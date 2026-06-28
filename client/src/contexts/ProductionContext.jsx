import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const ProductionContext = createContext(null);

export const PROCESS_STEPS = ['Job Work', 'Fabrication', 'Assembly', 'Painting', 'Re-Assembly', 'Final Testing'];
export const PROCESS_TYPE_MAP = {
  'Job Work': 'Outsourcing',
  'Fabrication': 'In-House',
  'Assembly': 'In-House',
  'Painting': 'In-House',
  'Re-Assembly': 'In-House',
  'Final Testing': 'In-House',
};

const BASE = '/api/production-mfg';

export function ProductionProvider({ children }) {
  const qc = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['production-mfg-orders'],
    queryFn: () => apiRequest('GET', `${BASE}/orders`),
  });

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['production-mfg-teams'],
    queryFn: () => apiRequest('GET', `${BASE}/teams`),
  });

  const orders = ordersData?.data || [];
  const teams = teamsData?.data || [];

  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ['production-mfg-orders'] });
  const invalidateTeams = () => qc.invalidateQueries({ queryKey: ['production-mfg-teams'] });

  // ── Order mutations ────────────────────────────────────────────────────────
  const addOrderMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', `${BASE}/orders`, data),
    onSuccess: invalidateOrders,
  });

  const verifyBOMMutation = useMutation({
    mutationFn: (id) => apiRequest('PUT', `${BASE}/orders/${id}/verify-bom`),
    onSuccess: invalidateOrders,
  });

  const verifyDesignMutation = useMutation({
    mutationFn: (id) => apiRequest('PUT', `${BASE}/orders/${id}/verify-design`),
    onSuccess: invalidateOrders,
  });

  const raiseRDRequestMutation = useMutation({
    mutationFn: (id) => apiRequest('PUT', `${BASE}/orders/${id}/raise-rd-request`),
    onSuccess: invalidateOrders,
  });

  const markMaterialIssuedMutation = useMutation({
    mutationFn: (id) => apiRequest('PUT', `${BASE}/orders/${id}/mark-material-issued`),
    onSuccess: invalidateOrders,
  });

  // ── Material mutations ─────────────────────────────────────────────────────
  const addMaterialDemandMutation = useMutation({
    mutationFn: ({ orderId, demand }) => apiRequest('POST', `${BASE}/orders/${orderId}/materials`, demand),
    onSuccess: invalidateOrders,
  });

  const updateMaterialStatusMutation = useMutation({
    mutationFn: ({ orderId, materialId, status }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/materials/${materialId}/status`, { status }),
    onSuccess: invalidateOrders,
  });

  // ── Process mutations ──────────────────────────────────────────────────────
  const assignTeamMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, teamId }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/assign-team`, { teamId }),
    onSuccess: invalidateOrders,
  });

  const startProcessMutation = useMutation({
    mutationFn: ({ orderId, stepIndex }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/start`),
    onSuccess: invalidateOrders,
  });

  const markProcessCompleteMutation = useMutation({
    mutationFn: ({ orderId, stepIndex }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/complete`),
    onSuccess: invalidateOrders,
  });

  const approveQCMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, qcBy }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/approve-qc`, { qcBy }),
    onSuccess: invalidateOrders,
  });

  const rejectQCMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, qcBy, reason }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/reject-qc`, { qcBy, reason }),
    onSuccess: invalidateOrders,
  });

  const updateProcessNotesMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, notes }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/notes`, { notes }),
    onSuccess: invalidateOrders,
  });

  // ── Team mutations ─────────────────────────────────────────────────────────
  const addTeamMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', `${BASE}/teams`, data),
    onSuccess: invalidateTeams,
  });

  // ── Stable callback wrappers (keep same API as before) ────────────────────
  const addOrder = useCallback((data) => addOrderMutation.mutate(data), []);
  const verifyBOM = useCallback((id) => verifyBOMMutation.mutateAsync(id), []);
  const verifyDesign = useCallback((id) => verifyDesignMutation.mutateAsync(id), []);
  const raiseRDRequest = useCallback((id) => raiseRDRequestMutation.mutateAsync(id), []);
  const markMaterialIssued = useCallback((id) => markMaterialIssuedMutation.mutateAsync(id), []);
  const addMaterialDemand = useCallback((orderId, demand) => addMaterialDemandMutation.mutate({ orderId, demand }), []);
  const updateMaterialStatus = useCallback((orderId, materialId, status) => updateMaterialStatusMutation.mutate({ orderId, materialId, status }), []);
  const addTeam = useCallback((data) => addTeamMutation.mutate(data), []);

  // Process callbacks — convert stepName to stepIndex
  const stepIndex = (stepName) => PROCESS_STEPS.indexOf(stepName);

  const assignTeam = useCallback((orderId, stepName, teamId) =>
    assignTeamMutation.mutate({ orderId, stepIndex: stepIndex(stepName), teamId }), []);

  const startProcess = useCallback((orderId, stepName) =>
    startProcessMutation.mutate({ orderId, stepIndex: stepIndex(stepName) }), []);

  const markProcessComplete = useCallback((orderId, stepName) =>
    markProcessCompleteMutation.mutate({ orderId, stepIndex: stepIndex(stepName) }), []);

  const approveQC = useCallback((orderId, stepName, qcBy) =>
    approveQCMutation.mutate({ orderId, stepIndex: stepIndex(stepName), qcBy }), []);

  const rejectQC = useCallback((orderId, stepName, qcBy, reason) =>
    rejectQCMutation.mutate({ orderId, stepIndex: stepIndex(stepName), qcBy, reason }), []);

  const updateProcessNotes = useCallback((orderId, stepName, notes) =>
    updateProcessNotesMutation.mutate({ orderId, stepIndex: stepIndex(stepName), notes }), []);

  // ── Computed helpers (same interface as before) ───────────────────────────
  const getOrderProgress = useCallback((orderId) => {
    const order = orders.find(o => o._id === orderId || o.id === orderId);
    if (!order) return 0;
    const done = order.processes.filter(p => p.status === 'Completed').length;
    return Math.round((done / order.processes.length) * 100);
  }, [orders]);

  const getPendingQC = useCallback(() => {
    return orders.flatMap(o =>
      o.processes
        .filter(p => p.status === 'QC Pending')
        .map(p => ({ orderId: o._id, machineName: o.machineName, machineCode: o.machineCode, priority: o.priority, ...p }))
    );
  }, [orders]);

  const getTeamById = useCallback((teamId) => {
    if (!teamId) return null;
    const id = teamId?._id || teamId;
    return teams.find(t => String(t._id) === String(id)) || teamId || null;
  }, [teams]);

  const getActiveProcessForOrder = useCallback((orderId) => {
    const order = orders.find(o => o._id === orderId || o.id === orderId);
    if (!order) return null;
    return order.processes.find(p => p.status === 'In Progress' || p.status === 'QC Pending') || null;
  }, [orders]);

  return (
    <ProductionContext.Provider value={{
      orders,
      teams,
      ordersLoading,
      teamsLoading,
      addOrder,
      verifyBOM,
      verifyDesign,
      raiseRDRequest,
      addMaterialDemand,
      updateMaterialStatus,
      markMaterialIssued,
      assignTeam,
      startProcess,
      markProcessComplete,
      approveQC,
      rejectQC,
      updateProcessNotes,
      addTeam,
      getOrderProgress,
      getPendingQC,
      getTeamById,
      getActiveProcessForOrder,
    }}>
      {children}
    </ProductionContext.Provider>
  );
}

export function useProduction() {
  const ctx = useContext(ProductionContext);
  if (!ctx) throw new Error('useProduction must be used within ProductionProvider');
  return ctx;
}
