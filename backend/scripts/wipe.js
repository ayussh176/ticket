require('dotenv').config({ path: 'd:/apna/backend/.env' });
const admin = require('firebase-admin');
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function deleteCollection(collectionPath) {
  const query = db.collection(collectionPath);
  const snapshot = await query.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) return;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${batchSize} docs from ${collectionPath}`);
}

async function wipeAll() {
  console.log('Wiping collections...');
  try {
    await deleteCollection('users');
    await deleteCollection('events');
    await deleteCollection('bookings');
    await deleteCollection('wallets');
    await deleteCollection('auditLog');
    console.log('Wipe complete.');
  } catch (e) {
    console.error(e);
  }
}
wipeAll();
