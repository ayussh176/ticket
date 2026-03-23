// config/firebase.js - Firebase Admin SDK initialization
const admin = require('firebase-admin');
const path = require('path');

let db, auth;
let isMockMode = false;

function initializeFirebase() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath || serviceAccountPath === 'mock') {
    console.log('⚠️  Firebase running in MOCK mode (no real database)');
    console.log('   Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to connect to real Firebase');
    isMockMode = true;
    return;
  }

  try {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    auth = admin.auth();
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('   Falling back to MOCK mode');
    isMockMode = true;
  }
}

function getDb() {
  return db;
}

function getAuth() {
  return auth;
}

function isUsingMock() {
  return isMockMode;
}

module.exports = { initializeFirebase, getDb, getAuth, isUsingMock };
