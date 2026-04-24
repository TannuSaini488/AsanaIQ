const admin = require('../config/firebaseAdmin');
const firestore = require('../config/firestore');
const AppError = require('../utils/appError');

const REVIEWS_COLLECTION = 'reviews';
const TRAINERS_COLLECTION = 'trainerProfiles';

function toEpoch(dateValue) {
  if (!dateValue) return 0;
  if (dateValue instanceof Date) return dateValue.getTime();
  if (typeof dateValue.toDate === 'function') return dateValue.toDate().getTime();
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function sortByCreatedAtDesc(items) {
  return items.sort((a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt));
}

function isMissingIndexError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return err?.code === 9 || msg.includes('requires an index') || msg.includes('failed_precondition');
}

async function findBySessionId(sessionId) {
  const snap = await firestore
    .collection(REVIEWS_COLLECTION)
    .where('sessionId', '==', sessionId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function createReview({ sessionId, studentId, trainerId, rating, comment }) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const reviewRef = firestore.collection(REVIEWS_COLLECTION).doc();
  const trainerRef = firestore.collection(TRAINERS_COLLECTION).doc(trainerId);

  return firestore.runTransaction(async (tx) => {
    const duplicateSnap = await tx.get(
      firestore.collection(REVIEWS_COLLECTION).where('sessionId', '==', sessionId).limit(1),
    );
    if (!duplicateSnap.empty) {
      throw new AppError('REVIEW_ALREADY_EXISTS', {
        status: 409,
        code: 'REVIEW_ALREADY_EXISTS',
      });
    }

    const trainerSnap = await tx.get(trainerRef);
    if (!trainerSnap.exists) {
      throw new AppError('TRAINER_NOT_FOUND', { status: 404, code: 'TRAINER_NOT_FOUND' });
    }

    const trainer = trainerSnap.data();
    const currentCount = Number(trainer.totalReviews || 0);
    const currentAvg = Number(trainer.ratingAverage || 0);
    const nextCount = currentCount + 1;
    const nextAvg = ((currentAvg * currentCount) + rating) / nextCount;

    tx.set(reviewRef, {
      sessionId,
      studentId,
      trainerId,
      rating,
      comment,
      createdAt: now,
    });

    tx.set(
      trainerRef,
      {
        totalReviews: nextCount,
        ratingAverage: Number(nextAvg.toFixed(2)),
        updatedAt: now,
      },
      { merge: true },
    );

    return { reviewId: reviewRef.id };
  });
}

async function listByTrainerId(trainerId, { limit = 50 } = {}) {
  try {
    const snap = await firestore
      .collection(REVIEWS_COLLECTION)
      .where('trainerId', '==', trainerId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    if (!isMissingIndexError(err)) throw err;

    // Fallback: allow review pages to work before composite indexes are deployed.
    const fallbackLimit = Math.min(Math.max(limit, 200), 500);
    const snap = await firestore
      .collection(REVIEWS_COLLECTION)
      .where('trainerId', '==', trainerId)
      .limit(fallbackLimit)
      .get();
    return sortByCreatedAtDesc(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))).slice(0, limit);
  }
}

async function listByStudentId(studentId, { limit = 100 } = {}) {
  try {
    const snap = await firestore
      .collection(REVIEWS_COLLECTION)
      .where('studentId', '==', studentId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    if (!isMissingIndexError(err)) throw err;

    const fallbackLimit = Math.min(Math.max(limit, 200), 500);
    const snap = await firestore
      .collection(REVIEWS_COLLECTION)
      .where('studentId', '==', studentId)
      .limit(fallbackLimit)
      .get();
    return sortByCreatedAtDesc(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))).slice(0, limit);
  }
}

module.exports = {
  findBySessionId,
  createReview,
  listByTrainerId,
  listByStudentId,
};
