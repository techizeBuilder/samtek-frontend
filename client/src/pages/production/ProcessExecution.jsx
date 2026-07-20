import React, { useState } from 'react';
import { useProduction, PROCESS_STEPS } from '@/contexts/ProductionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Cog, Play, CheckCircle, XCircle, AlertTriangle, ChevronDown, Lock,
  Clock, Users, RotateCcw, ThumbsUp, ThumbsDown, Package
} from 'lucide-react';

const stepColor = {
  'Pending': 'border-slate-200 bg-white',
  'In Progress': 'border-blue-300 bg-blue-50',
  'QC Pending': 'border-amber-300 bg-amber-50',
  'Completed': 'border-emerald-300 bg-emerald-50',
};

const stepBadge = {
  'Pending': 'bg-slate-100 text-slate-500',
  'In Progress': 'bg-blue-100 text-blue-700',
  'QC Pending': 'bg-amber-100 text-amber-700',
  'Completed': 'bg-emerald-100 text-emerald-700',
};

const stepIcon = {
  'Pending': <Clock className="h-4 w-4 text-slate-400" />,
  'In Progress': <Play className="h-4 w-4 text-blue-600" />,
  'QC Pending': <AlertTriangle className="h-4 w-4 text-amber-500" />,
  'Completed': <CheckCircle className="h-4 w-4 text-emerald-600" />,
};

const typeColor = {
  'Outsourcing': 'bg-purple-100 text-purple-700 border-purple-200',
  'In-House': 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function ProcessExecution() {
  const {
    orders, teams, getOrderProgress, getTeamById,
    assignTeam, startProcess, markProcessComplete,
    approveQC, rejectQC, updateProcessNotes,
    addSubEntry, completeSubEntry, qcSubEntry,
    getOrderUnitCount, getUnitProcesses
  } = useProduction();

  const [selectedOrderId, setSelectedOrderId] = useState('');
  // Which physical machine (1-based) of a multi-quantity order is shown —
  // only relevant when the order's orderQuantity > 1 (tabs render then).
  const [activeUnit, setActiveUnit] = useState(1);
  const [qcDialog, setQcDialog] = useState(null); // { step, action: 'approve'|'reject' }
  const [qcBy, setQcBy] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [notesDialog, setNotesDialog] = useState(null); // { step, notes }
  const [notesValue, setNotesValue] = useState('');
  const [subEntryDialog, setSubEntryDialog] = useState(null); // { step }
  const [subEntryForm, setSubEntryForm] = useState({ parentPart: '', childPart: '', assignedMember: '', fabricationType: '' });
  const [customFabricationType, setCustomFabricationType] = useState('');
  const [subQcDialog, setSubQcDialog] = useState(null); // { step, subEntryId, action: 'approve'|'reject' }
  const [subQcBy, setSubQcBy] = useState('');
  const [subRejectReason, setSubRejectReason] = useState('');
  const [assignDialog, setAssignDialog] = useState(null); // { step }
  const [selectedTeam, setSelectedTeam] = useState('');

  const activeOrders = orders.filter(o => o.status !== 'Completed');
  const selectedOrder = orders.find(o => String(o._id || o.id) === selectedOrderId);
  const progress = selectedOrder ? getOrderProgress(selectedOrder._id || selectedOrder.id) : 0;

  // How many physical machines this order builds, and which one is on screen.
  const unitCount = selectedOrder ? getOrderUnitCount(selectedOrder._id || selectedOrder.id) : 1;
  const activeProcesses = selectedOrder ? getUnitProcesses(selectedOrderId, activeUnit) : [];

  const selectOrder = (id) => {
    setSelectedOrderId(id);
    setActiveUnit(1); // reset to Unit 1 whenever the order selection changes
  };

  // A step can only start if the previous step is Completed (QC Approved)
  const canStart = (processes, stepIndex) => {
    if (stepIndex === 0) return true;
    return processes[stepIndex - 1].status === 'Completed';
  };

  const handleQCSubmit = () => {
    if (!qcBy.trim()) return;
    if (qcDialog.action === 'approve') {
      approveQC(selectedOrderId, qcDialog.step, qcBy, activeUnit);
    } else {
      rejectQC(selectedOrderId, qcDialog.step, qcBy, rejectReason, activeUnit);
    }
    setQcDialog(null);
    setQcBy('');
    setRejectReason('');
  };

  const handleSubQCSubmit = () => {
    if (!subQcBy.trim()) return;
    if (subQcDialog.action === 'reject' && !subRejectReason.trim()) return;
    qcSubEntry(
      selectedOrderId, subQcDialog.step, subQcDialog.subEntryId,
      subQcDialog.action === 'approve' ? 'Approved' : 'Rejected',
      subQcBy, subRejectReason, activeUnit
    );
    setSubQcDialog(null);
    setSubQcBy('');
    setSubRejectReason('');
  };

  const handleSaveNotes = () => {
    updateProcessNotes(selectedOrderId, notesDialog.step, notesValue, activeUnit);
    setNotesDialog(null);
  };

  const handleAssignTeam = () => {
    if (!selectedTeam) return;
    assignTeam(selectedOrderId, assignDialog.step, selectedTeam, activeUnit);
    setAssignDialog(null);
    setSelectedTeam('');
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Cog className="h-6 w-6 text-blue-600" /> Process Execution & QC
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Sequential process flow — each step requires supervisor QC approval before the next begins
        </p>
      </div>

      {/* Order Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Production Order</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedOrderId}
              onChange={e => selectOrder(e.target.value)}
            >
              <option value="">-- Select an order --</option>
              {orders.map(o => (
                <option key={o._id || o.id} value={String(o._id || o.id)}>
                  {o.orderId || o.id} — {o.machineName} [{o.status}]
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedOrderId && (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Cog className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select an order to manage its process execution and QC approvals</p>
          </CardContent>
        </Card>
      )}

      {selectedOrder && (
        <>
          {/* Order Summary Bar */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-slate-900">{selectedOrder.machineName}</h2>
                      <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedOrder.machineCode}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedOrder.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {selectedOrder.priority}
                      </span>
                      {unitCount > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Qty: {unitCount}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Delivery: {selectedOrder.deliveryDate} · {selectedOrder.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-600">Progress</div>
                  <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">{progress}%</span>
                </div>
              </div>

              {/* Prerequisite warnings */}
              {(!selectedOrder.bomVerified || !selectedOrder.designVerified) && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Design or BOM not verified. Go to Order Management to verify before starting production.</span>
                </div>
              )}
              {!selectedOrder.materialIssued && (
                <div className="mt-2 flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                  <Package className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Materials not issued. Raise material demand in Order Management before starting Job Work.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Machine / Unit Tabs — only shown when this order builds more than
              one physical machine, so single-quantity orders look exactly as
              before. Each tab tracks its own independent process pipeline. */}
          {unitCount > 1 && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 pl-1">Machine:</span>
                  {Array.from({ length: unitCount }, (_, i) => i + 1).map(unitNo => {
                    const unitProcs = getUnitProcesses(selectedOrderId, unitNo);
                    const unitDone = unitProcs.filter(p => p.status === 'Completed').length;
                    const unitComplete = unitDone === unitProcs.length;
                    return (
                      <button
                        key={unitNo}
                        onClick={() => setActiveUnit(unitNo)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activeUnit === unitNo
                            ? 'bg-blue-600 text-white border-blue-600'
                            : unitComplete
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                          }`}
                      >
                        {unitComplete && <CheckCircle className="h-3 w-3" />}
                        Unit {unitNo}
                        <span className={`text-[10px] ${activeUnit === unitNo ? 'text-blue-100' : 'text-slate-400'}`}>
                          {unitDone}/{unitProcs.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Process Steps */}
          <div className="space-y-3">
            {activeProcesses.map((proc, idx) => {
              const unlocked = canStart(activeProcesses, idx);
              const team = proc.assignedTeam ? getTeamById(proc.assignedTeam) : null;
              return (
                <Card key={proc.step} className={`border-2 shadow-sm transition-all ${stepColor[proc.status]} ${!unlocked && proc.status === 'Pending' ? 'opacity-60' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Step Info */}
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900">{proc.step}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${typeColor[proc.type]}`}>{proc.type}</span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${stepBadge[proc.status]}`}>
                              {stepIcon[proc.status]} {proc.status}
                            </span>
                            {!unlocked && proc.status === 'Pending' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                <Lock className="h-3 w-3" /> Locked
                              </span>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-slate-500">
                            {proc.startDate && <span>Started: <strong>{proc.startDate}</strong></span>}
                            {proc.endDate && <span>Completed: <strong>{proc.endDate}</strong></span>}
                            {proc.qcDate && <span>QC: <strong>{proc.qcDate}</strong> by {proc.qcBy}</span>}
                          </div>

                          {/* Team Assignment */}
                          <div className="mt-2 flex items-center gap-2">
                            {team ? (
                              <span className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                                <Users className="h-3.5 w-3.5 text-blue-500" />
                                {team.name} — Supervisor: {team.supervisor}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">No team assigned</span>
                            )}
                            {proc.status !== 'Completed' && (
                              <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-600 px-2" onClick={() => { setAssignDialog({ step: proc.step }); setSelectedTeam(String(proc.assignedTeam?._id || proc.assignedTeam || '')); }}>
                                {team ? 'Change Team' : '+ Assign Team'}
                              </Button>
                            )}
                          </div>

                          {/* Notes & Reworks */}
                          {proc.reworks.length > 0 && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                              <strong>Reworks ({proc.reworks.length}):</strong> {proc.reworks.map(r => r.reason).join('; ')}
                            </div>
                          )}
                          {proc.notes && (
                            <p className="mt-1.5 text-xs text-slate-500 italic">Notes: {proc.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        {(() => {
                          const isFabricationLocked = proc.step === 'Fabrication' && (
                            !proc.subEntries || proc.subEntries.length === 0 ||
                            proc.subEntries.some(se => se.status !== 'Completed' || se.qcStatus !== 'Approved')
                          );
                          
                          return (
                            <>
                              {proc.status === 'Pending' && unlocked && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => startProcess(selectedOrderId, proc.step, activeUnit)}>
                                  <Play className="h-3.5 w-3.5 mr-1" /> Start
                                </Button>
                              )}
                              {proc.status === 'In Progress' && (
                                <>
                                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => markProcessComplete(selectedOrderId, proc.step, activeUnit)} disabled={isFabricationLocked}>
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Complete
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-xs" onClick={() => { setNotesDialog({ step: proc.step }); setNotesValue(proc.notes); }}>
                                    Notes
                                  </Button>
                                </>
                              )}
                              {proc.status === 'QC Pending' && (
                                <>
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => setQcDialog({ step: proc.step, action: 'approve' })} disabled={isFabricationLocked}>
                                    <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve QC
                                  </Button>
                                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs" onClick={() => setQcDialog({ step: proc.step, action: 'reject' })}>
                                    <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject QC
                                  </Button>
                                </>
                              )}
                            </>
                          );
                        })()}

                        {proc.status === 'Completed' && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold px-2 py-1">
                            <CheckCircle className="h-3.5 w-3.5" /> QC Approved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fabrication Sub Entries Section */}
                    {proc.step === 'Fabrication' && proc.status !== 'Pending' && (
                      <div className="w-full mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Cog className="h-4 w-4 text-slate-500" /> Fabrication Sub-Processes</h4>
                          {proc.status === 'In Progress' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => {
                              setSubEntryForm({ parentPart: '', childPart: '', assignedMember: '', fabricationType: '' });
                              setCustomFabricationType('');
                              setSubEntryDialog({ step: proc.step });
                            }}>
                              + Add Entry
                            </Button>
                          )}
                        </div>
                        
                        {proc.subEntries && proc.subEntries.length > 0 ? (
                          <div className="space-y-2">
                            {proc.subEntries.map(se => (
                              <div key={se._id || se.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div>
                                      <p className="text-xs text-slate-500 mb-0.5">Parent Part</p>
                                      <p className="text-sm font-semibold text-slate-800">{se.parentPart}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-0.5">Child Part</p>
                                      <p className="text-sm font-semibold text-slate-800">{se.childPart}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-0.5">Fabrication Type</p>
                                      <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{se.fabricationType || 'Other'}</span>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 mb-0.5">Assigned To</p>
                                      <p className="text-sm font-medium text-slate-700">{se.assignedMember}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {se.status === 'Pending' ? (
                                      <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => completeSubEntry(selectedOrderId, proc.step, se._id || se.id, activeUnit)}>
                                        <CheckCircle className="h-3 w-3 mr-1" /> Mark Done
                                      </Button>
                                    ) : se.qcStatus === 'Pending' ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">Done - Pending QC</span>
                                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setSubQcDialog({ step: proc.step, subEntryId: se._id || se.id, action: 'approve' })}>
                                          <ThumbsUp className="h-3 w-3 mr-1" /> QC Approve
                                        </Button>
                                        <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={() => setSubQcDialog({ step: proc.step, subEntryId: se._id || se.id, action: 'reject' })}>
                                          <ThumbsDown className="h-3 w-3 mr-1" /> Reject
                                        </Button>
                                      </div>
                                    ) : se.qcStatus === 'Approved' ? (
                                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                                        <CheckCircle className="h-3 w-3" /> Approved
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {se.reworks && se.reworks.length > 0 && (
                                  <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                                    <strong>Reworks ({se.reworks.length}):</strong> {se.reworks.map(r => r.reason).join('; ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No sub-processes added yet.</p>
                        )}
                      </div>
                    )}

                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Completed Banner */}
          {selectedOrder.status === 'Completed' && (
            <Card className="border-2 border-emerald-300 bg-emerald-50 shadow-sm">
              <CardContent className="p-5 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-bold text-emerald-800 text-lg">All Processes Completed!</h3>
                <p className="text-emerald-700 text-sm mt-1">
                  {selectedOrder.machineName} is ready to be forwarded to Quality / Dispatch.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* QC Dialog */}
      <Dialog open={!!qcDialog} onOpenChange={() => setQcDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={qcDialog?.action === 'approve' ? 'text-emerald-700' : 'text-red-700'}>
              {qcDialog?.action === 'approve' ? <ThumbsUp className="inline h-4 w-4 mr-2" /> : <ThumbsDown className="inline h-4 w-4 mr-2" />}
              {qcDialog?.action === 'approve' ? 'Approve QC' : 'Reject QC'} — {qcDialog?.step}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Supervisor Name *</label>
              <Input placeholder="Enter your name" value={qcBy} onChange={e => setQcBy(e.target.value)} />
            </div>
            {qcDialog?.action === 'reject' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Rejection Reason *</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe the issue requiring rework..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQcDialog(null)}>Cancel</Button>
            <Button
              onClick={handleQCSubmit}
              disabled={!qcBy.trim() || (qcDialog?.action === 'reject' && !rejectReason.trim())}
              className={qcDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {qcDialog?.action === 'approve' ? 'Approve' : 'Reject & Send for Rework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Entry QC Dialog */}
      <Dialog open={!!subQcDialog} onOpenChange={() => setSubQcDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={subQcDialog?.action === 'approve' ? 'text-emerald-700' : 'text-red-700'}>
              {subQcDialog?.action === 'approve' ? <ThumbsUp className="inline h-4 w-4 mr-2" /> : <ThumbsDown className="inline h-4 w-4 mr-2" />}
              {subQcDialog?.action === 'approve' ? 'Approve Sub-Process QC' : 'Reject Sub-Process QC'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Supervisor Name *</label>
              <Input placeholder="Enter your name" value={subQcBy} onChange={e => setSubQcBy(e.target.value)} />
            </div>
            {subQcDialog?.action === 'reject' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Rejection Reason *</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Describe the issue requiring rework..."
                  value={subRejectReason}
                  onChange={e => setSubRejectReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubQcDialog(null)}>Cancel</Button>
            <Button
              onClick={handleSubQCSubmit}
              disabled={!subQcBy.trim() || (subQcDialog?.action === 'reject' && !subRejectReason.trim())}
              className={subQcDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            >
              {subQcDialog?.action === 'approve' ? 'Approve' : 'Reject & Send for Rework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Team — {assignDialog?.step}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {teams.map(t => {
              const tid = String(t._id || t.id);
              return (
              <button
                key={tid}
                onClick={() => setSelectedTeam(tid)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedTeam === tid ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
              >
                <div className="font-semibold text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Supervisor: {t.supervisor} · {t.members.length} members</div>
                <div className="text-xs text-slate-400 mt-0.5">Skills: {t.skills.join(', ')}</div>
                <div className="text-xs text-blue-600 mt-0.5 font-semibold">Efficiency: {t.efficiency}%</div>
              </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button onClick={handleAssignTeam} disabled={!selectedTeam} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={() => setNotesDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Process Notes — {notesDialog?.step}</DialogTitle></DialogHeader>
          <div className="py-2">
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
              placeholder="Add notes about this process step..."
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
            <Button onClick={handleSaveNotes} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Sub-Entry Dialog */}
      <Dialog open={!!subEntryDialog} onOpenChange={() => setSubEntryDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Cog className="h-5 w-5 text-blue-600" /> Add Fabrication Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Parent Part</label>
              <Input placeholder="e.g. Main Chassis" value={subEntryForm.parentPart} onChange={e => setSubEntryForm(f => ({ ...f, parentPart: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Child Part</label>
              <Input placeholder="e.g. Side Panels" value={subEntryForm.childPart} onChange={e => setSubEntryForm(f => ({ ...f, childPart: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Fabrication Type</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={subEntryForm.fabricationType}
                onChange={e => {
                  setSubEntryForm(f => ({ ...f, fabricationType: e.target.value }));
                  if (e.target.value !== 'Other') setCustomFabricationType('');
                }}
              >
                <option value="">-- Select type --</option>
                <option value="Welding">Welding</option>
                <option value="Cutting">Cutting</option>
                <option value="Bending">Bending</option>
                <option value="Drilling">Drilling</option>
                <option value="Grinding">Grinding</option>
                <option value="Painting">Painting</option>
                <option value="Assembly">Assembly</option>
                <option value="Other">Other — specify below</option>
              </select>
              {subEntryForm.fabricationType === 'Other' && (
                <div className="mt-2 relative">
                  <Input
                    placeholder="e.g. Laser Cutting, Stamping..."
                    value={customFabricationType}
                    onChange={e => setCustomFabricationType(e.target.value)}
                    className="pr-8 border-blue-300 focus:ring-blue-500"
                    autoFocus
                  />
                  {customFabricationType && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setCustomFabricationType('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Assign Team Member</label>
              <Input placeholder="Member Name" value={subEntryForm.assignedMember} onChange={e => setSubEntryForm(f => ({ ...f, assignedMember: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubEntryDialog(null)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              disabled={
                !subEntryForm.parentPart ||
                !subEntryForm.childPart ||
                !subEntryForm.assignedMember ||
                !subEntryForm.fabricationType ||
                (subEntryForm.fabricationType === 'Other' && !customFabricationType.trim())
              }
              onClick={async () => {
                try {
                  const finalType = subEntryForm.fabricationType === 'Other'
                    ? customFabricationType.trim()
                    : subEntryForm.fabricationType;
                  await addSubEntry(selectedOrderId, subEntryDialog.step, { ...subEntryForm, fabricationType: finalType }, activeUnit);
                  setSubEntryDialog(null);
                  setCustomFabricationType('');
                } catch (err) {}
              }}
            >
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
