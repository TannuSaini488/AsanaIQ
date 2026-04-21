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
