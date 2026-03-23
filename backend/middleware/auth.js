// middleware/auth.js - JWT authentication middleware
const jwt = require('jsonwebtoken');
const { isUsingMock } = require('../config/firebase');
const { mockUsers } = require('../data/mockData');

/**
 * Verifies JWT token from Authorization header.
 * Attaches req.user = { uid, email, role }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || 'user',
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Requires the authenticated user to have admin role.
 * Must be used AFTER authenticate middleware.
 */
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { uid: user.uid, email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticate, adminOnly, generateToken };
