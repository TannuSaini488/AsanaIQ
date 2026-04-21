const trainerRepository = require('../repositories/trainerRepository');
const AppError = require('../utils/appError');

async function listTrainers(filters = {}, { role } = {}) {
  if (role === 'trainer') {
    return trainerRepository.getAllStudents();
  }
  return trainerRepository.getAllTrainers(filters);
}

async function listAvailableSlots(trainerId) {
  return trainerRepository.getAvailableSlots(trainerId);
}

async function getMyTrainerProfile({ user }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['trainer', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  return trainerRepository.getTrainerById(user.uid);
}

async function upsertMyTrainerProfile({ user, payload }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['trainer', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  return trainerRepository.upsertTrainerProfile(user.uid, payload);
}

async function listMyAvailability({ user }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['trainer', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  return trainerRepository.listTrainerAvailability(user.uid, { includeBooked: true });
}

async function createMyAvailabilitySlot({ user, payload }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['trainer', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  return trainerRepository.createTrainerAvailabilitySlot(user.uid, payload);
}

async function deleteMyAvailabilitySlot({ user, slotId }) {
  const role = user?.role || user?.customClaims?.role;
  if (!['trainer', 'admin'].includes(role)) {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  return trainerRepository.deleteTrainerAvailabilitySlot(user.uid, slotId);
}

module.exports = {
  listTrainers,
  listAvailableSlots,
  getMyTrainerProfile,
  upsertMyTrainerProfile,
  listMyAvailability,
  createMyAvailabilitySlot,
  deleteMyAvailabilitySlot,
};
