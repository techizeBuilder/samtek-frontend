const API_BASE = import.meta.env.VITE_API_URL || '/api';

const apiFetch = (url, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_BASE}/sales-item-requests${url}`, {
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

export const salesItemRequestApi = {
  // Sales requests a new product for a lead — multipart (optional image file).
  // `fields`: { leadId, leadCode, productName, production, category, application, quantity }
  createRequest: (fields, imageFile) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v !== undefined && v !== null) formData.append(k, v); });
    if (imageFile) formData.append('image', imageFile);
    return fetch(`${API_BASE}/sales-item-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets multipart boundary
      body: formData,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    });
  },

  // Same endpoint powers Sales's "requests for this lead" view (leadId filter)
  // and R&D's approval inbox (status filter).
  listRequests: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.append(k, v); });
    const s = qs.toString();
    return apiFetch(`/${s ? `?${s}` : ''}`);
  },

  // R&D approve/reject — { decision: 'approve' | 'reject', remarks }
  reviewRequest: (id, body) => apiFetch(`/${id}/review`, { method: 'PUT', body: JSON.stringify(body) }),

  // Sales withdraws their own still-Pending request.
  cancelRequest: (id) => apiFetch(`/${id}`, { method: 'DELETE' }),
};
