const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['student', 'trainer']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z
  .object({
    refreshToken: z.string().trim().min(1),
  })
  .strict();

module.exports = { registerSchema, loginSchema, refreshSchema };
