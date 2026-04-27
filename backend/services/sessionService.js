const sessionRepository = require('../repositories/sessionRepository');
const AppError = require('../utils/appError');
const connectionRepository = require('../repositories/connectionRepository');
const reviewRepository = require('../repositories/reviewRepository');

async function bookSession({ user, trainerId, slotId }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'student') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const studentId = user.uid;
  return sessionRepository.bookSession({ studentId, trainerId, slotId });
}

async function validateSessionAccess({ sessionId, userId }) {
  const session = await sessionRepository.getSessionById(sessionId);
  if (!session) {
    throw new AppError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
  }

  const allowedStatuses = ['confirmed', 'in_progress'];
  if (!allowedStatuses.includes(session.status)) {
    throw new AppError('Session not active for calling', {
      status: 403,
      code: 'SESSION_NOT_CALLABLE',
    });
  }

  if (session.studentId !== userId && session.trainerId !== userId) {
    throw new AppError('Not a participant of this session', {
      status: 403,
      code: 'SESSION_FORBIDDEN',
    });
  }

  return session;
}

async function transitionSessionState({ sessionId, action, user }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['student', 'trainer'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const actorId = user?.uid;
  const session = await sessionRepository.getSessionById(sessionId);
  if (!session) {
    throw new AppError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
  }

  const isParticipant = actorId === session.studentId || actorId === session.trainerId;
  if (!isParticipant) {
    throw new AppError('Not a participant of this session', {
      status: 403,
      code: 'SESSION_FORBIDDEN',
    });
  }

  return sessionRepository.transitionSessionState({ sessionId, action });
}

async function updateTrainerNotes({ sessionId, trainerNotes, user }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'trainer') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const session = await sessionRepository.getSessionById(sessionId);
  if (!session) {
    throw new AppError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
  }
  if (session.trainerId !== user.uid) {
    throw new AppError('SESSION_FORBIDDEN', { status: 403, code: 'SESSION_FORBIDDEN' });
  }

  return sessionRepository.updateTrainerNotes({ sessionId, trainerNotes });
}

async function listReviewableSessions({ user, trainerId, limit = 100 }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'student') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const studentId = user.uid;

  const connection = await connectionRepository.getConnectionByStudentAndTrainer({ studentId, trainerId });
  if (!connection || connection.status !== 'accepted') {
    throw new AppError('Connection not accepted', {
      status: 403,
      code: 'CONNECTION_REQUIRED',
    });
  }

  const [sessions, reviews] = await Promise.all([
    sessionRepository.listSessionsByStudentId(studentId, { limit: 200 }),
    reviewRepository.listByStudentId(studentId, { limit: 200 }),
  ]);

  const reviewedSessionIds = new Set(reviews.map((review) => String(review.sessionId)));
  const candidates = sessions
    .filter((session) => session.status === 'completed' && session.trainerId === trainerId)
    .filter((session) => !reviewedSessionIds.has(String(session.id)));

  return candidates.slice(0, limit);
}

async function getCallableSession({ user, peerId }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['student', 'trainer'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const userId = user.uid;
  const statuses = new Set(['confirmed', 'in_progress']);

  const [asStudent, asTrainer] = await Promise.all([
    sessionRepository.listSessionsByStudentId(userId, { limit: 200 }),
    sessionRepository.listSessionsByTrainerId(userId, { limit: 200 }),
  ]);

  const sessionsById = new Map();
  (asStudent || []).forEach((s) => sessionsById.set(String(s.id), s));
  (asTrainer || []).forEach((s) => sessionsById.set(String(s.id), s));

  const match = Array.from(sessionsById.values()).find((session) => {
    if (!statuses.has(session.status)) return false;
    return (
      (session.studentId === userId && session.trainerId === peerId) ||
      (session.trainerId === userId && session.studentId === peerId)
    );
  });

  return match ? { sessionId: match.id, status: match.status } : null;
}

async function listMySessions({ user, limit = 50 }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['student', 'trainer'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const userId = user.uid;
  const sessions =
    role === 'student'
      ? await sessionRepository.listSessionsByStudentId(userId, { limit: safeLimit })
      : await sessionRepository.listSessionsByTrainerId(userId, { limit: safeLimit });
  return sessions || [];
}

module.exports = {
  bookSession,
  validateSessionAccess,
  transitionSessionState,
  updateTrainerNotes,
  listReviewableSessions,
  getCallableSession,
  listMySessions,
};
