const {
  aiMatchResponseSchema,
  aiPlanResponseSchema,
  aiSummaryResponseSchema,
  aiProgressResponseSchema,
} = require('../validators/aiValidator');
const AppError = require('../utils/appError');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const AI_PROVIDER = String(process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000);
// Prefer a stable, widely-available model; retry with rolling alias if needed.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const OLLAMA_BASE_URL = String(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = String(process.env.OLLAMA_MODEL || 'llama3.1:8b').trim();
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 30000);

const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
const OPENROUTER_MODEL = String(process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct').trim();
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 30000);

function normalizeModelName(model) {
  const raw = String(model || '').trim();
  if (!raw) return 'gemini-flash-latest';
  return raw.startsWith('models/') ? raw.slice('models/'.length) : raw;
}

function getEndpoint(model = GEMINI_MODEL) {
  const modelName = normalizeModelName(model);
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
}

function extractJsonText(text) {
  if (!text) return '';
  let trimmed = String(text).trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

function parseRetryAfterSeconds(message) {
  const raw = String(message || '');
  const match = raw.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function isQuotaExceededMessage(message) {
  const msg = String(message || '').toLowerCase();
  return msg.includes('quota exceeded') || msg.includes('exceeded your current quota');
}

function buildSafetySettings() {
  return [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  ];
}

async function requestGeminiJson({ apiKey, promptParts, maxOutputTokens = 700, responseJsonSchema = null }) {
  if (!apiKey) {
    throw new AppError('Gemini API key missing', { status: 500, code: 'CONFIG_MISSING', expose: true });
  }

  const primaryModel = GEMINI_MODEL;
  const urlForModel = (model) => `${getEndpoint(model)}?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const buildBody = ({ temperature, maxTokens, parts }) =>
    JSON.stringify({
      contents: [{ parts }],
      safetySettings: buildSafetySettings(),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        ...(responseJsonSchema ? { responseJsonSchema } : {}),
      },
    });

  const doFetch = (url, body) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

  const parseOrThrow = (responseBody, modelLabel) => {
    const text = responseBody?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new AppError('Gemini response missing text', {
        status: 502,
        code: 'GEMINI_BAD_RESPONSE',
        expose: true,
      });
    }

    try {
      return JSON.parse(extractJsonText(text));
    } catch (_parseErr) {
      // Avoid leaking full model output to clients; keep diagnostics in logs.
      // eslint-disable-next-line no-console
      console.warn('[gemini] parse error', {
        model: normalizeModelName(modelLabel),
        snippet: String(text).slice(0, 300),
      });
      throw new AppError('Gemini response not valid JSON', {
        status: 502,
        code: 'GEMINI_PARSE_ERROR',
        expose: true,
      });
    }
  };

  let res;
  try {
    const body = buildBody({ temperature: 0.2, maxTokens: maxOutputTokens, parts: promptParts });

    res = await doFetch(urlForModel(primaryModel), body);

    // If model is deprecated/not found, retry once with the rolling alias.
    if (!res.ok && res.status === 404 && normalizeModelName(primaryModel) !== 'gemini-flash-latest') {
      res = await doFetch(urlForModel('gemini-flash-latest'), body);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('Gemini request timed out', { status: 504, code: 'GEMINI_TIMEOUT', expose: true });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const responseBody = await res.json();
  if (!res.ok) {
    const errorMessage = responseBody.error?.message || 'Gemini request failed';
    if (res.status === 429 || isQuotaExceededMessage(errorMessage)) {
      throw new AppError(errorMessage, {
        status: 429,
        code: 'GEMINI_QUOTA_EXCEEDED',
        expose: true,
        retryAfterSeconds: parseRetryAfterSeconds(errorMessage),
      });
    }

    throw new AppError(errorMessage, {
      status: res.status,
      code: 'GEMINI_ERROR',
      expose: true,
    });
  }

  // Primary parse attempt.
  try {
    return parseOrThrow(responseBody, primaryModel);
  } catch (err) {
    if (err?.code !== 'GEMINI_PARSE_ERROR') throw err;

    // Retry once with stricter instruction and more deterministic settings.
    const strictParts = [
      {
        text:
          'Return ONLY a single valid JSON object. No markdown fences, no comments, no trailing text. ' +
          'Ensure all required keys are present and types match the schema exactly.',
      },
      ...promptParts,
    ];

    const retryBody = buildBody({ temperature: 0.0, maxTokens: Math.max(maxOutputTokens, 900), parts: strictParts });
    const retryRes = await doFetch(urlForModel(primaryModel), retryBody);
    const retryJson = await retryRes.json().catch(() => ({}));
    if (!retryRes.ok) {
      throw new AppError(retryJson.error?.message || 'Gemini request failed', {
        status: retryRes.status,
        code: 'GEMINI_ERROR',
        expose: true,
      });
    }
    return parseOrThrow(retryJson, primaryModel);
  }
}

function buildPromptText(promptParts) {
  return (promptParts || [])
    .map((p) => (p && typeof p.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('\n\n');
}

async function requestOllamaJson({ promptParts, maxOutputTokens = 700, responseJsonSchema = null }) {
  if (!OLLAMA_MODEL) {
    throw new AppError('Ollama model missing', { status: 500, code: 'CONFIG_MISSING', expose: true });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  const schemaHint = responseJsonSchema ? `\n\nJSON Schema (must match):\n${JSON.stringify(responseJsonSchema)}` : '';
  const baseSystem =
    'Return ONLY a single valid JSON object. No markdown fences, no comments, no trailing text. ' +
    'Ensure all required keys are present and types match exactly.' +
    schemaHint;

  const userText = buildPromptText(promptParts);

  const doFetch = async ({ temperature, numPredict, systemText }) => {
    let res;
    try {
      res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          messages: [
            { role: 'system', content: systemText },
            { role: 'user', content: userText },
          ],
          options: {
            temperature,
            num_predict: numPredict,
          },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      throw new AppError('Ollama is unreachable', {
        status: 503,
        code: 'OLLAMA_UNAVAILABLE',
        expose: true,
      });
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = body?.error || body?.message || 'Ollama request failed';
      throw new AppError(message, {
        status: res.status,
        code: 'OLLAMA_ERROR',
        expose: true,
      });
    }

    const text = body?.message?.content;
    if (!text) {
      throw new AppError('Ollama response missing text', {
        status: 502,
        code: 'OLLAMA_BAD_RESPONSE',
        expose: true,
      });
    }

    try {
      return JSON.parse(extractJsonText(text));
    } catch (_parseErr) {
      // eslint-disable-next-line no-console
      console.warn('[ollama] parse error', { model: OLLAMA_MODEL, snippet: String(text).slice(0, 300) });
      throw new AppError('Ollama response not valid JSON', {
        status: 502,
        code: 'OLLAMA_PARSE_ERROR',
        expose: true,
      });
    }
  };

  try {
    // First attempt.
    return await doFetch({ temperature: 0.2, numPredict: Math.max(256, maxOutputTokens), systemText: baseSystem });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new AppError('Ollama request timed out', { status: 504, code: 'OLLAMA_TIMEOUT', expose: true });
    }
    if (err?.code !== 'OLLAMA_PARSE_ERROR') throw err;

    // Retry once with deterministic settings.
    return await doFetch({ temperature: 0.0, numPredict: Math.max(900, maxOutputTokens), systemText: baseSystem });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestOpenRouterJson({ apiKey, promptParts, maxOutputTokens = 700 }) {
  if (!apiKey) {
    throw new AppError('OpenRouter API key missing', { status: 500, code: 'CONFIG_MISSING', expose: true });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  const userText = buildPromptText(promptParts);
  const systemText =
    'Return ONLY a single valid JSON object. No markdown fences, no comments, no trailing text. ' +
    'Ensure all required keys are present and types match exactly.';

  let res;
  try {
    res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://yoga-app.local',
        'X-Title': 'YogaTrainerMarketplace',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemText },
          { role: 'user', content: userText },
        ],
        max_tokens: maxOutputTokens,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new AppError('OpenRouter request timed out', { status: 504, code: 'OPENROUTER_TIMEOUT', expose: true });
    }
    throw new AppError('OpenRouter is unreachable', { status: 503, code: 'OPENROUTER_UNAVAILABLE', expose: true });
  } finally {
    clearTimeout(timeout);
  }

  const responseBody = await res.json().catch(() => ({}));
  if (!res.ok || responseBody?.error) {
    const errorMessage = responseBody?.error?.message || 'OpenRouter request failed';
    const statusCode = responseBody?.error?.code || res.status || 500;
    throw new AppError(errorMessage, { status: statusCode, code: 'OPENROUTER_ERROR', expose: true });
  }

  const text = responseBody?.choices?.[0]?.message?.content;
  if (!text) {
    throw new AppError('OpenRouter response missing content', { status: 502, code: 'OPENROUTER_BAD_RESPONSE', expose: true });
  }

  try {
    return JSON.parse(extractJsonText(text));
  } catch (_parseErr) {
    // eslint-disable-next-line no-console
    console.warn('[openrouter] parse error', { model: OPENROUTER_MODEL, snippet: String(text).slice(0, 300) });
    throw new AppError('OpenRouter response not valid JSON', { status: 502, code: 'OPENROUTER_PARSE_ERROR', expose: true });
  }
}

async function requestJson({ apiKey, promptParts, maxOutputTokens = 700, responseJsonSchema = null }) {
  if (AI_PROVIDER === 'openrouter') {
    return requestOpenRouterJson({ apiKey, promptParts, maxOutputTokens });
  }
  if (AI_PROVIDER === 'ollama') {
    return requestOllamaJson({ promptParts, maxOutputTokens, responseJsonSchema });
  }
  return requestGeminiJson({ apiKey, promptParts, maxOutputTokens, responseJsonSchema });
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
  const progressResponseSchema = {
    type: 'object',
    properties: {
      progressScore: { type: 'number', minimum: 0, maximum: 100 },
      consistencyRate: { type: 'number', minimum: 0, maximum: 100 },
      strengthAreas: { type: 'array', items: { type: 'string' }, maxItems: 30 },
      riskAreas: { type: 'array', items: { type: 'string' }, maxItems: 30 },
      recommendation: { type: 'string' },
    },
    required: ['progressScore', 'consistencyRate', 'strengthAreas', 'riskAreas', 'recommendation'],
  };

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
    responseJsonSchema: progressResponseSchema,
  });

  return aiProgressResponseSchema.parse(parsed);
}

module.exports = { requestMatch, requestPlan, requestSummary, requestProgress };
