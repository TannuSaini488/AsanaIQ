const sessionRepository = require('../repositories/sessionRepository');
const AppError = require('../utils/appError');

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
  if (!['student', 'trainer', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const actorId = user?.uid;
  const session = await sessionRepository.getSessionById(sessionId);
  if (!session) {
    throw new AppError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
  }

  const isParticipant = actorId === session.studentId || actorId === session.trainerId;
  if (!isParticipant && role !== 'admin') {
    throw new AppError('Not a participant of this session', {
      status: 403,
      code: 'SESSION_FORBIDDEN',
    });
  }

  return sessionRepository.transitionSessionState({ sessionId, action });
}

async function updateTrainerNotes({ sessionId, trainerNotes, user }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['trainer', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const session = await sessionRepository.getSessionById(sessionId);
  if (!session) {
    throw new AppError('Session not found', { status: 404, code: 'SESSION_NOT_FOUND' });
  }
  if (role !== 'admin' && session.trainerId !== user.uid) {
    throw new AppError('SESSION_FORBIDDEN', { status: 403, code: 'SESSION_FORBIDDEN' });
  }

  return sessionRepository.updateTrainerNotes({ sessionId, trainerNotes });
}

module.exports = { bookSession, validateSessionAccess, transitionSessionState, updateTrainerNotes };
