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
  } = useProduction();

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [qcDialog, setQcDialog] = useState(null); // { step, action: 'approve'|'reject' }
  const [qcBy, setQcBy] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [notesDialog, setNotesDialog] = useState(null); // { step, notes }
  const [notesValue, setNotesValue] = useState('');
  const [assignDialog, setAssignDialog] = useState(null); // { step }
  const [selectedTeam, setSelectedTeam] = useState('');

  const activeOrders = orders.filter(o => o.status !== 'Completed');
  const selectedOrder = orders.find(o => String(o._id || o.id) === selectedOrderId);
  const progress = selectedOrder ? getOrderProgress(selectedOrder._id || selectedOrder.id) : 0;

  // A step can only start if the previous step is Completed (QC Approved)
  const canStart = (processes, stepIndex) => {
    if (stepIndex === 0) return true;
    return processes[stepIndex - 1].status === 'Completed';
  };

  const handleQCSubmit = () => {
    if (!qcBy.trim()) return;
    if (qcDialog.action === 'approve') {
      approveQC(selectedOrderId, qcDialog.step, qcBy);
    } else {
      rejectQC(selectedOrderId, qcDialog.step, qcBy, rejectReason);
    }
    setQcDialog(null);
    setQcBy('');
    setRejectReason('');
  };

  const handleSaveNotes = () => {
    updateProcessNotes(selectedOrderId, notesDialog.step, notesValue);
    setNotesDialog(null);
  };

  const handleAssignTeam = () => {
    if (!selectedTeam) return;
    assignTeam(selectedOrderId, assignDialog.step, selectedTeam);
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
              onChange={e => setSelectedOrderId(e.target.value)}
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

          {/* Process Steps */}
          <div className="space-y-3">
            {selectedOrder.processes.map((proc, idx) => {
              const unlocked = canStart(selectedOrder.processes, idx);
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
                        {proc.status === 'Pending' && unlocked && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => startProcess(selectedOrderId, proc.step)}>
                            <Play className="h-3.5 w-3.5 mr-1" /> Start
                          </Button>
                        )}
                        {proc.status === 'In Progress' && (
                          <>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => markProcessComplete(selectedOrderId, proc.step)}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Complete
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => { setNotesDialog({ step: proc.step }); setNotesValue(proc.notes); }}>
                              Notes
                            </Button>
                          </>
                        )}
                        {proc.status === 'QC Pending' && (
                          <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => setQcDialog({ step: proc.step, action: 'approve' })}>
                              <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve QC
                            </Button>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs" onClick={() => setQcDialog({ step: proc.step, action: 'reject' })}>
                              <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject QC
                            </Button>
                          </>
                        )}
                        {proc.status === 'Completed' && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold px-2 py-1">
                            <CheckCircle className="h-3.5 w-3.5" /> QC Approved
                          </span>
                        )}
                      </div>
                    </div>
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
    </div>
  );
}
