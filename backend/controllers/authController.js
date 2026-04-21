const authService = require('../services/authService');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/authValidator');
const config = require('../config');

async function register(req, res, next) {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await authService.register(payload, { apiKey: config.firebaseWebApiKey });
    res.success(result, 'Registered successfully');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await authService.login(payload, { apiKey: config.firebaseWebApiKey });
    res.success(result, 'Logged in successfully');
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const payload = refreshSchema.parse(req.body);
    const result = await authService.refresh(payload, { apiKey: config.firebaseWebApiKey });
    res.success(result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh };
