const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function run() {
  const serviceAccountPath = 'd:/apna/backend/config/serviceAccountKey.json';
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();
  const uid = 'txK7hZW7k6NSI9egjKewIFJa1wJ2'; // Ayush's UID
  
  await db.collection('users').doc(uid).update({
      idVerificationStatus: 'verified'
  });
  
  console.log(`User ${uid} successfully verified in Firestore.`);
  process.exit(0);
}

run().catch(err => {
    console.error('Execution error:', err);
    process.exit(1);
});
