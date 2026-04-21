const { z } = require('zod');

const idSchema = z.string().min(1).max(128);

const bookSessionSchema = z.object({
  trainerId: idSchema,
  slotId: idSchema,
}).strict();

const sessionIdParamsSchema = z.object({
  id: idSchema,
}).strict();

const sessionStateActionSchema = z.object({
  action: z.enum(['confirm', 'start', 'complete', 'cancel']),
}).strict();

const trainerNotesSchema = z.object({
  trainerNotes: z.string().trim().min(1).max(4000),
}).strict();

module.exports = {
  bookSessionSchema,
  sessionIdParamsSchema,
  sessionStateActionSchema,
  trainerNotesSchema,
};
