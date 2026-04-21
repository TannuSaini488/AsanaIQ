export function decodeJwt(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    return payload;
  } catch (e) {
    return null;
  }
}

export function extractRoleFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;
  return payload.role || payload.custom_claims?.role || payload['role'];
}

export function extractUserIdFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;
  return payload.uid || payload.user_id || payload.sub || null;
}
