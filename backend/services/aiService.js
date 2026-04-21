const {
  aiMatchResponseSchema,
  aiPlanResponseSchema,
  aiSummaryResponseSchema,
  aiProgressResponseSchema,
} = require('../validators/aiValidator');
const aiRepository = require('../repositories/aiRepository');
const aiReportRepository = require('../repositories/aiReportRepository');
const sessionRepository = require('../repositories/sessionRepository');
const reviewRepository = require('../repositories/reviewRepository');
const chatRepository = require('../repositories/chatRepository');

function pickDeterministic(trainers) {
  const sorted = [...trainers].sort((a, b) => {
    const ratingA = a.ratingAverage ?? 0;
    const ratingB = b.ratingAverage ?? 0;
    if (ratingA !== ratingB) return ratingB - ratingA;
    // prefer available trainers
    if (a.isAvailable === b.isAvailable) return 0;
    return a.isAvailable ? -1 : 1;
  });
  return sorted;
}

function buildFallback(trainers) {
  const sorted = pickDeterministic(trainers);
  const primary = sorted[0];
  return aiMatchResponseSchema.parse({
    bestMatchTrainerId: primary.id,
    matchScore: 0.6,
    reasoning: 'Fallback selection based on highest rating and availability ordering',
    alternatives: sorted.slice(1).map((t) => t.id),
  });
}

function buildPlanFallback() {
  return aiPlanResponseSchema.parse({
    level: 'beginner',
    recommended_trainer_type: 'injury-aware and goal-focused trainer',
    weekly_schedule: [
      { day: 'Monday', focus: 'Breath and mobility' },
      { day: 'Wednesday', focus: 'Core stability and balance' },
      { day: 'Friday', focus: 'Strength and flexibility' },
    ],
    precautions: ['Move within pain-free range', 'Hydrate and warm up properly'],
    estimated_progress: 'Visible routine consistency in 2-4 weeks',
    risk_flags: ['Overstretching risk', 'Inconsistent practice risk'],
  });
}

function buildSummaryFallback() {
  return aiSummaryResponseSchema.parse({
    session_summary: 'Session completed with guided posture and breathing practice.',
    posture_feedback: 'Maintain neutral spine and controlled transitions.',
    improvement_areas: ['Hip mobility', 'Shoulder alignment'],
    next_week_focus: ['Consistency in home practice', 'Controlled breathing'],
    motivational_note: 'Steady practice will compound your progress.',
  });
}

function buildProgressFallback() {
  return aiProgressResponseSchema.parse({
    progressScore: 55,
    consistencyRate: 50,
    strengthAreas: ['Attendance effort'],
    riskAreas: ['Schedule inconsistency'],
    recommendation: 'Keep a fixed weekly yoga schedule and gradually increase session quality.',
  });
}

async function persistReport({ userId, sessionId = null, type, inputSnapshot, generatedContent }) {
  const confidenceScore =
    generatedContent?.confidenceScore && Number.isFinite(Number(generatedContent.confidenceScore))
      ? Number(generatedContent.confidenceScore)
      : 0.6;
  return aiReportRepository.createReport({
    userId,
    sessionId,
    type,
    inputSnapshot,
    generatedContent,
    confidenceScore,
    modelVersion: process.env.GEMINI_MODEL || 'fallback',
  });
}

async function matchTrainer({ student, trainers, apiKey }) {
  let generated;
  try {
    generated = await aiRepository.requestMatch({ apiKey, student, trainers });
  } catch (_err) {
    generated = buildFallback(trainers);
  }
  await persistReport({
    userId: student?.id || 'unknown',
    type: 'match',
    inputSnapshot: { student, trainerIds: trainers.map((t) => t.id) },
    generatedContent: generated,
  });
  return generated;
}

async function generatePlan({ userId, studentProfile, apiKey }) {
  let generated;
  try {
    generated = await aiRepository.requestPlan({ apiKey, studentProfile });
  } catch (_err) {
    generated = buildPlanFallback();
  }

  const report = await persistReport({
    userId,
    type: 'plan',
    inputSnapshot: { studentProfile },
    generatedContent: generated,
  });
  return { ...generated, reportId: report.reportId };
}

async function generateSessionSummary({ userId, sessionId, trainerNotes, chatTranscript, apiKey }) {
  let generated;
  try {
    generated = await aiRepository.requestSummary({
      apiKey,
      sessionId,
      trainerNotes,
      chatTranscript,
    });
  } catch (_err) {
    generated = buildSummaryFallback();
  }

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
  let generated;
  try {
    generated = await aiRepository.requestProgress({
      apiKey,
      sessions,
      reviews,
    });
  } catch (_err) {
    generated = buildProgressFallback();
  }

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
  const sessions = await sessionRepository.listSessionsByStudentId(studentId, { limit: 100 });
  const reviews = await reviewRepository.listByStudentId(studentId, { limit: 100 });
  return generateProgress({ userId: studentId, sessions, reviews, apiKey });
}

module.exports = {
  matchTrainer,
  generatePlan,
  generateSessionSummary,
  generateProgress,
  generateSummaryForCompletedSession,
  generateProgressFromStudentId,
};
