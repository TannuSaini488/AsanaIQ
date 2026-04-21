const firestore = require('../config/firestore');
const admin = require('../config/firebaseAdmin');
const AppError = require('../utils/appError');

const TRAINER_PROFILES_COLLECTION = 'trainerProfiles';
const AVAILABILITY_SUBCOLLECTION = 'availability';
const USERS_COLLECTION = 'users';
const STUDENT_PROFILES_COLLECTION = 'studentProfiles';

function toMinutes(timeStr) {
  const [h, m] = String(timeStr || '')
    .split(':')
    .map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function normalizeDayStart(dateStr) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function toEpoch(dateValue) {
  if (!dateValue) return 0;
  if (dateValue instanceof Date) return dateValue.getTime();
  if (typeof dateValue.toDate === 'function') return dateValue.toDate().getTime();
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

async function getAllTrainers({ specialization, minPrice, maxPrice, rating } = {}) {
  let ref = firestore.collection(TRAINER_PROFILES_COLLECTION);

  if (specialization) {
    ref = ref.where('specialization', 'array-contains', specialization);
  }
  if (typeof minPrice === 'number') {
    ref = ref.where('pricingPerSession', '>=', minPrice);
  }
  if (typeof maxPrice === 'number') {
    ref = ref.where('pricingPerSession', '<=', maxPrice);
  }
  if (typeof rating === 'number') {
    ref = ref.where('ratingAverage', '>=', rating);
  }

  const hasProfileFilters =
    Boolean(specialization) ||
    typeof minPrice === 'number' ||
    typeof maxPrice === 'number' ||
    typeof rating === 'number';

  const profileSnap = await ref.get();
  const profileById = new Map(profileSnap.docs.map((doc) => [doc.id, doc.data()]));

  // Keep trainer discovery usable even when trainerProfiles is not yet created.
  const usersSnap = await firestore.collection(USERS_COLLECTION).where('role', '==', 'trainer').get();
  const trainers = [];
  const seen = new Set();

  usersSnap.docs.forEach((doc) => {
    const userId = doc.id;
    const userData = doc.data() || {};
    if (userData.status === 'suspended') return;

    const profileData = profileById.get(userId);
    if (hasProfileFilters && !profileData) return;

    trainers.push({
      id: userId,
      name: userData.name || '',
      email: userData.email || '',
      profileImageUrl: userData.profileImageUrl || '',
      ...(profileData || {}),
    });
    seen.add(userId);
  });

  // Preserve legacy profiles if user doc is missing.
  profileById.forEach((profileData, userId) => {
    if (seen.has(userId)) return;
    trainers.push({ id: userId, ...profileData });
  });

  return trainers;
}

async function getAllStudents() {
  const usersSnap = await firestore.collection(USERS_COLLECTION).where('role', '==', 'student').get();
  const profileSnap = await firestore.collection(STUDENT_PROFILES_COLLECTION).get();
  const profileById = new Map(profileSnap.docs.map((doc) => [doc.id, doc.data()]));

  return usersSnap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
    .filter((student) => student.status !== 'suspended')
    .map((student) => ({
      id: student.id,
      name: student.name || '',
      email: student.email || '',
      profileImageUrl: student.profileImageUrl || '',
      ...(profileById.get(student.id) || {}),
    }));
}

async function getAvailableSlots(trainerId) {
  if (!trainerId) {
    throw new AppError('trainerId required', { status: 400, code: 'TRAINER_ID_REQUIRED' });
  }
  const ref = firestore
    .collection(TRAINER_PROFILES_COLLECTION)
    .doc(trainerId)
    .collection(AVAILABILITY_SUBCOLLECTION)
    .where('isBooked', '==', false);

  const snap = await ref.get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aDate = toEpoch(a.date);
      const bDate = toEpoch(b.date);
      if (aDate !== bDate) return aDate - bDate;
      return toMinutes(a.startTime) - toMinutes(b.startTime);
    });
}

async function listTrainerAvailability(trainerId, { includeBooked = true } = {}) {
  if (!trainerId) {
    throw new AppError('trainerId required', { status: 400, code: 'TRAINER_ID_REQUIRED' });
  }

  let ref = firestore
    .collection(TRAINER_PROFILES_COLLECTION)
    .doc(trainerId)
    .collection(AVAILABILITY_SUBCOLLECTION);
  if (!includeBooked) {
    ref = ref.where('isBooked', '==', false);
  }
  const snap = await ref.get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aDate = toEpoch(a.date);
      const bDate = toEpoch(b.date);
      if (aDate !== bDate) return aDate - bDate;
      return toMinutes(a.startTime) - toMinutes(b.startTime);
    });
}

async function createTrainerAvailabilitySlot(trainerId, { date, startTime, endTime }) {
  if (!trainerId) {
    throw new AppError('trainerId required', { status: 400, code: 'TRAINER_ID_REQUIRED' });
  }

  const dayStart = normalizeDayStart(date);
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);

  const daySlotsSnap = await firestore
    .collection(TRAINER_PROFILES_COLLECTION)
    .doc(trainerId)
    .collection(AVAILABILITY_SUBCOLLECTION)
    .where('date', '==', dayStart)
    .get();

  const hasConflict = daySlotsSnap.docs.some((doc) => {
    const slot = doc.data() || {};
    const slotStart = toMinutes(slot.startTime);
    const slotEnd = toMinutes(slot.endTime);
    return overlaps(newStart, newEnd, slotStart, slotEnd);
  });

  if (hasConflict) {
    throw new AppError('SLOT_OVERLAP', { status: 400, code: 'SLOT_OVERLAP' });
  }

  const ref = firestore
    .collection(TRAINER_PROFILES_COLLECTION)
    .doc(trainerId)
    .collection(AVAILABILITY_SUBCOLLECTION)
    .doc();

  await ref.set({
    date: dayStart,
    startTime,
    endTime,
    isBooked: false,
  });

  const saved = await ref.get();
  return { id: saved.id, ...saved.data() };
}

async function deleteTrainerAvailabilitySlot(trainerId, slotId) {
  if (!trainerId || !slotId) {
    throw new AppError('trainerId and slotId required', { status: 400, code: 'INVALID_SLOT_IDENTIFIER' });
  }

  const ref = firestore
    .collection(TRAINER_PROFILES_COLLECTION)
    .doc(trainerId)
    .collection(AVAILABILITY_SUBCOLLECTION)
    .doc(slotId);

  const existing = await ref.get();
  if (!existing.exists) {
    throw new AppError('SLOT_NOT_FOUND', { status: 404, code: 'SLOT_NOT_FOUND' });
  }
  const data = existing.data() || {};
  if (data.isBooked) {
    throw new AppError('SLOT_ALREADY_BOOKED', { status: 400, code: 'SLOT_ALREADY_BOOKED' });
  }

  await ref.delete();
  return { slotId };
}

async function getTrainerById(trainerId) {
  const doc = await firestore.collection(TRAINER_PROFILES_COLLECTION).doc(trainerId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function upsertTrainerProfile(trainerId, payload) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = firestore.collection(TRAINER_PROFILES_COLLECTION).doc(trainerId);
  const existing = await ref.get();

  const data = {
    experienceYears: payload.experienceYears,
    specialization: payload.specialization,
    certifications: payload.certifications,
    languages: payload.languages,
    pricingPerSession: payload.pricingPerSession,
    ratingAverage: typeof payload.ratingAverage === 'number' ? payload.ratingAverage : 0,
    totalReviews: typeof payload.totalReviews === 'number' ? payload.totalReviews : 0,
    totalSessionsCompleted:
      typeof payload.totalSessionsCompleted === 'number' ? payload.totalSessionsCompleted : 0,
    bio: payload.bio,
    isAvailable: payload.isAvailable,
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
  getAllTrainers,
  getAllStudents,
  getAvailableSlots,
  listTrainerAvailability,
  createTrainerAvailabilitySlot,
  deleteTrainerAvailabilitySlot,
  getTrainerById,
  upsertTrainerProfile,
};
