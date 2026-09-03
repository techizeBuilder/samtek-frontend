const API_BASE = import.meta.env.VITE_API_URL || '/api';

const apiFetch = (url, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_BASE}/lead-setting-requests${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  });
};

export const leadSettingRequestApi = {
  // Sales Head proposes an add/edit/delete — { field, action, payload, targetId }
  createRequest: (body) => apiFetch('/', { method: 'POST', body: JSON.stringify(body) }),

  // Same endpoint powers both Sales Head's "My Requests" (mine: true) and
  // Company Admin's approval inbox (status/field filters).
  listRequests: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.append(k, v); });
    const s = qs.toString();
    return apiFetch(`/${s ? `?${s}` : ''}`);
  },

  // Company Admin approve/reject — { decision: 'approve' | 'reject', remarks }
  reviewRequest: (id, body) => apiFetch(`/${id}/review`, { method: 'PUT', body: JSON.stringify(body) }),

  // Sales Head withdraws their own still-Pending request.
  cancelRequest: (id) => apiFetch(`/${id}`, { method: 'DELETE' }),
};
