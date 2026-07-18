import { apiRequest } from './index';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const cashAccessApi = {
  verifyPassword: (customerId, password) =>
    apiRequest('/cash-access/verify-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ customerId, password })
    }),

  verifyOtp: (requestId, otp) =>
    apiRequest('/cash-access/verify-otp', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ requestId, otp })
    }),

  viewCash: (requestId) =>
    apiRequest(`/cash-access/${requestId}/view`, { headers: authHeaders() }),

  markReceived: (requestId, orderId) =>
    apiRequest(`/cash-access/${requestId}/mark-received`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ orderId })
    }),
};
