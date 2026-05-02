const aiService = require('../services/aiService');
const {
  matchRequestSchema,
  aiPlanRequestSchema,
  aiSummaryRequestSchema,
  aiProgressRequestSchema,
  aiChatRequestSchema,
} = require('../validators/aiValidator');
const config = require('../config');

const AI_PROVIDER = String(process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
function resolveApiKey() {
  return AI_PROVIDER === 'openrouter' ? config.openrouterApiKey : config.geminiApiKey;
}

async function match(req, res, next) {
  try {
    const { student, trainers } = matchRequestSchema.parse(req.body);
    const result = await aiService.matchTrainer({
      student,
      trainers,
      apiKey: resolveApiKey(),
    });
    res.success(result, 'Trainer match generated');
  } catch (err) {
    next(err);
  }
}

async function plan(req, res, next) {
  try {
    const { studentProfile } = aiPlanRequestSchema.parse(req.body);
    const result = await aiService.generatePlan({
      userId: req.user.uid,
      studentProfile,
      apiKey: resolveApiKey(),
    });
    res.success(result, 'Plan generated');
  } catch (err) {
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    const payload = aiSummaryRequestSchema.parse(req.body);
    const result = await aiService.generateSessionSummary({
      userId: req.user.uid,
      sessionId: payload.sessionId,
      trainerNotes: payload.trainerNotes,
      chatTranscript: payload.chatTranscript,
      apiKey: resolveApiKey(),
    });
    res.success(result, 'Session summary generated');
  } catch (err) {
    next(err);
  }
}

async function progress(req, res, next) {
  try {
    const { studentId } = aiProgressRequestSchema.parse(req.body);
    const targetStudentId = studentId || req.user.uid;
    const result = await aiService.generateProgressFromStudentId({
      studentId: targetStudentId,
      apiKey: resolveApiKey(),
    });
    res.success(result, 'Progress report generated');
  } catch (err) {
    next(err);
  }
}

async function chat(req, res, next) {
  try {
    const { message, history } = aiChatRequestSchema.parse(req.body);
    const result = await aiService.generateChatResponse({
      userId: req.user.uid,
      message,
      history,
      apiKey: resolveApiKey(),
    });
    res.success(result, 'Chat response generated');
  } catch (err) {
    next(err);
  }
}

async function getSummary(req, res, next) {
  try {
    const { sessionId } = req.params;
    const result = await aiService.getSummaryForSession(sessionId);
    res.success({ summary: result }, 'Session summary fetched');
  } catch (err) {
    next(err);
  }
}

module.exports = { match, plan, summary, progress, chat, getSummary };
