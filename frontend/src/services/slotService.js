import { requestWithLocalToken } from './apiClient';

export async function fetchSlots(trainerId) {
  const res = await requestWithLocalToken(`/api/trainers/${trainerId}/availability`);
  return res.data?.slots || res.slots || res.data || [];
}

export async function fetchMySlots() {
  const res = await requestWithLocalToken('/api/trainers/me/availability');
  return res.data?.slots || res.slots || res.data || [];
}

export async function createMySlot({ date, startTime, endTime }) {
  const res = await requestWithLocalToken('/api/trainers/me/availability', {
    method: 'POST',
    body: { date, startTime, endTime },
  });
  return res.data?.slot || res.slot || res.data || null;
}

export async function deleteMySlot(slotId) {
  const res = await requestWithLocalToken(`/api/trainers/me/availability/${slotId}`, {
    method: 'DELETE',
  });
  return res.data || {};
}
