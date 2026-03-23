// routes/auth.js - Authentication routes with PAN/Aadhaar identity verification
const express = require('express');
const router = express.Router();
const { getDb, getAuth, isUsingMock } = require('../config/firebase');
const { authenticate, adminOnly, generateToken } = require('../middleware/auth');
const { mockUsers } = require('../data/mockData');

// In-memory store for mock mode
let mockUserStore = [...mockUsers];

// ─── Validation Helpers ─────────────────────────────────────────

/**
 * Validates Indian PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
 */
function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}

/**
 * Validates Aadhaar format: 12 digits
 */
function isValidAadhaar(aadhaar) {
  return /^\d{12}$/.test(aadhaar);
}

/**
 * Masks PAN for display: ABCDE1234F → ABCD****4F
 */
function maskPAN(pan) {
  if (!pan || pan.length < 10) return pan || '***';
  return pan.substring(0, 4) + '****' + pan.substring(8);
}

/**
 * Masks Aadhaar for display: 123456789012 → xxxxxxxx9012
 */
function maskAadhaar(aadhaar) {
  if (!aadhaar || aadhaar.length < 12) return aadhaar || '****';
  return 'xxxxxxxx' + aadhaar.substring(8);
}

/**
 * Calculate age from DOB string (YYYY-MM-DD)
 */
function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ─── REGISTER ───────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register with mandatory identity verification
 * Body: { name, email, phone, password, dateOfBirth, panNumber?, aadhaarNumber?, guardianPanNumber? }
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, dateOfBirth, panNumber, aadhaarNumber, guardianPanNumber } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (!dateOfBirth) {
      return res.status(400).json({ error: 'Date of birth is required for identity verification.' });
    }

    const age = calculateAge(dateOfBirth);
    const isMinor = age < 18;

    // Identity verification rules
    if (isMinor) {
      // Minors need Aadhaar linked to guardian PAN
      if (!aadhaarNumber) {
        return res.status(400).json({ error: 'Aadhaar number is required for users under 18.' });
      }
      if (!isValidAadhaar(aadhaarNumber)) {
        return res.status(400).json({ error: 'Invalid Aadhaar format. Must be 12 digits.' });
      }
      if (!guardianPanNumber) {
        return res.status(400).json({ error: 'Guardian PAN is required for users under 18.' });
      }
      if (!isValidPAN(guardianPanNumber)) {
        return res.status(400).json({ error: 'Invalid Guardian PAN format. Must be like ABCDE1234F.' });
      }
    } else {
      // Majors need PAN
      if (!panNumber) {
        return res.status(400).json({ error: 'PAN number is required for users 18 and above.' });
      }
      if (!isValidPAN(panNumber)) {
        return res.status(400).json({ error: 'Invalid PAN format. Must be like ABCDE1234F.' });
      }
    }

    const userData = {
      name,
      email,
      phone: phone || '',
      role: role || 'user',
      dateOfBirth,
      age,
      isMinor,
      panHash: isMinor ? '' : panNumber,
      aadhaarHash: isMinor ? aadhaarNumber : '',
      guardianPanHash: isMinor ? guardianPanNumber : '',
      idDocumentUrl: '',
      idVerificationStatus: 'pending', // pending | verified | rejected
      createdAt: new Date().toISOString(),
    };

    if (isUsingMock()) {
      const existing = mockUserStore.find(u => u.email === email);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered.' });
      }

      // Check duplicate PAN (majors only)
      if (!isMinor && panNumber) {
        const panExists = mockUserStore.find(u => u.panHash === panNumber && u.email !== email);
        if (panExists) {
          return res.status(400).json({ error: 'This PAN is already registered with another account.' });
        }
      }

      const newUser = { uid: 'user_' + Date.now(), ...userData, walletBalance: 0 };
      mockUserStore.push(newUser);

      const token = generateToken(newUser);
      return res.status(201).json({
        message: 'Registration successful. Please upload your photo ID for verification.',
        token,
        user: {
          uid: newUser.uid, name: newUser.name, email: newUser.email,
          role: newUser.role, isMinor, idVerificationStatus: 'pending',
        },
      });
    }

    // Firebase mode
    const db = getDb();
    const auth = getAuth();

    // Check duplicate PAN in Firestore
    if (!isMinor && panNumber) {
      const panSnap = await db.collection('users').where('panHash', '==', panNumber).get();
      if (!panSnap.empty) {
        return res.status(400).json({ error: 'This PAN is already registered with another account.' });
      }
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone || undefined,
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      ...userData,
    });

    // Initialize wallet
    await db.collection('wallets').doc(userRecord.uid).set({
      userId: userRecord.uid,
      balance: 0,
      transactions: [],
    });

    // Audit log
    await db.collection('auditLog').add({
      action: 'USER_REGISTERED',
      userId: userRecord.uid,
      details: `${name} registered (${isMinor ? 'Minor - Aadhaar' : 'Major - PAN'})`,
      timestamp: new Date().toISOString(),
    });

    const token = generateToken({ uid: userRecord.uid, email, role: role || 'user' });
    res.status(201).json({
      message: 'Registration successful. Please upload your photo ID for verification.',
      token,
      user: {
        uid: userRecord.uid, name, email, role: role || 'user',
        isMinor, idVerificationStatus: 'pending',
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// ─── UPLOAD ID DOCUMENT ─────────────────────────────────────────

/**
 * POST /api/auth/upload-id
 * Upload photo-based ID document (base64 encoded)
 * Body: { idDocumentBase64, idDocumentType }
 */
router.post('/upload-id', authenticate, async (req, res) => {
  try {
    const { idDocumentBase64, idDocumentType } = req.body;

    if (!idDocumentBase64) {
      return res.status(400).json({ error: 'idDocumentBase64 is required.' });
    }
    if (!idDocumentType || !['PAN_CARD', 'AADHAAR_CARD', 'PASSPORT', 'VOTER_ID'].includes(idDocumentType)) {
      return res.status(400).json({
        error: 'idDocumentType must be one of: PAN_CARD, AADHAAR_CARD, PASSPORT, VOTER_ID',
      });
    }

    // Validate base64 (simple check for data URI or raw base64)
    const isDataUri = idDocumentBase64.startsWith('data:image/');
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(idDocumentBase64.substring(0, 100));
    if (!isDataUri && !isBase64) {
      return res.status(400).json({ error: 'Invalid image format. Send a base64 encoded image.' });
    }

    // In production, you'd upload to Firebase Storage / S3 and store the URL
    // For now, we store a reference indicating the document was uploaded
    const docUrl = `id_doc_${req.user.uid}_${Date.now()}.jpg`;

    if (isUsingMock()) {
      const user = mockUserStore.find(u => u.uid === req.user.uid);
      if (user) {
        user.idDocumentUrl = docUrl;
        user.idDocumentType = idDocumentType;
        user.idVerificationStatus = 'pending';
      }
      return res.json({
        message: 'ID document uploaded successfully. Pending admin verification.',
        idDocumentUrl: docUrl,
      });
    }

    const db = getDb();
    await db.collection('users').doc(req.user.uid).update({
      idDocumentUrl: docUrl,
      idDocumentType,
      idVerificationStatus: 'pending',
    });

    // Audit log
    await db.collection('auditLog').add({
      action: 'ID_DOCUMENT_UPLOADED',
      userId: req.user.uid,
      details: `Uploaded ${idDocumentType} for verification`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: 'ID document uploaded successfully. Pending admin verification.',
      idDocumentUrl: docUrl,
    });
  } catch (error) {
    console.error('Upload ID error:', error);
    res.status(500).json({ error: 'Failed to upload ID document.' });
  }
});

// ─── ADMIN: VERIFY ID ───────────────────────────────────────────

/**
 * POST /api/auth/verify-id
 * Admin approves or rejects a user's ID document
 * Body: { userId, action: 'verify' | 'reject', reason? }
 */
router.post('/verify-id', authenticate, adminOnly, async (req, res) => {
  try {
    const { userId, action, reason } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: 'userId and action (verify/reject) are required.' });
    }
    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "verify" or "reject".' });
    }

    const newStatus = action === 'verify' ? 'verified' : 'rejected';

    if (isUsingMock()) {
      const user = mockUserStore.find(u => u.uid === userId);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (!user.idDocumentUrl) {
        return res.status(400).json({ error: 'User has not uploaded an ID document.' });
      }
      user.idVerificationStatus = newStatus;
      return res.json({
        message: `User ID ${action === 'verify' ? 'verified' : 'rejected'} successfully.`,
        user: { uid: user.uid, name: user.name, idVerificationStatus: newStatus },
      });
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found.' });

    const userData = userDoc.data();
    if (!userData.idDocumentUrl) {
      return res.status(400).json({ error: 'User has not uploaded an ID document.' });
    }

    await db.collection('users').doc(userId).update({
      idVerificationStatus: newStatus,
    });

    // Audit log
    await db.collection('auditLog').add({
      action: action === 'verify' ? 'ID_VERIFIED' : 'ID_REJECTED',
      userId: req.user.uid,
      details: `Admin ${action === 'verify' ? 'verified' : 'rejected'} ID for user ${userId}${reason ? ': ' + reason : ''}`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: `User ID ${action === 'verify' ? 'verified' : 'rejected'} successfully.`,
    });
  } catch (error) {
    console.error('Verify ID error:', error);
    res.status(500).json({ error: 'Failed to verify ID.' });
  }
});

// ─── LOGIN ──────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (isUsingMock()) {
      const user = mockUserStore.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken(user);
      return res.json({
        message: 'Login successful',
        token,
        user: {
          uid: user.uid, name: user.name, email: user.email, role: user.role,
          isMinor: user.isMinor || false,
          idVerificationStatus: user.idVerificationStatus || 'verified',
        },
      });
    }

    const auth = getAuth();
    const db = getDb();

    const userRecord = await auth.getUserByEmail(email);
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const token = generateToken({
      uid: userRecord.uid,
      email: userRecord.email,
      role: userData.role || 'user',
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        uid: userRecord.uid,
        name: userData.name || userRecord.displayName,
        email: userRecord.email,
        role: userData.role || 'user',
        isMinor: userData.isMinor || false,
        idVerificationStatus: userData.idVerificationStatus || 'pending',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid email or password.' });
  }
});

// ─── FORGOT PASSWORD ────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (isUsingMock()) {
      return res.json({ message: `Password reset link sent to ${email} (mock mode)` });
    }

    const auth = getAuth();
    await auth.generatePasswordResetLink(email);
    res.json({ message: `Password reset link sent to ${email}` });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset email.' });
  }
});

// ─── GET PROFILE ────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  try {
    if (isUsingMock()) {
      const user = mockUserStore.find(u => u.uid === req.user.uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      // Return with masked sensitive data
      return res.json({
        user: {
          ...user,
          panHash: user.panHash ? maskPAN(user.panHash) : '',
          aadhaarHash: user.aadhaarHash ? maskAadhaar(user.aadhaarHash) : '',
          guardianPanHash: user.guardianPanHash ? maskPAN(user.guardianPanHash) : '',
        },
      });
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = userDoc.data();
    res.json({
      user: {
        ...userData,
        panHash: userData.panHash ? maskPAN(userData.panHash) : '',
        aadhaarHash: userData.aadhaarHash ? maskAadhaar(userData.aadhaarHash) : '',
        guardianPanHash: userData.guardianPanHash ? maskPAN(userData.guardianPanHash) : '',
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// Export helpers for other modules
router.maskPAN = maskPAN;
router.maskAadhaar = maskAadhaar;
router.isValidPAN = isValidPAN;

module.exports = router;
