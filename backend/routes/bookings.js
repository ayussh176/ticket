const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb, isUsingMock } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { mockBookings, mockEvents, mockUsers } = require('../data/mockData');
const walletRouter = require('./wallet');
const { generateTicketQR } = require('../utils/qrGenerator');

// In-memory store for mock mode
let mockBookingStore = [...mockBookings];
let mockEventStore = [...mockEvents];

// Booking rules constants
const MAX_TICKETS_PER_BOOKING = 2;
const MAX_BOOKINGS_PER_DAY_PER_PAN = 2;

// ─── Helper: look up PAN for a user ─────────────────────────────

async function getUserPAN(userId) {
  if (isUsingMock()) {
    const user = mockUsers.find(u => u.uid === userId);
    // For minors, use guardianPanHash
    return user ? (user.panHash || user.guardianPanHash || '') : '';
  }

  const db = getDb();
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return '';
  const data = doc.data();
  return data.panHash || data.guardianPanHash || '';
}

// ─── Helper: get user identity verification status ──────────────

async function getUserVerificationStatus(userId) {
  if (isUsingMock()) {
    const user = mockUsers.find(u => u.uid === userId);
    return user?.idVerificationStatus || 'pending';
  }

  const db = getDb();
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return 'pending';
  return doc.data().idVerificationStatus || 'pending';
}

// ─── Helper: count today's bookings by PAN ──────────────────────

async function countTodayBookingsByPAN(pan) {
  const today = new Date().toISOString().split('T')[0];

  if (isUsingMock()) {
    // Find all users with this PAN
    const panUsers = mockUsers.filter(u => u.panHash === pan || u.guardianPanHash === pan);
    const userIds = panUsers.map(u => u.uid);

    return mockBookingStore.filter(
      b => userIds.includes(b.userId) && b.createdAt.startsWith(today) && b.status !== 'cancelled'
    ).length;
  }

  const db = getDb();
  // Find all users with this PAN
  const panSnap = await db.collection('users').where('panHash', '==', pan).get();
  const guardianSnap = await db.collection('users').where('guardianPanHash', '==', pan).get();
  const userIds = new Set();
  panSnap.forEach(doc => userIds.add(doc.id));
  guardianSnap.forEach(doc => userIds.add(doc.id));

  let totalBookings = 0;
  for (const uid of userIds) {
    const bookSnap = await db.collection('bookings')
      .where('userId', '==', uid)
      .get();
    bookSnap.forEach(doc => {
      const b = doc.data();
      if (b.createdAt.startsWith(today) && b.status !== 'cancelled') {
        totalBookings++;
      }
    });
  }
  return totalBookings;
}

/**
 * POST /api/bookings
 * Create a new booking with full rule enforcement
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { eventId, seats, passengers } = req.body;

    // --- Basic Validation ---
    if (!eventId || !seats || !passengers) {
      return res.status(400).json({ error: 'eventId, seats, and passengers are required.' });
    }

    if (!Array.isArray(seats) || !Array.isArray(passengers)) {
      return res.status(400).json({ error: 'seats and passengers must be arrays.' });
    }

    if (seats.length !== passengers.length) {
      return res.status(400).json({ error: 'Each seat must have a corresponding passenger.' });
    }

    // Rule 1: Max 2 tickets per booking
    if (seats.length > MAX_TICKETS_PER_BOOKING) {
      return res.status(400).json({
        error: `Maximum ${MAX_TICKETS_PER_BOOKING} tickets per booking allowed.`,
      });
    }

    // Rule 2: Each passenger must have mandatory ID format and we secure it immediately
    for (let p of passengers) {
      if (!p.name || !p.idType || !p.idHash) {
        return res.status(400).json({
          error: 'Each passenger must have name, idType (PAN/Aadhaar), and ID number.',
        });
      }
      if (!['PAN', 'Aadhaar'].includes(p.idType)) {
        return res.status(400).json({
          error: 'Passenger idType must be "PAN" or "Aadhaar".',
        });
      }
      
      const rawId = p.idHash; // Frontend currently sends plaintext in idHash
      if (p.idType === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(rawId)) {
        return res.status(400).json({ error: `Invalid PAN format for passenger ${p.name}` });
      }
      if (p.idType === 'Aadhaar' && !/^\d{12}$/.test(rawId)) {
        return res.status(400).json({ error: `Invalid Aadhaar format for passenger ${p.name}` });
      }
      
      // Cryptographically abstract the ID
      p.idMasked = p.idType === 'PAN' 
          ? rawId.substring(0, 4) + '****' + rawId.substring(8)
          : 'xxxxxxxx' + rawId.substring(8);
      p.idHash = crypto.createHash('sha256').update(rawId).digest('hex');
    }

    // Rule 3: ID verification gate — user must have verified ID
    const verificationStatus = await getUserVerificationStatus(req.user.uid);
    if (verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Your identity is not verified yet. Please upload your photo ID and wait for admin approval before booking.',
        idVerificationStatus: verificationStatus,
      });
    }

    // Rule 4: Daily booking cap per PAN (which is now a SHA-256 hash string)
    const userPAN = await getUserPAN(req.user.uid);
    if (userPAN) {
      const todayCount = await countTodayBookingsByPAN(userPAN);
      if (todayCount >= MAX_BOOKINGS_PER_DAY_PER_PAN) {
        return res.status(400).json({
          error: `Daily booking limit reached (max ${MAX_BOOKINGS_PER_DAY_PER_PAN} bookings per day per your registered identity).`,
        });
      }
    }

    // --- Process Booking ---

    if (isUsingMock()) {
      const event = mockEventStore.find(e => e.id === eventId);
      if (!event) return res.status(404).json({ error: 'Event not found.' });

      if (event.availableSeats < seats.length) {
        return res.status(400).json({ error: 'Not enough seats available.' });
      }

      const totalAmount = event.price * seats.length;

      // Debit wallet (e-INR only, no UPI/card fallback)
      try {
        await walletRouter.debitWallet(req.user.uid, totalAmount, 'bk_' + Date.now());
      } catch (walletErr) {
        return res.status(400).json({ error: walletErr.message });
      }

      const booking = {
        id: 'bk_' + Date.now(),
        userId: req.user.uid,
        userPanHash: userPAN,
        eventId,
        eventTitle: event.title,
        seats,
        passengers,
        totalAmount,
        status: 'confirmed',
        paymentTxId: 'tx_eru_' + Date.now(),
        paymentMethod: 'E-RUPEE',
        qrCode: null,
        createdAt: new Date().toISOString(),
      };

      // Generate encrypted QR ticket
      booking.qrCode = await generateTicketQR({
        bookingId: booking.id,
        eventTitle: event.title,
        seats,
        passengers,
      });

      mockBookingStore.push(booking);
      event.availableSeats -= seats.length;

      return res.status(201).json({
        message: 'Booking confirmed!',
        booking,
      });
    }

    // Firebase mode
    const db = getDb();
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) return res.status(404).json({ error: 'Event not found.' });

    const event = eventDoc.data();
    if (event.availableSeats < seats.length) {
      return res.status(400).json({ error: 'Not enough seats available.' });
    }

    const totalAmount = event.price * seats.length;

    // Debit wallet
    const bookingId = 'bk_' + Date.now();
    try {
      await walletRouter.debitWallet(req.user.uid, totalAmount, bookingId);
    } catch (walletErr) {
      return res.status(400).json({ error: walletErr.message });
    }

    // Generate encrypted QR
    const qrCode = await generateTicketQR({
      bookingId,
      eventTitle: event.title,
      seats,
      passengers,
    });

    const bookingData = {
      userId: req.user.uid,
      userPanHash: userPAN,
      eventId,
      eventTitle: event.title,
      seats,
      passengers,
      totalAmount,
      status: 'confirmed',
      paymentTxId: 'tx_eru_' + Date.now(),
      paymentMethod: 'E-RUPEE',
      qrCode,
      createdAt: new Date().toISOString(),
    };

    await db.collection('bookings').doc(bookingId).set(bookingData);

    // Update available seats
    await db.collection('events').doc(eventId).update({
      availableSeats: event.availableSeats - seats.length,
    });

    // Audit log (immutable)
    await db.collection('auditLog').add({
      action: 'BOOKING_CREATED',
      userId: req.user.uid,
      panHash: userPAN,
      details: `Booked ${seats.length} tickets for ${event.title}`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Booking confirmed!',
      booking: { id: bookingId, ...bookingData },
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking.' });
  }
});

/**
 * GET /api/bookings
 * List user's bookings
 */
router.get('/', authenticate, async (req, res) => {
  try {
    if (isUsingMock()) {
      const bookings = mockBookingStore.filter(b => b.userId === req.user.uid);
      return res.json({ bookings, total: bookings.length });
    }

    const db = getDb();
    const snapshot = await db.collection('bookings')
      .where('userId', '==', req.user.uid)
      .get();

    const bookings = [];
    snapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ bookings, total: bookings.length });
  } catch (error) {
    console.error('List bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

/**
 * GET /api/bookings/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (isUsingMock()) {
      const booking = mockBookingStore.find(b => b.id === id && b.userId === req.user.uid);
      if (!booking) return res.status(404).json({ error: 'Booking not found.' });
      return res.json({ booking });
    }

    const db = getDb();
    const doc = await db.collection('bookings').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found.' });

    const booking = doc.data();
    if (booking.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ booking: { id: doc.id, ...booking } });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ error: 'Failed to fetch booking.' });
  }
});

/**
 * PUT /api/bookings/:id/cancel
 */
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (isUsingMock()) {
      const booking = mockBookingStore.find(b => b.id === id && b.userId === req.user.uid);
      if (!booking) return res.status(404).json({ error: 'Booking not found.' });
      if (booking.status === 'cancelled') {
        return res.status(400).json({ error: 'Booking is already cancelled.' });
      }

      booking.status = 'cancelled';
      await walletRouter.creditWallet(req.user.uid, booking.totalAmount, id);

      const event = mockEventStore.find(e => e.id === booking.eventId);
      if (event) event.availableSeats += booking.seats.length;

      return res.json({ message: 'Booking cancelled and e-INR refunded.', booking });
    }

    const db = getDb();
    const docRef = db.collection('bookings').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found.' });

    const booking = doc.data();
    if (booking.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled.' });
    }

    await docRef.update({ status: 'cancelled' });
    await walletRouter.creditWallet(req.user.uid, booking.totalAmount, id);

    const eventRef = db.collection('events').doc(booking.eventId);
    const eventDoc = await eventRef.get();
    if (eventDoc.exists) {
      await eventRef.update({
        availableSeats: eventDoc.data().availableSeats + booking.seats.length,
      });
    }

    // Audit log
    await db.collection('auditLog').add({
      action: 'BOOKING_CANCELLED',
      userId: req.user.uid,
      panHash: booking.userPanHash || '',
      details: `Cancelled booking ${id} for ${booking.eventTitle}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Booking cancelled and e-INR refunded.' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

module.exports = router;
