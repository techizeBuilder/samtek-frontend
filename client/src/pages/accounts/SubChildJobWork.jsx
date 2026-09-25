import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Boxes, Clock, CheckCircle2, Send, ArrowDownToLine, ShieldAlert, XCircle } from 'lucide-react';

const LENGTH_UNITS = ['Millimeter', 'Centimeter', 'Meter', 'Inch', 'Foot'];
// Required spare area (over the exact area the order needs) before the
// sheet-metal Case-1 "cut piece" tight-margin warning stops showing — real
// cutting waste (kerf, layout inefficiency) isn't accounted for by the raw
// "capacity >= needed" check alone. Soft/non-blocking only; the real hard
// block stays server-side in applyCutSend, untouched by this.
const CUT_MARGIN_WARNING_RATIO = 0.15; // 15% spare area required

// Purchases > Outsource Work — Phase 2 rework (was "Sub Child Job Work",
// Sub-Child-Part-only). Now shows outsource work from all three BOM levels,
// one row per request: a `sourceType:'JobWorkOrder'` row is a PURE
// Out-Source Sub Child Part order (SubChildPartJobWorkOrder, entirely
// unchanged — its own Send/Receive Round dialog below still operates
// directly against that model, via each row's embedded `raw` document); a
// `sourceType:'Handoff'` row is a generalized hand-off living on a Child
// Part/Machine/hybrid Sub Child Part ProductionOrder's own
// outsourceHandoffs[] (see server/controllers/outsourceWorkController.js).
// Both come back merged, filtered, and paginated from one endpoint,
// /api/outsource-work — see server/docs/process-inhouse-outsource-redesign-
// discussion-2026-09.md for the full design.
const statusColor = {
  Pending: 'bg-slate-100 text-slate-700 border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Pending QC': 'bg-purple-100 text-purple-700 border-purple-200',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const orderKindLabel = { SubChildPart: 'Sub Child Part', ChildPart: 'Child Part', Machine: 'Machine' };
const orderKindColor = {
  SubChildPart: 'bg-teal-50 text-teal-700 border-teal-200',
  ChildPart: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Machine: 'bg-purple-50 text-purple-700 border-purple-200',
};

function formatDimValues(values) {
  if (!values) return '';
  const parts = [];
  if (values.length != null) parts.push(`L${values.length}`);
  if (values.width != null) parts.push(`W${values.width}`);
  if (values.thickness != null) parts.push(`T${values.thickness}`);
  return parts.join(' × ') || '—';
}

// Mirrors applyCutSend's own area formula server-side exactly, so client and
// server agree on what "capacity" means for a sheet-metal size.
function sheetAreaMm2(values) {
  return (Number(values?.width) || 0) * (Number(values?.length) || 0);
}

// Shared "Raw Material — first send" picker (2026-09-23) — used by BOTH the
// old SubChildPartJobWorkOrder dialog (mandatory, applies a real Store
// deduction server-side) and the new handoff dialog's testing bridge
// (optional, never applied to real Store stock — see the discussion doc's
// "First-step outsource material send" section). Same UI either way, so
// Purchase sees one consistent picker regardless of which system raised the
// request — only what happens server-side on Send differs. Byte-for-byte
// the same JSX the old dialog always had, just parameterized instead of
// closing over that dialog's own state directly.
function renderMaterialPicker({
  materialOptions, materialCase, setMaterialCase,
  sourceVariantId, setSourceVariantId,
  stockPiecesConsumed, setStockPiecesConsumed,
  combineLeftover, setCombineLeftover,
  immLength, setImmLength, immWidth, setImmWidth, immPieces, setImmPieces,
  cutMarginInfo, lengthCombineLeftover,
}) {
  if (!materialOptions) return null;

  if (materialOptions.kind === 'plain') {
    return (
      <p className="text-sm text-slate-700">
        This will issue <strong>{materialOptions.availability?.neededQty} {materialOptions.availability?.unit}</strong> of{' '}
        <strong>{materialOptions.sourceItem?.name}</strong> from Store.
      </p>
    );
  }

  if (materialOptions.kind === 'sheet') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button type="button"
            className={`flex-1 text-xs font-semibold py-1.5 rounded border ${materialCase === 'cut' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => { setMaterialCase('cut'); setSourceVariantId(''); }}
          >Send Cut Piece</button>
          <button type="button"
            className={`flex-1 text-xs font-semibold py-1.5 rounded border ${materialCase === 'whole' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => { setMaterialCase('whole'); setSourceVariantId(''); }}
          >Send Whole Sheet</button>
        </div>

        {materialCase === 'whole' && (
          <div>
            <p className="text-xs text-slate-600 mb-1">
              Sends <strong>{materialOptions.availability?.neededQty} whole sheet(s)</strong> of{' '}
              {formatDimValues(materialOptions.catalogVariant?.values)}.
            </p>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs border border-slate-200 rounded px-2 py-1.5 cursor-pointer hover:bg-white">
                <input type="radio" checked={!sourceVariantId} onChange={() => setSourceVariantId('')} />
                Catalog stock — {formatDimValues(materialOptions.catalogVariant?.values)} ({materialOptions.catalogVariant?.subStock ?? 0} in stock)
              </label>
              {(materialOptions.leftoverOptions || []).map(l => (
                <label key={l._id}
                  className={`flex items-center gap-2 text-xs border rounded px-2 py-1.5 ${l.matchesWholeSheet ? 'cursor-pointer hover:bg-white border-emerald-200 bg-emerald-50' : 'cursor-not-allowed border-red-200 bg-red-50 text-red-600 opacity-70'}`}
                >
                  <input type="radio" disabled={!l.matchesWholeSheet}
                    checked={sourceVariantId === l._id} onChange={() => setSourceVariantId(l._id)} />
                  Leftover — {formatDimValues(l.values)} ({l.subStock} in stock)
                  {l.matchesWholeSheet ? ' — matches a whole sheet size' : ' — does not match this plan’s sheet size'}
                </label>
              ))}
            </div>
          </div>
        )}

        {materialCase === 'cut' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              Needs at least <strong>{Math.round((materialOptions.availability?.totalAreaNeededMm2 || 0) / 1000000 * 100) / 100} m²</strong> total.
            </p>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs border border-slate-200 rounded px-2 py-1.5 cursor-pointer hover:bg-white">
                <input type="radio" checked={!sourceVariantId} onChange={() => setSourceVariantId('')} />
                Catalog stock — {formatDimValues(materialOptions.catalogVariant?.values)} ({materialOptions.catalogVariant?.subStock ?? 0} in stock)
              </label>
              {(materialOptions.leftoverOptions || []).map(l => (
                <label key={l._id} className="flex items-center gap-2 text-xs border border-slate-200 rounded px-2 py-1.5 cursor-pointer hover:bg-white">
                  <input type="radio" checked={sourceVariantId === l._id} onChange={() => setSourceVariantId(l._id)} />
                  Leftover — {formatDimValues(l.values)} ({l.subStock} in stock)
                </label>
              ))}
            </div>
            <div>
              <label className="text-xs text-slate-600">Stock pieces consumed</label>
              <Input type="number" min="1" value={stockPiecesConsumed} onChange={e => setStockPiecesConsumed(e.target.value)} className="h-8 text-sm" />
            </div>
            {cutMarginInfo?.isNarrow && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                Tight margin — this only leaves ~{Math.round(cutMarginInfo.marginRatio * 100)}% spare area above
                what this order needs. Real cutting waste (kerf, layout) could leave this short — consider more
                pieces or a larger leftover if one's available.
              </p>
            )}
            <p className="text-xs font-semibold text-slate-500">Leftover after cutting (optional)</p>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Length" type="number" value={immLength} onChange={e => setImmLength(e.target.value)} className="h-8 text-sm" />
              <Input placeholder="Width" type="number" value={immWidth} onChange={e => setImmWidth(e.target.value)} className="h-8 text-sm" />
              <Input placeholder="Pieces" type="number" value={immPieces} onChange={e => setImmPieces(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (materialOptions.kind === 'length') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <button type="button"
            className={`flex-1 text-xs font-semibold py-1.5 rounded border ${materialCase === 'cut' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setMaterialCase('cut')}
          >Send Cut Piece</button>
          <button type="button"
            className={`flex-1 text-xs font-semibold py-1.5 rounded border ${materialCase === 'whole' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}
            onClick={() => setMaterialCase('whole')}
          >Send Whole Piece(s)</button>
        </div>
        <p className="text-xs text-slate-600">
          Sends <strong>{materialOptions.availability?.wholePieces} catalog piece(s)</strong> of{' '}
          {formatDimValues(materialOptions.catalogVariant?.values)}
          {lengthCombineLeftover && combineLeftover ? <> + 1 existing leftover piece</> : null}.
        </p>
        {lengthCombineLeftover && (
          <label className="flex items-center gap-2 text-xs border border-emerald-200 bg-emerald-50 rounded px-2 py-1.5 cursor-pointer">
            <input type="checkbox" checked={combineLeftover} onChange={e => setCombineLeftover(e.target.checked)} />
            Using 1 existing leftover piece ({lengthCombineLeftover.values?.length} mm) to exactly cover the remaining length —
            no new offcut will be created this time.
          </label>
        )}
        {materialCase === 'cut' && (
          <div>
            <p className="text-xs font-semibold text-slate-500">Leftover after cutting (optional)</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Length (mm)" type="number" value={immLength} onChange={e => setImmLength(e.target.value)} className="h-8 text-sm" />
              <Input placeholder="Pieces" type="number" value={immPieces} onChange={e => setImmPieces(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function SubChildJobWork() {
  const { toast } = useToast();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderKindFilter, setOrderKindFilter] = useState('all');
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, statusFilter, orderKindFilter]);

  // ── Sub Child Part pure-outsource rows (sourceType:'JobWorkOrder') —
  // Send/Receive Round dialog state, UNCHANGED from before this rework,
  // just operating on row.raw (the embedded full SubChildPartJobWorkOrder
  // document) instead of a separately-fetched `order`.
  const [sendDialogOrder, setSendDialogOrder] = useState(null);
  const [sendChoices, setSendChoices] = useState([]);
  const [busy, setBusy] = useState(false);

  const [materialCase, setMaterialCase] = useState('whole'); // 'cut' | 'whole'
  const [sourceVariantId, setSourceVariantId] = useState('');
  const [stockPiecesConsumed, setStockPiecesConsumed] = useState('');
  const [combineLeftover, setCombineLeftover] = useState(true);
  const [immLength, setImmLength] = useState('');
  const [immLengthUnit, setImmLengthUnit] = useState('mm');
  const [immWidth, setImmWidth] = useState('');
  const [immWidthUnit, setImmWidthUnit] = useState('mm');
  const [immPieces, setImmPieces] = useState('');

  const [receiveDialog, setReceiveDialog] = useState(null); // { order, round }
  const [recvLength, setRecvLength] = useState('');
  const [recvLengthUnit, setRecvLengthUnit] = useState('Millimeter');
  const [recvWidth, setRecvWidth] = useState('');
  const [recvWidthUnit, setRecvWidthUnit] = useState('Millimeter');
  const [recvTotalCost, setRecvTotalCost] = useState('');

  // ── Handoff rows (Child Part/Machine/hybrid Sub Child Part) — new, much
  // simpler dialogs: no material-case UI (Stage 3's scoped design — see
  // outsourceWorkController.js — only ever does a pure status transition
  // for these, no Store deduction).
  const [handoffSendDialog, setHandoffSendDialog] = useState(null); // row
  const [handoffSendChoices, setHandoffSendChoices] = useState([]);
  // Testing bridge (2026-09-23, see the discussion doc's "First-step
  // outsource material send" section) — same picker UI/state shape as the
  // old dialog's own (renderMaterialPicker, shared), but picking anything
  // here is entirely optional and nothing ever touches real Store stock
  // (see outsourceWorkController.js's own comment).
  const [handoffMaterialCase, setHandoffMaterialCase] = useState('whole');
  const [handoffSourceVariantId, setHandoffSourceVariantId] = useState('');
  const [handoffStockPiecesConsumed, setHandoffStockPiecesConsumed] = useState('');
  const [handoffCombineLeftover, setHandoffCombineLeftover] = useState(true);
  const [handoffImmLength, setHandoffImmLength] = useState('');
  const [handoffImmWidth, setHandoffImmWidth] = useState('');
  const [handoffImmPieces, setHandoffImmPieces] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['outsource-work', search, statusFilter, orderKindFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (orderKindFilter !== 'all') params.set('orderKind', orderKindFilter);
      return apiRequest('GET', `/api/outsource-work?${params.toString()}`);
    },
    keepPreviousData: true,
  });

  const rows = data?.data || [];
  const summary = data?.summary || { total: 0, pending: 0, inProgress: 0, pendingQC: 0, completed: 0, qcRejected: 0 };
  const pagination = data?.pagination || { page: 1, pages: 1, total: rows.length };
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['outsource-work'] });

  const isFirstRoundSend = !!sendDialogOrder && (sendDialogOrder.rounds || []).length === 0;
  const { data: materialOptionsResp, isLoading: materialOptionsLoading } = useQuery({
    queryKey: ['sub-child-job-work-material-options', sendDialogOrder?._id],
    queryFn: () => apiRequest('GET', `/api/purchase/sub-child-job-work/${sendDialogOrder._id}/material-options`),
    enabled: isFirstRoundSend,
  });
  const materialOptions = materialOptionsResp?.data || null;

  const coveredTypes = (order) => new Set(
    (order.rounds || []).filter(r => r.status === 'Received').flatMap(r => r.jobWorkTypes)
  );
  const roundsSummary = (row) => {
    const sent = (row.rounds || []).length;
    const received = (row.rounds || []).filter(r => r.status === 'Received').length;
    if (!sent) return '—';
    return `${sent} sent, ${received} received`;
  };
  const openRound = (row) => (row.rounds || []).find(r => r.status === 'Sent') || null;
  const willComplete = (order, round) => {
    const coveredAfter = new Set([...coveredTypes(order), ...(round.jobWorkTypes || [])]);
    return (order.jobWorkTypes || []).every(t => coveredAfter.has(t));
  };

  const openSendDialog = (row) => {
    const order = row.raw;
    setSendDialogOrder(order);
    setSendChoices([]);
    setMaterialCase('whole');
    setSourceVariantId('');
    setStockPiecesConsumed('');
    setCombineLeftover(true);
    setImmLength(''); setImmLengthUnit('mm');
    setImmWidth(''); setImmWidthUnit('mm');
    setImmPieces('');
  };
  const toggleChoice = (type) => {
    setSendChoices(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  useEffect(() => {
    if (!materialOptions) return;
    if (materialOptions.kind === 'sheet' && materialCase === 'whole') {
      const match = (materialOptions.leftoverOptions || []).find(l => l.matchesWholeSheet);
      if (match) setSourceVariantId(match._id);
    }
  }, [materialOptions, materialCase]);

  const lengthCombineLeftover = materialOptions?.kind === 'length'
    ? (materialOptions.leftoverOptions || []).find(l => l.matchesRemainder)
    : null;

  const cutMarginInfo = useMemo(() => {
    if (!materialOptions || materialOptions.kind !== 'sheet' || materialCase !== 'cut') return null;
    const pieces = Number(stockPiecesConsumed) || 0;
    if (!pieces) return null;
    const chosenLeftover = sourceVariantId
      ? (materialOptions.leftoverOptions || []).find(l => l._id === sourceVariantId)
      : null;
    const perPieceAreaMm2 = chosenLeftover ? (chosenLeftover.cutCapacityAreaMm2 || 0) : sheetAreaMm2(materialOptions.catalogVariant?.values);
    const totalCapacityAreaMm2 = perPieceAreaMm2 * pieces;
    const neededAreaMm2 = materialOptions.availability?.totalAreaNeededMm2 || 0;
    if (!neededAreaMm2 || totalCapacityAreaMm2 < neededAreaMm2) return null;
    const marginRatio = (totalCapacityAreaMm2 - neededAreaMm2) / neededAreaMm2;
    return { marginRatio, isNarrow: marginRatio < CUT_MARGIN_WARNING_RATIO };
  }, [materialOptions, materialCase, sourceVariantId, stockPiecesConsumed]);

  const handleSendRound = async () => {
    if (!sendDialogOrder || !sendChoices.length) return;
    setBusy(true);
    try {
      const body = { jobWorkTypes: sendChoices };
      if (isFirstRoundSend && materialOptions) {
        if (materialOptions.kind === 'sheet') {
          body.material = {
            materialCase,
            leftoverVariantId: sourceVariantId || null,
            stockPiecesConsumed: materialCase === 'cut' ? Number(stockPiecesConsumed) : undefined,
            immediateLeftover: (materialCase === 'cut' && immLength && immPieces)
              ? { lengthValue: Number(immLength), lengthUnit: immLengthUnit, widthValue: Number(immWidth), widthUnit: immWidthUnit, pieceCount: Number(immPieces) }
              : null,
          };
        } else if (materialOptions.kind === 'length') {
          body.material = {
            materialCase,
            leftoverVariantId: (combineLeftover && lengthCombineLeftover) ? lengthCombineLeftover._id : null,
            immediateLeftover: (materialCase === 'cut' && immLength && immPieces)
              ? { lengthValue: Number(immLength), lengthUnit: immLengthUnit, pieceCount: Number(immPieces) }
              : null,
          };
        }
      }
      await apiRequest('POST', `/api/purchase/sub-child-job-work/${sendDialogOrder._id}/rounds`, body);
      toast({ title: 'Sent', description: `${sendChoices.length} job work type(s) sent for ${sendDialogOrder.itemName}.`, variant: 'default' });
      setSendDialogOrder(null);
      invalidateList();
    } catch (err) {
      toast({ title: 'Send Failed', description: err.message || 'Could not send this round.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const doReceive = async (order, round, body) => {
    setBusy(true);
    try {
      await apiRequest('PUT', `/api/purchase/sub-child-job-work/${order._id}/rounds/${round._id}/receive`, body || undefined);
      toast({ title: 'Received', description: `Round ${round.roundNumber} received for ${order.itemName}.`, variant: 'default' });
      setReceiveDialog(null);
      invalidateList();
    } catch (err) {
      toast({ title: 'Receive Failed', description: err.message || 'Could not receive this round.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleReceiveRound = async (order, round) => {
    if (willComplete(order, round)) {
      setRecvLength(''); setRecvLengthUnit('Millimeter'); setRecvWidth(''); setRecvWidthUnit('Millimeter');
      setRecvTotalCost('');
      setReceiveDialog({ order, round });
      return;
    }
    await doReceive(order, round, null);
  };

  const receiveNeedsLeftover = receiveDialog
    ? (receiveDialog.order.rawMaterial?.sentCase === 'whole' && !receiveDialog.order.rawMaterial?.leftoverCaptured)
    : false;
  const receiveIsSheet = receiveDialog?.order?.liveAvailability?.kind === 'sheet';

  const submitCompleteReceive = async () => {
    if (!receiveDialog) return;
    if (!(Number(recvTotalCost) > 0)) {
      toast({ title: 'Job Work Cost required', description: 'Enter the total you were invoiced for this whole order.', variant: 'destructive' });
      return;
    }
    const body = { totalJobWorkCost: Number(recvTotalCost) };
    if (receiveNeedsLeftover) {
      if (!recvLength) {
        toast({ title: 'Leftover length required', description: 'Enter 0 if there truly is no usable leftover.', variant: 'destructive' });
        return;
      }
      if (receiveIsSheet && !recvWidth) {
        toast({ title: 'Leftover width required', description: 'Sheet metal leftover needs both a length and a width.', variant: 'destructive' });
        return;
      }
      body.leftoverLengthValue = Number(recvLength);
      body.leftoverLengthUnit = recvLengthUnit;
      body.leftoverWidthValue = recvWidth ? Number(recvWidth) : undefined;
      body.leftoverWidthUnit = recvWidthUnit;
    }
    await doReceive(receiveDialog.order, receiveDialog.round, body);
  };

  const sendDialogNotYetCovered = useMemo(() => {
    if (!sendDialogOrder) return [];
    const covered = coveredTypes(sendDialogOrder);
    return (sendDialogOrder.jobWorkTypes || []).filter(t => !covered.has(t));
  }, [sendDialogOrder]);

  const canSubmitSend = () => {
    if (!sendChoices.length) return false;
    if (!isFirstRoundSend || !materialOptions) return true;
    if (materialOptions.kind === 'plain') return true;
    if (materialOptions.kind === 'sheet') {
      if (materialCase === 'whole') return true;
      return Number(stockPiecesConsumed) > 0 && (sourceVariantId || true);
    }
    if (materialOptions.kind === 'length') return true;
    return true;
  };

  // ── Handoff (Child Part/Machine/hybrid Sub Child Part) actions ──────────
  const handoffOpenRound = (row) => (row.rounds || []).find(r => r.status === 'Sent') || null;
  const handoffNotYetCovered = (row) => (row.stepNames || []).filter(s => !(row.coveredSteps || []).includes(s));

  const openHandoffSendDialog = (row) => {
    setHandoffSendDialog(row);
    setHandoffSendChoices([]);
    setHandoffMaterialCase('whole');
    setHandoffSourceVariantId('');
    setHandoffStockPiecesConsumed('');
    setHandoffCombineLeftover(true);
    setHandoffImmLength(''); setHandoffImmWidth(''); setHandoffImmPieces('');
  };
  const toggleHandoffChoice = (step) => {
    setHandoffSendChoices(prev => prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]);
  };

  // Testing bridge — only the very first hand-off's first round ever has
  // material to resolve at all (outsourceWorkController.js's
  // getHandoffMaterialInfo returns kind:'none' otherwise, so this query is
  // simply skipped for every other send).
  const handoffIsFirstRoundSend = !!handoffSendDialog && handoffSendDialog.isFirstStepOfOrder && (handoffSendDialog.rounds || []).length === 0;
  const { data: handoffMaterialResp, isLoading: handoffMaterialLoading } = useQuery({
    queryKey: ['outsource-handoff-material-info', handoffSendDialog?.orderRecordId, handoffSendDialog?.handoffId],
    queryFn: () => apiRequest('GET', `/api/outsource-work/orders/${handoffSendDialog.orderRecordId}/handoffs/${handoffSendDialog.handoffId}/material-info`),
    enabled: handoffIsFirstRoundSend,
  });
  const handoffMaterialInfo = handoffMaterialResp?.data || null;

  // Same auto-select/derived logic the old dialog has (see materialOptions'
  // own useEffect/lengthCombineLeftover/cutMarginInfo above), mirrored for
  // the handoff's own state — picking any of this is still entirely
  // optional at Send, this just keeps the picker itself behaving identically.
  useEffect(() => {
    if (!handoffMaterialInfo) return;
    if (handoffMaterialInfo.kind === 'sheet' && handoffMaterialCase === 'whole') {
      const match = (handoffMaterialInfo.leftoverOptions || []).find(l => l.matchesWholeSheet);
      if (match) setHandoffSourceVariantId(match._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffMaterialInfo, handoffMaterialCase]);

  const handoffLengthCombineLeftover = handoffMaterialInfo?.kind === 'length'
    ? (handoffMaterialInfo.leftoverOptions || []).find(l => l.matchesRemainder)
    : null;

  const handoffCutMarginInfo = useMemo(() => {
    if (!handoffMaterialInfo || handoffMaterialInfo.kind !== 'sheet' || handoffMaterialCase !== 'cut') return null;
    const pieces = Number(handoffStockPiecesConsumed) || 0;
    if (!pieces) return null;
    const chosenLeftover = handoffSourceVariantId
      ? (handoffMaterialInfo.leftoverOptions || []).find(l => l._id === handoffSourceVariantId)
      : null;
    const perPieceAreaMm2 = chosenLeftover ? (chosenLeftover.cutCapacityAreaMm2 || 0) : sheetAreaMm2(handoffMaterialInfo.catalogVariant?.values);
    const totalCapacityAreaMm2 = perPieceAreaMm2 * pieces;
    const neededAreaMm2 = handoffMaterialInfo.availability?.totalAreaNeededMm2 || 0;
    if (!neededAreaMm2 || totalCapacityAreaMm2 < neededAreaMm2) return null;
    const marginRatio = (totalCapacityAreaMm2 - neededAreaMm2) / neededAreaMm2;
    return { marginRatio, isNarrow: marginRatio < CUT_MARGIN_WARNING_RATIO };
  }, [handoffMaterialInfo, handoffMaterialCase, handoffSourceVariantId, handoffStockPiecesConsumed]);

  const handleSendHandoffRound = async () => {
    if (!handoffSendDialog || !handoffSendChoices.length) return;
    setBusy(true);
    try {
      const body = { coveredSteps: handoffSendChoices };
      // Entirely optional — Purchase can send with nothing chosen at all
      // (confirmed with the user: "it should show but user can proceed
      // without selecting the material"). Only ever meaningful for the
      // sheet/length shapes, which are the only ones with a real choice to
      // make (plain and multi are informational-only, see the dialog JSX).
      if (handoffIsFirstRoundSend && (handoffMaterialInfo?.kind === 'sheet' || handoffMaterialInfo?.kind === 'length')) {
        const selection = { materialCase: handoffMaterialCase };
        if (handoffSourceVariantId) selection.leftoverVariantId = handoffSourceVariantId;
        body.materialSelection = selection;
      }
      await apiRequest('POST', `/api/outsource-work/orders/${handoffSendDialog.orderRecordId}/handoffs/${handoffSendDialog.handoffId}/rounds`, body);
      toast({ title: 'Sent', description: `${handoffSendChoices.length} step(s) sent for ${handoffSendDialog.name}.`, variant: 'default' });
      setHandoffSendDialog(null);
      invalidateList();
    } catch (err) {
      toast({ title: 'Send Failed', description: err.message || 'Could not send this round.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };
  const handleReceiveHandoffRound = async (row, round) => {
    setBusy(true);
    try {
      await apiRequest('PUT', `/api/outsource-work/orders/${row.orderRecordId}/handoffs/${row.handoffId}/rounds/${round._id}/receive`);
      toast({ title: 'Received', description: `Round received for ${row.name}.`, variant: 'default' });
      invalidateList();
    } catch (err) {
      toast({ title: 'Receive Failed', description: err.message || 'Could not receive this round.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };
  const handoffSendDialogNotYetCovered = handoffSendDialog ? handoffNotYetCovered(handoffSendDialog) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Outsource Work</h1>
          <p className="text-gray-600 mt-2">Sub Child Part, Child Part, and Machine work routed to an outsourced vendor via Purchase</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                </div>
                <Boxes className="w-10 h-10 text-teal-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-amber-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.inProgress}</p>
                </div>
                <Send className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending QC</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.pendingQC}</p>
                </div>
                <ShieldAlert className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.completed}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">QC Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.qcRejected}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6 space-y-3">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by code, name, or order ID..."
                  className="pl-10 h-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'Pending', 'In Progress', 'Pending QC', 'Completed', 'QC Rejected'].map(s => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                    className={statusFilter === s ? (s === 'QC Rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700') : ''}
                  >
                    {s === 'all' ? 'All' : s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'SubChildPart', 'ChildPart', 'Machine'].map(k => (
                <Button
                  key={k}
                  variant={orderKindFilter === k ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOrderKindFilter(k)}
                  className={orderKindFilter === k ? 'bg-slate-800 hover:bg-slate-900' : ''}
                >
                  {k === 'all' ? 'All Types' : orderKindLabel[k]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>Outsource Work Requests ({pagination.total})</CardTitle>
            <CardDescription>Work items awaiting or in outsourced processing, across all order types</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 hover:bg-slate-100">
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Code</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Steps</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Qty</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Rounds</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        Outsourced work requests will appear here.
                      </td>
                    </tr>
                  ) : rows.map(row => {
                    const isJobWorkOrder = row.sourceType === 'JobWorkOrder';
                    const covered = isJobWorkOrder ? coveredTypes(row.raw) : new Set(row.coveredSteps || []);
                    const pendingRound = isJobWorkOrder ? openRound(row.raw) : handoffOpenRound(row);
                    const allCovered = (row.stepNames || []).every(t => covered.has(t));
                    const availability = row.raw?.liveAvailability;
                    return (
                      <tr key={row.id} className="border-b hover:bg-slate-50 transition-colors align-top">
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={orderKindColor[row.orderKind]}>{orderKindLabel[row.orderKind]}</Badge>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-gray-900">{row.code}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{row.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {(row.stepNames || []).map(t => (
                              <span
                                key={t}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${covered.has(t) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                          {isJobWorkOrder && (
                            <div className="mt-1">
                              {!availability ? (
                                <span className="text-xs text-gray-400">—</span>
                              ) : availability.shortfallQty > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">
                                  Short {availability.shortfallQty} {availability.unit || ''}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">Available</span>
                              )}
                            </div>
                          )}
                        </td>
                        {/* unitCount (2026-09-25): how many units THIS row's rounds actually
                            cover — orderQuantity is the whole order's build count, which for a
                            Child Part/Machine hand-off row can now be a subset (multi-unit
                            batching). Sub Child Part rows have no per-hand-off subset, so
                            unitCount === orderQuantity there, unchanged. */}
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">{row.unitCount ?? row.orderQuantity}</td>
                        <td className="px-6 py-4 text-gray-600 text-xs">{roundsSummary(row)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[row.status]}`}>{row.status}</span>
                          {row.qcRejectedQty > 0 && (
                            <div className="mt-1 text-[11px] text-red-600 font-medium">QC rejected {row.qcRejectedQty}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-1.5">
                            {isJobWorkOrder ? (
                              <>
                                {canEdit && pendingRound && (
                                  <Button size="sm" variant="outline" disabled={busy}
                                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 w-full"
                                    onClick={() => handleReceiveRound(row.raw, pendingRound)}>
                                    <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> Receive R{pendingRound.roundNumber}
                                  </Button>
                                )}
                                {canEdit && !allCovered && !pendingRound && row.status !== 'Pending QC' && (
                                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white w-full" onClick={() => openSendDialog(row)}>
                                    <Send className="w-3.5 h-3.5 mr-1" /> Send Round
                                  </Button>
                                )}
                                {row.status === 'Pending QC' && (
                                  <span className="text-xs text-purple-700 font-semibold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Sent to QC</span>
                                )}
                                {row.status === 'Completed' && <span className="text-xs text-emerald-700 font-semibold">Done</span>}
                              </>
                            ) : (
                              <>
                                {canEdit && pendingRound && (
                                  <Button size="sm" variant="outline" disabled={busy}
                                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 w-full"
                                    onClick={() => handleReceiveHandoffRound(row, pendingRound)}>
                                    <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> Receive R{pendingRound.roundNumber}
                                  </Button>
                                )}
                                {canEdit && !allCovered && !pendingRound && row.status !== 'Completed' && (
                                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white w-full" onClick={() => openHandoffSendDialog(row)}>
                                    <Send className="w-3.5 h-3.5 mr-1" /> Send Round
                                  </Button>
                                )}
                                {row.status === 'Completed' && <span className="text-xs text-emerald-700 font-semibold">Done</span>}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} requests)</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
          </div>
        )}
      </div>

      {/* Sub Child Part (pure Out-Source) — Send Round dialog, unchanged */}
      <Dialog open={!!sendDialogOrder} onOpenChange={(o) => { if (!o) setSendDialogOrder(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Job Work Round</DialogTitle>
            <DialogDescription>
              Select which job work type(s) to send for {sendDialogOrder?.itemName} — send all now, or just some and send the rest later.
            </DialogDescription>
          </DialogHeader>

          {isFirstRoundSend && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Raw Material — first send for this order</p>
              {materialOptionsLoading ? (
                <p className="text-sm text-slate-500">Loading material options…</p>
              ) : !materialOptions ? (
                <p className="text-sm text-red-600">Could not load material options.</p>
              ) : renderMaterialPicker({
                materialOptions, materialCase, setMaterialCase,
                sourceVariantId, setSourceVariantId,
                stockPiecesConsumed, setStockPiecesConsumed,
                combineLeftover, setCombineLeftover,
                immLength, setImmLength, immWidth, setImmWidth, immPieces, setImmPieces,
                cutMarginInfo, lengthCombineLeftover,
              })}
            </div>
          )}

          <div className="space-y-2 py-2">
            {sendDialogNotYetCovered.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing left to send — every job work type has already been received.</p>
            ) : sendDialogNotYetCovered.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={sendChoices.includes(t)} onChange={() => toggleChoice(t)} />
                {t}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOrder(null)}>Cancel</Button>
            <Button onClick={handleSendRound} disabled={busy || !canSubmitSend()} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub Child Part (pure Out-Source) — Receive/Complete Round dialog, unchanged */}
      <Dialog open={!!receiveDialog} onOpenChange={(o) => { if (!o) setReceiveDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Order — Send to QC</DialogTitle>
            <DialogDescription>
              This finishes {receiveDialog?.order?.itemName} and sends it to QC for inspection — stock is only
              credited once QC approves. Enter what the vendor actually invoiced for this whole order.
              {receiveNeedsLeftover && ' The whole sheet/piece sent at the start is finally back too — measure what’s genuinely left over (enter 0 if none).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-slate-600">Total Job Work Cost (vendor invoice, whole order)</label>
              <Input placeholder="₹ total" type="number" value={recvTotalCost} onChange={e => setRecvTotalCost(e.target.value)} />
            </div>
            {receiveNeedsLeftover && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Leftover length" type="number" value={recvLength} onChange={e => setRecvLength(e.target.value)} />
                  <Select value={recvLengthUnit} onValueChange={setRecvLengthUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LENGTH_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {receiveIsSheet && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Leftover width" type="number" value={recvWidth} onChange={e => setRecvWidth(e.target.value)} />
                    <Select value={recvWidthUnit} onValueChange={setRecvWidthUnit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LENGTH_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialog(null)}>Cancel</Button>
            <Button onClick={submitCompleteReceive} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <ArrowDownToLine className="w-4 h-4 mr-2" /> Send to QC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handoff (Child Part/Machine/hybrid Sub Child Part) — Send Round dialog, new */}
      <Dialog open={!!handoffSendDialog} onOpenChange={(o) => { if (!o) setHandoffSendDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Outsource Round</DialogTitle>
            <DialogDescription>
              Select which step(s) to send now for {handoffSendDialog?.name} — send all now, or just some and send the rest later.
            </DialogDescription>
          </DialogHeader>
          {/* Same "Raw Material — first send" picker the old
              SubChildPartJobWorkOrder dialog has (renderMaterialPicker,
              shared) — picking anything here is entirely optional at Send,
              and nothing here ever touches real Store stock (testing
              bridge, see the discussion doc's "First-step outsource
              material send" section and outsourceWorkController.js's own
              comment). Child Part/Machine's materialRefs (which can span
              more than one material line) get a simpler informational
              table instead — there's no old-UI equivalent for that shape. */}
          {handoffIsFirstRoundSend && (
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Raw Material — first send for this order</p>
              {handoffMaterialLoading ? (
                <p className="text-sm text-slate-500">Loading material options…</p>
              ) : !handoffMaterialInfo || handoffMaterialInfo.kind === 'none' ? (
                <p className="text-sm text-slate-400">No material info available for this step.</p>
              ) : handoffMaterialInfo.kind === 'multi' ? (
                handoffMaterialInfo.lines.length === 0 ? (
                  <p className="text-sm text-slate-400">No materials referenced for this step.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left font-medium">Material</th>
                        <th className="text-right font-medium">Needed</th>
                        <th className="text-right font-medium">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handoffMaterialInfo.lines.map(l => (
                        <tr key={l.itemCode}>
                          <td>{l.itemName} <span className="text-slate-400">({l.itemCode})</span></td>
                          <td className="text-right">{l.neededQty} {l.unit}</td>
                          <td className="text-right">{l.availableQty ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : renderMaterialPicker({
                materialOptions: handoffMaterialInfo,
                materialCase: handoffMaterialCase, setMaterialCase: setHandoffMaterialCase,
                sourceVariantId: handoffSourceVariantId, setSourceVariantId: setHandoffSourceVariantId,
                stockPiecesConsumed: handoffStockPiecesConsumed, setStockPiecesConsumed: setHandoffStockPiecesConsumed,
                combineLeftover: handoffCombineLeftover, setCombineLeftover: setHandoffCombineLeftover,
                immLength: handoffImmLength, setImmLength: setHandoffImmLength,
                immWidth: handoffImmWidth, setImmWidth: setHandoffImmWidth,
                immPieces: handoffImmPieces, setImmPieces: setHandoffImmPieces,
                cutMarginInfo: handoffCutMarginInfo, lengthCombineLeftover: handoffLengthCombineLeftover,
              })}
              <p className="text-[11px] text-amber-600">
                Optional — you can send without choosing anything above. No real stock will be moved for this hand-off yet; the vendor/Logistics handshake isn't built. Testing bridge only.
              </p>
            </div>
          )}

          <div className="space-y-2 py-2">
            {handoffSendDialogNotYetCovered.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing left to send — every step has already been received.</p>
            ) : handoffSendDialogNotYetCovered.map(t => (
              <label key={t} className="flex items-center gap-2 text-sm border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={handoffSendChoices.includes(t)} onChange={() => toggleHandoffChoice(t)} />
                {t}
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoffSendDialog(null)}>Cancel</Button>
            <Button onClick={handleSendHandoffRound} disabled={busy || !handoffSendChoices.length} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
