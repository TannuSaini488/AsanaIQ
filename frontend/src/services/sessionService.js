import { requestWithLocalToken } from './apiClient';

export async function bookSession({ trainerId, slotId }) {
  const res = await requestWithLocalToken('/api/sessions/book', {
    method: 'POST',
    body: { trainerId, slotId },
  });
  return res.data;
}

export async function updateSessionState(sessionId, action) {
  const res = await requestWithLocalToken(`/api/sessions/${sessionId}/state`, {
    method: 'PATCH',
    body: { action },
  });
  return res.data;
}

export async function updateTrainerNotes(sessionId, trainerNotes) {
  const res = await requestWithLocalToken(`/api/sessions/${sessionId}/notes`, {
    method: 'PATCH',
    body: { trainerNotes },
  });
  return res.data;
}

export async function fetchReviewableSessions(trainerId) {
  const params = new URLSearchParams({ trainerId });
  const res = await requestWithLocalToken(`/api/sessions/reviewable?${params.toString()}`);
  return res.data?.sessions || [];
}

export async function fetchCallableSession(peerId) {
  const params = new URLSearchParams({ peerId });
  const res = await requestWithLocalToken(`/api/sessions/callable?${params.toString()}`);
  return res.data?.session || null;
}

export async function fetchMySessions({ limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const res = await requestWithLocalToken(`/api/sessions/mine?${params.toString()}`);
  return res.data?.sessions || [];
}
