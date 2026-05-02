const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  firebaseWebApiKey: process.env.FIREBASE_WEB_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  aiProvider: String(process.env.AI_PROVIDER || 'openrouter').trim().toLowerCase(),
};

module.exports = config;
