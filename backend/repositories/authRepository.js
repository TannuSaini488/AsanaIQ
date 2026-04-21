const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const AppError = require('../utils/appError');

async function signInWithEmailAndPassword(email, password, { apiKey }) {
  if (!apiKey) {
    throw new AppError('Firebase Web API key missing', { status: 500, code: 'CONFIG_MISSING' });
  }
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new AppError(body.error?.message || 'Authentication failed', {
      status: 401,
      code: body.error?.message || 'AUTH_FAILED',
    });
  }
  return {
    idToken: body.idToken,
    refreshToken: body.refreshToken,
    expiresIn: body.expiresIn,
    localId: body.localId,
  };
}

async function refreshIdToken(refreshToken, { apiKey }) {
  if (!apiKey) {
    throw new AppError('Firebase Web API key missing', { status: 500, code: 'CONFIG_MISSING' });
  }
  const url = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  const body = await response.json();
  if (!response.ok) {
    throw new AppError(body.error?.message || 'Token refresh failed', {
      status: 401,
      code: body.error?.message || 'TOKEN_REFRESH_FAILED',
    });
  }
  return {
    idToken: body.id_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
    localId: body.user_id,
  };
}

module.exports = { signInWithEmailAndPassword, refreshIdToken };
