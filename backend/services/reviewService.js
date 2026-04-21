const AppError = require('../utils/appError');
const reviewRepository = require('../repositories/reviewRepository');
const sessionRepository = require('../repositories/sessionRepository');

async function createReview({ user, payload }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'student') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const session = await sessionRepository.getSessionById(payload.sessionId);
  if (!session) {
    throw new AppError('SESSION_NOT_FOUND', { status: 404, code: 'SESSION_NOT_FOUND' });
  }
  if (session.studentId !== user.uid) {
    throw new AppError('SESSION_FORBIDDEN', { status: 403, code: 'SESSION_FORBIDDEN' });
  }
  if (session.status !== 'completed') {
    throw new AppError('SESSION_NOT_COMPLETED', { status: 400, code: 'SESSION_NOT_COMPLETED' });
  }

  await reviewRepository.createReview({
    sessionId: payload.sessionId,
    studentId: user.uid,
    trainerId: session.trainerId,
    rating: payload.rating,
    comment: payload.comment,
  });

  return {
    sessionId: payload.sessionId,
    trainerId: session.trainerId,
    rating: payload.rating,
  };
}

async function listTrainerReviews(trainerId) {
  return reviewRepository.listByTrainerId(trainerId);
}

module.exports = {
  createReview,
  listTrainerReviews,
};
