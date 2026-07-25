import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create an Axios instance specifically for the task management service
export const taskClient = axios.create({
  baseURL: `${API_BASE}/hrms/tasks`,
});

// Auto-attach the auth token to every request
taskClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Users live outside the /hrms/tasks namespace, so this one uses its own instance.
const usersClient = axios.create({ baseURL: API_BASE });
usersClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==========================================
// TASKS
// ==========================================

export const getAllTasks = async (params: Record<string, any>) => {
  const { data } = await taskClient.get('/all', { params });
  return data;
};

export const getDashboardStats = async (params: { myTasksOnly?: boolean } = {}) => {
  const { data } = await taskClient.get('/dashboard', { params });
  return data;
};

export const getTaskById = async (taskId: string) => {
  const { data } = await taskClient.get(`/task/${taskId}`);
  return data;
};

export const createTask = async (formData: FormData) => {
  const { data } = await taskClient.post('/create', formData);
  return data;
};

export const updateTaskStatus = async (taskId: string, status: string) => {
  const { data } = await taskClient.put(`/update/${taskId}`, { status });
  return data;
};

export const addTaskComment = async (taskId: string, text: string) => {
  const { data } = await taskClient.post(`/comment/${taskId}`, { text });
  return data;
};

export const deleteTask = async (taskId: string) => {
  const { data } = await taskClient.delete(`/delete/${taskId}`);
  return data;
};

// ==========================================
// REPORTS
// ==========================================

export const getEmployeePerformanceReport = async (params: Record<string, any>) => {
  const { data } = await taskClient.get('/reports/employee-wise', { params });
  return data;
};

export const getOverdueTasksReport = async (params: Record<string, any>) => {
  const { data } = await taskClient.get('/reports/overdue', { params });
  return data;
};

export const getTaskEfficiencyReport = async (params: Record<string, any>) => {
  const { data } = await taskClient.get('/reports/task-efficiency', { params });
  return data;
};

export const getProductivityReport = async (params: Record<string, any>) => {
  const { data } = await taskClient.get('/reports/productivity', { params });
  return data;
};

export type ReportKind = 'employee-wise' | 'overdue' | 'task-efficiency' | 'productivity';
export type ExportFormat = 'excel' | 'pdf';

export const exportReport = async (reportType: ReportKind, format: ExportFormat, params: Record<string, any>) => {
  const response = await taskClient.get(`/reports/export/${reportType}/${format}`, {
    params,
    responseType: 'blob',
  });
  return response.data as Blob;
};

// ==========================================
// ASSIGNABLE EMPLOYEES (shared across Workspace / Reports / Task Creation)
// ==========================================

// The /users endpoint is paginated; task management needs the full list for
// client-side department/manager filtering, so this walks every page once.
export const getAllAssignableEmployees = async () => {
  let allUsers: any[] = [];
  let currentPage = 1;
  let fetchedTotalPages = 1;

  do {
    const { data: responseData } = await usersClient.get('/users', {
      params: { page: currentPage, limit: 100 },
    });

    let usersChunk: any[] = [];
    if (Array.isArray(responseData?.users)) usersChunk = responseData.users;
    else if (Array.isArray(responseData?.data?.users)) usersChunk = responseData.data.users;

    if (usersChunk.length > 0) {
      allUsers = [...allUsers, ...usersChunk];
    } else {
      break;
    }

    fetchedTotalPages = responseData.pagination?.pages || responseData.data?.pagination?.pages || 1;
    currentPage++;
    if (currentPage > 20) break;
  } while (currentPage <= fetchedTotalPages);

  return allUsers;
};
