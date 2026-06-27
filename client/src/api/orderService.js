import { apiRequest } from './index';

export const orderApi = {
  // Create new order
  create: (orderData) => {
    const token = localStorage.getItem('token');
    return apiRequest('/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    });
  },

  // Get all orders with filtering and pagination
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/orders${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get single order by ID
  getById: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/orders/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Update order
  update: (id, updateData) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
  },

  // Update order status only
  updateStatus: (id, status) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
  },

  // Delete order
  delete: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/orders/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Service Team: Verify or reject a deal (pending_service_approval -> pending or rejected_by_service)
  verifyServiceOrder: (id, data) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/orders/${id}/service-verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  // Deal Verifications page: paginated, with serviceStatus filter
  getDealVerifications: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/orders/deal-verifications${queryString ? `?${queryString}` : ''}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
};