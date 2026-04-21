const admin = require('../config/firebaseAdmin');
const firestore = require('../config/firestore');

const COLLECTION = 'aiReports';

async function createReport({ userId, sessionId = null, type, inputSnapshot, generatedContent, confidenceScore, modelVersion }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = firestore.collection(COLLECTION).doc();
  await ref.set({
    userId,
    sessionId,
    type,
    inputSnapshot,
    generatedContent,
    confidenceScore,
    modelVersion,
    createdAt: now,
  });
  return { reportId: ref.id };
}

module.exports = {
  createReport,
};
