import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const PackagingDispatchContext = createContext(null);
const BASE = '/api/packaging-dispatch';

export function PackagingDispatchProvider({ children }) {
  const qc = useQueryClient();

  const inv = (key) => () => qc.invalidateQueries({ queryKey: [key] });
  const invJobs = inv('pkg-jobs');
  const invOrders = inv('pkg-dispatch-orders');
  const invDashboard = inv('pkg-dashboard');
  const invReady = inv('pkg-ready');

  const invalidateAll = () => {
    invJobs(); invOrders(); invDashboard(); invReady();
  };

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['pkg-dashboard'],
    queryFn: () => apiRequest('GET', `${BASE}/dashboard`),
  });

  const { data: readyData, isLoading: readyLoading } = useQuery({
    queryKey: ['pkg-ready'],
    queryFn: () => apiRequest('GET', `${BASE}/ready-for-packaging`),
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['pkg-jobs'],
    queryFn: () => apiRequest('GET', `${BASE}/jobs`),
  });

  const { data: dispatchOrdersData, isLoading: dispatchOrdersLoading } = useQuery({
    queryKey: ['pkg-dispatch-orders'],
    queryFn: () => apiRequest('GET', `${BASE}/dispatch-orders`),
  });

  const dashboard = dashboardData?.data || {};
  const readyOrders = readyData?.data || [];
  const jobs = jobsData?.data || [];
  const dispatchOrders = dispatchOrdersData?.data || [];

  // ── Packaging Job Mutations ───────────────────────────────────────────────────
  const createJobMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/jobs`, d), onSuccess: () => { invJobs(); invReady(); invDashboard(); } });
  const updatePackingTypeMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/jobs/${id}/packing-type`, data), onSuccess: invJobs });
  const startPackingMut = useMutation({ mutationFn: (id) => apiRequest('PUT', `${BASE}/jobs/${id}/start`), onSuccess: () => { invJobs(); invDashboard(); } });
  const updateChecklistMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/jobs/${id}/checklist`, data), onSuccess: invJobs });
  const completePackingMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/jobs/${id}/complete`, data), onSuccess: () => { invJobs(); invDashboard(); } });

  // ── Dispatch Order Mutations ──────────────────────────────────────────────────
  const createDispatchOrderMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/dispatch-orders`, d), onSuccess: () => { invOrders(); invJobs(); invDashboard(); } });
  const updateDispatchOrderMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/dispatch-orders/${id}`, data), onSuccess: invOrders });
  const executeDispatchMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/dispatch-orders/${id}/execute`, data), onSuccess: () => { invOrders(); invDashboard(); } });
  const markInTransitMut = useMutation({ mutationFn: (id) => apiRequest('PUT', `${BASE}/dispatch-orders/${id}/in-transit`), onSuccess: () => { invOrders(); invDashboard(); } });
  const confirmDeliveryMut = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/dispatch-orders/${id}/deliver`, data),
    onSuccess: () => { invOrders(); invDashboard(); },
  });
  const closeDispatchMut = useMutation({ mutationFn: (id) => apiRequest('PUT', `${BASE}/dispatch-orders/${id}/close`), onSuccess: () => { invOrders(); invDashboard(); } });

  // ── Stable callbacks ─────────────────────────────────────────────────────────
  const createJob = useCallback((data) => createJobMut.mutateAsync(data), []);
  const updatePackingType = useCallback((id, data) => updatePackingTypeMut.mutateAsync({ id, data }), []);
  const startPacking = useCallback((id) => startPackingMut.mutateAsync(id), []);
  const updateChecklist = useCallback((id, data) => updateChecklistMut.mutateAsync({ id, data }), []);
  const completePacking = useCallback((id, data) => completePackingMut.mutateAsync({ id, data }), []);

  const createDispatchOrder = useCallback((data) => createDispatchOrderMut.mutateAsync(data), []);
  const updateDispatchOrder = useCallback((id, data) => updateDispatchOrderMut.mutateAsync({ id, data }), []);
  const executeDispatch = useCallback((id, data) => executeDispatchMut.mutateAsync({ id, data }), []);
  const markInTransit = useCallback((id) => markInTransitMut.mutateAsync(id), []);
  const confirmDelivery = useCallback((id, data) => confirmDeliveryMut.mutateAsync({ id, data }), []);
  const closeDispatch = useCallback((id) => closeDispatchMut.mutateAsync(id), []);

  return (
    <PackagingDispatchContext.Provider value={{
      dashboard, dashboardLoading,
      readyOrders, readyLoading,
      jobs, jobsLoading,
      dispatchOrders, dispatchOrdersLoading,
      createJob,
      updatePackingType,
      startPacking,
      updateChecklist,
      completePacking,
      createDispatchOrder,
      updateDispatchOrder,
      executeDispatch,
      markInTransit,
      confirmDelivery,
      closeDispatch,
      invalidateAll,
    }}>
      {children}
    </PackagingDispatchContext.Provider>
  );
}

export function usePackagingDispatch() {
  const ctx = useContext(PackagingDispatchContext);
  if (!ctx) throw new Error('usePackagingDispatch must be used within PackagingDispatchProvider');
  return ctx;
}
