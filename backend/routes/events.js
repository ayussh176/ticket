// routes/events.js - Events/Tickets CRUD routes
const express = require('express');
const router = express.Router();
const { getDb, isUsingMock } = require('../config/firebase');
const { authenticate, adminOnly } = require('../middleware/auth');
const { mockEvents } = require('../data/mockData');

// In-memory store for mock mode
let mockEventStore = [...mockEvents];

/**
 * GET /api/events
 * List all events with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, date, status } = req.query;

    if (isUsingMock()) {
      let results = [...mockEventStore];

      if (category) {
        results = results.filter(e => e.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(e =>
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
        );
      }
      if (date) {
        results = results.filter(e => e.date === date);
      }
      if (status) {
        results = results.filter(e => e.status === status);
      }

      return res.json({ events: results, total: results.length });
    }

    // Firebase mode
    const db = getDb();
    let query = db.collection('events');

    if (category) query = query.where('category', '==', category);
    if (status) query = query.where('status', '==', status);
    if (date) query = query.where('date', '==', date);

    const snapshot = await query.get();
    let events = [];
    snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));

    if (search) {
      const q = search.toLowerCase();
      events = events.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
      );
    }

    res.json({ events, total: events.length });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

/**
 * GET /api/events/:id
 * Get single event details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isUsingMock()) {
      const event = mockEventStore.find(e => e.id === id);
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      return res.json({ event });
    }

    const db = getDb();
    const doc = await db.collection('events').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Event not found.' });

    res.json({ event: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

/**
 * POST /api/events
 * Create a new event (Admin only)
 */
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { title, category, date, time, location, price, totalSeats, description, imageUrl } = req.body;

    if (!title || !category || !date || !price || !totalSeats) {
      return res.status(400).json({ error: 'Title, category, date, price, and totalSeats are required.' });
    }

    const eventData = {
      title,
      category,
      date,
      time: time || '',
      location: location || '',
      price: Number(price),
      totalSeats: Number(totalSeats),
      availableSeats: Number(totalSeats),
      status: 'live',
      imageUrl: imageUrl || '',
      description: description || '',
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
    };

    if (isUsingMock()) {
      eventData.id = 'evt_' + Date.now();
      mockEventStore.push(eventData);
      return res.status(201).json({ message: 'Event created successfully', event: eventData });
    }

    const db = getDb();
    const docRef = await db.collection('events').add(eventData);
    res.status(201).json({ message: 'Event created successfully', event: { id: docRef.id, ...eventData } });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

/**
 * PUT /api/events/:id
 * Update an event (Admin only)
 */
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (isUsingMock()) {
      const index = mockEventStore.findIndex(e => e.id === id);
      if (index === -1) return res.status(404).json({ error: 'Event not found.' });
      mockEventStore[index] = { ...mockEventStore[index], ...updates };
      return res.json({ message: 'Event updated', event: mockEventStore[index] });
    }

    const db = getDb();
    const docRef = db.collection('events').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Event not found.' });

    await docRef.update(updates);
    const updated = await docRef.get();
    res.json({ message: 'Event updated', event: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event (Admin only)
 */
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (isUsingMock()) {
      const index = mockEventStore.findIndex(e => e.id === id);
      if (index === -1) return res.status(404).json({ error: 'Event not found.' });
      mockEventStore.splice(index, 1);
      return res.json({ message: 'Event deleted successfully' });
    }

    const db = getDb();
    const docRef = db.collection('events').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Event not found.' });

    await docRef.delete();
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

module.exports = router;
