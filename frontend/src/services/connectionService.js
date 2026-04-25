import { requestWithLocalToken } from './apiClient';

export async function getMyConnections() {
  const res = await requestWithLocalToken('/api/connections/mine');
  return res.data?.connections || [];
}

export async function requestConnection(peerId) {
  const res = await requestWithLocalToken('/api/connections/request', {
    method: 'POST',
    body: { peerId },
  });
  return res.data;
}

export async function updateConnectionStatus(connectionId, status) {
  const res = await requestWithLocalToken(`/api/connections/${connectionId}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return res.data;
}
