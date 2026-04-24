const admin = require('../config/firebaseAdmin');
const firestore = require('../config/firestore');

const USERS_COLLECTION = 'users';

/**
 * Creates a user document in Firestore.
 * @param {string} userId - Firestore document id (typically Firebase Auth uid).
 * @param {Object} payload - User fields matching the schema.
 */
async function createUser(userId, payload) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const docRef = firestore.collection(USERS_COLLECTION).doc(userId);

  await docRef.set({
    role: payload.role,
    name: payload.name,
    email: payload.email,
    phone: payload.phone || null,
    profileImageUrl: payload.profileImageUrl || null,
    status: payload.status || 'active',
    createdAt: now,
    updatedAt: now,
  });

  const saved = await docRef.get();
  return { id: saved.id, ...saved.data() };
}

/**
 * Retrieves a user document by id.
 * @param {string} userId
 */
async function getUserById(userId) {
  const doc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Updates a user document in Firestore.
 * @param {string} userId
 * @param {Object} updates
 */
async function updateUser(userId, updates) {
  const docRef = firestore.collection(USERS_COLLECTION).doc(userId);
  await docRef.update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const updated = await docRef.get();
  return { id: updated.id, ...updated.data() };
}

module.exports = { createUser, getUserById, updateUser };
