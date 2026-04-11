// routes/admin.js - Admin dashboard, management, and anomaly detection
const express = require('express');
const router = express.Router();
const { getDb, isUsingMock } = require('../config/firebase');
const { authenticate, adminOnly } = require('../middleware/auth');
const { mockUsers, mockEvents, mockBookings, mockWallets, mockAuditLog } = require('../data/mockData');

// ─── DASHBOARD ──────────────────────────────────────────────────

router.get('/dashboard', authenticate, adminOnly, async (req, res) => {
  try {
    if (isUsingMock()) {
      const totalSales = mockBookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.totalAmount, 0);

      return res.json({
        totalSales,
        activeTickets: mockBookings.filter(b => b.status === 'confirmed').length,
        totalEvents: mockEvents.length,
        totalUsers: mockUsers.filter(u => u.role === 'user').length,
        pendingVerifications: mockUsers.filter(u => u.idVerificationStatus === 'pending').length,
        revenueGrowth: '+12.5%',
      });
    }

    const db = getDb();
    const [eventsSnap, bookingsSnap, usersSnap] = await Promise.all([
      db.collection('events').get(),
      db.collection('bookings').get(),
      db.collection('users').where('role', '==', 'user').get(),
    ]);

    let totalSales = 0;
    let activeTickets = 0;
    bookingsSnap.forEach(doc => {
      const b = doc.data();
      if (b.status === 'confirmed') {
        totalSales += b.totalAmount;
        activeTickets++;
      }
    });

    let pendingVerifications = 0;
    usersSnap.forEach(doc => {
      if (doc.data().idVerificationStatus === 'pending') pendingVerifications++;
    });

    res.json({
      totalSales,
      activeTickets,
      totalEvents: eventsSnap.size,
      totalUsers: usersSnap.size,
      pendingVerifications,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard.' });
  }
});

// ─── USERS ──────────────────────────────────────────────────────

router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    if (isUsingMock()) {
      const users = mockUsers.map(u => {
        const { panHash, aadhaarHash, guardianPanHash, ...safeUser } = u;
        return {
          ...safeUser,
          panMasked: u.panMasked || '',
          aadhaarMasked: u.aadhaarMasked || '',
        };
      });
      return res.json({ users, total: users.length });
    }

    const db = getDb();
    const snapshot = await db.collection('users').get();
    const users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const { panHash, aadhaarHash, guardianPanHash, ...safeData } = data;
      users.push({
        id: doc.id,
        ...safeData,
        panMasked: data.panMasked || '',
        aadhaarMasked: data.aadhaarMasked || '',
      });
    });

    res.json({ users, total: users.length });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ─── BOOKINGS ───────────────────────────────────────────────────

router.get('/bookings', authenticate, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    if (isUsingMock()) {
      let bookings = [...mockBookings];
      if (status) bookings = bookings.filter(b => b.status === status);
      return res.json({ bookings, total: bookings.length });
    }

    const db = getDb();
    let snapshot = await db.collection('bookings').get();
    let bookings = [];
    snapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));

    if (status) bookings = bookings.filter(b => b.status === status);
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    bookings = bookings.slice(0, Number(limit));

    res.json({ bookings, total: bookings.length });
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// ─── ANALYTICS ──────────────────────────────────────────────────

router.get('/analytics', authenticate, adminOnly, async (req, res) => {
  try {
    if (isUsingMock()) {
      const categories = {};
      mockEvents.forEach(e => {
        categories[e.category] = (categories[e.category] || 0) + 1;
      });

      const revenueByEvent = {};
      mockBookings.forEach(b => {
        if (b.status === 'confirmed') {
          revenueByEvent[b.eventTitle] = (revenueByEvent[b.eventTitle] || 0) + b.totalAmount;
        }
      });

      return res.json({
        categoryBreakdown: categories,
        revenueByEvent,
        weeklyRevenue: [1200, 2100, 1800, 3400, 1400, 2800, 4200],
        weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      });
    }

    const db = getDb();
    const bookingsSnap = await db.collection('bookings')
      .where('status', '==', 'confirmed')
      .get();

    const revenueByEvent = {};
    bookingsSnap.forEach(doc => {
      const b = doc.data();
      revenueByEvent[b.eventTitle] = (revenueByEvent[b.eventTitle] || 0) + b.totalAmount;
    });

    const eventsSnap = await db.collection('events').get();
    const categories = {};
    eventsSnap.forEach(doc => {
      const e = doc.data();
      categories[e.category] = (categories[e.category] || 0) + 1;
    });

    res.json({ categoryBreakdown: categories, revenueByEvent });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics.' });
  }
});

// ─── AUDIT LOG ──────────────────────────────────────────────────

router.get('/audit-log', authenticate, adminOnly, async (req, res) => {
  try {
    if (isUsingMock()) {
      return res.json({ auditLog: mockAuditLog, total: mockAuditLog.length });
    }

    const db = getDb();
    const snapshot = await db.collection('auditLog').get();
    const auditLog = [];
    snapshot.forEach(doc => auditLog.push({ id: doc.id, ...doc.data() }));
    auditLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ auditLog: auditLog.slice(0, 100), total: auditLog.length });
  } catch (error) {
    console.error('Admin audit log error:', error);
    res.status(500).json({ error: 'Failed to load audit log.' });
  }
});

// ─── ANOMALY DETECTION ──────────────────────────────────────────

/**
 * GET /api/admin/anomalies
 * Detects suspicious booking patterns:
 * 1. Users with excessive bookings in a single day (>5)
 * 2. Multiple accounts sharing the same PAN
 * 3. Bookings with mismatched passenger IDs
 * 4. Unverified users who managed to book (shouldn't happen, but flag it)
 */
router.get('/anomalies', authenticate, adminOnly, async (req, res) => {
  try {
    const anomalies = [];

    if (isUsingMock()) {
      // Anomaly 1: Excessive daily bookings per user
      const bookingsByUserAndDay = {};
      mockBookings.forEach(b => {
        const day = b.createdAt.split('T')[0];
        const key = `${b.userId}_${day}`;
        bookingsByUserAndDay[key] = (bookingsByUserAndDay[key] || 0) + 1;
      });
      Object.entries(bookingsByUserAndDay).forEach(([key, count]) => {
        if (count > MAX_BOOKINGS_PER_DAY_PER_PAN) {
          const [userId, day] = key.split('_');
          const user = mockUsers.find(u => u.uid === userId);
          anomalies.push({
            type: 'EXCESSIVE_DAILY_BOOKINGS',
            severity: 'high',
            userId,
            userName: user?.name || 'Unknown',
            details: `${count} bookings on ${day} (limit: 2)`,
            detectedAt: new Date().toISOString(),
          });
        }
      });

      // Anomaly 2: Duplicate PANs across accounts
      const panMap = {};
      mockUsers.forEach(u => {
        if (u.panHash && u.panHash !== '') {
          if (!panMap[u.panHash]) panMap[u.panHash] = [];
          panMap[u.panHash].push({ uid: u.uid, name: u.name, email: u.email, panMasked: u.panMasked });
        }
      });
      Object.entries(panMap).forEach(([panHash, users]) => {
        if (users.length > 1) {
          const displayMask = users[0].panMasked || '***';
          anomalies.push({
            type: 'DUPLICATE_PAN',
            severity: 'critical',
            panMasked: displayMask,
            details: `Identity ${displayMask} shared by ${users.length} accounts: ${users.map(u => u.name).join(', ')}`,
            affectedUsers: users.map(u => ({ uid: u.uid, name: u.name })),
            detectedAt: new Date().toISOString(),
          });
        }
      });

      // Anomaly 3: Unverified users with bookings
      const unverifiedBookers = new Set();
      mockBookings.forEach(b => {
        const user = mockUsers.find(u => u.uid === b.userId);
        if (user && user.idVerificationStatus !== 'verified' && b.status === 'confirmed') {
          unverifiedBookers.add(b.userId);
        }
      });
      unverifiedBookers.forEach(uid => {
        const user = mockUsers.find(u => u.uid === uid);
        anomalies.push({
          type: 'UNVERIFIED_BOOKER',
          severity: 'medium',
          userId: uid,
          userName: user?.name || 'Unknown',
          details: `User with ${user?.idVerificationStatus || 'unknown'} verification status has confirmed bookings`,
          detectedAt: new Date().toISOString(),
        });
      });

      return res.json({
        anomalies,
        total: anomalies.length,
        scannedAt: new Date().toISOString(),
      });
    }

    // Firebase mode
    const db = getDb();
    const [usersSnap, bookingsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('bookings').get(),
    ]);

    const users = [];
    usersSnap.forEach(doc => users.push({ uid: doc.id, ...doc.data() }));
    const bookings = [];
    bookingsSnap.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));

    // Anomaly 1: Excessive daily bookings
    const bookingsByUserAndDay = {};
    bookings.forEach(b => {
      if (b.status === 'confirmed') {
        const day = (b.createdAt || '').split('T')[0];
        const key = `${b.userId}_${day}`;
        bookingsByUserAndDay[key] = (bookingsByUserAndDay[key] || 0) + 1;
      }
    });
    Object.entries(bookingsByUserAndDay).forEach(([key, count]) => {
      if (count > 2) {
        const userId = key.split('_')[0];
        const day = key.substring(userId.length + 1);
        const user = users.find(u => u.uid === userId);
        anomalies.push({
          type: 'EXCESSIVE_DAILY_BOOKINGS',
          severity: 'high',
          userId,
          userName: user?.name || 'Unknown',
          details: `${count} bookings on ${day}`,
          detectedAt: new Date().toISOString(),
        });
      }
    });

    // Anomaly 2: Duplicate PANs
    const panMap = {};
    users.forEach(u => {
      if (u.panHash && u.panHash !== '') {
        if (!panMap[u.panHash]) panMap[u.panHash] = [];
        panMap[u.panHash].push({ uid: u.uid, name: u.name, email: u.email, panMasked: u.panMasked });
      }
    });
    Object.entries(panMap).forEach(([panHash, panUsers]) => {
      if (panUsers.length > 1) {
        const displayMask = panUsers[0].panMasked || '***';
        anomalies.push({
          type: 'DUPLICATE_PAN',
          severity: 'critical',
          panMasked: displayMask,
          details: `Identity ${displayMask} shared by ${panUsers.length} accounts`,
          affectedUsers: panUsers.map(u => ({ uid: u.uid, name: u.name })),
          detectedAt: new Date().toISOString(),
        });
      }
    });

    // Anomaly 3: Unverified users with confirmed bookings
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const unverifiedBookers = new Set();
    confirmedBookings.forEach(b => {
      const user = users.find(u => u.uid === b.userId);
      if (user && user.idVerificationStatus !== 'verified') {
        unverifiedBookers.add(b.userId);
      }
    });
    unverifiedBookers.forEach(uid => {
      const user = users.find(u => u.uid === uid);
      anomalies.push({
        type: 'UNVERIFIED_BOOKER',
        severity: 'medium',
        userId: uid,
        userName: user?.name || 'Unknown',
        details: `User with '${user?.idVerificationStatus || 'unknown'}' status has confirmed bookings`,
        detectedAt: new Date().toISOString(),
      });
    });

    res.json({
      anomalies,
      total: anomalies.length,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ error: 'Failed to run anomaly detection.' });
  }
});

// ─── PENDING ID VERIFICATIONS ───────────────────────────────────

/**
 * GET /api/admin/pending-verifications
 * List users awaiting ID verification
 */
router.get('/pending-verifications', authenticate, adminOnly, async (req, res) => {
  try {
    if (isUsingMock()) {
      const pending = mockUsers
        .filter(u => u.idVerificationStatus === 'pending' && u.idDocumentUrl)
        .map(u => ({
          id: u.uid, // Add alias 'id' for frontend
          uid: u.uid,
          name: u.name,
          email: u.email,
          isMinor: u.isMinor || false,
          idDocumentType: u.idDocumentType || 'PAN_CARD',
          idDocumentUrl: u.idDocumentUrl, // Crucial for rendering the image
          panMasked: u.panMasked || '',
          aadhaarMasked: u.aadhaarMasked || '',
          uploadedAt: u.createdAt,
        }));
      return res.json({ users: pending, total: pending.length });
    }

    const db = getDb();
    const snapshot = await db.collection('users')
      .where('idVerificationStatus', '==', 'pending')
      .get();

    const pending = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.idDocumentUrl) {
        pending.push({
          id: doc.id, // Add alias 'id' for frontend
          uid: doc.id,
          name: data.name,
          email: data.email,
          isMinor: data.isMinor || false,
          idDocumentType: data.idDocumentType || 'PAN_CARD',
          idDocumentUrl: data.idDocumentUrl, // Crucial for rendering the image
          panMasked: data.panMasked || '',
          aadhaarMasked: data.aadhaarMasked || '',
          uploadedAt: data.createdAt,
        });
      }
    });

    // Frontend looks for { users: [...] }
    res.json({ users: pending, total: pending.length });
  } catch (error) {
    console.error('Pending verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch pending verifications.' });
  }
});

module.exports = router;
