const AppError = require('../utils/appError');
const reviewRepository = require('../repositories/reviewRepository');
const sessionRepository = require('../repositories/sessionRepository');
const connectionRepository = require('../repositories/connectionRepository');
const userRepository = require('../repositories/userRepository');

async function createReview({ user, payload }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'student') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }

  const studentId = user.uid;
  let sessionId = payload.sessionId || null;

  if (!sessionId) {
    const trainerId = payload.trainerId;
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
    const candidate = (sessions || []).find(
      (session) =>
        session.status === 'completed' &&
        session.trainerId === trainerId &&
        !reviewedSessionIds.has(String(session.id)),
    );

    if (!candidate) {
      throw new AppError('No completed sessions available for review', {
        status: 404,
        code: 'NO_REVIEWABLE_SESSION',
      });
    }

    sessionId = candidate.id;
  }

  const session = await sessionRepository.getSessionById(sessionId);
  if (!session) {
    throw new AppError('SESSION_NOT_FOUND', { status: 404, code: 'SESSION_NOT_FOUND' });
  }
  if (session.studentId !== studentId) {
    throw new AppError('SESSION_FORBIDDEN', { status: 403, code: 'SESSION_FORBIDDEN' });
  }
  if (session.status !== 'completed') {
    throw new AppError('SESSION_NOT_COMPLETED', { status: 400, code: 'SESSION_NOT_COMPLETED' });
  }

  await reviewRepository.createReview({
    sessionId,
    studentId,
    trainerId: session.trainerId,
    rating: payload.rating,
    comment: payload.comment,
  });

  return {
    sessionId,
    trainerId: session.trainerId,
    rating: payload.rating,
  };
}

async function listTrainerReviews(trainerId) {
  const reviews = await reviewRepository.listByTrainerId(trainerId);
  const studentIds = [...new Set(reviews.map((r) => r.studentId).filter(Boolean))];

  const studentNames = {};
  await Promise.all(
    studentIds.map(async (id) => {
      try {
        const user = await userRepository.getUserById(id);
        if (user) studentNames[id] = user.name || 'Student';
      } catch (err) {
        // ignore
      }
    })
  );

  return reviews.map((r) => ({
    ...r,
    studentName: studentNames[r.studentId] || 'Unknown Student',
  }));
}

async function listStudentReviews(studentId) {
  const reviews = await reviewRepository.listByStudentId(studentId);
  const trainerIds = [...new Set(reviews.map((r) => r.trainerId).filter(Boolean))];

  const trainerNames = {};
  await Promise.all(
    trainerIds.map(async (id) => {
      try {
        const user = await userRepository.getUserById(id);
        if (user) trainerNames[id] = user.name || 'Trainer';
      } catch (err) {
        // ignore
      }
    })
  );

  return reviews.map((r) => ({
    ...r,
    trainerName: trainerNames[r.trainerId] || 'Unknown Trainer',
  }));
}

module.exports = {
  createReview,
  listTrainerReviews,
  listStudentReviews,
};

