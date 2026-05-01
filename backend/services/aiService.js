const aiRepository = require('../repositories/aiRepository');
const aiReportRepository = require('../repositories/aiReportRepository');
const sessionRepository = require('../repositories/sessionRepository');
const reviewRepository = require('../repositories/reviewRepository');
const chatRepository = require('../repositories/chatRepository');

async function persistReport({ userId, sessionId = null, type, inputSnapshot, generatedContent }) {
  const confidenceScore =
    generatedContent?.confidenceScore && Number.isFinite(Number(generatedContent.confidenceScore))
      ? Number(generatedContent.confidenceScore)
      : 0.6;
  const provider = String(process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();
  const modelVersion =
    provider === 'openrouter'
      ? String(process.env.OPENROUTER_MODEL || 'openrouter/auto').trim()
      : provider === 'ollama'
      ? String(process.env.OLLAMA_MODEL || 'ollama').trim()
      : String(process.env.GEMINI_MODEL || 'gemini').trim();
  return aiReportRepository.createReport({
    userId,
    sessionId,
    type,
    inputSnapshot,
    generatedContent,
    confidenceScore,
    modelVersion,
  });
}

async function matchTrainer({ student, trainers, apiKey }) {
  const generated = await aiRepository.requestMatch({ apiKey, student, trainers });
  await persistReport({
    userId: student?.id || 'unknown',
    type: 'match',
    inputSnapshot: { student, trainerIds: trainers.map((t) => t.id) },
    generatedContent: generated,
  });
  return generated;
}

async function generatePlan({ userId, studentProfile, apiKey }) {
  const generated = await aiRepository.requestPlan({ apiKey, studentProfile });
  const report = await persistReport({
    userId,
    type: 'plan',
    inputSnapshot: { studentProfile },
    generatedContent: generated,
  });
  return { ...generated, reportId: report.reportId };
}

async function generateSessionSummary({ userId, sessionId, trainerNotes, chatTranscript, apiKey }) {
  const generated = await aiRepository.requestSummary({
    apiKey,
    sessionId,
    trainerNotes,
    chatTranscript,
  });
  const report = await persistReport({
    userId,
    sessionId,
    type: 'summary',
    inputSnapshot: { trainerNotes, chatTranscript },
    generatedContent: generated,
  });
  return { ...generated, reportId: report.reportId };
}

async function generateProgress({ userId, sessions, reviews, apiKey }) {
  const generated = await aiRepository.requestProgress({
    apiKey,
    sessions,
    reviews,
  });
  const report = await persistReport({
    userId,
    type: 'progress',
    inputSnapshot: { sessionCount: sessions.length, reviewCount: reviews.length },
    generatedContent: generated,
  });
  return { ...generated, reportId: report.reportId };
}

async function generateSummaryForCompletedSession({ sessionId, apiKey }) {
  const session = await sessionRepository.getSessionById(sessionId);
  if (!session || session.status !== 'completed') {
    return null;
  }
  const transcript = await chatRepository.getTranscriptBySessionId(sessionId);
  const summary = await generateSessionSummary({
    userId: session.studentId,
    sessionId,
    trainerNotes: session.trainerNotes || '',
    chatTranscript: transcript.map((m) => `${m.senderId}: ${m.content}`),
    apiKey,
  });
  await sessionRepository.updateAiSummaryId({ sessionId, aiSummaryId: summary.reportId });
  return summary;
}

async function generateProgressFromStudentId({ studentId, apiKey }) {
  const toIso = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  // Keep payload compact to reduce Gemini latency/timeouts.
  const sessions = await sessionRepository.listSessionsByStudentId(studentId, { limit: 25 });
  const reviews = await reviewRepository.listByStudentId(studentId, { limit: 25 });

  const sessionDigest = (sessions || []).map((s) => ({
    status: s.status || null,
    scheduledStart: toIso(s.scheduledStart),
    scheduledEnd: toIso(s.scheduledEnd),
  }));

  const reviewDigest = (reviews || []).map((r) => ({
    rating: typeof r.rating === 'number' ? r.rating : null,
    createdAt: toIso(r.createdAt),
  }));

  return generateProgress({ userId: studentId, sessions: sessionDigest, reviews: reviewDigest, apiKey });
}

async function generateChatResponse({ userId, message, history, apiKey }) {
  const generated = await aiRepository.requestChat({ apiKey, message, history });
  
  // Optionally persist chat interaction to aiReports or just return it
  // Since it's a transient chat, returning directly might be better, but we can persist for analytics.
  await persistReport({
    userId,
    type: 'summary', // using summary or custom type
    inputSnapshot: { message, historyLength: history?.length || 0 },
    generatedContent: generated,
  });

  return generated;
}

module.exports = {
  matchTrainer,
  generatePlan,
  generateSessionSummary,
  generateProgress,
  generateSummaryForCompletedSession,
  generateProgressFromStudentId,
  generateChatResponse,
};
