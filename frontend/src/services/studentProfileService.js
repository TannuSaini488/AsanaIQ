import { requestWithLocalToken } from './apiClient';

export async function getMyStudentProfile() {
  const res = await requestWithLocalToken('/api/student-profile/me');
  return res.data?.profile || null;
}

export async function upsertMyStudentProfile(payload) {
  const res = await requestWithLocalToken('/api/student-profile/me', {
    method: 'PUT',
    body: payload,
  });
  return res.data?.profile || null;
}
