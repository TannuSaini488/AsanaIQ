const {
  aiMatchResponseSchema,
  aiPlanResponseSchema,
  aiSummaryResponseSchema,
  aiProgressResponseSchema,
} = require('../validators/aiValidator');
const AppError = require('../utils/appError');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const REQUEST_TIMEOUT_MS = 10000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function getEndpoint(model = GEMINI_MODEL) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function buildSafetySettings() {
  return [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ];
}

async function requestJson({ apiKey, promptParts, maxOutputTokens = 700 }) {
  if (!apiKey) {
    throw new AppError('Gemini API key missing', { status: 500, code: 'CONFIG_MISSING' });
  }

  const url = `${getEndpoint()}?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: promptParts }],
        safetySettings: buildSafetySettings(),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('Gemini request timed out', { status: 504, code: 'GEMINI_TIMEOUT' });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const body = await res.json();
  if (!res.ok) {
    throw new AppError(body.error?.message || 'Gemini request failed', {
      status: res.status,
      code: 'GEMINI_ERROR',
    });
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AppError('Gemini response missing text', { status: 502, code: 'GEMINI_BAD_RESPONSE' });
  }

  try {
    return JSON.parse(text);
  } catch (_parseErr) {
    throw new AppError('Gemini response not valid JSON', { status: 502, code: 'GEMINI_PARSE_ERROR' });
  }
}

async function requestMatch({ apiKey, student, trainers }) {
  const parsed = await requestJson({
    apiKey,
    promptParts: [
      {
        text:
          'You are a yoga trainer matcher. Given a student profile and trainer list, pick the best match. ' +
          'Respond ONLY with JSON in the format: ' +
          '{\"bestMatchTrainerId\":\"id\",\"matchScore\":0.0-1.0,\"reasoning\":\"string\",\"alternatives\":[\"id\"]}. ' +
          'Prefer higher rating, relevant specialization, availability, and language fit. Keep alternatives ordered by relevance.',
      },
      { text: `Student: ${JSON.stringify(student)}` },
      { text: `Trainers: ${JSON.stringify(trainers)}` },
    ],
    maxOutputTokens: 512,
  });

  return aiMatchResponseSchema.parse(parsed);
}

async function requestPlan({ apiKey, studentProfile }) {
  const parsed = await requestJson({
    apiKey,
    promptParts: [
      {
        text:
          'Generate a safe yoga plan and return JSON only in the exact shape: ' +
          '{"level":"string","recommended_trainer_type":"string","weekly_schedule":[{"day":"string","focus":"string"}],' +
          '"precautions":["string"],"estimated_progress":"string","risk_flags":["string"]}. ' +
          'Never provide medical diagnosis.',
      },
      { text: `Student profile: ${JSON.stringify(studentProfile)}` },
    ],
  });

  return aiPlanResponseSchema.parse(parsed);
}

async function requestSummary({ apiKey, sessionId, trainerNotes, chatTranscript }) {
  const parsed = await requestJson({
    apiKey,
    promptParts: [
      {
        text:
          'Create a yoga session summary and return JSON only with keys: ' +
          '{"session_summary":"string","posture_feedback":"string","improvement_areas":["string"],' +
          '"next_week_focus":["string"],"motivational_note":"string"}. No diagnosis.',
      },
      { text: `Session ID: ${sessionId}` },
      { text: `Trainer notes: ${trainerNotes || ''}` },
      { text: `Chat transcript: ${JSON.stringify(chatTranscript || [])}` },
    ],
  });

  return aiSummaryResponseSchema.parse(parsed);
}

async function requestProgress({ apiKey, sessions, reviews }) {
  const parsed = await requestJson({
    apiKey,
    promptParts: [
      {
        text:
          'Analyze yoga progress and return JSON only with keys: ' +
          '{"progressScore":0-100,"consistencyRate":0-100,"strengthAreas":["string"],' +
          '"riskAreas":["string"],"recommendation":"string"}. No diagnosis.',
      },
      { text: `Sessions: ${JSON.stringify(sessions || [])}` },
      { text: `Reviews: ${JSON.stringify(reviews || [])}` },
    ],
  });

  return aiProgressResponseSchema.parse(parsed);
}

module.exports = { requestMatch, requestPlan, requestSummary, requestProgress };
