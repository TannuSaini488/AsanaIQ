const reviewService = require('../services/reviewService');
const { createReviewSchema, trainerIdParamsSchema, studentIdParamsSchema } = require('../validators/reviewValidator');

async function create(req, res, next) {
  try {
    const payload = createReviewSchema.parse(req.body);
    const review = await reviewService.createReview({ user: req.user, payload });
    res.success({ review }, 'Review created');
  } catch (err) {
    next(err);
  }
}

async function listByTrainer(req, res, next) {
  try {
    const { trainerId } = trainerIdParamsSchema.parse(req.params);
    const reviews = await reviewService.listTrainerReviews(trainerId);
    res.success({ reviews }, 'Reviews fetched');
  } catch (err) {
    next(err);
  }
}

async function listByStudent(req, res, next) {
  try {
    const { studentId } = studentIdParamsSchema.parse(req.params);
    const reviews = await reviewService.listStudentReviews(studentId);
    res.success({ reviews }, 'Reviews fetched');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  listByTrainer,
  listByStudent,
};

