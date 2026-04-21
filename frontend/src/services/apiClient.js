import useAuth from '../hooks/useAuth';
import { refreshAuthToken } from './authService';

function isExpiredTokenError(res, data) {
  const message = String(data?.error?.message || data?.message || '');
  const code = String(data?.error?.code || '');
  return (
    res.status === 401 &&
    (message.includes('id-token-expired') ||
      message.includes('auth/id-token-expired') ||
      code === 'auth/id-token-expired')
  );
}

async function performRequest(url, { method = 'GET', body, headers = {} } = {}, token = '') {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// Note: apiClientHook is used inside components/hooks to access context token.
export function useApiClient() {
  const { token } = useAuth();
  const request = async (url, { method = 'GET', body, headers = {} } = {}) => {
    const localToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') || '';
    let { res, data } = await performRequest(url, { method, body, headers }, localToken);

    if (isExpiredTokenError(res, data)) {
      const refreshed = await refreshAuthToken();
      const retryToken = refreshed?.idToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') || '';
      ({ res, data } = await performRequest(url, { method, body, headers }, retryToken));
    }

    if (!res.ok || data.success === false) {
      throw new Error(data.error?.message || data.message || 'Request failed');
    }
    return data;
  };
  return { request };
}

// For non-hook modules, fallback to localStorage token
export async function requestWithLocalToken(url, { method = 'GET', body, headers = {} } = {}) {
  const token = (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') || '';
  let { res, data } = await performRequest(url, { method, body, headers }, token);

  if (isExpiredTokenError(res, data)) {
    const refreshed = await refreshAuthToken();
    const retryToken = refreshed?.idToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '') || '';
    ({ res, data } = await performRequest(url, { method, body, headers }, retryToken));
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.error?.message || data.message || 'Request failed');
  }
  return data;
}
