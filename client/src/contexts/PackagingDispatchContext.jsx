import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const PackagingDispatchContext = createContext(null);
const BASE = '/api/packaging-dispatch';

export function PackagingDispatchProvider({ children }) {
  const qc = useQueryClient();

  // Partial-key match: invalidating a shorter key invalidates every query
  // whose key starts with it (the bounded active-work feed here AND any
  // currently-mounted paginated list query below), but only mounted queries
  // actually refetch — so this stays cheap regardless of how many pages are
  // watching packaging-job/dispatch-order data.
  const invJobs = () => qc.invalidateQueries({ queryKey: ['pkg-jobs'] });
  const invOrders = () => qc.invalidateQueries({ queryKey: ['pkg-dispatch-orders'] });
  const invDashboard = () => qc.invalidateQueries({ queryKey: ['pkg-dashboard'] });
  const invReady = () => qc.invalidateQueries({ queryKey: ['pkg-ready'] });

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

  // Bounded "current work" feed (non-Dispatched jobs, or dispatched within
  // the last 7 days) — Packaging Jobs (which needs full, searchable history
  // including Dispatched ones) reads from its own paginated query instead,
  // see usePackagingJobsList below.
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['pkg-jobs', 'active'],
    queryFn: () => apiRequest('GET', `${BASE}/jobs/active`),
  });

  // Bounded "current work" feed (everything except Closed) — Dispatch
  // History reads from its own paginated query instead, see
  // useDispatchOrdersList below.
  const { data: dispatchOrdersData, isLoading: dispatchOrdersLoading } = useQuery({
    queryKey: ['pkg-dispatch-orders', 'active'],
    queryFn: () => apiRequest('GET', `${BASE}/dispatch-orders/active`),
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

function buildParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      params.append(key, value.toString());
    }
  });
  return params;
}

// Shared paginated/searchable/filterable job list — for Packaging Jobs, which
// needs to browse full job history (including already-Dispatched ones),
// unlike the bounded "active work" feed the provider above exposes as
// `jobs`. Shares the 'pkg-jobs' key prefix so invJobs() (any mutation)
// refreshes this too whenever it's mounted.
export function usePackagingJobsList(filters, options = {}) {
  return useQuery({
    queryKey: ['pkg-jobs', 'list', filters],
    queryFn: () => apiRequest('GET', `${BASE}/jobs?${buildParams(filters).toString()}`),
    keepPreviousData: true,
    ...options,
  });
}

// Shared paginated/searchable/filterable dispatch-order list — for Dispatch
// History, which needs to browse full dispatch history (Delivered/Closed),
// unlike the bounded "current work" feed the provider above exposes as
// `dispatchOrders`. Shares the 'pkg-dispatch-orders' key prefix so
// invOrders() (any mutation) refreshes this too whenever it's mounted.
export function useDispatchOrdersList(filters, options = {}) {
  return useQuery({
    queryKey: ['pkg-dispatch-orders', 'list', filters],
    queryFn: () => apiRequest('GET', `${BASE}/dispatch-orders?${buildParams(filters).toString()}`),
    keepPreviousData: true,
    ...options,
  });
}
