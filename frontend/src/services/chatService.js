import { requestWithLocalToken } from './apiClient';

export async function fetchMessages(chatId, { cursor = null, limit = 20 } = {}) {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', cursor);
  if (limit) query.set('limit', String(limit));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await requestWithLocalToken(`/api/chats/${chatId}/messages${suffix}`);
  return res.data || {};
}

export async function sendMessage(chatId, { messageType = 'text', content }) {
  const res = await requestWithLocalToken(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    body: { messageType, content },
  });
  return res.data;
}
