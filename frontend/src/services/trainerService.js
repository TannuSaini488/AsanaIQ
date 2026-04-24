import { requestWithLocalToken } from './apiClient';

const API_BASE = '/api/trainers';

export async function fetchTrainers() {
  const res = await requestWithLocalToken(API_BASE);
  return res.data?.trainers || res.trainers || res.data || [];
}

export async function getMyTrainerProfile() {
  const res = await requestWithLocalToken(`${API_BASE}/me`);
  return res.data?.profile || null;
}

export async function upsertMyTrainerProfile(payload) {
  const res = await requestWithLocalToken(`${API_BASE}/me`, {
    method: 'PUT',
    body: payload,
  });
  return res.data?.profile || null;
}
