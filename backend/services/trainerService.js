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
  if (role !== 'trainer') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  const profile = await trainerRepository.getTrainerById(user.uid);
  const userRepository = require('../repositories/userRepository');
  const userData = await userRepository.getUserById(user.uid);
  return { ...profile, name: userData?.name || '' };
}

async function upsertMyTrainerProfile({ user, payload }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'trainer') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  const { name, ...profilePayload } = payload;
  if (name) {
    const userRepository = require('../repositories/userRepository');
    await userRepository.updateUser(user.uid, { name });
  }
  return trainerRepository.upsertTrainerProfile(user.uid, profilePayload);
}

async function listMyAvailability({ user }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'trainer') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  return trainerRepository.listTrainerAvailability(user.uid, { includeBooked: true });
}

async function createMyAvailabilitySlot({ user, payload }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'trainer') {
    throw new AppError('INVALID_ROLE', { status: 403, code: 'INVALID_ROLE' });
  }
  return trainerRepository.createTrainerAvailabilitySlot(user.uid, payload);
}

async function deleteMyAvailabilitySlot({ user, slotId }) {
  const role = user?.role || user?.customClaims?.role;
  if (role !== 'trainer') {
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
