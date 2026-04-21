const trainerService = require('../services/trainerService');
const {
  trainerQuerySchema,
  trainerProfileUpsertSchema,
  trainerAvailabilityCreateSchema,
  trainerAvailabilitySlotParamsSchema,
} = require('../validators/trainerValidator');

async function getAll(req, res, next) {
  try {
    const filters = trainerQuerySchema.parse(req.query || {});
    const trainers = await trainerService.listTrainers(filters, { role: req.user?.role });
    res.success({ trainers }, 'Trainers fetched');
  } catch (err) {
    next(err);
  }
}

async function getAvailability(req, res, next) {
  try {
    const { trainerId } = req.params;
    const slots = await trainerService.listAvailableSlots(trainerId);
    res.success({ slots }, 'Availability fetched');
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const profile = await trainerService.getMyTrainerProfile({ user: req.user });
    res.success({ profile }, 'Trainer profile fetched');
  } catch (err) {
    next(err);
  }
}

async function upsertMine(req, res, next) {
  try {
    const payload = trainerProfileUpsertSchema.parse(req.body);
    const profile = await trainerService.upsertMyTrainerProfile({
      user: req.user,
      payload,
    });
    res.success({ profile }, 'Trainer profile saved');
  } catch (err) {
    next(err);
  }
}

async function getMyAvailability(req, res, next) {
  try {
    const slots = await trainerService.listMyAvailability({ user: req.user });
    res.success({ slots }, 'Trainer availability fetched');
  } catch (err) {
    next(err);
  }
}

async function createMyAvailability(req, res, next) {
  try {
    const payload = trainerAvailabilityCreateSchema.parse(req.body);
    const slot = await trainerService.createMyAvailabilitySlot({ user: req.user, payload });
    res.success({ slot }, 'Availability slot created');
  } catch (err) {
    next(err);
  }
}

async function deleteMyAvailability(req, res, next) {
  try {
    const { slotId } = trainerAvailabilitySlotParamsSchema.parse(req.params);
    const result = await trainerService.deleteMyAvailabilitySlot({ user: req.user, slotId });
    res.success(result, 'Availability slot deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getAvailability,
  getMine,
  upsertMine,
  getMyAvailability,
  createMyAvailability,
  deleteMyAvailability,
};
