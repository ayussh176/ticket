// utils/qrGenerator.js - QR code generation with AES-256-CBC encryption
const QRCode = require('qrcode');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

/**
 * Get the encryption key from environment (32 bytes).
 */
function getEncryptionKey() {
  const keyHex = process.env.QR_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 64) {
    // Fallback: derive key from JWT_SECRET
    return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback-key').digest();
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts a plaintext string using AES-256-CBC.
 */
function encrypt(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Prepend the IV so we can decrypt later
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts an AES-256-CBC encrypted string.
 */
function decrypt(encryptedText) {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length < 2) throw new Error('Invalid encrypted format');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts.slice(1).join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generates QR code with encrypted booking metadata.
 * @param {Object} bookingData - { bookingId, eventTitle, passengers, seats }
 * @returns {Promise<string>} Base64 data URL of the QR code image
 */
async function generateTicketQR(bookingData) {
  const payload = JSON.stringify({
    id: bookingData.bookingId,
    event: bookingData.eventTitle,
    seats: bookingData.seats,
    passengers: bookingData.passengers.map(p => ({
      name: p.name,
      idType: p.idType,
    })),
    validatedAt: null,
    issuedAt: new Date().toISOString(),
  });

  // Encrypt the payload
  const encryptedPayload = encrypt(payload);

  try {
    const qrDataUrl = await QRCode.toDataURL(encryptedPayload, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (err) {
    console.error('QR generation error:', err);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Validates and decrypts a QR code payload string.
 * @param {string} qrPayload - The raw QR code content (encrypted)
 * @returns {Object} { valid, data } or { valid: false, error }
 */
function validateQRPayload(qrPayload) {
  try {
    // First try to decrypt (new encrypted format)
    let jsonString;
    try {
      jsonString = decrypt(qrPayload);
    } catch (decryptErr) {
      // Fallback: try parsing as plain JSON (legacy tickets)
      jsonString = qrPayload;
    }

    const data = JSON.parse(jsonString);
    if (!data.id || !data.event) {
      return { valid: false, error: 'Invalid QR code format' };
    }
    return { valid: true, data };
  } catch (err) {
    return { valid: false, error: 'Cannot parse QR code data' };
  }
}

module.exports = { generateTicketQR, validateQRPayload, encrypt, decrypt };
