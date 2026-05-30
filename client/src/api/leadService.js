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

  markAsWon: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/leads/${id}/won`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
  }
};
