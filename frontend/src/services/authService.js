const API_BASE = '/api/auth';
import { extractRoleFromToken } from '../utils/jwt';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRES_AT_KEY = 'tokenExpiresAt';
const AUTH_TOKEN_UPDATED_EVENT = 'auth:token-updated';

let refreshPromise = null;

export function persistTokenBundle(bundle = {}) {
  const token = bundle.idToken || bundle.token || bundle.customToken || '';
  const refreshToken = bundle.refreshToken || '';
  const expiresInSec = Number(bundle.expiresIn || 0);
  const tokenExpiresAt = expiresInSec > 0 ? Date.now() + expiresInSec * 1000 : 0;

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (tokenExpiresAt) {
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(tokenExpiresAt));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AUTH_TOKEN_UPDATED_EVENT, {
        detail: { token, refreshToken, tokenExpiresAt },
      }),
    );
  }
}

export function clearPersistedAuthTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AUTH_TOKEN_UPDATED_EVENT, {
        detail: { token: '', refreshToken: '', tokenExpiresAt: 0 },
      }),
    );
  }
}

export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || body.message || 'Login failed');
  }
  const token = body.data?.idToken || body.data?.token || body.data?.customToken;
  const role = extractRoleFromToken(token) || body.data?.role;
  persistTokenBundle(body.data || {});
  return { token, data: body.data, role };
}

export async function register({ email, password, role = 'student' }) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || body.message || 'Registration failed');
  }
  const token = body.data?.idToken || body.data?.token || body.data?.customToken;
  const parsedRole = extractRoleFromToken(token) || role || body.data?.role;
  persistTokenBundle(body.data || {});
  return { token, data: body.data, role: parsedRole };
}

export async function refreshAuthToken(passedRefreshToken = '') {
  if (refreshPromise) return refreshPromise;
  const refreshToken = passedRefreshToken || localStorage.getItem(REFRESH_TOKEN_KEY) || '';
  if (!refreshToken) {
    throw new Error('Refresh token missing');
  }

  refreshPromise = (async () => {
    const res = await fetch(`${API_BASE}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) {
      clearPersistedAuthTokens();
      throw new Error(body.error?.message || body.message || 'Token refresh failed');
    }
    persistTokenBundle(body.data || {});
    return body.data;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export { TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRES_AT_KEY, AUTH_TOKEN_UPDATED_EVENT };
