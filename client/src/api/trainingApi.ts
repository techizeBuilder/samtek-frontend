import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create an Axios instance specifically for the training service
export const trainingClient = axios.create({
  baseURL: `${API_BASE}/training`,
});

// Auto-attach the auth token to every request
trainingClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- CERTIFICATE API ---
export const downloadCertificate = async (profileId: string) => {
  // CRITICAL: responseType 'blob' tells Axios to handle the binary PDF data correctly
  const response = await trainingClient.get(`/certificate/download/${profileId}`, {
    responseType: 'blob',
  });
  return response.data;
};
// ==========================================
// 0. dashboard API
// ==========================================
export const getAdminDashboard = async () => {
  const { data } = await trainingClient.get('/admin/dashboard');
  return data;
};
// ==========================================
// 1. TRAINEE MANAGEMENT APIs (Admin/Manager)
// ==========================================

// Get fresh hires from HRMS who haven't been staged yet
export const getAvailableTrainees = async () => {
  const { data } = await trainingClient.get('/available-trainees');
  return data;
};

// Replace 'createTrainee'. This stages an existing user into the LMS.
export const stageCandidate = async (payload: { userId: string, assignedModules: string[] }) => {
  const { data } = await trainingClient.post('/stage-candidate', payload);
  return data;
};

// Get the list of actively training candidates (Lightweight for tables)
export const getActiveTrainees = async (params?: any) => {
  // params can include { page, limit, department, status, isEligible }
  const { data } = await trainingClient.get('/trainees', { params });
  return data;
};

// Get full details (Progress, Scores) for a specific candidate
export const getTraineeDetails = async (id: string) => {
  const { data } = await trainingClient.get(`/trainees/${id}`);
  return data;
};

// Update a candidate's assigned courses after they have been staged
export const updateTraineeModules = async (id: string, assignedModules: string[]) => {
  const { data } = await trainingClient.put(`/trainees/${id}/modules`, { assignedModules });
  return data;
};

// Hire or Reject a candidate based on their test results
export const finalizeTrainee = async (id: string, action: 'hire' | 'reject') => {
  const { data } = await trainingClient.post(`/trainees/${id}/finalize`, { action });
  return data;
};

// Hard delete a trainee and wipe their records
export const deleteTraineeRecord = async (id: string) => {
  const { data } = await trainingClient.delete(`/trainees/${id}`);
  return data;
};


// ==========================================
// 2. MODULE MANAGEMENT APIs (Admin/Manager)
// ==========================================

export const createTrainingModule = async (formData: FormData) => {
  const { data } = await trainingClient.post('/modules', formData);
  return data;
};

export const getModules = async (params?: any) => {
  // params can include { department }
  const { data } = await trainingClient.get('/modules', { params });
  return data;
};

// NEW: Edit module text details
export const updateTrainingModule = async (id: string, payload: any) => {
  const { data } = await trainingClient.put(`/modules/${id}`, payload);
  return data;
};

export const deactivateModule = async (id: string) => {
  const { data } = await trainingClient.delete(`/modules/${id}`);
  return data;
};

// NEW: Add new media files to an existing module
export const addMediaToModule = async (moduleId: string, formData: FormData) => {
  const { data } = await trainingClient.post(`/modules/${moduleId}/media`, formData);
  return data;
};

// NEW: Remove a specific video/PDF from a module
export const removeMediaFromModule = async (moduleId: string, contentId: string) => {
  const { data } = await trainingClient.delete(`/modules/${moduleId}/media/${contentId}`);
  return data;
};


// ==========================================
// 3. QUESTION BANK APIs (Admin/Manager)
// ==========================================

export const addQuestionToModule = async (moduleId: string, payload: any) => {
  const { data } = await trainingClient.post(`/modules/${moduleId}/questions`, payload);
  return data;
};

export const getQuestions = async (moduleId: string, params?: any) => {
  // params can include { page, limit }
  const { data } = await trainingClient.get(`/modules/${moduleId}/questions`, { params });
  return data;
};

// NEW: Fix typos or change the correct answer
export const updateQuestion = async (questionId: string, payload: any) => {
  const { data } = await trainingClient.put(`/questions/${questionId}`, payload);
  return data;
};

export const deleteQuestion = async (questionId: string) => {
  const { data } = await trainingClient.delete(`/questions/${questionId}`);
  return data;
};



// ==========================================
// 4. PHASE 2: TRAINEE / CANDIDATE APIs
// ==========================================

export const getMyDashboard = async () => {
  const { data } = await trainingClient.get('/my-learning/dashboard');
  return data;
};

export const getModuleLearningView = async (moduleId: string) => {
  const { data } = await trainingClient.get(`/my-learning/module/${moduleId}`);
  return data;
};

export const markContentCompleted = async (payload: { moduleId: string; contentId: string }) => {
  const { data } = await trainingClient.post('/my-learning/module/mark-content-completed', payload);
  return data;
};

export const startTest = async (moduleId: string) => {
  const { data } = await trainingClient.post(`/my-learning/module/${moduleId}/start-test`);
  return data;
};

export const submitTest = async (payload: { testAttemptId: string; answers: { questionId: string; selectedOption: string }[] }) => {
  const { data } = await trainingClient.post('/my-learning/module/submit-test', payload);
  return data;
};