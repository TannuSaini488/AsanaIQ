const AppError = require('../utils/appError');
const studentProfileRepository = require('../repositories/studentProfileRepository');

function assertStudentOrAdmin(user) {
  const role = user?.role || user?.customClaims?.role;
  if (!['student', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
}

async function getMyProfile({ user }) {
  assertStudentOrAdmin(user);
  return studentProfileRepository.getByUserId(user.uid);
}

async function upsertMyProfile({ user, payload }) {
  assertStudentOrAdmin(user);
  return studentProfileRepository.upsertByUserId(user.uid, payload);
}

module.exports = {
  getMyProfile,
  upsertMyProfile,
};
