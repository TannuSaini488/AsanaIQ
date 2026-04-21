const { z } = require('zod');

const trainerQuerySchema = z
  .object({
    specialization: z.string().trim().min(1).max(100).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
  })
  .refine(
    (payload) => payload.minPrice === undefined || payload.maxPrice === undefined || payload.minPrice <= payload.maxPrice,
    {
      message: 'minPrice cannot be greater than maxPrice',
      path: ['minPrice'],
    },
  );

const trainerProfileUpsertSchema = z
  .object({
    experienceYears: z.number().min(0).max(80),
    specialization: z.array(z.string().trim().min(1).max(100)).max(20),
    certifications: z.array(z.string().trim().min(1).max(200)).max(30),
    languages: z.array(z.string().trim().min(1).max(100)).max(20),
    pricingPerSession: z.number().min(0).max(10000),
    ratingAverage: z.number().min(0).max(5).optional(),
    totalReviews: z.number().int().min(0).optional(),
    totalSessionsCompleted: z.number().int().min(0).optional(),
    isAvailable: z.boolean(),
    bio: z.string().trim().min(1).max(3000),
  })
  .strict();

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const trainerAvailabilityCreateSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    startTime: z.string().regex(timePattern, 'startTime must be HH:mm'),
    endTime: z.string().regex(timePattern, 'endTime must be HH:mm'),
  })
  .strict()
  .refine(
    (payload) => {
      const [startH, startM] = payload.startTime.split(':').map(Number);
      const [endH, endM] = payload.endTime.split(':').map(Number);
      return endH * 60 + endM > startH * 60 + startM;
    },
    { message: 'endTime must be after startTime', path: ['endTime'] },
  );

const trainerAvailabilitySlotParamsSchema = z
  .object({
    slotId: z.string().trim().min(1).max(128),
  })
  .strict();

module.exports = {
  trainerQuerySchema,
  trainerProfileUpsertSchema,
  trainerAvailabilityCreateSchema,
  trainerAvailabilitySlotParamsSchema,
};
