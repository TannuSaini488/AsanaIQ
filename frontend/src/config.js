const sanitizeUrl = (url) => url ? url.replace(/\/+$/, '') : '';

export const API_BASE_URL = sanitizeUrl(import.meta.env.VITE_API_URL || '');
export const SOCKET_URL = sanitizeUrl(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '');
