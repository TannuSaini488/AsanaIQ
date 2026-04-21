const { z } = require('zod');

const genderSchema = z.string().trim().min(1).max(50);
const smallText = z.string().trim().min(1).max(200);

const studentProfileUpsertSchema = z
  .object({
    age: z.number().int().min(13).max(100),
    gender: genderSchema,
    weight: z.number().positive().max(500),
    height: z.number().positive().max(300),
    injuries: z.array(smallText).max(30),
    medicalConditions: z.array(smallText).max(30),
    fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    primaryGoal: smallText,
    preferredTrainerGender: z.string().trim().min(1).max(50),
    onboardingCompleted: z.boolean().default(true),
  })
  .strict();

module.exports = {
  studentProfileUpsertSchema,
};
