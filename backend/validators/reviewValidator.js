const { z } = require('zod');

const idSchema = z.string().min(1).max(128);

const createReviewSchema = z
  .object({
    sessionId: idSchema,
    rating: z.number().min(0).max(5),
    comment: z.string().trim().min(1).max(2000),
  })
  .strict();

const trainerIdParamsSchema = z
  .object({
    trainerId: idSchema,
  })
  .strict();

module.exports = {
  createReviewSchema,
  trainerIdParamsSchema,
};
