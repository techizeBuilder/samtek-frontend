import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const QCContext = createContext(null);
const BASE = '/api/qc';

export function QCProvider({ children }) {
  const qc = useQueryClient();

  const inv = (key) => () => qc.invalidateQueries({ queryKey: [key] });
  const invJobs = inv('qc-jobs');
  const invDashboard = inv('qc-dashboard');
  const invAll = () => { invJobs(); invDashboard(); };

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['qc-dashboard'],
    queryFn: () => apiRequest('GET', `${BASE}/dashboard`),
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['qc-jobs'],
    queryFn: () => apiRequest('GET', `${BASE}/jobs`),
  });

  const dashboard = dashboardData?.data || {};
  const jobs = jobsData?.data || [];

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createJobMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/jobs`, d), onSuccess: invAll });
  const updateJobMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/jobs/${id}`, data), onSuccess: invJobs });
  const startInspectionMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/jobs/${id}/start`, data), onSuccess: invAll });
  const updateChecklistItemMut = useMutation({ mutationFn: ({ id, itemId, data }) => apiRequest('PUT', `${BASE}/jobs/${id}/checklist/${itemId}`, data), onSuccess: invJobs });
  const addChecklistItemMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('POST', `${BASE}/jobs/${id}/checklist`, data), onSuccess: invJobs });
  const removeChecklistItemMut = useMutation({ mutationFn: ({ id, itemId }) => apiRequest('DELETE', `${BASE}/jobs/${id}/checklist/${itemId}`), onSuccess: invJobs });
  const submitDecisionMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/jobs/${id}/decision`, data), onSuccess: invAll });

  // ── Stable callbacks ──────────────────────────────────────────────────────────
  const createJob = useCallback((data) => createJobMut.mutateAsync(data), []);
  const updateJob = useCallback((id, data) => updateJobMut.mutateAsync({ id, data }), []);
  const startInspection = useCallback((id, data) => startInspectionMut.mutateAsync({ id, data }), []);
  const updateChecklistItem = useCallback((id, itemId, data) => updateChecklistItemMut.mutateAsync({ id, itemId, data }), []);
  const addChecklistItem = useCallback((id, data) => addChecklistItemMut.mutateAsync({ id, data }), []);
  const removeChecklistItem = useCallback((id, itemId) => removeChecklistItemMut.mutateAsync({ id, itemId }), []);
  const submitDecision = useCallback((id, data) => submitDecisionMut.mutateAsync({ id, data }), []);

  const refreshJob = useCallback((id) => qc.invalidateQueries({ queryKey: ['qc-job', id] }), [qc]);

  const getJobById = useCallback((id) => jobs.find(j => j._id === id) || null, [jobs]);

  return (
    <QCContext.Provider value={{
      dashboard, dashboardLoading,
      jobs, jobsLoading,
      createJob, updateJob,
      startInspection,
      updateChecklistItem, addChecklistItem, removeChecklistItem,
      submitDecision,
      getJobById, refreshJob,
    }}>
      {children}
    </QCContext.Provider>
  );
}

export function useQC() {
  const ctx = useContext(QCContext);
  if (!ctx) throw new Error('useQC must be used within QCProvider');
  return ctx;
}
