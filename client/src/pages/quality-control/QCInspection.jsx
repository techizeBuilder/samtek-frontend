import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useQC } from '@/contexts/QCContext';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ChevronLeft,
  Play, Send, Package, Factory, ShoppingCart, Plus, Trash2, RefreshCw
} from 'lucide-react';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

const itemStatusColor = { Pending: 'text-slate-400', Pass: 'text-emerald-600', Fail: 'text-red-600' };

function ChecklistRow({ item, jobStatus, onUpdate }) {
  const [local, setLocal] = useState({ actualValue: item.actualValue || '', status: item.status || 'Pending', remarks: item.remarks || '' });
  const [saving, setSaving] = useState(false);
  const editable = jobStatus === 'In Progress';

  const save = async () => {
    setSaving(true);
    try { await onUpdate(item._id, local); } finally { setSaving(false); }
  };

  // Dynamically set placeholder based on the type of check
  const isVisualCheck = item.standardValue === 'Visual Inspection';
  const actualValuePlaceholder = isVisualCheck ? 'Observations (optional)' : 'Measured value';

  return (
    <div className={`p-4 rounded-lg border ${item.status === 'Pass' ? 'border-emerald-200 bg-emerald-50' : item.status === 'Fail' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{item.parameter}</p>
          {item.standardValue && (
            <div className="mt-1.5">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                Standard: {item.standardValue}
              </span>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${itemStatusColor[item.status]}`}>
          {item.status === 'Pass' && <CheckCircle2 className="h-4 w-4" />}
          {item.status === 'Fail' && <XCircle className="h-4 w-4" />}
          {item.status === 'Pending' && <Clock className="h-4 w-4" />}
          {item.status}
        </div>
      </div>

      {editable ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label className="text-xs text-slate-500">Actual Value</Label>
            <Input 
              className="mt-1 h-9 text-sm" 
              value={local.actualValue} 
              onChange={e => setLocal(l => ({ ...l, actualValue: e.target.value }))} 
              placeholder={actualValuePlaceholder} 
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Result</Label>
            <Select value={local.status} onValueChange={v => setLocal(l => ({ ...l, status: v }))}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Pass">Pass</SelectItem>
                <SelectItem value="Fail">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Remarks {local.status === 'Fail' && <span className="text-red-500">*</span>}</Label>
            <div className="flex gap-2 mt-1">
              <Input 
                className="h-9 text-sm flex-1" 
                value={local.remarks} 
                onChange={e => setLocal(l => ({ ...l, remarks: e.target.value }))} 
                placeholder={local.status === 'Fail' ? 'Reason required' : 'Optional'} 
              />
              <Button size="sm" className="h-9 px-3 shrink-0" onClick={save} disabled={saving}>
                {saving ? '...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-6 text-sm mt-2 pt-3 border-t border-slate-100">
          {item.actualValue && <div><span className="text-slate-400">Actual: </span><span className="font-medium text-slate-700">{item.actualValue}</span></div>}
          {item.remarks && <div><span className="text-slate-400">Remarks: </span><span className="font-medium text-slate-700">{item.remarks}</span></div>}
        </div>
      )}
    </div>
  );
}

export default function QCInspection() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { startInspection, updateChecklistItem, submitDecision, addChecklistItem, removeChecklistItem } = useQC();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [syncingRD, setSyncingRD] = useState(false); // New state for R&D sync
  const [decision, setDecision] = useState('');
  const [failReason, setFailReason] = useState('');
  const [rejectQty, setRejectQty] = useState('');
  const [inspectorRemarks, setInspectorRemarks] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [newParam, setNewParam] = useState('');
  const [newStd, setNewStd] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['qc-job', id],
    queryFn: () => apiRequest('GET', `/api/qc/jobs/${id}`),
    enabled: !!id,
  });

  const job = data?.data;

  // ⚡ The new Sync Function ⚡
  const handleSyncRD = async () => {
    setSyncingRD(true);
    try {
      await apiRequest('PUT', `/api/qc/jobs/${id}/sync-rd`);
      toast({ title: 'Success', description: 'R&D parameters loaded successfully.' });
      refetch(); // Instantly reloads the UI with the new checklist
    } catch (e) {
      toast({
        title: 'Sync Failed',
        description: e.message || 'Could not find R&D data for this item.',
        variant: 'destructive'
      });
    } finally {
      setSyncingRD(false);
    }
  };

  const handleStart = async () => {
    if (!inspectorName.trim()) {
      toast({ title: 'Inspector name is required', description: 'Please enter the inspector name before starting inspection.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await startInspection(id, { inspector: inspectorName });
      toast({ title: 'Inspection started' });
      refetch();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleUpdateItem = async (itemId, updateData) => {
    try {
      await updateChecklistItem(id, itemId, updateData);
      refetch();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleAddItem = async () => {
    if (!newParam.trim()) return;
    try {
      await addChecklistItem(id, { parameter: newParam, standardValue: newStd });
      setNewParam(''); setNewStd('');
      refetch();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await removeChecklistItem(id, itemId);
      refetch();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Reject qty only matters when the job still holds more than 1 unit — for a
  // single-unit job, Fail always rejects that one unit, same as before.
  const showRejectQtyInput = decision === 'Fail' && (job?.quantity || 1) > 1;
  const parsedRejectQty = showRejectQtyInput ? Number(rejectQty) : (job?.quantity || 1);
  const isPartialRejectQty = showRejectQtyInput && parsedRejectQty > 0 && parsedRejectQty < job.quantity;

  const handleDecision = async () => {
    if (!decision) { toast({ title: 'Select Pass or Fail', variant: 'destructive' }); return; }
    if (cl.length > 0 && pendingCount > 0) {
      toast({ title: 'Checklist incomplete', description: `${pendingCount} checklist item${pendingCount > 1 ? 's' : ''} still pending. Please inspect all items before submitting a decision.`, variant: 'destructive' });
      return;
    }
    if (decision === 'Fail' && !failReason.trim()) { toast({ title: 'Fail reason is required', variant: 'destructive' }); return; }
    if (showRejectQtyInput && (!Number.isFinite(parsedRejectQty) || parsedRejectQty < 1 || parsedRejectQty > job.quantity)) {
      toast({ title: 'Enter a valid reject quantity', description: `Must be between 1 and ${job.quantity}`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const payload = { decision, failReason, inspectorRemarks };
      if (showRejectQtyInput) payload.rejectQty = parsedRejectQty;
      const res = await submitDecision(id, payload);

      if (res?.partial) {
        // Only part of the job's quantity was rejected — the rest stays in
        // QC for its own Approve/Fail decision, so we stay on this screen.
        setDecision('');
        setFailReason('');
        setRejectQty('');
        await refetch();
        toast({
          title: `✗ ${parsedRejectQty} unit${parsedRejectQty > 1 ? 's' : ''} rejected`,
          description: `${res.data.quantity} unit${res.data.quantity > 1 ? 's' : ''} remaining in QC`,
        });
      } else {
        await refetch();
        toast({
          title: decision === 'Pass' ? '✓ QC Approved' : '✗ QC Rejected',
          description: decision === 'Pass' ? 'Item transferred to Store' : `Returned to ${job.source} Department`,
        });
        setLocation('/qc/jobs');
      }
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (isLoading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!job) return <div className="p-6 text-slate-500">QC Job not found</div>;

  const cl = job.checklist || [];
  const passCount = cl.filter(c => c.status === 'Pass').length;
  const failCount = cl.filter(c => c.status === 'Fail').length;
  const pendingCount = cl.filter(c => c.status === 'Pending').length;
  const allInspected = cl.length > 0 && pendingCount === 0;
  const hasAnyFail = failCount > 0;

  const SrcIcon = { Purchase: ShoppingCart, Production: Factory, Store: Package }[job.source] || Package;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation('/qc/jobs')} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{job.orderCode || job.qcJobId}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[job.status]}`}>{job.status}</span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">{job.itemName} · {job.category}</p>
          <p className="text-xs text-slate-400 mt-0.5">QC Job ID: {job.qcJobId}</p>
        </div>
      </div>

      {/* Basic info */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-slate-400">Order ID</p><p className="font-medium mt-1">{job.orderCode || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Source</p><div className="flex items-center gap-1.5 mt-1"><SrcIcon className="h-4 w-4 text-slate-500" /><span className="font-medium">{job.source}</span></div></div>
            <div><p className="text-xs text-slate-400">Ref ID</p><p className="font-medium mt-1">{job.sourceRefId || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Sent By</p><p className="font-medium mt-1">{job.sentBy || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Received</p><p className="font-medium mt-1">{new Date(job.receivedDate).toLocaleDateString('en-IN')}</p></div>
            <div><p className="text-xs text-slate-400">Quantity</p><p className="font-medium mt-1">{job.quantity} {job.unit}</p></div>
            <div><p className="text-xs text-slate-400">Item Code</p><p className="font-medium mt-1">{job.itemCode || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Inspector</p><p className="font-medium mt-1">{job.inspector || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Department</p><p className="font-medium mt-1">{job.sourceDepartment || '—'}</p></div>
          </div>
          {job.notes && <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100 italic">Note: {job.notes}</p>}
        </CardContent>
      </Card>

      {/* Start inspection */}
      {job.status === 'Pending' && (
        <Card className="border-none shadow-sm border-l-4 border-l-amber-400">
          <CardContent className="p-5">
            <p className="font-semibold text-slate-800 mb-3">Start Inspection</p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label>Inspector Name</Label>
                <Input className="mt-1" value={inspectorName} onChange={e => setInspectorName(e.target.value)} placeholder="Your name" />
              </div>
              <Button onClick={handleStart} disabled={loading} className="flex items-center gap-2">
                <Play className="h-4 w-4" /> Start Inspection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">Inspection Checklist</h2>
              {cl.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {passCount} Pass · {failCount} Fail · {pendingCount} Pending
                </p>
              )}
            </div>

            {/* Sync R&D Data Button */}
            {(job.status === 'Pending' || job.status === 'In Progress') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncRD}
                disabled={syncingRD}
                className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncingRD ? 'animate-spin' : ''}`} />
                {syncingRD ? 'Syncing...' : 'Pull R&D Data'}
              </Button>
            )}
          </div>

          {cl.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No checklist items defined</p>
          ) : (
            <div className="space-y-3">
              {cl.map(item => (
                <div key={item._id} className="relative group">
                  <ChecklistRow item={item} jobStatus={job.status} onUpdate={handleUpdateItem} />
                  {job.status === 'In Progress' && (
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add item (only In Progress) */}
          {job.status === 'In Progress' && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <Input className="text-sm" placeholder="New parameter" value={newParam} onChange={e => setNewParam(e.target.value)} />
              <Input className="text-sm" placeholder="Standard value" value={newStd} onChange={e => setNewStd(e.target.value)} />
              <Button size="sm" variant="outline" onClick={handleAddItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision panel */}
      {job.status === 'In Progress' && (
        <Card className={`border-none shadow-sm border-l-4 ${allInspected ? (hasAnyFail ? 'border-l-red-400' : 'border-l-emerald-400') : 'border-l-slate-300'}`}>
          <CardContent className="p-5">
            <h2 className="font-semibold text-slate-800 mb-1">Final Decision</h2>
            {!allInspected && (
              <p className="text-sm text-amber-600 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                {pendingCount} checklist item{pendingCount > 1 ? 's' : ''} still pending — complete all before deciding
              </p>
            )}
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => { setDecision('Pass'); setRejectQty(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-all ${decision === 'Pass' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                    }`}
                >
                  <CheckCircle2 className="h-5 w-5" /> Pass — Approve {job.quantity} & Transfer to Store
                </button>
                <button
                  onClick={() => { setDecision('Fail'); setRejectQty(String(job.quantity)); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-all ${decision === 'Fail' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-red-300'
                    }`}
                >
                  <XCircle className="h-5 w-5" /> Fail — Return to {job.source}
                </button>
              </div>

              {decision === 'Fail' && (
                <div>
                  <Label>Fail Reason <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="Describe why the item failed inspection" />
                </div>
              )}

              {showRejectQtyInput && (
                <div>
                  <Label>Reject Quantity <span className="text-red-500">*</span></Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={1}
                    max={job.quantity}
                    value={rejectQty}
                    onChange={e => setRejectQty(e.target.value)}
                    placeholder={`Out of ${job.quantity} ${job.unit}`}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {isPartialRejectQty
                      ? `${parsedRejectQty} will be rejected, ${job.quantity - parsedRejectQty} will stay in QC for its own decision.`
                      : `All ${job.quantity} ${job.unit} will be rejected.`}
                  </p>
                </div>
              )}

              <div>
                <Label>Inspector Remarks (optional)</Label>
                <Input className="mt-1" value={inspectorRemarks} onChange={e => setInspectorRemarks(e.target.value)} placeholder="Additional notes for records" />
              </div>

              <Button
                className="w-full"
                onClick={handleDecision}
                disabled={
                  loading || !decision || (cl.length > 0 && pendingCount > 0) ||
                  (showRejectQtyInput && (!Number.isFinite(parsedRejectQty) || parsedRejectQty < 1 || parsedRejectQty > job.quantity))
                }
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Submitting...' : isPartialRejectQty ? `Reject ${parsedRejectQty} of ${job.quantity}` : `Submit ${decision || 'Decision'}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result banner */}
      {(job.status === 'Approved' || job.status === 'Rejected') && (
        <Card className={`border-none shadow-sm ${job.status === 'Approved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              {job.status === 'Approved'
                ? <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                : <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={`font-semibold ${job.status === 'Approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {job.status === 'Approved' ? 'QC Approved — Transferred to Store' : `QC Rejected — Returned to ${job.source} Department`}
                </p>
                {job.failReason && <p className="text-sm text-red-700 mt-1">Reason: {job.failReason}</p>}
                {job.inspectorRemarks && <p className="text-sm text-slate-600 mt-1">Remarks: {job.inspectorRemarks}</p>}
                {job.inspector && <p className="text-sm text-slate-500 mt-1">Inspector: {job.inspector} · {job.inspectionEndDate}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}