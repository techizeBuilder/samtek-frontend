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

// Pure function of an order document — usable directly by pages that hold
// their own order objects (e.g. from a paginated list) without needing the
// order to be present in the context's active-orders array.
export function computeOrderProgress(order) {
  const buildQty = Math.max(1, Number(order.orderQuantity) || 1);
  const stepsPerUnit = order.processes.length;
  const doneInMain = order.processes.filter(p => p.status === 'Completed').length;
  const doneInExtra = (order.extraUnits || []).reduce(
    (sum, u) => sum + (u.processes || []).filter(p => p.status === 'Completed').length, 0
  );
  const totalSteps = stepsPerUnit * buildQty;
  return totalSteps ? Math.round(((doneInMain + doneInExtra) / totalSteps) * 100) : 0;
}

export function ProductionProvider({ children }) {
  const qc = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────
  // Only currently-active work (non-Completed, or completed in the last 7
  // days) — this is what every board/kanban-style consumer of `orders` below
  // actually needs. Pages that need full order history (Orders, Job Cards)
  // run their own paginated queries instead of reading from this context —
  // see `useProductionOrdersList` below.
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['production-mfg-orders', 'active'],
    queryFn: () => apiRequest('GET', `${BASE}/orders/active`),
  });

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['production-mfg-teams'],
    queryFn: () => apiRequest('GET', `${BASE}/teams`),
  });

  const orders = ordersData?.data || [];
  const teams = teamsData?.data || [];

  // Partial-key match: invalidates the active-orders query above AND any
  // currently-mounted paginated list / team-history queries (see
  // useProductionOrdersList / ManpowerTracking) sharing the same prefix.
  // Only mounted queries actually refetch, so this stays cheap no matter how
  // many pages happen to be watching production-mfg-orders data.
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

  const decideReworkMutation = useMutation({
    mutationFn: (id) => apiRequest('PUT', `${BASE}/orders/${id}/decide-rework`),
    onSuccess: invalidateOrders,
  });

  const decideRepairMutation = useMutation({
    mutationFn: (id) => apiRequest('PUT', `${BASE}/orders/${id}/decide-repair`),
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
  // `unitNumber` (1-based) selects which physical machine of a multi-quantity
  // order the action applies to. It's sent as a `?unit=` query param and
  // defaults to 1 everywhere below, so any call site that doesn't pass it
  // keeps behaving exactly as before (operates on the order's original,
  // single process pipeline).
  const assignTeamMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, teamId, unitNumber = 1 }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/assign-team?unit=${unitNumber}`, { teamId }),
    onSuccess: invalidateOrders,
  });

  const startProcessMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, unitNumber = 1 }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/start?unit=${unitNumber}`),
    onSuccess: invalidateOrders,
  });

  const markProcessCompleteMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, unitNumber = 1 }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/complete?unit=${unitNumber}`),
    onSuccess: invalidateOrders,
  });

  const approveQCMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, qcBy, unitNumber = 1, productionCost, productionExpense }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/approve-qc?unit=${unitNumber}`, { qcBy, productionCost, productionExpense }),
    onSuccess: invalidateOrders,
  });

  const rejectQCMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, qcBy, reason, unitNumber = 1 }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/reject-qc?unit=${unitNumber}`, { qcBy, reason }),
    onSuccess: invalidateOrders,
  });

  const updateProcessNotesMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, notes, unitNumber = 1 }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/notes?unit=${unitNumber}`, { notes }),
    onSuccess: invalidateOrders,
  });

  // ── Sub-Entries mutations ──────────────────────────────────────────────────
  const addSubEntryMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, payload, unitNumber = 1 }) =>
      apiRequest('POST', `${BASE}/orders/${orderId}/processes/${stepIndex}/sub-entries?unit=${unitNumber}`, payload),
    onSuccess: invalidateOrders,
  });

  const completeSubEntryMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, subEntryId, unitNumber = 1 }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/sub-entries/${subEntryId}/complete?unit=${unitNumber}`),
    onSuccess: invalidateOrders,
  });

  const qcSubEntryMutation = useMutation({
    mutationFn: ({ orderId, stepIndex, subEntryId, qcStatus, qcBy, reason, unitNumber = 1 }) =>
      apiRequest('PUT', `${BASE}/orders/${orderId}/processes/${stepIndex}/sub-entries/${subEntryId}/qc?unit=${unitNumber}`, { qcStatus, qcBy, reason }),
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
  const decideRework = useCallback((id) => decideReworkMutation.mutateAsync(id), []);
  const decideRepair = useCallback((id) => decideRepairMutation.mutateAsync(id), []);
  const addMaterialDemand = useCallback((orderId, demand) => addMaterialDemandMutation.mutateAsync({ orderId, demand }), []);
  const updateMaterialStatus = useCallback((orderId, materialId, status) => updateMaterialStatusMutation.mutate({ orderId, materialId, status }), []);
  const addTeam = useCallback((data) => addTeamMutation.mutate(data), []);

  // Process callbacks — convert stepName to stepIndex. Every one takes an
  // optional trailing `unitNumber` (1-based, default 1) so existing call
  // sites that never pass it keep targeting the order's original pipeline.
  const stepIndex = (stepName) => PROCESS_STEPS.indexOf(stepName);

  const assignTeam = useCallback((orderId, stepName, teamId, unitNumber = 1) =>
    assignTeamMutation.mutate({ orderId, stepIndex: stepIndex(stepName), teamId, unitNumber }), []);

  const startProcess = useCallback((orderId, stepName, unitNumber = 1) =>
    startProcessMutation.mutate({ orderId, stepIndex: stepIndex(stepName), unitNumber }), []);

  const markProcessComplete = useCallback((orderId, stepName, unitNumber = 1) =>
    markProcessCompleteMutation.mutate({ orderId, stepIndex: stepIndex(stepName), unitNumber }), []);

  const approveQC = useCallback((orderId, stepName, qcBy, unitNumber = 1, productionCost, productionExpense) =>
    approveQCMutation.mutate({ orderId, stepIndex: stepIndex(stepName), qcBy, unitNumber, productionCost, productionExpense }), []);

  const rejectQC = useCallback((orderId, stepName, qcBy, reason, unitNumber = 1) =>
    rejectQCMutation.mutate({ orderId, stepIndex: stepIndex(stepName), qcBy, reason, unitNumber }), []);

  const updateProcessNotes = useCallback((orderId, stepName, notes, unitNumber = 1) =>
    updateProcessNotesMutation.mutate({ orderId, stepIndex: stepIndex(stepName), notes, unitNumber }), []);

  const addSubEntry = useCallback((orderId, stepName, payload, unitNumber = 1) =>
    addSubEntryMutation.mutateAsync({ orderId, stepIndex: stepIndex(stepName), payload, unitNumber }), []);

  const completeSubEntry = useCallback((orderId, stepName, subEntryId, unitNumber = 1) =>
    completeSubEntryMutation.mutateAsync({ orderId, stepIndex: stepIndex(stepName), subEntryId, unitNumber }), []);

  const qcSubEntry = useCallback((orderId, stepName, subEntryId, qcStatus, qcBy, reason, unitNumber = 1) =>
    qcSubEntryMutation.mutateAsync({ orderId, stepIndex: stepIndex(stepName), subEntryId, qcStatus, qcBy, reason, unitNumber }), []);

  // ── Multi-unit helpers ─────────────────────────────────────────────────────
  // How many physical machines this order builds (>= 1).
  const getOrderUnitCount = useCallback((orderId) => {
    const order = orders.find(o => o._id === orderId || o.id === orderId);
    return Math.max(1, Number(order?.orderQuantity) || 1);
  }, [orders]);

  // Fresh, all-Pending process steps — mirrors the backend's buildProcessSteps(),
  // used as a display-only placeholder for a unit the backend hasn't
  // materialized into `extraUnits` yet (nothing has been done on it so far).
  const buildDefaultProcesses = () => PROCESS_STEPS.map(step => ({
    step, type: PROCESS_TYPE_MAP[step], status: 'Pending', assignedTeam: null,
    startDate: null, endDate: null, qcStatus: 'Pending', qcBy: null, qcDate: null,
    notes: '', reworks: [], subEntries: [],
  }));

  // Process-steps array for a given 1-based unit number of an order. Unit 1
  // is always `order.processes`; units 2..N come from `order.extraUnits`.
  const getUnitProcesses = useCallback((orderId, unitNumber = 1) => {
    const order = orders.find(o => o._id === orderId || o.id === orderId);
    if (!order) return [];
    if (unitNumber <= 1) return order.processes;
    const extra = order.extraUnits?.[unitNumber - 2];
    return extra ? extra.processes : buildDefaultProcesses();
  }, [orders]);

  // ── Computed helpers (same interface as before) ───────────────────────────
  // getOrderProgress(orderId) only finds orders within the active-orders set
  // above — fine for WorkPlanning/ProcessExecution (active-only pages), but
  // pages with their own paginated order list (OrderManagement, JobCards)
  // should call computeOrderProgress(order) directly with the order object
  // they already have in hand, since it may not be in the active set.
  const getOrderProgress = useCallback((orderId) => {
    const order = orders.find(o => o._id === orderId || o.id === orderId);
    return order ? computeOrderProgress(order) : 0;
  }, [orders]);

  const getPendingQC = useCallback(() => {
    return orders.flatMap(o => {
      const allProcesses = [...o.processes, ...(o.extraUnits || []).flatMap(u => u.processes || [])];
      return allProcesses
        .filter(p => p.status === 'QC Pending')
        .map(p => ({ orderId: o._id, machineName: o.machineName, machineCode: o.machineCode, priority: o.priority, ...p }));
    });
  }, [orders]);

  const getTeamById = useCallback((teamId) => {
    if (!teamId) return null;
    const id = teamId?._id || teamId;
    return teams.find(t => String(t._id) === String(id)) || teamId || null;
  }, [teams]);

  const getActiveProcessForOrder = useCallback((orderId) => {
    const order = orders.find(o => o._id === orderId || o.id === orderId);
    if (!order) return null;
    const allProcesses = [...order.processes, ...(order.extraUnits || []).flatMap(u => u.processes || [])];
    return allProcesses.find(p => p.status === 'In Progress' || p.status === 'QC Pending') || null;
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
      decideRework,
      decideRepair,
      addMaterialDemand,
      updateMaterialStatus,
      markMaterialIssued,
      assignTeam,
      startProcess,
      markProcessComplete,
      approveQC,
      rejectQC,
      updateProcessNotes,
      addSubEntry,
      completeSubEntry,
      qcSubEntry,
      addTeam,
      getOrderProgress,
      getPendingQC,
      getTeamById,
      getActiveProcessForOrder,
      getOrderUnitCount,
      getUnitProcesses,
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

// Shared paginated/searchable/filterable order list — for pages that need to
// browse full order history (Orders, Job Cards), unlike the bounded
// "active work" feed the provider above exposes as `orders`. Shares the
// 'production-mfg-orders' key prefix so invalidateOrders() (any mutation)
// refreshes this too whenever it's mounted.
export function useProductionOrdersList(filters, options = {}) {
  return useQuery({
    queryKey: ['production-mfg-orders', 'list', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, value.toString());
        }
      });
      return apiRequest('GET', `${BASE}/orders?${params.toString()}`);
    },
    keepPreviousData: true,
    ...options,
  });
}
