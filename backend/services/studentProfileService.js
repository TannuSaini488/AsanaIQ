const AppError = require('../utils/appError');
const studentProfileRepository = require('../repositories/studentProfileRepository');

function assertStudent(user) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'student') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
}

async function getMyProfile({ user }) {
  assertStudent(user);
  return studentProfileRepository.getByUserId(user.uid);
}

async function upsertMyProfile({ user, payload }) {
  assertStudent(user);
  const { name, ...profilePayload } = payload;
  if (name) {
    const userRepository = require('../repositories/userRepository');
    await userRepository.updateUser(user.uid, { name });
  }
  return studentProfileRepository.upsertByUserId(user.uid, profilePayload);
}

module.exports = {
  getMyProfile,
  upsertMyProfile,
};
