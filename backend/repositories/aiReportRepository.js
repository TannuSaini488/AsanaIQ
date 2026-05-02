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

async function getBySessionId(sessionId, type = 'summary') {
  try {
    const snap = await firestore
      .collection(COLLECTION)
      .where('sessionId', '==', sessionId)
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    const msg = String(err?.message || '').toLowerCase();
    if (err?.code === 9 || msg.includes('requires an index') || msg.includes('failed_precondition')) {
      const snap = await firestore
        .collection(COLLECTION)
        .where('sessionId', '==', sessionId)
        .where('type', '==', type)
        .get();
      if (snap.empty) return null;
      
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
      return docs[0];
    }
    throw err;
  }
}

module.exports = {
  createReport,
  getBySessionId,
};
