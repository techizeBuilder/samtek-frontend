import { apiRequest } from './index';

export const customerApi = {
  // Get all customers
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/customers${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get single customer by ID
  getById: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/customers/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Create new customer
  create: (customerData) => {
    const token = localStorage.getItem('token');
    return apiRequest('/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(customerData)
    });
  },

  // Update customer
  update: (id, updateData) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
  },

  // Delete customer
  delete: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/customers/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};

// Unit Head specific customer API
export const unitHeadCustomerApi = {
  // Get all customers for Unit Head
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/unit-head/customers${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get single customer by ID for Unit Head
  getById: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/unit-head/customers/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Create new customer as Unit Head
  create: (customerData) => {
    const token = localStorage.getItem('token');
    return apiRequest('/unit-head/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(customerData)
    });
  },

  // Update customer as Unit Head
  update: (id, updateData) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/unit-head/customers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
  },

  // Delete customer as Unit Head
  delete: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/unit-head/customers/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get customers list for dropdown (simplified version of getAll)
  getCustomers: () => {
    const token = localStorage.getItem('token');
    return apiRequest('/unit-head/customers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get sales persons list for dropdown
  getSalesPersons: () => {
    const token = localStorage.getItem('token');
    return apiRequest('/unit-head/sales-persons-list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};

// Accounts Sales Persons API
export const accountsSalesPersonsApi = {
  // Get all sales persons for the company
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/accounts/sales-persons${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get specific sales person details
  getById: (salesPersonId) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/accounts/sales-persons/${salesPersonId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get all orders for a specific sales person
  getOrders: (salesPersonId, params = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/accounts/sales-persons/${salesPersonId}/orders${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // NEW: Get daily stats for settlement
  getDailyStats: (salesmanId, date) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/accounts/sales-persons/daily-settlement/stats?salesmanId=${salesmanId}&date=${date}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // NEW: Save daily settlement
  saveDailySettlement: (data) => {
    const token = localStorage.getItem('token');
    return apiRequest('/accounts/sales-persons/daily-settlement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  // NEW: Get ledger
  getLedger: (salesmanId, params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/accounts/sales-persons/${salesmanId}/ledger${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // NEW: Calculate commission
  calculateCommission: (data) => {
    const token = localStorage.getItem('token');
    return apiRequest('/accounts/sales-persons/commission/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  },

  // NEW: Post commission to ledger
  postCommission: (data) => {
    const token = localStorage.getItem('token');
    return apiRequest('/accounts/sales-persons/commission/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  }
};

// Accounts Damage & Expiry API
export const accountsDamageExpiryApi = {
  // Get all damage and expiry items for the company
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const queryString = queryParams.toString();
    const token = localStorage.getItem('token');
    return apiRequest(`/accounts/damage-expiry${queryString ? `?${queryString}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Get specific damage/expiry item details
  getById: (id) => {
    const token = localStorage.getItem('token');
    return apiRequest(`/accounts/damage-expiry/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }
};