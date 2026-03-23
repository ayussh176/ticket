// server.js - APNATICKET Backend Entry Point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Initialize Firebase
const { initializeFirebase } = require('./config/firebase');
initializeFirebase();

// Import routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const walletRoutes = require('./routes/wallet');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - allow frontend origin
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5501',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'APNATICKET Backend',
    timestamp: new Date().toISOString(),
    mode: require('./config/firebase').isUsingMock() ? 'mock' : 'firebase',
  });
});

// --- API Documentation (Simple) ---
app.get('/api', (req, res) => {
  res.json({
    service: 'APNATICKET REST API',
    version: '2.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register (requires PAN for 18+, Aadhaar+guardian PAN for minors)',
        'POST /api/auth/login': 'Login with email/password',
        'POST /api/auth/forgot-password': 'Send password reset email',
        'GET /api/auth/me': 'Get profile with masked PAN/Aadhaar (auth required)',
        'POST /api/auth/upload-id': 'Upload photo ID document (auth required)',
        'POST /api/auth/verify-id': 'Approve/reject user ID (admin only)',
      },
      events: {
        'GET /api/events': 'List events (filters: ?category, ?search, ?date)',
        'GET /api/events/:id': 'Get event details',
        'POST /api/events': 'Create event (admin)',
        'PUT /api/events/:id': 'Update event (admin)',
        'DELETE /api/events/:id': 'Delete event (admin)',
      },
      bookings: {
        'POST /api/bookings': 'Create booking (requires verified ID, PAN daily cap enforced)',
        'GET /api/bookings': 'List user bookings (auth required)',
        'GET /api/bookings/:id': 'Get booking details (auth required)',
        'PUT /api/bookings/:id/cancel': 'Cancel booking with e-INR refund (auth required)',
      },
      wallet: {
        'GET /api/wallet': 'Get e-INR wallet balance (auth required)',
        'POST /api/wallet/topup': 'Top up e-INR wallet (auth required)',
      },
      tickets: {
        'GET /api/tickets/:bookingId': 'Get encrypted QR ticket (auth required)',
        'POST /api/tickets/validate': 'Decrypt and validate QR code (admin)',
      },
      admin: {
        'GET /api/admin/dashboard': 'Dashboard stats (admin)',
        'GET /api/admin/users': 'List users with masked PAN (admin)',
        'GET /api/admin/bookings': 'List all bookings (admin)',
        'GET /api/admin/analytics': 'Revenue analytics (admin)',
        'GET /api/admin/audit-log': 'Immutable audit trail (admin)',
        'GET /api/admin/anomalies': 'Anomaly detection scan (admin)',
        'GET /api/admin/pending-verifications': 'Pending ID verifications (admin)',
      },
    },
  });
});

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       🎫 APNATICKET Backend Server       ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Port:     ${PORT}                           ║`);
  console.log(`║  API Docs: http://localhost:${PORT}/api       ║`);
  console.log(`║  Health:   http://localhost:${PORT}/api/health ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
