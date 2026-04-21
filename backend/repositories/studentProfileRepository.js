const admin = require('../config/firebaseAdmin');
const firestore = require('../config/firestore');

const COLLECTION = 'studentProfiles';

async function getByUserId(userId) {
  const doc = await firestore.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function upsertByUserId(userId, payload) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = firestore.collection(COLLECTION).doc(userId);
  const existing = await ref.get();

  const data = {
    age: payload.age,
    gender: payload.gender,
    weight: payload.weight,
    height: payload.height,
    injuries: payload.injuries,
    medicalConditions: payload.medicalConditions,
    fitnessLevel: payload.fitnessLevel,
    primaryGoal: payload.primaryGoal,
    preferredTrainerGender: payload.preferredTrainerGender,
    onboardingCompleted: payload.onboardingCompleted,
    updatedAt: now,
  };

  if (!existing.exists) {
    data.createdAt = now;
  }

  await ref.set(data, { merge: true });
  const saved = await ref.get();
  return { id: saved.id, ...saved.data() };
}

module.exports = {
  getByUserId,
  upsertByUserId,
};
