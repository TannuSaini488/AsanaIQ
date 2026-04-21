const admin = require('./firebaseAdmin');
const { getFirestore } = require('firebase-admin/firestore');

// Shared Firestore instance
const databaseId = process.env.FIRESTORE_DATABASE_ID;
const firestore = databaseId
  ? getFirestore(admin.app(), databaseId)
  : getFirestore(admin.app());

module.exports = firestore;
