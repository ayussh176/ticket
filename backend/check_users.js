const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function run() {
  const serviceAccountPath = 'd:/apna/backend/config/serviceAccountKey.json';
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found at:', serviceAccountPath);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();
  const usersRef = db.collection('users');
  
  // Find all users to see who is logged in
  const snapshot = await usersRef.get();
  
  console.log('--- Current Users in System ---');
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`Email: ${d.email}, Role: ${d.role}, Verification: ${d.idVerificationStatus}, UID: ${doc.id}`);
  });

  process.exit(0);
}

run().catch(err => {
    console.error('Execution error:', err);
    process.exit(1);
});
