const API_BASE = import.meta.env.VITE_API_URL || '/api';

const apiFetch = (url, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${API_BASE}/admin-settings${url}`, {
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

export const adminSettingsApi = {
  // Full settings
  getAll: () => apiFetch('/'),

  // SMTP (platform-wide, Super Admin only)
  getGlobalSmtp: () => apiFetch('/global-smtp'),
  addSmtp: (body) => apiFetch('/global-smtp', { method: 'POST', body: JSON.stringify(body) }),
  updateSmtp: (id, body) => apiFetch(`/global-smtp/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSmtp: (id) => apiFetch(`/global-smtp/${id}`, { method: 'DELETE' }),

  // Lead Stages
  addLeadStage: (body) => apiFetch('/lead-stages', { method: 'POST', body: JSON.stringify(body) }),
  updateLeadStage: (id, body) => apiFetch(`/lead-stages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLeadStage: (id) => apiFetch(`/lead-stages/${id}`, { method: 'DELETE' }),

  // Lead Sources
  addLeadSource: (body) => apiFetch('/lead-sources', { method: 'POST', body: JSON.stringify(body) }),
  updateLeadSource: (id, body) => apiFetch(`/lead-sources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLeadSource: (id) => apiFetch(`/lead-sources/${id}`, { method: 'DELETE' }),

  // Business Types
  addBusinessType: (body) => apiFetch('/business-types', { method: 'POST', body: JSON.stringify(body) }),
  updateBusinessType: (id, body) => apiFetch(`/business-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBusinessType: (id) => apiFetch(`/business-types/${id}`, { method: 'DELETE' }),

  // Document Types
  addDocumentType: (body) => apiFetch('/document-types', { method: 'POST', body: JSON.stringify(body) }),
  updateDocumentType: (id, body) => apiFetch(`/document-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDocumentType: (id) => apiFetch(`/document-types/${id}`, { method: 'DELETE' }),

  // Lead Reject Reasons
  addLeadRejectReason: (body) => apiFetch('/lead-reject-reasons', { method: 'POST', body: JSON.stringify(body) }),
  updateLeadRejectReason: (id, body) => apiFetch(`/lead-reject-reasons/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLeadRejectReason: (id) => apiFetch(`/lead-reject-reasons/${id}`, { method: 'DELETE' }),

  // Terms & Conditions
  addTerm: (body) => apiFetch('/terms', { method: 'POST', body: JSON.stringify(body) }),
  updateTerm: (id, body) => apiFetch(`/terms/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTerm: (id) => apiFetch(`/terms/${id}`, { method: 'DELETE' }),

  // Additional Charges
  addCharge: (body) => apiFetch('/charges', { method: 'POST', body: JSON.stringify(body) }),
  updateCharge: (id, body) => apiFetch(`/charges/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCharge: (id) => apiFetch(`/charges/${id}`, { method: 'DELETE' }),

  // Quotation Notes
  addNote: (body) => apiFetch('/notes', { method: 'POST', body: JSON.stringify(body) }),
  updateNote: (id, body) => apiFetch(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteNote: (id) => apiFetch(`/notes/${id}`, { method: 'DELETE' }),

  // Dispatch Checklist
  addDispatchChecklistItem: (body) => apiFetch('/dispatch-checklist', { method: 'POST', body: JSON.stringify(body) }),
  updateDispatchChecklistItem: (id, body) => apiFetch(`/dispatch-checklist/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDispatchChecklistItem: (id) => apiFetch(`/dispatch-checklist/${id}`, { method: 'DELETE' }),

  // Quotation Number Settings
  addQuotationNumberSetting: (body) => apiFetch('/quotation-number-settings', { method: 'POST', body: JSON.stringify(body) }),
  updateQuotationNumberSetting: (id, body) => apiFetch(`/quotation-number-settings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteQuotationNumberSetting: (id) => apiFetch(`/quotation-number-settings/${id}`, { method: 'DELETE' }),

  // HRMS: Upload Document Settings
  addHrmsDocumentType: (body) => apiFetch('/hrms-document-types', { method: 'POST', body: JSON.stringify(body) }),
  updateHrmsDocumentType: (id, body) => apiFetch(`/hrms-document-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteHrmsDocumentType: (id) => apiFetch(`/hrms-document-types/${id}`, { method: 'DELETE' }),

  // HRMS: Role Setting
  getRoles: () => apiFetch('/roles'),
  addRole: (body) => apiFetch('/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (id, body) => apiFetch(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRole: (id) => apiFetch(`/roles/${id}`, { method: 'DELETE' }),
};
