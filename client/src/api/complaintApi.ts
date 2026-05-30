import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create an Axios instance specifically for the complaints service
export const complaintClient = axios.create({
  baseURL: `${API_BASE}/complaints`,
});

// Auto-attach the auth token to every request
complaintClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Adjust if your token is stored elsewhere
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==========================================
// DISPATCHER / SUPPORT APIs
// ==========================================

export const getCustomerHistory = async (mobileNumber: string) => {
  const { data } = await complaintClient.get(`/purchase-history/${mobileNumber}`);
  return data;
};


export const getServicemen = async (status?: string, zone?: string) => {
  const params: any = {};
  if (status) params.status = status;
  if (zone) params.zone = zone;
  const { data } = await complaintClient.get('/servicemen', { params });
  return data;
};

export const createSupportTicket = async (payload: any) => {
  const { data } = await complaintClient.post('/create-ticket', payload);
  return data;
};

export const getSupportTickets = async (params: any) => {
  const { data } = await complaintClient.get('/tickets', { params });
  return data;
};

export const getTicketDetails = async (id: string) => {
  const { data } = await complaintClient.get(`/tickets/${id}`);
  return data;
};

export const assignTicket = async (id: string, payload: { technicianId: string; visitScheduledAt?: string }) => {
  const { data } = await complaintClient.put(`/tickets/${id}/assign`, payload);
  return data;
};

export const cancelTicket = async (id: string, payload: { reason?: string }) => {
  const { data } = await complaintClient.put(`/tickets/${id}/cancel`, payload);
  return data;
};

//  NEW: Dispatcher triggers email
export const sendVerificationEmail = async (id: string) => {
  const { data } = await complaintClient.post(`/tickets/${id}/send-verification`);
  return data;
};

//  NEW: Customer submits response (Public)
// NEW: Customer submits response (Public - Bypasses the auth interceptor!)
export const verifyCustomerResponse = async (token: string, payload: { action: 'approve' | 'reject'; comments?: string }) => {
  // Notice we use plain 'axios' here, NOT 'complaintClient'
  const { data } = await axios.post(`${API_BASE}/complaints/verify-response/${token}`, payload);
  return data;
};

// ==========================================
// TECHNICIAN APIs
// ==========================================

export const getMyTickets = async (params: any) => {
  const { data } = await complaintClient.get('/technician/tickets', { params });
  return data;
};

export const startVisit = async (id: string) => {
  const { data } = await complaintClient.put(`/technician/start-visit/${id}`);
  return data;
};

export const completeVisit = async (id: string, formData: FormData) => {
  // Axios automatically sets 'multipart/form-data' when it detects FormData
  const { data } = await complaintClient.put(`/technician/complete-visit/${id}`, formData);
  return data;
};

export const updateTechnician = async (id: string, payload: { serviceZone: string; technicianSkills: string[] }) => {
  const { data } = await complaintClient.put(`/servicemen/${id}`, payload);
  return data;
};