import { apiRequest } from './index';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const orderFormApi = {
  // Returns null (not a thrown error) when the order has no Order Form yet —
  // callers use this to decide "Fill Order Form" vs. a status badge.
  getByOrderId: async (orderId) => {
    try {
      return await apiRequest(`/order-forms/by-order/${orderId}`, { headers: authHeaders() });
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  },

  submit: (orderId, formData) =>
    apiRequest(`/order-forms/by-order/${orderId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(formData)
    }),

  returnForCorrection: (formId, remark) =>
    apiRequest(`/order-forms/${formId}/return`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ remark })
    }),

  list: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, value);
    });
    const qs = queryParams.toString();
    return apiRequest(`/order-forms${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
  },

  getById: (id) =>
    apiRequest(`/order-forms/${id}`, { headers: authHeaders() }),
};
