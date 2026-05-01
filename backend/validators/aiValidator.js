const { z } = require('zod');

const idSchema = z.string().min(1).max(128);
const shortText = z.string().min(1).max(200);

const studentProfileSchema = z.object({
  id: idSchema.optional(),
  age: z.number().min(13).max(100).optional(),
  gender: shortText.optional(),
  injuries: z.array(shortText).max(20).optional(),
  medicalConditions: z.array(shortText).max(20).optional(),
  fitnessLevel: shortText.optional(),
  primaryGoal: shortText.optional(),
  preferredTrainerGender: shortText.optional(),
});

const trainerSchema = z.object({
  id: idSchema,
  experienceYears: z.number().min(0).max(80).optional(),
  specialization: z.array(shortText).max(20).optional(),
  languages: z.array(shortText).max(20).optional(),
  pricingPerSession: z.number().min(0).max(10000).optional(),
  ratingAverage: z.number().min(0).max(5).optional(),
  isAvailable: z.boolean().optional(),
});

const matchRequestSchema = z.object({
  student: studentProfileSchema,
  trainers: z.array(trainerSchema).min(1, 'At least one trainer is required').max(50, 'Too many trainers'),
}).strict();

const aiMatchResponseSchema = z.object({
  bestMatchTrainerId: idSchema,
  matchScore: z.number().min(0).max(1),
  reasoning: z.string().min(1).max(1000),
  alternatives: z.array(idSchema),
}).strict();

const aiPlanRequestSchema = z.object({
  studentProfile: studentProfileSchema,
}).strict();

const aiPlanResponseSchema = z.object({
  level: shortText,
  recommended_trainer_type: shortText,
  weekly_schedule: z.array(z.object({ day: shortText, focus: shortText }).strict()).max(14),
  precautions: z.array(shortText).max(20),
  estimated_progress: shortText,
  risk_flags: z.array(shortText).max(20),
}).strict();

const aiSummaryRequestSchema = z.object({
  sessionId: idSchema,
  trainerNotes: z.string().max(4000).optional(),
  chatTranscript: z.array(z.string().max(4000)).max(200).optional(),
}).strict();

const aiSummaryResponseSchema = z.object({
  session_summary: z.string().min(1).max(3000),
  posture_feedback: z.string().min(1).max(2000),
  improvement_areas: z.array(shortText).max(30),
  next_week_focus: z.array(shortText).max(30),
  motivational_note: z.string().min(1).max(1000),
}).strict();

const aiProgressRequestSchema = z.object({
  studentId: idSchema.optional(),
}).strict();

const aiProgressResponseSchema = z.object({
  progressScore: z.number().min(0).max(100),
  consistencyRate: z.number().min(0).max(100),
  strengthAreas: z.array(shortText).max(30),
  riskAreas: z.array(shortText).max(30),
  recommendation: z.string().min(1).max(2000),
}).strict();

const aiChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'ai']),
    content: z.string().min(1).max(4000)
  })).max(50).optional(),
}).strict();

const aiChatResponseSchema = z.object({
  reply: z.string().min(1).max(4000),
}).strict();

module.exports = {
  matchRequestSchema,
  aiMatchResponseSchema,
  aiPlanRequestSchema,
  aiPlanResponseSchema,
  aiSummaryRequestSchema,
  aiSummaryResponseSchema,
  aiProgressRequestSchema,
  aiProgressResponseSchema,
  aiChatRequestSchema,
  aiChatResponseSchema,
};
