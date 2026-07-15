import { apiRequest } from './index';

export const leadApi = {
  create: (leadData) => {
    const token = localStorage.getItem('token');
    return apiRequest('/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(leadData)
    });
  },

  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/leads${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getById: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getQuotation: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}/quotation`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  update: (id, updateData) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
  },

  delete: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  checkExisting: (params) => {
    const queryParams = new URLSearchParams(params);
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/check?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getUsers: () => {
    const token = localStorage.getItem('token');
    return apiRequest('/leads/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  getItems: () => {
    const token = localStorage.getItem('token');
    return apiRequest('/sales/items', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  markAsWon: (id, salesChecklist) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}/won`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ salesChecklist })
    });
  },

  requestPaymentCheck: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}/request-payment-check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  updatePaymentCheckStatus: (id, status, remarks) => {
    const token = localStorage.getItem('token');
    const bodyData = typeof status === 'object' ? status : { status, remarks };
    return apiRequest(`/leads/${id}/payment-check`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bodyData)
    });
  },

  sendToAccount: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}/send-to-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  uploadLeadDocuments: async (id, files) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    if (files.po) formData.append('po', files.po);
    if (files.paymentProof) formData.append('paymentProof', files.paymentProof);
    if (files.quotation) formData.append('quotation', files.quotation);

    const res = await fetch(`/api/leads/${id}/upload-documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // No Content-Type — browser sets multipart boundary automatically
      },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      const error = new Error(err.message || 'Upload failed');
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  addLeadDocument: async (id, docType, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    const res = await fetch(`/api/leads/${id}/add-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      const error = new Error(err.message || 'Upload failed');
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  // ─── IndiaMART Sync ──────────────────────────────────────────
  syncIndiamart: () => {
    const token = localStorage.getItem('token');
    return apiRequest('/leads/sync-indiamart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // ─── IVR (Acefone) Sync ──────────────────────────────────────
  syncIvr: () => {
    const token = localStorage.getItem('token');
    return apiRequest('/leads/sync-ivr', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // ─── API Settings ────────────────────────────────────────────
  getApiSettings: () => {
    const token = localStorage.getItem('token');
    return apiRequest('/leads/api-settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  saveApiSettings: (data) => {
    const token = localStorage.getItem('token');
    return apiRequest('/leads/api-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  // ─── Click-to-Call (Acefone) ─────────────────────────────────
  clickToCall: (customerNumber) => {
    const token = localStorage.getItem('token');
    return apiRequest('/leads/click-to-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ customerNumber })
    });
  },

  // ─── Call Logs ───────────────────────────────────────────────
  getCallLogs: (leadId) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${leadId}/call-logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // ─── Meeting Schedule ─────────────────────────────────────────
  scheduleMeeting: (leadId, data) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${leadId}/meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  updateMeeting: (leadId, data) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${leadId}/meeting`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  getMeeting: (leadId) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${leadId}/meeting`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // All meetings of a lead (pending + done history) — Meeting Attempts modal
  getMeetings: (leadId) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${leadId}/meetings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  },

  // Save attempt notes + mark the meeting Done
  completeMeeting: (leadId, meetingId, attemptNote) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${leadId}/meeting/${meetingId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ attemptNote })
    });
  }
};

