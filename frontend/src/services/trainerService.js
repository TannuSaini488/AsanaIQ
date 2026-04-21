import { requestWithLocalToken } from './apiClient';

const API_BASE = '/api/trainers';

export async function fetchTrainers() {
  const res = await requestWithLocalToken(API_BASE);
  return res.data?.trainers || res.trainers || res.data || [];
}
