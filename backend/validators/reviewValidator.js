const { z } = require('zod');

const idSchema = z.string().min(1).max(128);

const ratingSchema = z.number().min(0).max(5);
const commentSchema = z.string().trim().min(1).max(2000);

const createReviewSchema = z.union([
  z
    .object({
      sessionId: idSchema,
      rating: ratingSchema,
      comment: commentSchema,
    })
    .strict(),
  z
    .object({
      trainerId: idSchema,
      rating: ratingSchema,
      comment: commentSchema,
    })
    .strict(),
]);

const trainerIdParamsSchema = z
  .object({
    trainerId: idSchema,
  })
  .strict();

const studentIdParamsSchema = z
  .object({
    studentId: idSchema,
  })
  .strict();

module.exports = {
  createReviewSchema,
  trainerIdParamsSchema,
  studentIdParamsSchema,
};
