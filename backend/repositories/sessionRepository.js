const admin = require('../config/firebaseAdmin');
const firestore = require('../config/firestore');
const AppError = require('../utils/appError');

const SESSIONS_COLLECTION = 'sessions';
const TRAINER_PROFILES_COLLECTION = 'trainerProfiles';
const AVAILABILITY_SUBCOLLECTION = 'availability';
const SESSION_TRANSITIONS = {
  confirm: { from: ['pending'], to: 'confirmed' },
  start: { from: ['confirmed'], to: 'in_progress' },
  complete: { from: ['in_progress'], to: 'completed' },
  cancel: { from: ['pending', 'confirmed'], to: 'cancelled' },
};

function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function withTime(baseValue, timeStr) {
  const baseDate = toDateValue(baseValue);
  if (!baseDate || !timeStr || typeof timeStr !== 'string') return baseDate;
  const [rawHour, rawMinute] = timeStr.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return baseDate;
  const merged = new Date(baseDate);
  merged.setHours(hour, minute, 0, 0);
  return merged;
}

async function getSessionById(sessionId) {
  const doc = await firestore.collection(SESSIONS_COLLECTION).doc(sessionId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function listSessionsByStudentId(studentId, { limit = 100 } = {}) {
  const snap = await firestore
    .collection(SESSIONS_COLLECTION)
    .where('studentId', '==', studentId)
    .orderBy('scheduledStart', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Book a session by marking a trainer's availability slot as booked
 * and creating a session document atomically.
 */
async function bookSession({ studentId, trainerId, slotId }) {
  const now = admin.firestore.FieldValue.serverTimestamp();

  return firestore.runTransaction(async (tx) => {
    const slotRef = firestore
      .collection(TRAINER_PROFILES_COLLECTION)
      .doc(trainerId)
      .collection(AVAILABILITY_SUBCOLLECTION)
      .doc(slotId);

    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists) {
      throw new AppError('Slot not found', { status: 404, code: 'SLOT_NOT_FOUND' });
    }

    const slot = slotSnap.data();
    if (slot.isBooked) {
      throw new AppError('SLOT_ALREADY_BOOKED', { status: 400, code: 'SLOT_ALREADY_BOOKED' });
    }

    const scheduledStart = withTime(slot.date, slot.startTime);
    const scheduledEnd = withTime(slot.date, slot.endTime) || scheduledStart;
    const sessionRef = firestore.collection(SESSIONS_COLLECTION).doc();

    tx.set(sessionRef, {
      studentId,
      trainerId,
      scheduledStart,
      scheduledEnd,
      status: 'confirmed',
      videoRoomId: null,
      aiSummaryId: null,
      trainerNotes: '',
      createdAt: now,
      updatedAt: now,
    });

    tx.update(slotRef, { isBooked: true });

    return { sessionId: sessionRef.id, status: 'confirmed' };
  });
}

async function transitionSessionState({ sessionId, action }) {
  const rule = SESSION_TRANSITIONS[action];
  if (!rule) {
    throw new AppError('INVALID_SESSION_STATE', { status: 400, code: 'INVALID_SESSION_STATE' });
  }

  const sessionRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists) {
      throw new AppError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
    }

    const session = snap.data();
    const current = session.status;
    const nextStatus = rule.to;

    // Idempotent behavior for repeated calls with same action/session.
    if (current === nextStatus) {
      return { sessionId, status: current };
    }
    if (!rule.from.includes(current)) {
      throw new AppError('INVALID_SESSION_STATE', { status: 400, code: 'INVALID_SESSION_STATE' });
    }

    tx.update(sessionRef, {
      status: nextStatus,
      updatedAt: now,
    });

    return { sessionId, status: nextStatus };
  });
}

async function updateTrainerNotes({ sessionId, trainerNotes }) {
  const sessionRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await sessionRef.set(
    {
      trainerNotes,
      updatedAt: now,
    },
    { merge: true },
  );
  const saved = await sessionRef.get();
  if (!saved.exists) return null;
  return { id: saved.id, ...saved.data() };
}

async function updateAiSummaryId({ sessionId, aiSummaryId }) {
  const sessionRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await sessionRef.set(
    {
      aiSummaryId,
      updatedAt: now,
    },
    { merge: true },
  );
}

module.exports = {
  bookSession,
  getSessionById,
  listSessionsByStudentId,
  transitionSessionState,
  updateTrainerNotes,
  updateAiSummaryId,
};
