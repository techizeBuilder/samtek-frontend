import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import * as api from '../api/taskManagementApi';

// ==========================================
// TASK LIST (List view — page-based, keeps the previous page on screen while the next loads)
// ==========================================

export const useTasks = (filters: Record<string, any>, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.getAllTasks(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
};

// ==========================================
// KANBAN — accumulating pages via useInfiniteQuery.
// "Load More" = fetchNextPage(); already-loaded pages stay cached and are
// never re-fetched or replaced.
// ==========================================

export const useKanbanTasks = (filters: Record<string, any>, limit = 10, options?: { enabled?: boolean }) => {
  return useInfiniteQuery({
    queryKey: ['kanbanTasks', filters],
    queryFn: ({ pageParam }) => api.getAllTasks({ ...filters, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return nextPage <= (lastPage.totalPages || 1) ? nextPage : undefined;
    },
    enabled: options?.enabled ?? true,
  });
};

// ==========================================
// CALENDAR — whole visible month in one request, cached per month/filter combo
// ==========================================

export const useCalendarTasks = (filters: Record<string, any>, startDate: string, endDate: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['calendarTasks', filters, startDate, endDate],
    queryFn: () => api.getAllTasks({ ...filters, startDate, endDate, page: 1, limit: 1000 }),
    enabled: options?.enabled ?? true,
  });
};

// ==========================================
// DASHBOARD
// ==========================================

export const useTaskDashboard = (myTasksOnly = false) => {
  return useQuery({
    queryKey: ['taskDashboard', myTasksOnly],
    queryFn: () => api.getDashboardStats({ myTasksOnly }),
  });
};

// ==========================================
// TASK DETAILS (drawer)
// ==========================================

export const useTaskDetails = (taskId: string | null) => {
  return useQuery({
    queryKey: ['taskDetails', taskId],
    queryFn: () => api.getTaskById(taskId as string),
    enabled: !!taskId,
  });
};

// ==========================================
// MUTATIONS
// ==========================================

// Every write invalidates all three task views (List/Kanban/Calendar) plus the
// dashboard, so whichever one the user lands on next is guaranteed fresh.
const invalidateAllTaskViews = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['kanbanTasks'] });
  queryClient.invalidateQueries({ queryKey: ['calendarTasks'] });
  queryClient.invalidateQueries({ queryKey: ['taskDashboard'] });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => api.updateTaskStatus(taskId, status),
    onSuccess: (_, variables) => {
      invalidateAllTaskViews(queryClient);
      queryClient.invalidateQueries({ queryKey: ['taskDetails', variables.taskId] });
    },
  });
};

export const useAddTaskComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, text }: { taskId: string; text: string }) => api.addTaskComment(taskId, text),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskDetails', variables.taskId] });
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.createTask(formData),
    onSuccess: () => {
      invalidateAllTaskViews(queryClient);
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: () => {
      invalidateAllTaskViews(queryClient);
    },
  });
};

// ==========================================
// REPORTS
// ==========================================

export const useEmployeePerformanceReport = (filters: Record<string, any>, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['taskReports', 'employee', filters],
    queryFn: () => api.getEmployeePerformanceReport(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
};

export const useOverdueTasksReport = (filters: Record<string, any>, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['taskReports', 'overdue', filters],
    queryFn: () => api.getOverdueTasksReport(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
};

export const useTaskEfficiencyReport = (filters: Record<string, any>, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['taskReports', 'efficiency', filters],
    queryFn: () => api.getTaskEfficiencyReport(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
};

export const useProductivityReport = (filters: Record<string, any>, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['taskReports', 'productivity', filters],
    queryFn: () => api.getProductivityReport(filters),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
};

export const useExportReport = () => {
  return useMutation({
    mutationFn: ({ reportType, format, params }: { reportType: api.ReportKind; format: api.ExportFormat; params: Record<string, any> }) =>
      api.exportReport(reportType, format, params),
  });
};

// ==========================================
// ASSIGNABLE EMPLOYEES — shared, cached once (staleTime: Infinity globally),
// instead of Workspace/Reports/TaskCreationForm each independently paging
// through every user on every mount.
// ==========================================

export const useAssignableEmployees = () => {
  return useQuery({
    queryKey: ['assignableEmployees'],
    queryFn: api.getAllAssignableEmployees,
  });
};
