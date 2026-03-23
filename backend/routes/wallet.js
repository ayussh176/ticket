// routes/wallet.js - E-Rupee wallet simulation routes
const express = require('express');
const router = express.Router();
const { getDb, isUsingMock } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { mockWallets } = require('../data/mockData');

// In-memory store for mock mode
let mockWalletStore = [...mockWallets];

/**
 * Helper: Get or create wallet for a user (mock mode)
 */
function getMockWallet(userId) {
  let wallet = mockWalletStore.find(w => w.userId === userId);
  if (!wallet) {
    wallet = { userId, balance: 0, transactions: [] };
    mockWalletStore.push(wallet);
  }
  return wallet;
}

/**
 * GET /api/wallet
 * Get wallet balance and transaction history
 */
router.get('/', authenticate, async (req, res) => {
  try {
    if (isUsingMock()) {
      const wallet = getMockWallet(req.user.uid);
      return res.json({
        balance: wallet.balance,
        currency: 'e-INR',
        transactions: wallet.transactions,
      });
    }

    const db = getDb();
    const doc = await db.collection('wallets').doc(req.user.uid).get();
    if (!doc.exists) {
      // Create wallet if it doesn't exist
      const newWallet = { userId: req.user.uid, balance: 0, transactions: [] };
      await db.collection('wallets').doc(req.user.uid).set(newWallet);
      return res.json({ balance: 0, currency: 'e-INR', transactions: [] });
    }

    const data = doc.data();
    res.json({
      balance: data.balance,
      currency: 'e-INR',
      transactions: data.transactions || [],
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet.' });
  }
});

/**
 * POST /api/wallet/topup
 * Add E-Rupee tokens to wallet (simulation)
 */
router.post('/topup', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const txRecord = {
      type: 'topup',
      amount: Number(amount),
      ref: 'TOPUP_' + Date.now(),
      timestamp: new Date().toISOString(),
    };

    if (isUsingMock()) {
      const wallet = getMockWallet(req.user.uid);
      wallet.balance += Number(amount);
      wallet.transactions.push(txRecord);
      return res.json({
        message: `₹${amount} e-INR added to wallet`,
        balance: wallet.balance,
        transaction: txRecord,
      });
    }

    const db = getDb();
    const docRef = db.collection('wallets').doc(req.user.uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      await docRef.set({
        userId: req.user.uid,
        balance: Number(amount),
        transactions: [txRecord],
      });
    } else {
      const data = doc.data();
      await docRef.update({
        balance: data.balance + Number(amount),
        transactions: [...(data.transactions || []), txRecord],
      });
    }

    const updated = await docRef.get();
    res.json({
      message: `₹${amount} e-INR added to wallet`,
      balance: updated.data().balance,
      transaction: txRecord,
    });
  } catch (error) {
    console.error('Topup error:', error);
    res.status(500).json({ error: 'Failed to top up wallet.' });
  }
});

/**
 * Internal helper: Debit wallet (called by booking module)
 * Not exposed as an API route.
 */
async function debitWallet(userId, amount, bookingRef) {
  const txRecord = {
    type: 'debit',
    amount: -Math.abs(amount),
    ref: bookingRef,
    timestamp: new Date().toISOString(),
  };

  if (isUsingMock()) {
    const wallet = getMockWallet(userId);
    if (wallet.balance < amount) {
      throw new Error('Insufficient e-INR balance');
    }
    wallet.balance -= amount;
    wallet.transactions.push(txRecord);
    return { balance: wallet.balance, transaction: txRecord };
  }

  const db = getDb();
  const docRef = db.collection('wallets').doc(userId);
  const doc = await docRef.get();

  if (!doc.exists || doc.data().balance < amount) {
    throw new Error('Insufficient e-INR balance');
  }

  const data = doc.data();
  await docRef.update({
    balance: data.balance - amount,
    transactions: [...(data.transactions || []), txRecord],
  });

  return { balance: data.balance - amount, transaction: txRecord };
}

/**
 * Internal helper: Credit wallet (for refunds)
 */
async function creditWallet(userId, amount, bookingRef) {
  const txRecord = {
    type: 'refund',
    amount: Math.abs(amount),
    ref: bookingRef,
    timestamp: new Date().toISOString(),
  };

  if (isUsingMock()) {
    const wallet = getMockWallet(userId);
    wallet.balance += amount;
    wallet.transactions.push(txRecord);
    return { balance: wallet.balance, transaction: txRecord };
  }

  const db = getDb();
  const docRef = db.collection('wallets').doc(userId);
  const doc = await docRef.get();
  const data = doc.exists ? doc.data() : { balance: 0, transactions: [] };

  await docRef.set({
    userId,
    balance: data.balance + amount,
    transactions: [...(data.transactions || []), txRecord],
  });

  return { balance: data.balance + amount, transaction: txRecord };
}

// Export router and internal helpers
router.debitWallet = debitWallet;
router.creditWallet = creditWallet;

module.exports = router;
