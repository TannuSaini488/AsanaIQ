const { z } = require('zod');

const idSchema = z.string().min(1).max(128);

const chatIdParamsSchema = z.object({
  chatId: idSchema,
}).strict();

const listMessagesQuerySchema = z.object({
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();

const createMessageSchema = z.object({
  messageType: z.enum(['text', 'ai', 'system', 'slot_proposal', 'slot_accepted']).default('text'),
  content: z.string().trim().min(1).max(5000),
}).strict();

module.exports = {
  chatIdParamsSchema,
  listMessagesQuerySchema,
  createMessageSchema,
};
