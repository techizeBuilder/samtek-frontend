import { apiRequest } from '@/lib/queryClient';

const BASE = '/api/marketing';

// Sales ↔ Marketing content request APIs
export const marketingRequestApi = {
  create: (data) => apiRequest('POST', `${BASE}/requests`, data),
  getMy: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'All') {
        query.append(key, value.toString());
      }
    });
    const qs = query.toString();
    return apiRequest('GET', `${BASE}/requests/my${qs ? `?${qs}` : ''}`);
  },
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && value !== 'All') {
        query.append(key, value.toString());
      }
    });
    const qs = query.toString();
    return apiRequest('GET', `${BASE}/requests${qs ? `?${qs}` : ''}`);
  },
  getMatchingAssets: (id) => apiRequest('GET', `${BASE}/requests/${id}/matching-assets`),
  approve: (id, assetIds) => apiRequest('POST', `${BASE}/requests/${id}/approve`, { assetIds }),
  reject: (id, reason) => apiRequest('POST', `${BASE}/requests/${id}/reject`, { reason }),
  getCategories: () => apiRequest('GET', `${BASE}/categories`),
};
