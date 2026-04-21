import { requestWithLocalToken } from './apiClient';

const MATCH_API = '/api/ai/match';

export async function matchBestTrainer({ student = {}, trainers = [] }) {
  const res = await requestWithLocalToken(MATCH_API, {
    method: 'POST',
    body: { student, trainers },
  });
  return res.data;
}

export async function generatePlan(studentProfile) {
  const res = await requestWithLocalToken('/api/ai/plan', {
    method: 'POST',
    body: { studentProfile },
  });
  return res.data;
}

export async function generateProgress(studentId) {
  const res = await requestWithLocalToken('/api/ai/progress', {
    method: 'POST',
    body: { studentId },
  });
  return res.data;
}
