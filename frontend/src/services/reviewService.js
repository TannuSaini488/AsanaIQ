import { requestWithLocalToken } from './apiClient';

export async function createReview({ trainerId, sessionId, rating, comment }) {
  const res = await requestWithLocalToken('/api/reviews', {
    method: 'POST',
    body: sessionId ? { sessionId, rating, comment } : { trainerId, rating, comment },
  });
  return res.data?.review;
}

export async function fetchTrainerReviews(trainerId) {
  const res = await requestWithLocalToken(`/api/reviews/trainer/${trainerId}`);
  return res.data?.reviews || [];
}

export async function getReviewsForStudent(studentId) {
  const res = await requestWithLocalToken(`/api/reviews/student/${studentId}`);
  return res.data?.reviews || [];
}

