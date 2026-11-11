import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useQC } from '@/contexts/QCContext';
import { usePermissions } from '@/hooks/usePermissions';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronLeft,
  Play, Send, Package, Factory, ShoppingCart, Plus, Trash2, RefreshCw, ClipboardCheck, History
} from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDims } from '@/lib/fabricationDims';
import SubChildPartQCReview from '@/components/qc/SubChildPartQCReview';
import ChildPartUnitQCReview from '@/components/qc/ChildPartUnitQCReview';
import SubChildPartBatchQCReview from '@/components/qc/SubChildPartBatchQCReview';
import QcCheckRow, { checksState, fmtWhen, CheckStatusChip } from '@/components/qc/QcCheckRow';
import RejectionPhotoPicker, { decisionBody } from '@/components/qc/RejectionPhotoPicker';
import RejectionEvidence from '@/components/qc/RejectionEvidence';
import RejectBreakdownEditor, { newRejectLine, breakdownState, breakdownBody } from '@/components/qc/RejectBreakdownEditor';
import SerialPicker, { emptyPick } from '@/components/serials/SerialPicker';
import { useConfirmWarnings } from '@/components/serials/useConfirmWarnings';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

// QC by PO line (2026-10-15): which kind of request a rejection is counted against.
const KIND_LABEL = { stock: 'stock', production: 'production', sales: 'sales order' };

// One-checklist jobs (purchase / store / a machine's Final Check), 2026-10-30:
// one "Inspection checklist" step row like the production steps — Review (each
// check Pass / Fail with a remark, then the decision, saved in one go; or Save
// checks so someone else carries on) and History. Who checked each row and who
// decided come from the login. When Production filled the Final Check first,
// QC's verdict is the row's qcStatus / qcRemarks and Production's own result is
// shown beside it, never edited.
const toDraft = (c, productionFilled) => (productionFilled
  ? { _id: c._id, parameter: c.parameter, standardValue: c.standardValue, type: c.type, status: c.qcStatus || 'Pending', remarks: c.qcRemarks || '', checkedBy: c.checkedBy, checkedAt: c.checkedAt, production: { status: c.status, actualValue: c.actualValue, remarks: c.remarks } }
  : { _id: c._id, parameter: c.parameter, standardValue: c.standardValue, type: c.type, status: c.status || 'Pending', actualValue: c.actualValue || '', remarks: c.remarks || '', checkedBy: c.checkedBy, checkedAt: c.checkedAt });
const draftResults = (draft) => draft.map(d => ({ _id: d._id, status: d.status, remarks: d.remarks, ...(d.production ? {} : { actualValue: d.actualValue }) }));

export default function QCInspection() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { startInspection, submitDecision, addChecklistItem, removeChecklistItem } = useQC();
  const { hasFeatureAccess } = usePermissions();
  const canView = hasFeatureAccess('quality-control', 'qcInspection', 'view');
  const canEdit = hasFeatureAccess('quality-control', 'qcInspection', 'edit');
  const canAddItem = hasFeatureAccess('quality-control', 'qcInspection', 'add');
  const canDeleteItem = hasFeatureAccess('quality-control', 'qcInspection', 'delete');
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [syncingRD, setSyncingRD] = useState(false); // New state for R&D sync
  const [decision, setDecision] = useState('');
  const [failReason, setFailReason] = useState('');
  const [rejectQty, setRejectQty] = useState('');
  const [sizeRejects, setSizeRejects] = useState({}); // fabrication line with several sizes: size key → pieces
  const [severity, setSeverity] = useState('Major');
  const [inspectorRemarks, setInspectorRemarks] = useState('');
  // The Review / History dialogs and the Review's working copy of the checks.
  const [reviewOpen, setReviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  const [savingChecks, setSavingChecks] = useState(false);
  // Photos of the rejected material (2026-10-30) — required on a purchase rejection.
  const [rejectPhotos, setRejectPhotos] = useState([]);
  // The reject breakdown (2026-10-30): one line per fault when more than one
  // piece is rejected; a single piece says what failed if it isn't a check.
  const [rejectLines, setRejectLines] = useState([]);
  const [otherFailed, setOtherFailed] = useState('');
  const [newParam, setNewParam] = useState('');
  const [newStd, setNewStd] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['qc-job', id],
    queryFn: () => apiRequest('GET', `/api/qc/jobs/${id}`),
    enabled: !!id && canView,
  });

  const job = data?.data;

  // Serial numbers of a purchased item (2026-10-13): when every piece came
  // with its own serial, a Fail ticks the serials instead of typing a count.
  const { data: serialData, refetch: refetchSerials } = useQuery({
    queryKey: ['qc-job-serials', id],
    queryFn: () => apiRequest('GET', `/api/serial-numbers/qc-job/${id}`),
    enabled: !!id && canView && job?.source === 'Purchase',
  });
  const jobSerials = (serialData?.data || []).filter(u => !u.isLot);
  const piecesInQc = jobSerials.filter(u => u.status === 'In QC');
  const serialMode = piecesInQc.length > 0;
  const [rejectSerials, setRejectSerials] = useState([]);
  // Serial number work step 2 (§5.8): a sale from stock — which one QC is checking.
  const { runChecked, warningDialog } = useConfirmWarnings();
  const [salePick, setSalePick] = useState(emptyPick());
  const [salePickOk, setSalePickOk] = useState(true);
  const [scrapPick, setScrapPick] = useState(emptyPick()); // a job-work reject's serials (2 Nov review)
  const [scrapPickOk, setScrapPickOk] = useState(true);
  const toggleSerial = (uid) => setRejectSerials(cur => (cur.includes(uid) ? cur.filter(x => x !== uid) : [...cur, uid]));

  // QC by PO line (2026-10-15): a purchase card stands for the whole received
  // PO line — several requests' jobs decided as one. The quantities below are
  // the LINE's; the server shares a rejection out across the requests.
  const rg = job?.receiptGroup || null;
  const lineMode = !!rg && rg.requests.length > 1;
  const lineQty = lineMode ? rg.inQc : (job?.quantity || 1);
  const lineSizes = (() => {
    if (!rg?.isFabrication) return [];
    const bySize = new Map();
    for (const r of rg.requests) for (const s of r.sizes || []) {
      const key = JSON.stringify(s.values);
      const cur = bySize.get(key) || { key, values: s.values, quantity: 0 };
      cur.quantity += Number(s.quantity) || 0;
      bySize.set(key, cur);
    }
    return [...bySize.values()];
  })();
  const multiSize = lineSizes.length > 1;
  const sizeRejectTotal = lineSizes.reduce((s, z) => s + (Number(sizeRejects[z.key]) || 0), 0);
  // Purchase / store QC rejecting more than one piece: the breakdown lines.
  const breakdown = decision === 'Fail' && lineQty > 1 && ['Purchase', 'Store'].includes(job?.source);
  const lineSizeQty = (z) => rejectLines.filter(l => l.size === z.key).reduce((t, l) => t + (Number(l.qty) || 0), 0);
  const breakdownTotal = rejectLines.reduce((t, l) => t + (serialMode ? (l.serials || []).length : (Number(l.qty) || 0)), 0);
  // "Which request will this go on?" — asked of the server as a dry run.
  const previewBody = decision === 'Fail' && lineMode && !serialMode
    ? (multiSize
      ? { rejectSizes: lineSizes.map(z => ({ values: z.values, qty: breakdown ? lineSizeQty(z) : (Number(sizeRejects[z.key]) || 0) })).filter(z => z.qty > 0) }
      : { rejectQty: breakdown ? breakdownTotal : (Number(rejectQty) || 0) })
    : null;
  const previewKey = useDebouncedValue(JSON.stringify(previewBody), 400);
  const previewReady = previewKey !== 'null' && (multiSize ? (breakdown ? breakdownTotal : sizeRejectTotal) > 0 : Number(JSON.parse(previewKey || 'null')?.rejectQty) > 0);
  const { data: previewData } = useQuery({
    queryKey: ['qc-line-preview', id, previewKey],
    queryFn: () => apiRequest('PUT', `/api/qc/jobs/${id}/decision`, { decision: 'Fail', dryRun: true, ...JSON.parse(previewKey) }),
    enabled: !!id && canEdit && previewReady,
    retry: false,
  });
  const previewRows = previewReady ? (previewData?.preview || []).filter(p => p.reject > 0) : [];

  // The Review starts from the saved checks; rows added / removed / pulled from
  // R&D while it's open join it, and what this person already changed stays.
  const checklistKey = (job?.checklist || []).map(c => `${c._id}:${c.checkedAt || ''}`).join(',');
  useEffect(() => {
    if (reviewOpen) setDraft((job?.checklist || []).map(c => toDraft(c, !!job?.finalCheckFilledBy)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewOpen]);
  useEffect(() => {
    if (!reviewOpen) return;
    setDraft(cur => {
      const mine = new Map(cur.filter(d => d._dirty).map(d => [String(d._id), d]));
      return (job?.checklist || []).map(c => {
        const fresh = toDraft(c, !!job?.finalCheckFilledBy);
        const local = mine.get(String(c._id));
        return local ? { ...fresh, status: local.status, remarks: local.remarks, actualValue: local.actualValue, _dirty: true } : fresh;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistKey]);
  const editDraft = (rowId, patch) => setDraft(ds => ds.map(d => (String(d._id) === String(rowId) ? { ...d, ...patch, _dirty: true } : d)));

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

  // The person starting is the inspector — from the login (2026-10-30).
  const handleStart = async () => {
    setLoading(true);
    try {
      await startInspection(id, {});
      toast({ title: 'Inspection started' });
      refetch();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // "Save checks": the rows this person checked, no decision (2026-10-30).
  const handleSaveChecks = async () => {
    if (checksState(draft).failMissingRemarks) {
      toast({ title: 'Add a remark for each failed check', variant: 'destructive' });
      return;
    }
    setSavingChecks(true);
    try {
      const res = await apiRequest('PUT', `/api/qc/jobs/${id}/checks`, { results: draftResults(draft) });
      toast({ title: 'Checks saved', description: res?.changed ? `${res.changed} check${res.changed === 1 ? '' : 's'} saved — decide now or later.` : 'Nothing changed.' });
      // The Review stays open — saving checks isn't the decision (2026-10-30);
      // the rows reload with "checked by".
      setDraft(ds => ds.map(d => ({ ...d, _dirty: false })));
      refetch();
    } catch (e) {
      toast({ title: 'Checks not saved', description: e.message, variant: 'destructive' });
    } finally { setSavingChecks(false); }
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
  // (The breakdown replaces these three for purchase / store QC.)
  const showRejectQtyInput = decision === 'Fail' && !breakdown && !serialMode && !multiSize && lineQty > 1;
  const showSerialPicker = decision === 'Fail' && !breakdown && serialMode;
  const showSizeRejects = decision === 'Fail' && !breakdown && !serialMode && multiSize;
  const parsedRejectQty = breakdown ? breakdownTotal : showSerialPicker ? rejectSerials.length : showSizeRejects ? sizeRejectTotal : showRejectQtyInput ? Number(rejectQty) : lineQty;
  const isPartialRejectQty = (breakdown || showRejectQtyInput || showSerialPicker || showSizeRejects) && parsedRejectQty > 0 && parsedRejectQty < lineQty;
  const bState = breakdownState(rejectLines, { inQc: lineQty, serialMode, multiSize, needPhoto: job?.source === 'Purchase' });
  // One piece: the Fail rows are the rejection — or "what failed" typed.
  const singleNeedsWhat = decision === 'Fail' && !breakdown && ['Purchase', 'Store'].includes(job?.source)
    && !draft.some(d => d.status === 'Fail') && !otherFailed.trim();
  const sizeRejectInvalid = showSizeRejects && (sizeRejectTotal <= 0 || lineSizes.some(z => (Number(sizeRejects[z.key]) || 0) > z.quantity || !Number.isInteger(Number(sizeRejects[z.key]) || 0)));

  const handleDecision = async () => {
    if (!decision) { toast({ title: 'Select Pass or Fail', variant: 'destructive' }); return; }
    const dState = checksState(draft);
    // A reject with breakdown lines doesn't need every check (2026-10-31) —
    // the lines are its reason; a Pass (and a one-piece reject) still does.
    if (draft.length > 0 && dState.pending > 0 && !breakdown) {
      toast({ title: 'Checklist incomplete', description: `${dState.pending} checklist item${dState.pending > 1 ? 's' : ''} still pending. Please inspect all items before submitting a decision.`, variant: 'destructive' });
      return;
    }
    if (dState.failMissingRemarks) { toast({ title: 'Add a remark for each failed check', variant: 'destructive' }); return; }
    if (breakdown && !bState.ok) { toast({ title: 'The reject lines aren\'t complete', description: bState.message, variant: 'destructive' }); return; }
    if (decision === 'Fail' && !breakdown && !failReason.trim()) { toast({ title: 'Fail reason is required', variant: 'destructive' }); return; }
    if (singleNeedsWhat) { toast({ title: 'Mark the check that failed, or say what failed', variant: 'destructive' }); return; }
    if (showRejectQtyInput && (!Number.isFinite(parsedRejectQty) || parsedRejectQty <= 0 || parsedRejectQty > lineQty)) {
      toast({ title: 'Enter a valid reject quantity', description: `Must be more than 0 and at most ${lineQty}`, variant: 'destructive' });
      return;
    }
    if (showSerialPicker && !rejectSerials.length) {
      toast({ title: 'Tick the rejected serial numbers', variant: 'destructive' });
      return;
    }
    if (sizeRejectInvalid) {
      toast({ title: 'Enter the rejected pieces per size', description: 'Whole pieces, at most what arrived of each size.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // The checks and the decision in one go (2026-10-30).
      if (decision === 'Fail' && !breakdown && job?.source === 'Purchase' && !rejectPhotos.length) {
        toast({ title: 'Add at least one photo of the rejected material', description: 'Purchase shares it with the vendor.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      const payload = { decision, failReason, inspectorRemarks, results: draftResults(draft) };
      if (!breakdown && otherFailed.trim()) payload.otherFailed = otherFailed.trim();
      if (decision === 'Fail' && job?.source === 'Purchase') payload.severity = severity;
      if (showRejectQtyInput || (decision === 'Fail' && lineMode && !serialMode && !showSizeRejects)) payload.rejectQty = parsedRejectQty;
      if (showSerialPicker) { payload.rejectSerials = rejectSerials; payload.rejectQty = rejectSerials.length; }
      if (decision === 'Pass' && job?.source === 'Store') {
        if (!salePickOk) { toast({ title: 'Pick which one you checked', description: 'The sticker number (our machine) or the vendor serial number (a bought product).', variant: 'destructive' }); setLoading(false); return; }
        payload.salePick = salePick;
      }
      if (decision === 'Fail' && job?.source === 'SubChildPartJobWork') payload.scrapSerials = scrapPick;
      // Fabrication: say which size the rejected pieces were.
      if (decision === 'Fail' && !serialMode && rg?.isFabrication) {
        payload.rejectSizes = showSizeRejects
          ? lineSizes.map(z => ({ values: z.values, qty: Number(sizeRejects[z.key]) || 0 })).filter(z => z.qty > 0)
          : (lineSizes.length === 1 ? [{ values: lineSizes[0].values, qty: parsedRejectQty }] : undefined);
      }
      // Photos ride along as multipart (2026-10-30); a breakdown sends its lines
      // and each line's photos — the server works out qty / sizes / serials.
      const res = await runChecked((acknowledgeWarnings) => submitDecision(id, breakdown
        ? breakdownBody({ decision, inspectorRemarks, results: draftResults(draft) }, rejectLines, { serialMode, sizes: lineSizes })
        : decisionBody({ ...payload, acknowledgeWarnings }, decision === 'Fail' ? rejectPhotos : [])));
      if (!res) return; // QC went back to pick
      setRejectPhotos([]);
      setRejectLines([]);
      setOtherFailed('');
      // The Review stays open while pieces are still in QC (a partial reject);
      // it closes once the job is decided (2026-10-30). The checks reload with
      // who checked them.
      setDraft(ds => ds.map(d => ({ ...d, _dirty: false })));
      if (job?.source === 'Purchase') refetchSerials();

      if (lineMode) {
        // The line: stay while anything on it is still in QC.
        const fresh = (await refetch())?.data?.data;
        setDecision(''); setFailReason(''); setRejectQty(''); setRejectSerials([]); setSizeRejects({});
        if (fresh?.status !== 'In Progress') setReviewOpen(false);
        const results = res?.line?.results || [];
        const summary = decision === 'Fail'
          ? results.filter(r => r.rejected > 0).map(r => `${r.rejected} on ${r.requestId} (${KIND_LABEL[r.kind] || r.kind})`).join(', ')
          : `${results.length} request${results.length === 1 ? '' : 's'} approved`;
        toast({ title: decision === 'Pass' ? '✓ Line approved' : `✗ ${parsedRejectQty} rejected`, description: summary });
        if (fresh?.status !== 'In Progress') setLocation('/qc/jobs');
      } else if (res?.partial) {
        // Only part of the job's quantity was rejected — the rest stays in
        // QC for its own Approve/Fail decision, so we stay on this screen.
        setDecision('');
        setFailReason('');
        setRejectQty('');
        setRejectSerials([]);
        await refetch();
        toast({
          title: `✗ ${parsedRejectQty} unit${parsedRejectQty > 1 ? 's' : ''} rejected`,
          description: `${res.data.quantity} unit${res.data.quantity > 1 ? 's' : ''} remaining in QC`,
        });
      } else {
        setReviewOpen(false);
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

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view QC Inspection.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!job) return <div className="p-6 text-slate-500">QC Job not found</div>;

  const cl = job.checklist || [];
  // Mirrors the backend gate in getQCJob — job.waitsForProductionFinal (the
  // job's source + the item's own productSourceType, resolved server-side;
  // a machine sold from stock or bought doesn't wait, 2026-11-05) decides
  // whether Production must submit the Final checklist first, NOT
  // job.partChecks.length. A MachineBOM-driven manufactured order
  // legitimately has zero partChecks (its Child Parts each pass their own
  // QC before ever reaching this order) but still must have Production fill
  // the Final checklist first, same as every other manufactured Machine —
  // partChecks.length can't tell the two apart (corrected 2026-09-17, same
  // bug class as the pre-existing 2026-09-02 fix this mirrors, just missed
  // for the new hierarchy).
  const finalCheckReady = !job.waitsForProductionFinal || !!job.finalCheckFilledAt;
  // A manufactured job's Final Check rows are Production's own self-check —
  // QC's real progress lives in the separate qcStatus field (see
  // toDraft at the top of this file); every other
  // job's `status` field IS QC's own record, unchanged.
  const productionFilled = !!job.finalCheckFilledBy;
  // A Child Part order has no whole-job Final Check at all (unlike a
  // manufactured Machine's partChecks, which all gate ONE shared Final
  // Check below) — every real decision here is per-unit, via
  // ChildPartUnitQCReview. The flat Checklist/Decision cards below are
  // meaningless for this source (job.checklist never resolves anything for
  // a Child Part item — see qcChecklistPullService.js's
  // flatModuleStageForItem) and would let QC accidentally flip the whole
  // job's top-level status with zero real checks — hidden entirely instead.
  // Same for a per-unit Machine job (2026-09-24 — dynamic Process
  // Definition): one whole-job Pass here was what approved a whole
  // multi-unit order for dispatch off one unit's check. Keyed on having
  // unitChecks at all, not on source, so both kinds are covered.
  const isPerUnitJob = job.unitChecks?.length > 0;
  // QC multi-checkpoint redesign (slice 2, 2026-09-26) — Sub Child Part's
  // own whole-batch equivalent (SubChildPartBatchQCReview), same reasoning:
  // the flat Checklist/Decision cards below are meaningless once a job has
  // moved onto per-step batchSteps.
  const isBatchJob = job.batchSteps?.length > 0;
  const statusField = productionFilled ? 'qcStatus' : 'status';
  const passCount = cl.filter(c => c[statusField] === 'Pass').length;
  const failCount = cl.filter(c => c[statusField] === 'Fail').length;
  const pendingCount = cl.filter(c => c[statusField] === 'Pending').length;

  const SrcIcon = { Purchase: ShoppingCart, Production: Factory, Store: Package }[job.source] || Package;
  const dState = checksState(draft);
  const flatBadge = {
    Pending: { label: 'Waiting to start', cls: 'bg-slate-100 text-slate-500' },
    'In Progress': { label: 'Ready for QC', cls: 'bg-amber-100 text-amber-700' },
    Approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
    Rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  }[job.status] || { label: job.status, cls: 'bg-slate-100 text-slate-500' };
  const decidedWho = job.decidedBy || job.inspector || '—';
  const decidedWhen = job.decidedAt ? fmtWhen(job.decidedAt) : (job.inspectionEndDate || '');
  const flatLine = job.status === 'Approved'
    ? { cls: 'text-emerald-700', text: `Passed by ${decidedWho}${decidedWhen ? ` · ${decidedWhen}` : ''}` }
    : job.status === 'Rejected'
      ? { cls: 'text-red-600', text: `Rejected by ${decidedWho}${decidedWhen ? ` · ${decidedWhen}` : ''}${job.failReason ? ` — ${job.failReason}` : ''}` }
      : job.status === 'In Progress'
        ? { cls: 'text-amber-700', text: `Inspector ${job.inspector || '—'}${job.inspectionStartDate ? ` · started ${job.inspectionStartDate}` : ''} — ${pendingCount} check${pendingCount === 1 ? '' : 's'} to go` }
        : { cls: 'text-slate-500', text: `Sent by ${job.sentBy || '—'}${job.receivedDate ? ` · ${new Date(job.receivedDate).toLocaleDateString('en-IN')}` : ''} — not started` };

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
          {job.receiptGroup?.sizes?.length > 0 && (
            <p className="text-xs font-mono text-slate-600 mt-0.5">{job.receiptGroup.sizes.map(z => `${formatDims(z.values)} × ${z.quantity} pcs`).join(' · ')}</p>
          )}
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
            <div><p className="text-xs text-slate-400">Quantity</p><p className="font-medium mt-1">{lineMode ? `${rg.received} ${job.unit} (this delivery)` : `${job.quantity} ${job.unit}`}</p></div>
            <div><p className="text-xs text-slate-400">Item Code</p><p className="font-medium mt-1">{job.itemCode || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Inspector</p><p className="font-medium mt-1">{job.inspector || '—'}</p></div>
            <div><p className="text-xs text-slate-400">Department</p><p className="font-medium mt-1">{job.sourceDepartment || '—'}</p></div>
          </div>
          {job.notes && !lineMode && <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100 italic">Note: {job.notes}</p>}
        </CardContent>
      </Card>

      {/* QC by PO line (2026-10-15): the requests this delivery fills. QC
          decides the line once; a rejection is counted against requests by
          the rule — stock requests first, then production, sales orders last,
          newest first (fabrication: per size first). */}
      {lineMode && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-slate-800">This delivery</h2>
              {rg.isFabrication && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-slate-50 text-slate-500 border-slate-200">Fabrication</span>}
              <span className="text-xs text-slate-500">one PO line · {rg.requests.length} requests · {rg.inQc} {job.unit} in QC{rg.rejected > 0 ? ` · ${rg.rejected} rejected` : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 text-left">
                    <th className="font-semibold pb-1">Request</th><th className="font-semibold pb-1">For</th>
                    <th className="font-semibold pb-1 text-right">Received</th><th className="font-semibold pb-1 text-right">Rejected</th>
                    <th className="font-semibold pb-1 text-right">In QC</th><th className="font-semibold pb-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rg.requests.map(r => (
                    <tr key={r.jobId} className="border-t">
                      <td className="py-1 font-mono text-xs">{r.requestId}</td>
                      <td className="py-1 text-slate-600">{KIND_LABEL[r.kind] || r.kind}</td>
                      <td className="py-1 text-right">{r.received}</td>
                      <td className={`py-1 text-right ${r.rejected > 0 ? 'text-red-600' : 'text-slate-400'}`}>{r.rejected || '—'}</td>
                      <td className="py-1 text-right">{r.inQc || '—'}</td>
                      <td className="py-1 text-right"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor[r.status] || ''}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rg.isFabrication && lineSizes.length > 0 && (
              <p className="text-xs text-slate-500">In QC by size: {lineSizes.map(z => `${formatDims(z.values)} × ${z.quantity} pcs`).join(' · ')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start — the person clicking is the inspector, from the login
          (2026-10-30, client: no picking someone else's name). Production
          step jobs open themselves; their first QC person to save or decide
          becomes the inspector. */}
      {job.status === 'Pending' && canEdit && !isPerUnitJob && !isBatchJob && (
        <Card className="border-none shadow-sm border-l-4 border-l-amber-400">
          <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-slate-800">Start the inspection</p>
              <p className="text-xs text-slate-500 mt-0.5">You become this job's inspector. Anyone in QC can then check rows — each row records who checked it.</p>
            </div>
            <Button onClick={handleStart} disabled={loading} className="flex items-center gap-2">
              <Play className="h-4 w-4" /> Start Inspection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sub Child Parts — in-house/outsource manufactured products only
          (renders nothing otherwise, see SubChildPartQCReview's own
          comment). The Checklist/Decision below is this SAME job's Final
          Check, gated server-side (submitDecision) until every part here
          is Approved. */}
      <SubChildPartQCReview jobId={id} partChecks={job.partChecks} canEdit={canEdit} onRefetch={refetch} />

      {/* Child Part/Machine order — this job's per-unit review (renders
          nothing otherwise, see ChildPartUnitQCReview's own comment). No
          shared Final Check follows it for Child Part — each unit's own
          Approval directly unlocks that unit's own Painting step in
          Production. unitStepsDynamic (Stage C, 2026-09-28 — was Child-
          Part-only childPartDynamic) covers a dynamic Machine order too now. */}
      <ChildPartUnitQCReview jobId={id} unitChecks={job.unitChecks} canEdit={canEdit} onRefetch={refetch} singleStage={job.source !== 'ChildPartProduction'} stepped={!!job.unitStepsDynamic} inspector={job.inspector} />

      {/* Sub Child Part's own whole-batch QC steps (slice 2, 2026-09-26) —
          renders nothing otherwise, see SubChildPartBatchQCReview's own
          comment. */}
      <SubChildPartBatchQCReview jobId={id} batchSteps={job.batchSteps} canEdit={canEdit} onRefetch={refetch} inspector={job.inspector} />

      {/* One-checklist jobs (2026-10-30): one step row like the production
          steps — status, who / when, Review, History. Meaningless for a
          per-unit or batch job, see isPerUnitJob/isBatchJob. */}
      {!isPerUnitJob && !isBatchJob && (
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b border-slate-50 pb-3">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4" /> Inspection
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {passCount} Pass · {failCount} Fail · {pendingCount} Pending{lineMode ? ` · ${rg.inQc} ${job.unit} in QC` : ''}{(job.partialRejections || []).length ? ` · ${job.partialRejections.length} rejected earlier` : ''}
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">Inspection checklist</p>
                <p className="text-[10px] text-slate-400">{cl.length} check{cl.length === 1 ? '' : 's'}</p>
                <p className={`text-[10px] ${flatLine.cls}`}>{flatLine.text}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`text-xs ${flatBadge.cls}`}>{flatBadge.label}</Badge>
                {job.status === 'In Progress' && canEdit && (finalCheckReady
                  ? <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => setReviewOpen(true)}>Review</Button>
                  : <span className="text-xs text-slate-500">waiting for Production's Final checklist</span>)}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setHistoryOpen(true)}>
                  <History className="h-3.5 w-3.5 mr-1" /> History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review: each check Pass / Fail + remark, then the decision — saved in
          one go (Save Decision), or just the checks (Save checks). */}
      {!isPerUnitJob && !isBatchJob && (
        <Dialog open={reviewOpen} onOpenChange={(v) => { if (!loading && !savingChecks) setReviewOpen(v); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {warningDialog}
            <DialogHeader>
              <DialogTitle>Review — Inspection checklist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-2">
                <p className="text-xs text-slate-500">{dState.pass} Pass · {dState.fail} Fail · {dState.pending} Pending</p>
            {/* Sync R&D Data Button — hidden for a manufactured job until
                Production has actually submitted the Final checklist (see
                getQCJob's finalCheckReady gate); pulling early would just
                400 now, and the button would be pointless before then. */}
            {(job.status === 'Pending' || job.status === 'In Progress') && canEdit && finalCheckReady && (
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
              {draft.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No checklist items defined — decide below directly.</p>
              ) : (
                <div className="space-y-2">
                  {draft.map(row => (
                    <div key={row._id} className="relative group">
                      <QcCheckRow row={row} production={row.production || null} onChange={patch => editDraft(row._id, patch)} />
                      {job.status === 'In Progress' && canDeleteItem && (
                        <button
                          onClick={() => handleRemoveItem(row._id)}
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
          {job.status === 'In Progress' && canAddItem && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <Input className="text-sm" placeholder="New parameter" value={newParam} onChange={e => setNewParam(e.target.value)} />
              <Input className="text-sm" placeholder="Standard value" value={newStd} onChange={e => setNewStd(e.target.value)} />
              <Button size="sm" variant="outline" onClick={handleAddItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

              {draft.length > 0 && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleSaveChecks} disabled={savingChecks || loading || dState.failMissingRemarks}
                    title={dState.failMissingRemarks ? 'Add a remark for each failed check' : 'Save the checks you did; the decision can be made later (by you or someone else)'}>
                    {savingChecks ? 'Saving…' : 'Save checks'}
                  </Button>
                </div>
              )}

              {job.status === 'In Progress' && canEdit && (
                <div className="border-t border-slate-100 pt-4">
                  <h2 className="font-semibold text-slate-800 mb-1">Decision</h2>
                  {dState.pending > 0 && !breakdown && (
                    <p className="text-sm text-amber-600 mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {dState.pending} check{dState.pending > 1 ? 's' : ''} still pending — mark every check before deciding
                    </p>
                  )}
                  {dState.pending > 0 && breakdown && (
                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {dState.pending} check{dState.pending > 1 ? 's' : ''} not marked — not needed to reject with lines (the lines are the reason); pieces left in QC need every check before their Pass
                    </p>
                  )}
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => { setDecision('Pass'); setRejectQty(''); setRejectSerials([]); setSizeRejects({}); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-all ${decision === 'Pass' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                    }`}
                >
                  <CheckCircle2 className="h-5 w-5" /> Pass — Approve {lineQty} & Transfer to Store
                </button>
                <button
                  onClick={() => { setDecision('Fail'); setRejectQty(String(lineQty)); if (lineQty > 1 && ['Purchase', 'Store'].includes(job.source)) setRejectLines(ls => (ls.length ? ls : [newRejectLine()])); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-all ${decision === 'Fail' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-red-300'
                    }`}
                >
                  <XCircle className="h-5 w-5" /> Fail — Return to {job.source}
                </button>
              </div>

              {decision === 'Pass' && job.source === 'Store' && /^[a-f0-9]{24}$/i.test(String(job.itemCode || '')) && (
                <SerialPicker mode="stock" itemId={job.itemCode} qty={job.quantity} extraUntracked={job.quantity}
                  title="Which one are you checking? Sticker / serial number"
                  value={salePick} onChange={setSalePick} onValidity={(ok) => setSalePickOk(ok)} />
              )}

              {decision === 'Fail' && job.source === 'SubChildPartJobWork' && (
                <SerialPicker mode="scpPieces" jobId={id} qty={parsedRejectQty > 0 ? parsedRejectQty : job.quantity} onFloor={job.quantity}
                  title="Serial numbers in the rejected pieces" value={scrapPick} onChange={setScrapPick} onValidity={(ok) => setScrapPickOk(ok)} />
              )}

              {decision === 'Fail' && !breakdown && (
                <div>
                  <Label>Fail Reason <span className="text-red-500">*</span></Label>
                  <Input className="mt-1" value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="Describe why the item failed inspection" />
                </div>
              )}

              {breakdown && (
                <RejectBreakdownEditor lines={rejectLines} onChange={setRejectLines}
                  checks={draft.map(d => d.parameter)} inQc={lineQty} unit={job.unit} isPurchase={job.source === 'Purchase'}
                  serialPieces={serialMode ? piecesInQc : null} sizes={multiSize ? lineSizes : []} formatSize={formatDims}
                  onError={(msg) => toast({ title: 'Photo not added', description: msg, variant: 'destructive' })} />
              )}
              {breakdown && !bState.ok && rejectLines.length > 0 && <p className="text-xs text-amber-700">{bState.message}</p>}

              {decision === 'Fail' && !breakdown && ['Purchase', 'Store'].includes(job.source) && (
                <div>
                  <Label>What failed, if it isn't one of the checks</Label>
                  <Input className="mt-1" value={otherFailed} onChange={e => setOtherFailed(e.target.value)} placeholder={draft.some(d => d.status === 'Fail') ? 'Optional — the Fail rows above already say it' : 'Mark a check Fail above, or type what failed'} />
                </div>
              )}

              {decision === 'Fail' && !breakdown && (
                <RejectionPhotoPicker files={rejectPhotos} onChange={setRejectPhotos} required={job.source === 'Purchase'}
                  onError={(msg) => toast({ title: 'Photo not added', description: msg, variant: 'destructive' })} />
              )}

              {/* How bad it is (2026-10-13) — purchased material only; it weighs the vendor's quality score. */}
              {decision === 'Fail' && !breakdown && job.source === 'Purchase' && (
                <div>
                  <Label>Severity</Label>
                  <div className="mt-1 flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                    {[['Minor', 'Cosmetic / usable'], ['Major', 'Not usable as is'], ['Critical', 'Unsafe / wrong item']].map(([s, hint]) => (
                      <button key={s} type="button" title={hint} onClick={() => setSeverity(s)}
                        className={`text-xs px-3 py-1 rounded-md font-medium ${severity === s ? (s === 'Critical' ? 'bg-red-600 text-white' : s === 'Major' ? 'bg-amber-500 text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500 hover:text-slate-700'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Counts against the vendor's quality score: Minor 1×, Major 1.5×, Critical 2×.</p>
                </div>
              )}

              {showRejectQtyInput && (
                <div>
                  <Label>Reject Quantity <span className="text-red-500">*</span></Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    max={lineQty}
                    value={rejectQty}
                    onChange={e => setRejectQty(e.target.value)}
                    placeholder={`Out of ${lineQty} ${job.unit}`}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {isPartialRejectQty
                      ? `${parsedRejectQty} will be rejected, ${Math.round((lineQty - parsedRejectQty) * 1000) / 1000} will stay in QC for its own decision.`
                      : `All ${lineQty} ${job.unit} will be rejected.`}
                  </p>
                </div>
              )}

              {/* Fabrication line with several sizes: rejected pieces per size. */}
              {showSizeRejects && (
                <div>
                  <Label>Rejected pieces per size <span className="text-red-500">*</span></Label>
                  <div className="mt-1 space-y-1.5">
                    {lineSizes.map(z => (
                      <div key={z.key} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 font-mono text-xs text-slate-600">{formatDims(z.values)}</span>
                        <Input className="h-8 w-24" type="number" min={0} max={z.quantity} value={sizeRejects[z.key] ?? ''} onChange={e => setSizeRejects(s => ({ ...s, [z.key]: e.target.value }))} placeholder="0" />
                        <span className="text-xs text-slate-500 w-20">of {z.quantity} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Which request the rejection is counted against (server dry run). */}
              {previewRows.length > 0 && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  Counted against: {previewRows.map(p => `${p.requestId} (${KIND_LABEL[p.kind] || p.kind}) ${p.reject}`).join(' · ')}
                  <span className="block text-slate-400 mt-0.5">Stock requests first, then production, sales orders last — newest first.</span>
                </p>
              )}

              {showSerialPicker && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Rejected Serial Numbers <span className="text-red-500">*</span></Label>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => setRejectSerials(rejectSerials.length === piecesInQc.length ? [] : piecesInQc.map(u => u._id))}
                    >
                      {rejectSerials.length === piecesInQc.length ? 'Clear' : 'Tick all'}
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {piecesInQc.map(u => (
                      <label key={u._id} className={`flex items-center gap-2 px-2 py-1 rounded-md border text-sm cursor-pointer ${rejectSerials.includes(u._id) ? 'border-red-300 bg-red-50 text-red-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={rejectSerials.includes(u._id)} onChange={() => toggleSerial(u._id)} />
                        <span className="font-mono truncate">{u.serialNumber}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {!rejectSerials.length
                      ? `Tick each piece that failed (${piecesInQc.length} in QC).`
                      : isPartialRejectQty
                        ? `${rejectSerials.length} will be rejected, ${lineQty - rejectSerials.length} will stay in QC for its own decision.`
                        : `All ${lineQty} pieces will be rejected.`}
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
                  loading || savingChecks || !decision || (draft.length > 0 && dState.pending > 0 && !breakdown) || dState.failMissingRemarks ||
                  (decision === 'Fail' && !breakdown && job.source === 'Purchase' && !rejectPhotos.length) ||
                  (breakdown && !bState.ok) || singleNeedsWhat ||
                  (showRejectQtyInput && (!Number.isFinite(parsedRejectQty) || parsedRejectQty <= 0 || parsedRejectQty > lineQty)) ||
                  (showSerialPicker && !rejectSerials.length) || sizeRejectInvalid ||
                  (decision === 'Fail' && job.source === 'SubChildPartJobWork' && !scrapPickOk)
                }
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Submitting...' : isPartialRejectQty ? `Reject ${parsedRejectQty} of ${lineQty}` : `Save Decision — ${decision || 'choose Pass or Fail'}`}
              </Button>
            </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* History (2026-10-30): received, started, every check with who / when,
          rejections along the way, the decision. */}
      {!isPerUnitJob && !isBatchJob && (
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>History — Inspection checklist</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3 text-xs">
              <div className="border border-slate-100 rounded-lg p-3">
                <p className="font-semibold text-slate-600">Received</p>
                <p className="text-slate-600 mt-1">{lineMode ? `${rg.received} ${job.unit} (this delivery)` : `${job.quantity} ${job.unit}`} · sent by {job.sentBy || '—'} · {job.receivedDate ? new Date(job.receivedDate).toLocaleDateString('en-IN') : '—'}</p>
              </div>
              <div className="border border-slate-100 rounded-lg p-3">
                <p className="font-semibold text-slate-600">Inspection</p>
                <p className="text-slate-600 mt-1">{job.inspector ? `Inspector ${job.inspector}${job.inspectionStartDate ? ` · started ${job.inspectionStartDate}` : ''}` : 'Not started yet.'}</p>
              </div>
              <div className="border border-slate-100 rounded-lg p-3 space-y-2">
                <p className="font-semibold text-slate-600">Checks ({passCount} Pass · {failCount} Fail · {pendingCount} Pending)</p>
                {cl.length === 0 ? <p className="text-slate-400">No checks on this job.</p> : cl.map(c => {
                  const row = toDraft(c, productionFilled);
                  return <QcCheckRow key={c._id} row={row} production={row.production || null} readOnly />;
                })}
              </div>
              {(job.partialRejections || []).map((r, i) => (
                <div key={i} className="border border-red-100 bg-red-50/40 rounded-lg p-3">
                  <p className="font-semibold text-red-700">Rejected {r.qty} {job.unit || ''}{r.parameter ? <> — <span className="underline decoration-red-300">{r.parameter}</span></> : ''}{r.severity ? ` (${r.severity})` : ''}</p>
                  <p className="text-slate-600 mt-1">{r.rejectedByName ? `by ${r.rejectedByName} · ` : ''}{r.rejectedAt ? fmtWhen(r.rejectedAt) : ''}{r.reason ? ` — ${r.reason}` : ''}</p>
                  <div className="mt-1.5"><RejectionEvidence failedChecks={r.failedChecks} photos={r.photos} downloadName={`${job.qcJobId}-rejected-${i + 1}`} /></div>
                </div>
              ))}
              {(job.status === 'Approved' || job.status === 'Rejected') ? (
                <div className="border-t border-slate-100 pt-2">
                  <p className="text-slate-600">Decided by {decidedWho}{decidedWhen ? `, ${decidedWhen}` : ''}</p>
                  <span className="inline-flex mt-1"><CheckStatusChip status={job.status === 'Approved' ? 'Pass' : 'Fail'} /></span>
                  <span className="ml-2 text-slate-600">{job.status === 'Approved' ? 'transferred to Store' : `returned to ${job.source}`}</span>
                  {job.failReason && <p className="mt-1 italic text-slate-500">Reason: {job.failReason}</p>}
                  {job.status === 'Rejected' && (job.rejectLines || []).length > 0 ? (
                    // A whole reject made of breakdown lines (2026-10-30).
                    <div className="mt-1.5 space-y-2">
                      {job.rejectLines.map((l, i) => (
                        <div key={i} className="border border-red-100 bg-red-50/40 rounded-lg p-2.5">
                          <p className="font-semibold text-red-700">{l.qty} {job.unit || ''} — <span className="underline decoration-red-300">{l.parameter}</span>{l.severity ? ` (${l.severity})` : ''}</p>
                          <p className="text-slate-700">{l.remark}</p>
                          <div className="mt-1"><RejectionEvidence photos={l.photos} downloadName={`${job.qcJobId}-line${i + 1}`} /></div>
                        </div>
                      ))}
                    </div>
                  ) : job.status === 'Rejected' && <div className="mt-1.5"><RejectionEvidence failedChecks={job.failedChecks} photos={job.rejectionPhotos} downloadName={`${job.qcJobId}-rejected`} /></div>}
                  {job.inspectorRemarks && <p className="mt-1 text-slate-500">Remarks: {job.inspectorRemarks}</p>}
                </div>
              ) : (
                <p className="text-amber-600 border-t border-slate-100 pt-2">Awaiting QC decision.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
                {job.status === 'Rejected' && job.failReason && <p className="text-sm text-red-700 mt-1">Reason: {job.failReason}</p>}
                {job.status === 'Rejected' && <div className="mt-2"><RejectionEvidence failedChecks={job.failedChecks} photos={job.rejectionPhotos} downloadName={`${job.qcJobId}-rejected`} /></div>}
                {/* Slices QC rejected before the final decision (2026-10-12). */}
                {lineMode && rg.rejected > 0 && (
                  <p className="text-sm text-red-700 mt-1">
                    Rejected on this delivery: {rg.requests.filter(r => r.rejected > 0).map(r => `${r.rejected} on ${r.requestId} (${KIND_LABEL[r.kind] || r.kind})`).join(', ')} — see "This delivery" above.
                  </p>
                )}
                {!lineMode && (job.partialRejections || []).length > 0 && (
                  <div className="text-sm text-red-700 mt-1">
                    {job.partialRejections.map((r, i) => (
                      <p key={i}>Rejected earlier: {r.qty} {job.unit || ''}{r.severity ? ` (${r.severity})` : ''} — {r.reason || 'no reason'}{r.rejectedAt ? ` (${new Date(r.rejectedAt).toLocaleDateString('en-IN')})` : ''}</p>
                    ))}
                  </div>
                )}
                {jobSerials.some(u => u.status === 'QC rejected') && (
                  <p className="text-sm text-red-700 mt-1">Rejected serial numbers: <span className="font-mono">{jobSerials.filter(u => u.status === 'QC rejected').map(u => u.serialNumber).join(', ')}</span></p>
                )}
                {job.source === 'Purchase' && (job.status === 'Rejected' || (job.partialRejections || []).length > 0 || (lineMode && rg.rejected > 0)) && (
                  <p className="text-xs text-slate-500 mt-1">Purchase records the vendor's answer (replace / refund / credit / refused) under Purchase Orders → QC Rejections.</p>
                )}
                {job.inspectorRemarks && <p className="text-sm text-slate-600 mt-1">Remarks: {job.inspectorRemarks}</p>}
                {job.inspector && <p className="text-sm text-slate-500 mt-1">Inspector: {job.inspector}{job.decidedBy && job.decidedBy !== job.inspector ? ` · decided by ${job.decidedBy}` : ''} · {job.decidedAt ? fmtWhen(job.decidedAt) : job.inspectionEndDate}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}