import React, { createContext, useContext, useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuthContext } from '@/contexts/AuthContext';

const RDContext = createContext(null);
const BASE = '/api/rd';

export function RDProvider({ children }) {
  const qc = useQueryClient();
  // RDProvider is mounted once at the app root (before routing/auth resolve), so every
  // query here must wait for a real session — otherwise the first fetch fires with no
  // token, fails, and (with staleTime: Infinity + retry: false in queryClient.ts) that
  // empty/failed result is cached for good and never auto-refetches after login. Only a
  // hard refresh used to fix it because that recreates the QueryClient from scratch.
  const { isAuthenticated } = useAuthContext();

  // ── Production Request Filters State ─────────────────────────────────────────
  // This state powers your tabs, search, and dropdown filters
  const [reqFilters, setReqFilters] = useState({
    tab: 'fresh', // 'fresh' or 'history'
    search: '',
    status: 'All',
    page: 1
  });

  // ── Queries ──────────────────────────────────────────────────────────────────
  // `enabled: isAuthenticated` on every query below: RDProvider lives above the router,
  // so these must not fire until there's a real session (see note above).
  const { data: machinesData, isLoading: machinesLoading } = useQuery({
    queryKey: ['rd-machines'],
    queryFn: () => apiRequest('GET', `${BASE}/machines`),
    enabled: isAuthenticated,
  });

  const { data: bomsData, isLoading: bomsLoading } = useQuery({
    queryKey: ['rd-boms'],
    queryFn: () => apiRequest('GET', `${BASE}/boms`),
    enabled: isAuthenticated,
  });

  const { data: prototypesData, isLoading: prototypesLoading } = useQuery({
    queryKey: ['rd-prototypes'],
    queryFn: () => apiRequest('GET', `${BASE}/prototypes`),
    enabled: isAuthenticated,
  });

  const { data: changeRequestsData, isLoading: changeRequestsLoading } = useQuery({
    queryKey: ['rd-change-requests'],
    queryFn: () => apiRequest('GET', `${BASE}/change-requests`),
    enabled: isAuthenticated,
  });

  const { data: toolProcessesData, isLoading: toolProcessesLoading } = useQuery({
    queryKey: ['rd-tool-processes'],
    queryFn: () => apiRequest('GET', `${BASE}/tool-processes`),
    enabled: isAuthenticated,
  });

  const { data: qualityParamsData, isLoading: qualityParamsLoading } = useQuery({
    queryKey: ['rd-quality-params'],
    queryFn: () => apiRequest('GET', `${BASE}/quality-params`),
    enabled: isAuthenticated,
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['rd-documents'],
    queryFn: () => apiRequest('GET', `${BASE}/documents`),
    enabled: isAuthenticated,
  });

  const { data: masterOptionsData, isLoading: masterOptionsLoading } = useQuery({
    queryKey: ['rd-master-options'],
    queryFn: () => apiRequest('GET', `${BASE}/master-options`),
    enabled: isAuthenticated,
  });

  const { data: customFieldTemplatesData, isLoading: customFieldTemplatesLoading } = useQuery({
    queryKey: ['rd-custom-field-templates'],
    queryFn: () => apiRequest('GET', `${BASE}/custom-field-templates`),
    enabled: isAuthenticated,
  });

  // Production Requests Query (Watches reqFilters automatically)
  const { data: productionRequestsData, isLoading: productionRequestsLoading } = useQuery({
    queryKey: ['rd-production-requests', reqFilters],
    queryFn: () => {
      const params = new URLSearchParams(reqFilters).toString();
      return apiRequest('GET', `${BASE}/production-rnd-requests?${params}`);
    },
    enabled: isAuthenticated,
  });

  const machines = machinesData?.data || [];
  const boms = bomsData?.data || [];
  const prototypes = prototypesData?.data || [];
  const changeRequests = changeRequestsData?.data || [];
  const toolProcesses = toolProcessesData?.data || [];
  const qualityParams = qualityParamsData?.data || [];
  const documents = documentsData?.data || [];
  const masterOptions = masterOptionsData?.data || { Category: [], PType: [], PSourceType: [], Metrology: [], MaterialType: [] };
  const customFieldTemplates = customFieldTemplatesData?.data || [];
  const productionRequests = productionRequestsData?.data || [];
  const productionRequestsPagination = productionRequestsData?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };

  const inv = (key) => () => qc.invalidateQueries({ queryKey: [key] });
  const invMachines = inv('rd-machines');
  const invBOMs = inv('rd-boms');
  const invPrototypes = inv('rd-prototypes');
  const invChangeRequests = inv('rd-change-requests');
  const invToolProcesses = inv('rd-tool-processes');
  const invQualityParams = inv('rd-quality-params');
  const invDocuments = inv('rd-documents');
  const invProductionRequests = inv('rd-production-requests');
  const invMasterOptions = inv('rd-master-options');
  const invCustomFieldTemplates = inv('rd-custom-field-templates');

  // ── Machine mutations ────────────────────────────────────────────────────────
  const createMachineMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/machines`, d), onSuccess: invMachines });
  const updateMachineMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/machines/${id}`, data), onSuccess: invMachines });
  const addMasterOptionMut = useMutation({ mutationFn: (data) => apiRequest('POST', `${BASE}/master-options`, data), onSuccess: invMasterOptions });
  // Renaming/deleting an option cascades server-side into machines, BOM material snapshots and
  // custom field templates, so all of those caches need invalidating too, not just the option list.
  const updateMasterOptionMut = useMutation({
    mutationFn: ({ id, value }) => apiRequest('PUT', `${BASE}/master-options/${id}`, { value }),
    onSuccess: () => { invMasterOptions(); invMachines(); invBOMs(); invCustomFieldTemplates(); }
  });
  const deleteMasterOptionMut = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `${BASE}/master-options/${id}`),
    onSuccess: invMasterOptions
  });
  const saveCustomFieldTemplateMut = useMutation({ mutationFn: (data) => apiRequest('POST', `${BASE}/custom-field-templates`, data), onSuccess: invCustomFieldTemplates });
  const deleteCustomFieldTemplateMut = useMutation({ mutationFn: (id) => apiRequest('DELETE', `${BASE}/custom-field-templates/${id}`), onSuccess: invCustomFieldTemplates });
  const designStatusMut = useMutation({ mutationFn: ({ id, status, note }) => apiRequest('PUT', `${BASE}/machines/${id}/design-status`, { status, note }), onSuccess: invMachines });
  const releaseStatusMut = useMutation({ mutationFn: ({ id, status }) => apiRequest('PUT', `${BASE}/machines/${id}/release-status`, { status }), onSuccess: invMachines });
  const discontinueMachineMut = useMutation({ mutationFn: (id) => apiRequest('PUT', `${BASE}/machines/${id}/discontinue`), onSuccess: invMachines });
  const reactivateMachineMut = useMutation({ mutationFn: (id) => apiRequest('PUT', `${BASE}/machines/${id}/reactivate`), onSuccess: invMachines });

  // ── BOM mutations ────────────────────────────────────────────────────────────
  const createBOMMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/boms`, d), onSuccess: invBOMs });
  const addMaterialMut = useMutation({ mutationFn: ({ bomId, mat }) => apiRequest('POST', `${BASE}/boms/${bomId}/materials`, mat), onSuccess: invBOMs });
  const updateMaterialMut = useMutation({ mutationFn: ({ bomId, matId, data }) => apiRequest('PUT', `${BASE}/boms/${bomId}/materials/${matId}`, data), onSuccess: invBOMs });
  const deleteMaterialMut = useMutation({ mutationFn: ({ bomId, matId }) => apiRequest('DELETE', `${BASE}/boms/${bomId}/materials/${matId}`), onSuccess: invBOMs });
  const lockBOMMut = useMutation({ mutationFn: (bomId) => apiRequest('PUT', `${BASE}/boms/${bomId}/lock`), onSuccess: invBOMs });
  const discontinueMaterialMut = useMutation({ mutationFn: ({ bomId, matId }) => apiRequest('PUT', `${BASE}/boms/${bomId}/materials/${matId}/discontinue`), onSuccess: invBOMs });
  const reactivateMaterialMut = useMutation({ mutationFn: ({ bomId, matId }) => apiRequest('PUT', `${BASE}/boms/${bomId}/materials/${matId}/reactivate`), onSuccess: invBOMs });

  // ── Prototype mutations ──────────────────────────────────────────────────────
  const createPrototypeMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/prototypes`, d), onSuccess: invPrototypes });
  const updatePrototypeMut = useMutation({ mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/prototypes/${id}`, data), onSuccess: invPrototypes });

  // ── Change request mutations ─────────────────────────────────────────────────
  const createCRMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/change-requests`, d), onSuccess: invChangeRequests });
  // Approving a change request unlocks the target BOM server-side, so the
  // cached BOM list must be invalidated too — otherwise BOM Management keeps
  // showing it as locked until something else happens to refetch it.
  const resolveCRMut = useMutation({ mutationFn: ({ id, approved, notes }) => apiRequest('PUT', `${BASE}/change-requests/${id}/resolve`, { approved, notes }), onSuccess: () => { invChangeRequests(); invBOMs(); } });

  // ── Tool process mutations ───────────────────────────────────────────────────
  const addToolMut = useMutation({ mutationFn: ({ machineId, tool }) => apiRequest('POST', `${BASE}/tool-processes/${machineId}/tools`, tool), onSuccess: invToolProcesses });
  const removeToolMut = useMutation({ mutationFn: ({ machineId, toolId }) => apiRequest('DELETE', `${BASE}/tool-processes/${machineId}/tools/${toolId}`), onSuccess: invToolProcesses });
  const discontinueToolMut = useMutation({ mutationFn: ({ machineId, toolId }) => apiRequest('PUT', `${BASE}/tool-processes/${machineId}/tools/${toolId}/discontinue`), onSuccess: invToolProcesses });
  const reactivateToolMut = useMutation({ mutationFn: ({ machineId, toolId }) => apiRequest('PUT', `${BASE}/tool-processes/${machineId}/tools/${toolId}/reactivate`), onSuccess: invToolProcesses });
  const addProcessMut = useMutation({ mutationFn: ({ machineId, proc }) => apiRequest('POST', `${BASE}/tool-processes/${machineId}/processes`, proc), onSuccess: invToolProcesses });
  const removeProcessMut = useMutation({ mutationFn: ({ machineId, processId }) => apiRequest('DELETE', `${BASE}/tool-processes/${machineId}/processes/${processId}`), onSuccess: invToolProcesses });

  // ── Quality param mutations ──────────────────────────────────────────────────
  const addQualityParamMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/quality-params/parameters`, d), onSuccess: invQualityParams });
  const deleteQualityParamMut = useMutation({ mutationFn: ({ machineId, paramId }) => apiRequest('DELETE', `${BASE}/quality-params/${machineId}/parameters/${paramId}`), onSuccess: invQualityParams });
  const addQCItemMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/quality-params/qc-items`, d), onSuccess: invQualityParams });
  const deleteQCItemMut = useMutation({ mutationFn: ({ machineId, itemId }) => apiRequest('DELETE', `${BASE}/quality-params/${machineId}/qc-items/${itemId}`), onSuccess: invQualityParams });

  // ── Document mutations ───────────────────────────────────────────────────────
  const createDocMut = useMutation({ mutationFn: (d) => apiRequest('POST', `${BASE}/documents`, d), onSuccess: invDocuments });
  const deleteDocMut = useMutation({ mutationFn: (id) => apiRequest('DELETE', `${BASE}/documents/${id}`), onSuccess: invDocuments });

  // ── Production Request Mutations ─────────────────────────────────────────────
  const processRDRequestMut = useMutation({
    mutationFn: ({ id, action, rejectReason }) => apiRequest('PUT', `${BASE}/${id}/process`, { action, rejectReason }),
    onSuccess: invProductionRequests
  });

  // ── Stable callbacks ─────────────────────────────────────────────────────────
  const addMachine = useCallback((data) => createMachineMut.mutate(data), []);
  const updateMachine = useCallback((id, data) => updateMachineMut.mutate({ id, data }), []);
  const updateDesignStatus = useCallback((id, status, note = '') => designStatusMut.mutate({ id, status, note }), []);
  const updateReleaseStatus = useCallback((id, status) => releaseStatusMut.mutateAsync({ id, status }), []);
  const discontinueMachine = useCallback((id) => discontinueMachineMut.mutate(id), []);
  const reactivateMachine = useCallback((id) => reactivateMachineMut.mutate(id), []);

  const getBOMForMachine = useCallback((machineId) => {
    const mid = String(machineId);
    return boms.find(b => String(b.machine?._id || b.machine) === mid) || null;
  }, [boms]);

  const addBOM = useCallback((machineId, variant) => createBOMMut.mutate({ machineId, variant }), []);
  const addMaterial = useCallback((bomId, mat) => addMaterialMut.mutate({ bomId, mat }), []);
  const updateMaterial = useCallback((bomId, matId, data) => updateMaterialMut.mutate({ bomId, matId, data }), []);
  const deleteMaterial = useCallback((bomId, matId) => deleteMaterialMut.mutate({ bomId, matId }), []);
  const lockBOM = useCallback((bomId) => lockBOMMut.mutate(bomId), []);
  const discontinueMaterial = useCallback((bomId, matId) => discontinueMaterialMut.mutate({ bomId, matId }), []);
  const reactivateMaterial = useCallback((bomId, matId) => reactivateMaterialMut.mutate({ bomId, matId }), []);

  const addPrototype = useCallback((data) => createPrototypeMut.mutate(data), []);
  const updatePrototype = useCallback((id, data) => updatePrototypeMut.mutate({ id, data }), []);

  const addChangeRequest = useCallback((data) => createCRMut.mutate(data), []);
  const resolveChangeRequest = useCallback((id, approved, notes) => resolveCRMut.mutate({ id, approved, notes }), []);

  const getToolsProcess = useCallback((machineId) => {
    const mid = String(machineId);
    return toolProcesses.find(tp => String(tp.machine?._id || tp.machine) === mid) || null;
  }, [toolProcesses]);

  const addTool = useCallback((machineId, tool) => addToolMut.mutate({ machineId, tool }), []);
  const removeTool = useCallback((machineId, toolId) => removeToolMut.mutate({ machineId, toolId }), []);
  const discontinueTool = useCallback((machineId, toolId) => discontinueToolMut.mutate({ machineId, toolId }), []);
  const reactivateTool = useCallback((machineId, toolId) => reactivateToolMut.mutate({ machineId, toolId }), []);
  const addProcess = useCallback((machineId, proc) => addProcessMut.mutate({ machineId, proc }), []);
  const removeProcess = useCallback((machineId, processId) => removeProcessMut.mutate({ machineId, processId }), []);

  const getQualityParams = useCallback((machineId) => {
    const mid = String(machineId);
    return qualityParams.find(qp => String(qp.machine?._id || qp.machine) === mid) || null;
  }, [qualityParams]);

  const addQualityParam = useCallback((machineId, machineName, param) => addQualityParamMut.mutate({ machineId, machineName, ...param }), []);
  const deleteQualityParam = useCallback((machineId, paramId) => deleteQualityParamMut.mutate({ machineId, paramId }), []);
  const addQCItem = useCallback((machineId, machineName, item) => addQCItemMut.mutate({ machineId, machineName, ...item }), []);
  const deleteQCItem = useCallback((machineId, itemId) => deleteQCItemMut.mutate({ machineId, itemId }), []);

  const getDocumentsForMachine = useCallback((machineId) => {
    const mid = String(machineId);
    return documents.filter(d => String(d.machine?._id || d.machine) === mid);
  }, [documents]);

  const addDocument = useCallback((data) => {
    const machine = machines.find(m => String(m._id || m.id) === String(data.machineId));
    const fd = new FormData();
    fd.append('machineId', data.machineId);
    fd.append('type', data.type);
    fd.append('name', data.name || '');
    fd.append('version', data.version || 'v1.0');
    fd.append('notes', data.notes || '');
    fd.append('machineCode', machine?.code || '');
    fd.append('machineName', machine?.name || '');
    fd.append('uploadedBy', 'R&D Team');
    if (data.file) fd.append('file', data.file);
    createDocMut.mutate(fd);
  }, [machines]);
  const deleteDocument = useCallback((id) => deleteDocMut.mutate(id), []);

  const processProductionRequest = useCallback(async (id, action, rejectReason = '') => {
    return processRDRequestMut.mutateAsync({ id, action, rejectReason });
  }, []);

  const fetchProductionRequestReviewData = useCallback(async (id) => {
    return apiRequest('GET', `${BASE}/production-rnd-requests/${id}/review`);
  }, []);

  const addMasterOption = useCallback(async (data) => {
    return addMasterOptionMut.mutateAsync(data);
  }, []);
  const updateMasterOption = useCallback(async (id, value) => {
    return updateMasterOptionMut.mutateAsync({ id, value });
  }, []);
  const deleteMasterOption = useCallback(async (id) => {
    return deleteMasterOptionMut.mutateAsync(id);
  }, []);

  const saveCustomFieldTemplate = useCallback(async (data) => {
    return saveCustomFieldTemplateMut.mutateAsync(data);
  }, []);
  const deleteCustomFieldTemplate = useCallback(async (id) => {
    return deleteCustomFieldTemplateMut.mutateAsync(id);
  }, []);
  const getCustomFieldTemplate = useCallback((pType, category, pSourceType) => {
    if (!pType || !category || !pSourceType) return null;
    return customFieldTemplates.find(t => t.pType === pType && t.category === category && t.pSourceType === pSourceType) || null;
  }, [customFieldTemplates]);

  // ── Computed stats ────────────────────────────────────────────────────────────
  const stats = {
    totalMachines: machines.filter(m => !m.isDiscontinued).length,
    approved: machines.filter(m => m.designStatus === 'Approved' && !m.isDiscontinued).length,
    released: machines.filter(m => m.releaseStatus === 'Released' && !m.isDiscontinued).length,
    pendingApproval: machines.filter(m => m.designStatus === 'Testing' && !m.isDiscontinued).length,
    openChangeRequests: changeRequests.filter(cr => cr.status === 'Pending').length,
    prototypesInProgress: prototypes.filter(p => p.status === 'In Progress').length,
    discontinued: machines.filter(m => m.isDiscontinued).length,
    draft: machines.filter(m => m.designStatus === 'Draft' && !m.isDiscontinued).length,
    rejected: machines.filter(m => m.designStatus === 'Rejected' && !m.isDiscontinued).length,
  };

  return (
    <RDContext.Provider value={{
      machines, boms, prototypes, changeRequests, toolProcesses, qualityParams, documents, stats,
      masterOptions, masterOptionsLoading, addMasterOption, updateMasterOption, deleteMasterOption,
      customFieldTemplates, customFieldTemplatesLoading, saveCustomFieldTemplate, deleteCustomFieldTemplate, getCustomFieldTemplate,

      // Production Requests state
      productionRequests,
      productionRequestsPagination,
      productionRequestsLoading,
      reqFilters,
      setReqFilters,
      processProductionRequest,
      fetchProductionRequestReviewData,

      machinesLoading, bomsLoading, prototypesLoading, changeRequestsLoading,
      toolProcessesLoading, qualityParamsLoading, documentsLoading,
      addMachine, updateMachine, updateDesignStatus, updateReleaseStatus, discontinueMachine, reactivateMachine,
      getBOMForMachine, addBOM, addMaterial, updateMaterial, deleteMaterial, lockBOM, discontinueMaterial, reactivateMaterial,
      addPrototype, updatePrototype,
      addChangeRequest, resolveChangeRequest,
      getToolsProcess, addTool, removeTool, discontinueTool, reactivateTool, addProcess, removeProcess,
      getQualityParams, addQualityParam, deleteQualityParam, addQCItem, deleteQCItem,
      getDocumentsForMachine, addDocument, deleteDocument,
    }}>
      {children}
    </RDContext.Provider>
  );
}

export const useRD = () => {
  const ctx = useContext(RDContext);
  if (!ctx) throw new Error('useRD must be used within RDProvider');
  return ctx;
};