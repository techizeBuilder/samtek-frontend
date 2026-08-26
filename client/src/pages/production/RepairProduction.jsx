import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Wrench, Clock, PlayCircle, CheckCircle2, AlertTriangle, Package, Plus, ArrowDownToLine, UserCircle2 } from 'lucide-react';
import { UNIT_TYPES, getUnitsForType } from '@/utils/unitTypes';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
};

const statusIcon = { Pending: Clock, 'In Progress': PlayCircle, Completed: CheckCircle2 };

const emptyDemand = { materialCode: '', materialName: '', quantity: '', unitType: '', unit: '' };

// Same fallback chain as Production Orders' "Rejected Items" tab — the real
// customer sales order code, not the internal REJ-... tracking id.
const getRealOrderId = (job) => job.orderCode || job.rejectionDetails?.originalOrderId || job.machineCode || null;

export default function RepairProduction() {
  const { toast } = useToast();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('production', 'repairProduction', 'edit');
  const canAddDemand = hasFeatureAccess('production', 'orders', 'add');
  const qc = useQueryClient();
  const [completeModal, setCompleteModal] = useState(null); // order being completed
  const [notes, setNotes] = useState('');

  // Supervision — repair jobs had no accountable person assigned at all before
  // this. Reuses the same ProductionTeam pool (with its supervisor) that
  // regular process steps assign to.
  const [startModal, setStartModal] = useState(null); // job being started
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Materials dialog for a single repair job — mirrors Order Management's
  // material demand section (Add Demand / Receive / Return), since repair
  // jobs can need replacement parts just like a fresh production run.
  const [materialsJob, setMaterialsJob] = useState(null);
  const [demandOpen, setDemandOpen] = useState(false);
  const [demandForm, setDemandForm] = useState(emptyDemand);
  const [foundItem, setFoundItem] = useState(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueRow, setIssueRow] = useState(null);
  const [issueQty, setIssueQty] = useState('');
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnRow, setReturnRow] = useState(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState('Excess');

  const { data, isLoading } = useQuery({
    queryKey: ['repair-jobs'],
    queryFn: () => apiRequest('GET', '/api/production-mfg/repair-jobs'),
  });
  const jobs = data?.data || [];

  // Same query key ProductionContext uses for teams — shares cache with the
  // rest of the app instead of re-fetching.
  const { data: teamsData } = useQuery({
    queryKey: ['production-mfg-teams'],
    queryFn: () => apiRequest('GET', '/api/production-mfg/teams'),
  });
  const teams = teamsData?.data || [];

  // Keep the open Materials dialog in sync with the latest fetched job data,
  // the same way Order Management's detailOrderLive works.
  const materialsJobLive = materialsJob ? jobs.find(j => j._id === materialsJob._id) || materialsJob : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['repair-jobs'] });

  const startMutation = useMutation({
    mutationFn: ({ id, assignedTo }) => apiRequest('PUT', `/api/production-mfg/orders/${id}/repair/start`, { assignedTo }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Repair started' });
      setStartModal(null);
      setSelectedTeamId('');
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleStartRepair = () => {
    const team = teams.find(t => String(t._id) === selectedTeamId);
    if (!team || !startModal) return;
    startMutation.mutate({ id: startModal._id, assignedTo: `${team.supervisor} (${team.name})` });
  };

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }) => apiRequest('PUT', `/api/production-mfg/orders/${id}/repair/complete`, { notes }),
    onSuccess: () => {
      invalidate();
      setCompleteModal(null);
      setNotes('');
      toast({ title: '✓ Repair complete', description: 'Item sent to QC for approval.' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Dynamic unit types (same source BOM Management/Product Master/Inventory/Order
  // Management use) for the Add Material Demand form's Unit Type/Unit pair.
  const { data: unitTypesData } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
    queryFn: () => apiRequest('GET', '/api/inventory/unit-types'),
  });
  const unitTypesList = React.useMemo(() => {
    if (unitTypesData?.unitTypes) return unitTypesData.unitTypes.map(ut => ut.name);
    return UNIT_TYPES;
  }, [unitTypesData]);
  const getUnitsForTypeDynamic = (unitTypeName, currentUnit) => {
    if (!unitTypeName) return [];
    if (unitTypesData?.unitTypes) {
      const found = unitTypesData.unitTypes.find(ut => ut.name === unitTypeName);
      if (found) {
        const units = found.units || [];
        return currentUnit && !units.includes(currentUnit) ? [currentUnit, ...units] : units;
      }
    }
    return getUnitsForType(unitTypeName, currentUnit);
  };
  const getUnitTypeForUnitDynamic = (unitName) => {
    if (!unitName) return '';
    if (unitTypesData?.unitTypes) {
      const found = unitTypesData.unitTypes.find(ut => ut.units?.includes(unitName));
      if (found) return found.name;
    }
    return '';
  };

  const handleCodeChange = async (codeVal) => {
    setDemandForm(prev => ({ ...prev, materialCode: codeVal }));
    if (!codeVal.trim()) {
      setFoundItem(null);
      return;
    }
    try {
      const res = await apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(codeVal.trim())}`);
      if (res.success && res.data) {
        setFoundItem(res.data);
        // Deliberately the item's stock/storage unit ("unit"/"unitType"), not its
        // Purchase Unit ("purchaseUnit"/"purchaseUnitType") — Production draws from
        // stock, so the demand quantity must be expressed in the stock unit.
        setDemandForm(prev => ({
          ...prev,
          materialName: res.data.name,
          unitType: res.data.unitType || getUnitTypeForUnitDynamic(res.data.unit) || prev.unitType,
          unit: res.data.unit || prev.unit
        }));
      } else {
        setFoundItem(null);
      }
    } catch (err) {
      setFoundItem(null);
    }
  };

  const addDemandMutation = useMutation({
    mutationFn: ({ id, demand }) => apiRequest('POST', `/api/production-mfg/orders/${id}/materials`, demand),
    onSuccess: () => {
      invalidate();
      showDemandSuccess();
      setDemandOpen(false);
      setDemandForm(emptyDemand);
      setFoundItem(null);
    },
    onError: (e) => toast({ title: 'Add Material Demand Failed', description: e.message, variant: 'destructive' }),
  });
  const showDemandSuccess = () => toast({ title: 'Sent to R&D', description: `Extra material demand for "${demandForm.materialName}" is pending R&D approval.` });

  const handleAddDemand = () => {
    if (!demandForm.materialCode || !demandForm.materialName || !demandForm.quantity || !demandForm.unit || !materialsJobLive) return;
    addDemandMutation.mutate({
      id: materialsJobLive._id,
      demand: { ...demandForm, quantity: Number(demandForm.quantity) }
    });
  };

  const receiveMutation = useMutation({
    mutationFn: ({ id, materialCode, receivedQuantity }) =>
      apiRequest('PUT', `/api/production-mfg/orders/${id}/mark-material-issued`, { materialCode, receivedQuantity }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Material Received', description: `Successfully received ${issueQty} ${issueRow?.unit}.` });
      setIssueModalOpen(false);
      setIssueRow(null);
      setIssueQty('');
    },
    onError: (e) => toast({ title: 'Receive Material Failed', description: e.message, variant: 'destructive' }),
  });

  const handleReceiveMaterial = () => {
    if (!issueRow || !issueQty || Number(issueQty) <= 0 || Number(issueQty) > issueRow.remainingQty || !materialsJobLive) return;
    receiveMutation.mutate({ id: materialsJobLive._id, materialCode: issueRow.materialCode, receivedQuantity: Number(issueQty) });
  };

  const returnMutation = useMutation({
    mutationFn: ({ id, materialCode, returnQuantity, reason, returnType }) =>
      apiRequest('POST', `/api/production-mfg/orders/${id}/materials/return`, { materialCode, returnQuantity, reason, returnType }),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Return Requested', description: `Return request for ${returnQty} ${returnRow?.unit} submitted.` });
      setReturnModalOpen(false);
      setReturnRow(null);
      setReturnQty('');
      setReturnReason('');
      setReturnType('Excess');
    },
    onError: (e) => toast({ title: 'Return Material Failed', description: e.message, variant: 'destructive' }),
  });

  const handleReturnMaterial = () => {
    if (!returnRow || !returnQty || Number(returnQty) <= 0 || Number(returnQty) > returnRow.issuedQuantity || !materialsJobLive) return;
    returnMutation.mutate({
      id: materialsJobLive._id, materialCode: returnRow.materialCode, returnQuantity: Number(returnQty),
      reason: returnReason, returnType
    });
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wrench className="h-6 w-6 text-purple-600" /> Repair Production
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">QC-rejected items sent for repair instead of a full rebuild</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-slate-500">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="p-6 text-slate-400 text-sm">No repair jobs</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">Item</th>
                  <th className="p-4 font-medium">Qty</th>
                  <th className="p-4 font-medium">Rejection Reason</th>
                  <th className="p-4 font-medium">Supervisor</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const StIcon = statusIcon[job.repair?.status] || Clock;
                  const status = job.repair?.status || 'Pending';
                  const realOrderId = getRealOrderId(job);
                  return (
                    <tr key={job._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-800">
                        {realOrderId ? (
                          <>
                            <span className="font-bold text-blue-700">{realOrderId}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">{job.orderId}</span>
                          </>
                        ) : job.orderId}
                      </td>
                      <td className="p-4 text-slate-700">{job.machineName}</td>
                      <td className="p-4 text-slate-700">{job.orderQuantity || 1}</td>
                      <td className="p-4 text-slate-500 text-xs max-w-xs">
                        {job.rejectionDetails?.rejectionReason || '—'}
                      </td>
                      <td className="p-4 text-xs">
                        {job.repair?.assignedTo ? (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <UserCircle2 className="w-3.5 h-3.5 text-slate-400" /> {job.repair.assignedTo}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusColor[status]}`}>
                          <StIcon className="w-3 h-3" /> {status}
                        </span>
                        {job.repair?.notes && (
                          <div className="text-[10px] text-slate-500 mt-1 max-w-[180px] truncate" title={job.repair.notes}>
                            "{job.repair.notes}"
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-slate-600" onClick={() => setMaterialsJob(job)}>
                            <Package className="w-3.5 h-3.5 mr-1" /> Materials
                            {job.materialDemands?.length > 0 && (
                              <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-700 px-1.5 rounded-full">{job.materialDemands.length}</span>
                            )}
                          </Button>
                          {status === 'Pending' && canEdit && (
                            <Button size="sm" variant="outline" onClick={() => { setStartModal(job); setSelectedTeamId(''); }}>
                              Start Repair
                            </Button>
                          )}
                          {status === 'In Progress' && canEdit && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCompleteModal(job)}>
                              Mark Complete
                            </Button>
                          )}
                          {status === 'Completed' && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sent to QC
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!completeModal} onOpenChange={(open) => !open && setCompleteModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Repair</DialogTitle>
            <DialogDescription>
              {completeModal?.machineName} — {completeModal?.orderQuantity || 1} unit(s). This sends the item to QC for approval, same as a fresh production run.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-slate-500">Repair Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was repaired / replaced" />
          </div>
          {completeMutation.isError && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {completeMutation.error?.message}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCompleteModal(null)}>Cancel</Button>
            <Button
              onClick={() => completeMutation.mutate({ id: completeModal._id, notes })}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Submitting...' : 'Mark Complete & Send to QC'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── START REPAIR (assign supervisor) ─── */}
      <Dialog open={!!startModal} onOpenChange={(open) => !open && setStartModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Repair</DialogTitle>
            <DialogDescription>
              {startModal?.machineName} — assign a team/supervisor to be accountable for this repair before it starts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-slate-500">Team / Supervisor *</Label>
            {teams.length === 0 ? (
              <p className="text-xs text-amber-600">No production teams set up yet — create one in Work Planning first.</p>
            ) : (
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
              >
                <option value="">Select a team</option>
                {teams.map(t => (
                  <option key={t._id} value={t._id}>{t.name} — Supervisor: {t.supervisor}</option>
                ))}
              </select>
            )}
          </div>
          {startMutation.isError && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {startMutation.error?.message}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setStartModal(null)}>Cancel</Button>
            <Button onClick={handleStartRepair} disabled={!selectedTeamId || startMutation.isPending}>
              {startMutation.isPending ? 'Starting...' : 'Start Repair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MATERIALS DIALOG (per repair job) ─── */}
      <Dialog open={!!materialsJob} onOpenChange={(open) => !open && setMaterialsJob(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" /> Materials — {materialsJobLive?.machineName}
            </DialogTitle>
          </DialogHeader>
          {materialsJobLive && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-end">
                {materialsJobLive.repair?.status !== 'Completed' && canAddDemand && (
                  <Button size="sm" className="h-7 text-xs" variant="outline" onClick={() => {
                    setDemandForm(emptyDemand);
                    setFoundItem(null);
                    setDemandOpen(true);
                  }}>
                    <Plus className="h-3 w-3 mr-1" /> Add Demand
                  </Button>
                )}
              </div>
              {(materialsJobLive.materialDemands || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No material demands raised yet.</p>
              ) : (
                <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold">Code</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold">Material</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold">Qty</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold">Status</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialsJobLive.materialDemands.map(m => {
                      const issued = m.issuedQuantity || 0;
                      const remaining = m.quantity - issued;
                      return (
                        <tr key={m._id || m.id} className="border-t border-slate-50">
                          <td className="px-3 py-2 font-mono text-blue-700">{m.materialCode}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{m.materialName}</td>
                          <td className="px-3 py-2">
                            {m.bomQuantity !== null && m.bomQuantity !== undefined ? (
                              <div className="flex flex-col">
                                <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                                  Req: {m.quantity} {m.fabricationCategory ? 'pcs' : m.unit}
                                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200">BOM</span>
                                </span>
                                <span className={`text-[10px] font-bold mt-0.5 ${issued === m.quantity ? 'text-emerald-600' : 'text-blue-600'}`}>
                                  Issued: {issued} / {m.quantity}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-purple-700 font-bold flex items-center gap-1.5">
                                  Req: {m.quantity} {m.fabricationCategory ? 'pcs' : m.unit}
                                  <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded uppercase font-bold border border-purple-200">Out of BOM</span>
                                </span>
                                <span className={`text-[10px] font-bold mt-0.5 ${issued === m.quantity ? 'text-emerald-600' : 'text-blue-600'}`}>
                                  Issued: {issued} / {m.quantity}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${m.status === 'Issued' ? 'bg-emerald-100 text-emerald-700' :
                                m.status === 'Pending Purchase' ? 'bg-amber-100 text-amber-700' :
                                  m.status === 'Pending R&D' ? 'bg-orange-100 text-orange-700' :
                                    m.status === 'R&D Rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-slate-100 text-slate-600'}`}>{m.status}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              {(m.status === 'Requested' || m.status === 'In Transit') && remaining > 0 && (
                                <button
                                  onClick={() => {
                                    const inTransitQty = (m.transferredQuantity || 0) - (m.issuedQuantity || 0);
                                    setIssueRow({ materialCode: m.materialCode, materialName: m.materialName, remainingQty: inTransitQty > 0 ? inTransitQty : remaining, unit: m.unit });
                                    setIssueQty(inTransitQty > 0 ? inTransitQty : remaining);
                                    setIssueModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                  title="Receive items internally from the Store shelf"
                                >
                                  <ArrowDownToLine className="h-3 w-3" /> Receive
                                </button>
                              )}
                              {m.status === 'Issued' && (
                                <button
                                  onClick={() => {
                                    setReturnRow({ materialCode: m.materialCode, materialName: m.materialName, issuedQuantity: m.issuedQuantity, unit: m.unit });
                                    setReturnQty('');
                                    setReturnModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                                  title="Return items to the Store"
                                >
                                  <Package className="h-3 w-3" /> Return
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialsJob(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ADD MATERIAL DEMAND ─── */}
      <Dialog open={demandOpen} onOpenChange={setDemandOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Material Demand</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Code *</label>
              <Input placeholder="e.g. STL-010" value={demandForm.materialCode} onChange={e => handleCodeChange(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={demandForm.unitType} onChange={e => setDemandForm(f => ({ ...f, unitType: e.target.value, unit: '' }))}>
                  <option value="">Select</option>
                  {unitTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" value={demandForm.unit} disabled={!demandForm.unitType} onChange={e => setDemandForm(f => ({ ...f, unit: e.target.value }))}>
                  <option value="">{demandForm.unitType ? 'Select' : 'Select Unit Type first'}</option>
                  {getUnitsForTypeDynamic(demandForm.unitType, demandForm.unit).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Name *</label>
              <Input placeholder="e.g. MS Plate 12mm" value={demandForm.materialName} onChange={e => setDemandForm(f => ({ ...f, materialName: e.target.value }))} />
              {foundItem ? (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  ✓ Found: {foundItem.name} ({foundItem.itemType || '—'})
                </p>
              ) : demandForm.materialCode.trim() ? (
                <p className="text-xs text-amber-500 font-medium mt-1">
                  ⚠ Code not matched. Enter name manually.
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
              <Input type="number" min="0" placeholder="0" value={demandForm.quantity} onChange={e => setDemandForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold block mb-0.5">R&D Authorization Required</span>
                This demand will be locked as <strong>Pending R&D</strong> and an R&D ticket will be auto-generated. This material will only become available for receiving after R&D approves the request.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemandOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddDemand}
              disabled={!demandForm.materialCode || !demandForm.materialName || !demandForm.quantity || !demandForm.unit || addDemandMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              {addDemandMutation.isPending ? 'Adding...' : 'Add Demand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RECEIVE MATERIAL ─── */}
      <Dialog open={issueModalOpen} onOpenChange={(o) => { setIssueModalOpen(o); if (!o) { setIssueRow(null); setIssueQty(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowDownToLine className="h-5 w-5" /> Receive Material
            </DialogTitle>
          </DialogHeader>
          {issueRow && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Code</span><span className="font-mono text-blue-700 text-xs font-semibold">{issueRow.materialCode}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Material</span><span className="text-slate-800 text-xs font-medium truncate ml-2">{issueRow.materialName}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-xs text-slate-500 font-semibold">Remaining Required</span><span className="text-emerald-700 text-xs font-bold">{issueRow.remainingQty} {issueRow.unit}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity to Receive *</label>
                  <Input
                    type="number" min="0" max={issueRow.remainingQty}
                    value={issueQty} onChange={e => setIssueQty(e.target.value)}
                    className={Number(issueQty) > issueRow.remainingQty ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {Number(issueQty) > issueRow.remainingQty && (
                    <span className="text-[10px] text-red-500 font-medium">Cannot exceed {issueRow.remainingQty}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100" disabled value={issueRow.unit}>
                    <option>{issueRow.unit}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReceiveMaterial}
              disabled={!issueQty || Number(issueQty) <= 0 || Number(issueQty) > (issueRow?.remainingQty || 0) || receiveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {receiveMutation.isPending ? 'Receiving...' : 'Receive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RETURN MATERIAL ─── */}
      <Dialog open={returnModalOpen} onOpenChange={(o) => { setReturnModalOpen(o); if (!o) { setReturnRow(null); setReturnQty(''); setReturnReason(''); setReturnType('Excess'); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Package className="h-5 w-5" /> Return Material
            </DialogTitle>
          </DialogHeader>
          {returnRow && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Return excess or defective materials back to the store.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Code</span><span className="font-mono text-blue-700 text-xs font-semibold">{returnRow.materialCode}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Material</span><span className="text-slate-800 text-xs font-medium truncate ml-2">{returnRow.materialName}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-xs text-slate-500 font-semibold">Max Returnable</span><span className="text-amber-700 text-xs font-bold">{returnRow.issuedQuantity} {returnRow.unit}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity to Return *</label>
                  <Input
                    type="number" min="0" max={returnRow.issuedQuantity}
                    value={returnQty} onChange={e => setReturnQty(e.target.value)}
                    className={Number(returnQty) > returnRow.issuedQuantity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {Number(returnQty) > returnRow.issuedQuantity && (
                    <span className="text-[10px] text-red-500 font-medium">Cannot exceed {returnRow.issuedQuantity}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100" disabled value={returnRow.unit}>
                    <option>{returnRow.unit}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Return Type *</label>
                <div className="flex gap-2">
                  {['Excess', 'Defect'].map(t => (
                    <button
                      key={t} type="button" onClick={() => setReturnType(t)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${returnType === t ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason (optional)</label>
                <Input placeholder="e.g. excess after repair" value={returnReason} onChange={e => setReturnReason(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReturnMaterial}
              disabled={!returnQty || Number(returnQty) <= 0 || Number(returnQty) > (returnRow?.issuedQuantity || 0) || returnMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {returnMutation.isPending ? 'Submitting...' : 'Submit Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
