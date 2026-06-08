import { config } from '../config/environment.js';

const API_BASE_URL = config.apiURL;

class APIService {
  constructor() {
    this.baseURL = API_BASE_URL;
    console.log(`API Service initialized with base URL: ${this.baseURL} (${config.isDevelopment ? 'development' : 'production'} mode)`);
  }

  // Helper method to get role-based inventory API path
  getInventoryApiPath() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return '';

    try {
      const user = JSON.parse(userStr);
      switch (user.role) {
        case 'Superadmin':
        case 'Super Admin': // backend stores as 'Super Admin'
          return '/super-admin/inventory';
        case 'Unit Head':
          return '/unit-head/inventory';
        default:
          return '';
      }
    } catch (e) {
      return '';
    }
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        // Create a detailed error object with server response
        const error = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.data = data;
        error.success = data.success || false;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);

      // If it's a network error (no response), mark it as such
      if (!error.status && error.message.includes('fetch')) {
        error.isNetworkError = true;
        error.message = 'Unable to connect to the server. Please check your internet connection.';
        console.error('[NETWORK] Connection Problem:', error);
      }

      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Auth specific methods
  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  }

  async logout() {
    // Just call the server logout endpoint
    // Storage clearing is handled by AuthContext
    return this.post('/auth/logout');
  }

  async getCurrentUser() {
    return this.get('/auth/me');
  }

  // Profile methods
  async updateProfile(data) {
    return this.put('/profile', data);
  }

  async changePassword(data) {
    return this.put('/profile/password', data);
  }

  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('picture', file);
    return this.request('/profile/picture', {
      method: 'POST',
      body: formData,
      headers: { ...this.getAuthHeaders() }
    });
  }

  async resetUserPassword(userId, data) {
    return this.post(`/users/${userId}/reset-password`, data);
  }

  // Excel export methods - handle file downloads
  async exportCategoriesToExcel() {
    const inventoryPath = this.getInventoryApiPath();
    return this.downloadFile(`${inventoryPath}/categories/export`);
  }

  async exportCustomerCategoriesToExcel() {
    const inventoryPath = this.getInventoryApiPath();
    return this.downloadFile(`${inventoryPath}/customer-categories/export`);
  }

  async exportCustomersToExcel() {
    return this.downloadFile('/customers/export');
  }

  async importCustomersFromExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/customers/import', {
      method: 'POST',
      body: formData,
      headers: { ...this.getAuthHeaders() }
    });
  }

  async exportSuppliersToExcel() {
    return this.downloadFile('/suppliers/export');
  }

  async importSuppliersFromExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/suppliers/import', {
      method: 'POST',
      body: formData,
      headers: { ...this.getAuthHeaders() }
    });
  }

  async exportItemsToExcel() {
    const inventoryPath = this.getInventoryApiPath();
    return this.downloadFile(`${inventoryPath}/items/export`);
  }

  // File download method for Excel exports
  async downloadFile(endpoint) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return { success: true, message: 'File downloaded successfully' };
    } catch (error) {
      console.error('File download error:', error);
      throw error;
    }
  }

  // Data fetching methods for client-side Excel export
  async getItems() {
    return this.request('/items');
  }

  async getCategories() {
    return this.request('/categories');
  }

  async getCustomerCategories() {
    return this.request('/customer-categories');
  }

  async getCustomers(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== 'all') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();

    // Use role-based customer endpoint
    const userStr = localStorage.getItem('user');
    let endpoint = '/customers';

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        switch (user.role) {
          case 'Superadmin':
          case 'Super Admin': // backend stores as 'Super Admin'
            endpoint = '/super-admin/customers';
            break;
          case 'Unit Head':
            endpoint = '/unit-head/customers';
            break;
          case 'Unit Manager':
            endpoint = '/unit-manager/customers';
            break;
          case 'Sales':
            endpoint = '/sales/customers';
            break;
          default:
            endpoint = '/customers';
        }
      } catch (e) {
        // fallback to default
      }
    }

    return this.get(`${endpoint}${queryString ? `?${queryString}` : ''}`);
  }

  async getSuppliers() {
    return this.request('/suppliers');
  }

  async importItemsFromExcel(file) {
    const formData = new FormData();
    formData.append('file', file);
    // Don't set Content-Type manually, let browser set it with boundary
    const headers = { ...this.getAuthHeaders() };
    delete headers['Content-Type'];

    const inventoryPath = this.getInventoryApiPath();
    return this.request(`${inventoryPath}/items/import`, {
      method: 'POST',
      body: formData,
      headers
    });
  }

  async importCustomersFromExcel(file) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = { ...this.getAuthHeaders() };
    delete headers['Content-Type'];

    return this.request('/customers/import', {
      method: 'POST',
      body: formData,
      headers
    });
  }

  async importSuppliersFromExcel(file) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = { ...this.getAuthHeaders() };
    delete headers['Content-Type'];

    return this.request('/suppliers/import', {
      method: 'POST',
      body: formData,
      headers
    });
  }

  // Inventory CRUD methods using role-based paths
  async getItems() {
    const inventoryPath = this.getInventoryApiPath();
    return this.get(`${inventoryPath}/items`);
  }

  async getItemById(id) {
    const inventoryPath = this.getInventoryApiPath();
    return this.get(`${inventoryPath}/items/${id}`);
  }

  async createItem(data) {
    const inventoryPath = this.getInventoryApiPath();
    return this.post(`${inventoryPath}/items`, data);
  }

  async updateItem(id, data) {
    const inventoryPath = this.getInventoryApiPath();
    return this.put(`${inventoryPath}/items/${id}`, data);
  }

  async deleteItem(id) {
    const inventoryPath = this.getInventoryApiPath();
    return this.delete(`${inventoryPath}/items/${id}`);
  }

  async getCategories() {
    const inventoryPath = this.getInventoryApiPath();
    return this.get(`${inventoryPath}/categories`);
  }

  async createCategory(data) {
    const inventoryPath = this.getInventoryApiPath();
    return this.post(`${inventoryPath}/categories`, data);
  }

  async updateCategory(id, data) {
    const inventoryPath = this.getInventoryApiPath();
    return this.put(`${inventoryPath}/categories/${id}`, data);
  }

  async deleteCategory(id) {
    const inventoryPath = this.getInventoryApiPath();
    return this.delete(`${inventoryPath}/categories/${id}`);
  }

  async getCustomerCategories() {
    const inventoryPath = this.getInventoryApiPath();
    return this.get(`${inventoryPath}/customer-categories`);
  }

  async createCustomerCategory(data) {
    const inventoryPath = this.getInventoryApiPath();
    return this.post(`${inventoryPath}/customer-categories`, data);
  }

  async updateCustomerCategory(id, data) {
    const inventoryPath = this.getInventoryApiPath();
    return this.put(`${inventoryPath}/customer-categories/${id}`, data);
  }

  async deleteCustomerCategory(id) {
    const inventoryPath = this.getInventoryApiPath();
    return this.delete(`${inventoryPath}/customer-categories/${id}`);
  }

  async getInventoryStats() {
    const inventoryPath = this.getInventoryApiPath();
    return this.get(`${inventoryPath}/stats`);
  }

  async getLowStockItems() {
    const inventoryPath = this.getInventoryApiPath();
    return this.get(`${inventoryPath}/low-stock`);
  }

  async adjustStock(id, data) {
    const inventoryPath = this.getInventoryApiPath();
    return this.post(`${inventoryPath}/items/${id}/adjust-stock`, data);
  }

  // Export/Import methods for inventory
  async exportItems() {
    const inventoryPath = this.getInventoryApiPath();
    const response = await fetch(`${this.baseURL}${inventoryPath}/items/export`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }

  async exportCategories() {
    const inventoryPath = this.getInventoryApiPath();
    const response = await fetch(`${this.baseURL}${inventoryPath}/categories/export`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }

  async exportCustomerCategories() {
    const inventoryPath = this.getInventoryApiPath();
    const response = await fetch(`${this.baseURL}${inventoryPath}/customer-categories/export`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  }

  async importItems(file) {
    const inventoryPath = this.getInventoryApiPath();
    const formData = new FormData();
    formData.append('file', file);

    const headers = { ...this.getAuthHeaders() };
    delete headers['Content-Type'];

    return this.request(`${inventoryPath}/items/import`, {
      method: 'POST',
      body: formData,
      headers
    });
  }

  // Helper method to get role-based orders API path
  getOrdersApiPath() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return '/orders';

    try {
      const user = JSON.parse(userStr);
      switch (user.role) {
        case 'Superadmin':
        case 'Super Admin': // backend stores as 'Super Admin'
          return '/super-admin/orders';
        case 'Unit Head':
          return '/unit-head/orders';
        case 'Unit Manager':
          return '/unit-manager/orders';
        case 'Sales':
          return '/sales/orders';
        default:
          return '/orders';
      }
    } catch (e) {
      return '/orders';
    }
  }

  // Orders CRUD methods using role-based paths
  async getOrders(params = {}) {
    const ordersPath = this.getOrdersApiPath();
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== 'all') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    return this.get(`${ordersPath}${queryString ? `?${queryString}` : ''}`);
  }

  async getOrderById(id) {
    const ordersPath = this.getOrdersApiPath();
    return this.get(`${ordersPath}/${id}`);
  }

  async createOrder(data) {
    const ordersPath = this.getOrdersApiPath();
    return this.post(ordersPath, data);
  }

  async updateOrder(id, data) {
    const ordersPath = this.getOrdersApiPath();
    return this.put(`${ordersPath}/${id}`, data);
  }

  async updateOrderStatus(id, data) {
    const ordersPath = this.getOrdersApiPath();
    return this.request(`${ordersPath}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteOrder(id) {
    const ordersPath = this.getOrdersApiPath();
    return this.delete(`${ordersPath}/${id}`);
  }

  // Get customers for order creation (role-based)
  async getOrderCustomers() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return this.get('/api/customers');

    try {
      const user = JSON.parse(userStr);
      switch (user.role) {
        case 'Superadmin':
          return this.get('/api/super-admin/customers');
        case 'Unit Head':
          return this.get('/api/unit-head/customers');
        case 'Unit Manager':
          return this.get('/api/unit-manager/customers');
        case 'Sales':
          return this.get('/api/sales/customers');
        default:
          return this.get('/api/customers');
      }
    } catch (e) {
      return this.get('/api/customers');
    }
  }

  // Company Management APIs
  async getCompanies(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    return this.get(`/super-admin/companies${queryString ? `?${queryString}` : ''}`);
  }

  async getCompanyById(id) {
    return this.get(`/super-admin/companies/${id}`);
  }

  async createCompany(data) {
    return this.post('/super-admin/companies', data);
  }

  async updateCompany(id, data) {
    return this.put(`/super-admin/companies/${id}`, data);
  }

  async deleteCompany(id) {
    return this.delete(`/super-admin/companies/${id}`);
  }

  async getCompaniesDropdown(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    return this.get(`/companies/dropdown${queryString ? `?${queryString}` : ''}`);
  }

  async getCompanyStats() {
    return this.get('/super-admin/companies/stats');
  }

  async getCompanyReport(id) {
    return this.get(`/super-admin/companies/${id}/report`);
  }

  // ============ CUTOFF TIME MANAGEMENT APIs ============

  // Get current cutoff time setting for unit head's company
  async getCutoffTime() {
    return this.get('/unit-head/cutoff-time');
  }

  // Set or update cutoff time
  async setCutoffTime(data) {
    // Map frontend data structure to backend expected format
    const requestData = {
      cutoffTime: data.time,  // Map 'time' to 'cutoffTime'
      description: data.description
    };

    // Use POST - backend handles both create and update logic
    return this.post('/unit-head/cutoff-time', requestData);
  }

  // Toggle cutoff time active status
  async toggleCutoffTime(isActive) {
    return this.request('/unit-head/cutoff-time/toggle', {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  }

  // Check if orders are currently allowed (utility function)
  async canPlaceOrder() {
    try {
      const response = await this.getCutoffTime();
      if (response.data && response.data.currentStatus) {
        return {
          allowed: response.data.currentStatus.allowed,
          message: response.data.currentStatus.message,
          cutoffTime: response.data.cutoffTime
        };
      }
      // If no cutoff time set, orders are allowed
      return { allowed: true, message: 'No cutoff restrictions' };
    } catch (error) {
      console.error('Error checking order permission:', error);
      // Fail-safe: if can't check, allow orders
      return { allowed: true, message: 'Unable to check cutoff time' };
    }
  }

  // Sales-specific cutoff time status check
  async getSalesCutoffTimeStatus() {
    return this.get('/sales/cutoff-time-status');
  }

  // ============ EXPENSE & FINANCE APIs ============
  async getExpenses(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== 'all') {
        queryParams.append(key, params[key]);
      }
    });
    return this.get(`/expenses?${queryParams.toString()}`);
  }

  async createExpense(data) {
    return this.post('/expenses', data);
  }

  async updateExpense(id, data) {
    return this.put(`/expenses/${id}`, data);
  }

  async deleteExpense(id) {
    return this.delete(`/expenses/${id}`);
  }

  async getExpenseStats(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return this.get(`/expenses/stats?${queryParams.toString()}`);
  }

  async getAllExpenseRequests() {
    return this.get('/expense-requests/all');
  }

  async payExpenseRequest(id, data) {
    return this.post(`/expense-requests/${id}/pay`, data);
  }

  async getFinanceSummary(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return this.get(`/finance/summary?${queryParams.toString()}`);
  }

  // ============ BANK & CASH APIs ============
  async getAccounts(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return this.get(`/accounts?${queryParams.toString()}`);
  }

  async createAccount(data) {
    return this.post('/accounts', data);
  }

  async updateAccount(id, data) {
    return this.put(`/accounts/${id}`, data);
  }

  async getAccountById(id) {
    return this.get(`/accounts/${id}`);
  }

  async deleteAccount(id) {
    return this.delete(`/accounts/${id}`);
  }

  async getBankCashSummary(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return this.get(`/accounts/bank-cash/summary?${queryParams.toString()}`);
  }

  async reconcileTransaction(id, data) {
    return this.put(`/accounts/bank-cash/reconcile/${id}`, data);
  }

  async getLedgerRecords(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return this.get(`/accounts/ledger?${queryParams.toString()}`);
  }

  // ============ PARTNER MANAGEMENT APIs ============
  async getPartners() {
    return this.get('/accounts/partners');
  }

  async createPartner(data) {
    return this.post('/accounts/partners', data);
  }

  async updatePartner(id, data) {
    return this.put(`/accounts/partners/${id}`, data);
  }

  async deletePartner(id) {
    return this.delete(`/accounts/partners/${id}`);
  }

  // ============ ACCOUNTS DASHBOARD ====================
  async getAccountsDashboardData(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const qs = queryParams.toString();
    return this.get(`/accounts/dashboard${qs ? `?${qs}` : ''}`);
  }
}

export const api = new APIService();
export default api;

// Export individual methods for easier importing
export const getOrders = (params) => api.getOrders(params);
export const getOrder = (id) => api.getOrderById(id);
export const createOrder = (data) => api.createOrder(data);
export const updateOrder = (id, data) => api.updateOrder(id, data);
export const updateOrderStatus = (id, data) => api.updateOrderStatus(id, data);
export const deleteOrder = (id) => api.deleteOrder(id);
export const getCustomers = (params) => api.getCustomers(params);
export const getInventoryItems = (params) => api.getItems(params);
export const getItems = (params) => api.getItems(params);
export const getOrderById = (id) => api.getOrderById(id);

// Cutoff Time API exports
export const getCutoffTime = () => api.getCutoffTime();
export const setCutoffTime = (data) => api.setCutoffTime(data);
export const toggleCutoffTime = (isActive) => api.toggleCutoffTime(isActive);
export const canPlaceOrder = () => api.canPlaceOrder();

// Sales Cutoff Time API
export const getSalesCutoffTimeStatus = () => api.getSalesCutoffTimeStatus();

// Company Report API
export const getCompanyReport = (id) => api.getCompanyReport(id);