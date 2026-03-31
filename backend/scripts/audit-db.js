// scripts/audit-db.js - Audit all Firestore collections for completeness
require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const REQUIRED_FIELDS = {
  users: ['uid','name','email','phone','role','dateOfBirth','age','isMinor','panHash','panMasked','aadhaarHash','aadhaarMasked','guardianPanHash','guardianPanMasked','idDocumentUrl','idVerificationStatus','createdAt'],
  events: ['title','category','date','time','location','price','totalSeats','availableSeats','status','imageUrl','description','createdAt'],
  bookings: ['userId','userPanHash','eventId','eventTitle','seats','passengers','totalAmount','status','paymentTxId','paymentMethod','qrCode','createdAt'],
  wallets: ['userId','balance','transactions'],
  auditLog: ['action','userId','details','timestamp'],
};

async function auditCollection(name, requiredFields) {
  const snap = await db.collection(name).get();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📂 Collection: ${name} (${snap.size} documents)`);
  console.log('═'.repeat(60));

  if (snap.size === 0) {
    console.log('  ⚠️  EMPTY — no documents found');
    return;
  }

  let allGood = true;
  snap.forEach(doc => {
    const data = doc.data();
    const docFields = Object.keys(data);
    const missing = requiredFields.filter(f => !(f in data));
    const hasValue = {};

    requiredFields.forEach(f => {
      const val = data[f];
      if (val === undefined || val === null) hasValue[f] = '❌ MISSING';
      else if (val === '') hasValue[f] = '⚪ empty string';
      else if (Array.isArray(val)) hasValue[f] = `✅ array[${val.length}]`;
      else if (typeof val === 'object') hasValue[f] = '✅ object';
      else if (typeof val === 'string' && val.length > 50) hasValue[f] = `✅ "${val.substring(0,30)}..."`;
      else hasValue[f] = `✅ ${JSON.stringify(val)}`;
    });

    if (missing.length > 0) allGood = false;
    const statusIcon = missing.length === 0 ? '✅' : '❌';

    console.log(`\n  ${statusIcon} Doc: ${doc.id}`);
    // Show key identity fields for users
    if (name === 'users') {
      console.log(`     name=${data.name || '?'}, role=${data.role || '?'}, email=${data.email || '?'}`);
    }
    if (name === 'events') {
      console.log(`     title=${data.title || '?'}, imageUrl=${data.imageUrl ? 'HAS IMAGE' : 'NO IMAGE'}`);
    }

    if (missing.length > 0) {
      console.log(`     🚨 Missing fields: ${missing.join(', ')}`);
    }

    // Show fields with their values
    for (const [field, status] of Object.entries(hasValue)) {
      if (status.startsWith('❌') || status.startsWith('⚪')) {
        console.log(`     ${field}: ${status}`);
      }
    }
  });

  if (allGood) console.log(`\n  🎉 All ${snap.size} documents have all required fields!`);
}

async function main() {
  console.log('\n🔍 APNATICKET Firebase Database Audit');
  console.log('Date:', new Date().toISOString());

  for (const [collection, fields] of Object.entries(REQUIRED_FIELDS)) {
    await auditCollection(collection, fields);
  }

  console.log('\n\n✅ Audit complete!\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
