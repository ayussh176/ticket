// scripts/seed.js - Seed Firestore with initial data
// Run: node scripts/seed.js

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const { mockEvents, mockAuditLog } = require('../data/mockData');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath || serviceAccountPath === 'mock') {
  console.log('Cannot seed - Firebase must be configured (not mock mode)');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function seedDatabase() {
  console.log('🌱 Seeding Firestore database...\n');

  // 1. Create admin user
  console.log('--- Creating admin user ---');
  try {
    let adminUser;
    try {
      adminUser = await auth.getUserByEmail('admin@apnaticket.com');
      console.log('  Admin user already exists:', adminUser.uid);
    } catch (e) {
      adminUser = await auth.createUser({
        email: 'admin@apnaticket.com',
        password: 'Admin@12345',
        displayName: 'Admin User',
      });
      console.log('  ✅ Admin user created:', adminUser.uid);
    }

    await db.collection('users').doc(adminUser.uid).set({
      uid: adminUser.uid,
      name: 'Admin User',
      email: 'admin@apnaticket.com',
      phone: '+919999900000',
      role: 'admin',
      panHash: 'ADMIN0000A',
      createdAt: new Date().toISOString(),
    }, { merge: true });
    console.log('  ✅ Admin Firestore profile set (role: admin)');

    // Create wallet for admin
    await db.collection('wallets').doc(adminUser.uid).set({
      userId: adminUser.uid,
      balance: 0,
      transactions: [],
    }, { merge: true });
  } catch (err) {
    console.error('  ❌ Admin user error:', err.message);
  }

  // 2. Create demo user
  console.log('\n--- Creating demo user ---');
  try {
    let demoUser;
    try {
      demoUser = await auth.getUserByEmail('john@example.com');
      console.log('  Demo user already exists:', demoUser.uid);
    } catch (e) {
      demoUser = await auth.createUser({
        email: 'john@example.com',
        password: 'Test@12345',
        displayName: 'John Doe',
      });
      console.log('  ✅ Demo user created:', demoUser.uid);
    }

    await db.collection('users').doc(demoUser.uid).set({
      uid: demoUser.uid,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+919876543210',
      role: 'user',
      panHash: 'ABCDE1234F',
      createdAt: new Date().toISOString(),
    }, { merge: true });
    console.log('  ✅ Demo user Firestore profile set');

    // Create wallet with initial balance
    await db.collection('wallets').doc(demoUser.uid).set({
      userId: demoUser.uid,
      balance: 10000,
      transactions: [
        { type: 'topup', amount: 10000, ref: 'INITIAL_SEED', timestamp: new Date().toISOString() },
      ],
    }, { merge: true });
    console.log('  ✅ Demo user wallet set (₹10,000 e-INR)');
  } catch (err) {
    console.error('  ❌ Demo user error:', err.message);
  }

  // 3. Seed events
  console.log('\n--- Seeding events ---');
  for (const event of mockEvents) {
    try {
      const docRef = db.collection('events').doc(event.id);
      await docRef.set({
        ...event,
        createdAt: new Date().toISOString(),
        createdBy: 'seed_script',
      });
      console.log(`  ✅ Event: ${event.title}`);
    } catch (err) {
      console.error(`  ❌ Event ${event.title}:`, err.message);
    }
  }

  // 4. Seed audit log
  console.log('\n--- Seeding audit log ---');
  for (const log of mockAuditLog) {
    try {
      await db.collection('auditLog').add(log);
      console.log(`  ✅ Log: ${log.action} - ${log.details}`);
    } catch (err) {
      console.error(`  ❌ Log:`, err.message);
    }
  }

  console.log('\n🎉 Database seeding complete!\n');
  console.log('Demo credentials:');
  console.log('  User:  john@example.com / Test@12345');
  console.log('  Admin: admin@apnaticket.com / Admin@12345');
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
