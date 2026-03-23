// routes/tickets.js - QR ticket generation and validation routes
const express = require('express');
const router = express.Router();
const { getDb, isUsingMock } = require('../config/firebase');
const { authenticate, adminOnly } = require('../middleware/auth');
const { generateTicketQR, validateQRPayload } = require('../utils/qrGenerator');
const { mockBookings } = require('../data/mockData');

let mockBookingStore = [...mockBookings];

/**
 * GET /api/tickets/:bookingId
 * Get/generate the digital ticket (QR code) for a booking
 */
router.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (isUsingMock()) {
      const booking = mockBookingStore.find(
        b => b.id === bookingId && (b.userId === req.user.uid || req.user.role === 'admin')
      );
      if (!booking) return res.status(404).json({ error: 'Booking not found.' });
      if (booking.status !== 'confirmed') {
        return res.status(400).json({ error: 'Ticket unavailable - booking is not confirmed.' });
      }

      // Generate QR if not already generated
      if (!booking.qrCode) {
        booking.qrCode = await generateTicketQR({
          bookingId: booking.id,
          eventTitle: booking.eventTitle,
          seats: booking.seats,
          passengers: booking.passengers,
        });
      }

      return res.json({
        ticket: {
          bookingId: booking.id,
          eventTitle: booking.eventTitle,
          seats: booking.seats,
          passengers: booking.passengers.map(p => ({ name: p.name, idType: p.idType })),
          qrCode: booking.qrCode,
          status: booking.status,
        },
      });
    }

    const db = getDb();
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Booking not found.' });

    const booking = doc.data();
    if (booking.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Ticket unavailable - booking is not confirmed.' });
    }

    let qrCode = booking.qrCode;
    if (!qrCode) {
      qrCode = await generateTicketQR({
        bookingId,
        eventTitle: booking.eventTitle,
        seats: booking.seats,
        passengers: booking.passengers,
      });
      await db.collection('bookings').doc(bookingId).update({ qrCode });
    }

    res.json({
      ticket: {
        bookingId,
        eventTitle: booking.eventTitle,
        seats: booking.seats,
        passengers: booking.passengers.map(p => ({ name: p.name, idType: p.idType })),
        qrCode,
        status: booking.status,
      },
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to generate ticket.' });
  }
});

/**
 * POST /api/tickets/validate
 * Validate a scanned QR code (Admin/Scanner endpoint)
 */
router.post('/validate', authenticate, adminOnly, async (req, res) => {
  try {
    const { qrPayload } = req.body;
    if (!qrPayload) {
      return res.status(400).json({ error: 'qrPayload is required.' });
    }

    const result = validateQRPayload(qrPayload);
    if (!result.valid) {
      return res.status(400).json({ valid: false, error: result.error });
    }

    // Look up the booking to confirm it's still valid
    const bookingId = result.data.id;

    if (isUsingMock()) {
      const booking = mockBookingStore.find(b => b.id === bookingId);
      if (!booking) {
        return res.json({ valid: false, error: 'Booking not found in system.' });
      }
      return res.json({
        valid: true,
        booking: {
          id: booking.id,
          eventTitle: booking.eventTitle,
          seats: booking.seats,
          status: booking.status,
          passengers: booking.passengers.map(p => ({ name: p.name, idType: p.idType })),
        },
      });
    }

    const db = getDb();
    const doc = await db.collection('bookings').doc(bookingId).get();
    if (!doc.exists) {
      return res.json({ valid: false, error: 'Booking not found in system.' });
    }

    const booking = doc.data();
    res.json({
      valid: true,
      booking: {
        id: bookingId,
        eventTitle: booking.eventTitle,
        seats: booking.seats,
        status: booking.status,
        passengers: booking.passengers.map(p => ({ name: p.name, idType: p.idType })),
      },
    });
  } catch (error) {
    console.error('Validate ticket error:', error);
    res.status(500).json({ error: 'Failed to validate ticket.' });
  }
});

module.exports = router;
