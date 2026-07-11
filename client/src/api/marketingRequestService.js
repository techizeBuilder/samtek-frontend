import { apiRequest } from '@/lib/queryClient';

const BASE = '/api/marketing';

// Sales ↔ Marketing content request APIs
export const marketingRequestApi = {
  create: (data) => apiRequest('POST', `${BASE}/requests`, data),
  getMy: () => apiRequest('GET', `${BASE}/requests/my`),
  getAll: (status) => apiRequest('GET', `${BASE}/requests${status ? `?status=${status}` : ''}`),
  getMatchingAssets: (id) => apiRequest('GET', `${BASE}/requests/${id}/matching-assets`),
  approve: (id, assetIds) => apiRequest('POST', `${BASE}/requests/${id}/approve`, { assetIds }),
  reject: (id, reason) => apiRequest('POST', `${BASE}/requests/${id}/reject`, { reason }),
  getCategories: () => apiRequest('GET', `${BASE}/categories`),
};
