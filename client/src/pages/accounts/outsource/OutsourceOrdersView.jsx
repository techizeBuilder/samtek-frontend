import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Ban, Pencil, RefreshCw } from 'lucide-react';
import NewOutsourceOrderDialog from './NewOutsourceOrderDialog';
import SerialPicker, { emptyPick } from '@/components/serials/SerialPicker';
import { useConfirmWarnings } from '@/components/serials/useConfirmWarnings';

// Outsource Orders (outsource-v2 slice 2, 2026-10-20). Trips go out and come
// back through Dispatch (Vendor Pickups) and Store (slices 6–7) — Purchase's
// temporary Mark sent / Receive went in slice 8. Here Purchase sees each
// line's material plan, trip and bill, marks "vendor says ready", cancels
// (only while nothing has gone out) and edits (only when Rejected).
// Backend: /api/outsource-work/outsource-orders (outsourceOrderController.js).
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const who = (u) => u?.fullName || u?.username || '';
const STATUS_FILTERS = ['all', 'Pending Approval', 'Open', 'With vendor', 'Partly received', 'Received', 'Rejected', 'Cancelled'];
export const ORDER_STATUS_TONE = {
  'Pending Approval': 'bg-amber-50 text-amber-800 border-amber-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  Open: 'bg-slate-100 text-slate-700 border-slate-200',
  'With vendor': 'bg-blue-50 text-blue-700 border-blue-200',
  'Partly received': 'bg-violet-50 text-violet-700 border-violet-200',
  Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-slate-50 text-slate-400 border-slate-200',
};
// The material plan (slice 5): one row, in plain words. Sheet area / lengths
// are shown in m² / m; a combined line shows its whole sheets / lengths.
const fmtQty = (n) => (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString('en-IN');
function planQty(row, n) {
  if (row.kind === 'sheetArea') return `${fmtQty(n / 1e6)} m²`;
  if (row.kind === 'length') return `${fmtQty(n / 1000)} m`;
  return `${fmtQty(n)} ${row.unit || ''}`.trim();
}
function planText(row) {
  const name = row.kind === 'wip' ? `the ${row.unit === 'units' ? 'units' : 'pieces'} themselves` : row.itemName;
  const parts = [];
  if (row.fromProduction > 0) parts.push(`${planQty(row, row.fromProduction)} from Production${row.awaitingDelivery > 0 ? ` (${fmtQty(row.awaitingDelivery)} still being made${row.awaitingOrders?.length ? `, ${row.awaitingOrders.join(', ')}` : ''})` : ''}`);
  if (row.fromStore > 0) parts.push(`${planQty(row, row.fromStore)} from Store${row.storeShare != null ? ` (${fmtQty(row.storeShare)} ${row.kind === 'length' ? 'length' : 'sheet'}s booked)` : ''}`);
  return `${name}: ${parts.join(' + ') || 'nothing'}`;
}

// The bill (slice 3): its stage, in outsource words.
const BILL_TONE = {
  'Advance due': 'bg-violet-50 text-violet-700 border-violet-200',
  'Awaiting material': 'bg-slate-50 text-slate-600 border-slate-200',
  Payable: 'bg-amber-50 text-amber-800 border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-slate-50 text-slate-400 border-slate-200',
};
const billLabel = (stage) => (stage === 'Awaiting material' ? 'Awaiting work' : stage || '—');

// Pricing types (2026-10-22 — server/services/outsourcePricingService.js
// priceBasis, mirrored): one step's price in words.
const timeText = (m) => { const v = Math.round(Number(m) || 0); const h = Math.floor(v / 60); return h ? `${h} h${v % 60 ? ` ${v % 60} min` : ''}` : `${v} min`; };
function stepBasis(sr, qty, qtyUnit) {
  const t = sr.type || 'piece';
  const q = `${qty} ${qtyUnit}`;
  if (t === 'line') return `whole line (${q}) ${inr(sr.rate)}`;
  if (t === 'operation') return `${q} × ${sr.operationsPerPiece} ${sr.operationName || 'operations'} × ${inr(sr.rate)} = ${inr(sr.amount)}`;
  if (t === 'minute' || t === 'hour') {
    const per = t === 'minute' ? '/min' : '/h';
    return sr.time?.minutes != null ? `${timeText(sr.time.minutes)} × ${inr(sr.rate)}${per} = ${inr(sr.amount)}` : `${inr(sr.rate)}${per} — time not entered yet`;
  }
  return `${q} × ${inr(sr.rate)} = ${inr(sr.amount ?? sr.rate * qty)}`;
}

// A per minute / per hour step: Purchase enters (or edits) how long it took —
// any time after approval; locked once the line's work is accepted (R4).
function StepTime({ order, line, sr, canEdit, onDone }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = line.requests.some(r => r.acceptance?.appliedKeys?.length);
  const allowed = canEdit && !['Pending Approval', 'Rejected', 'Cancelled'].includes(order.status) && !locked;
  const start = () => {
    const cur = Math.round(Number(sr.time?.minutes) || 0);
    setH(cur ? String(Math.floor(cur / 60)) : ''); setM(cur ? String(cur % 60) : ''); setOpen(true);
  };
  const save = async () => {
    const minutes = (Number(h) || 0) * 60 + (Number(m) || 0);
    setBusy(true);
    try {
      const res = await apiRequest('POST', `/api/outsource-work/outsource-orders/${order._id}/lines/${line._id}/time`, { step: sr.step, minutes });
      toast({ title: 'Time saved', description: res?.message });
      setOpen(false); onDone();
    } catch (e) {
      toast({ title: "Couldn't save the time", description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  if (open) {
    return (
      // Wide enough to read the number next to the spinner (2026-10-23 — w-14 hid it).
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
        <Input type="number" min="0" className="h-8 w-24 text-sm" placeholder="hours" value={h} onChange={e => setH(e.target.value)} /> h
        <Input type="number" min="0" max="59" className="h-8 w-24 text-sm" placeholder="minutes" value={m} onChange={e => setM(e.target.value)} /> min
        <Button size="sm" className="h-8" disabled={busy || !((Number(h) || 0) * 60 + (Number(m) || 0) > 0)} onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen(false)}>×</Button>
      </span>
    );
  }
  if (!allowed) {
    return order.status === 'Pending Approval' ? <span className="text-[11px] text-slate-400">time after approval</span>
      : locked && sr.time?.minutes != null ? <span className="text-[11px] text-slate-400">locked (work accepted)</span> : null;
  }
  return <Button size="sm" variant="outline" className="h-7 text-[11px] border-violet-300 text-violet-700" onClick={start}>{sr.time?.minutes != null ? 'Edit time' : 'Enter time'}</Button>;
}
const REQ_TONE = { Ordered: 'text-slate-500', Sent: 'text-blue-700', Received: 'text-emerald-700', Released: 'text-slate-400 line-through' };

export function OrderDetailDialog({ orderId, onClose, onEdit }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
  const [busy, setBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['outsource-order', orderId],
    queryFn: () => apiRequest('GET', `/api/outsource-work/outsource-orders/${orderId}`),
    enabled: !!orderId,
  });
  const order = data?.data;
  const refresh = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['outsource-orders'] });
    qc.invalidateQueries({ queryKey: ['outsource-requests'] });
  };
  const live = order && ['Open', 'With vendor', 'Partly received', 'Received'].includes(order.status);
  const nothingOut = order && order.lines.every(l => l.requests.every(r => r.status === 'Ordered' || r.status === 'Released'));

  // Slice 7 (T9) — the vendor called: ready to collect.
  // Partial returns (2026-10-26): pieces the vendor lost / kept — written off.
  const [notComing, setNotComing] = useState(null); // { r, qty, reason }
  const { runChecked, warningDialog } = useConfirmWarnings();
  const [lostPick, setLostPick] = useState(emptyPick());
  const [lostPickOk, setLostPickOk] = useState(true);
  const writeOff = async () => {
    setBusy(true);
    try {
      const res = await runChecked((acknowledgeWarnings) => apiRequest('POST', `/api/outsource-work/outsource-orders/${order._id}/requests/${notComing.r._id}/not-coming`, { qty: Number(notComing.qty), reason: notComing.reason, lostUnitIds: lostPick.unitIds, acknowledgeWarnings }));
      if (!res) return; // went back to pick
      toast({ title: res.message || 'Written off' });
      setNotComing(null);
      refresh();
    } catch (e) {
      toast({ title: "Couldn't write it off", description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const markReady = async (r) => {
    setBusy(true);
    try {
      await apiRequest('POST', `/api/outsource-work/outsource-orders/${order._id}/requests/${r._id}/vendor-ready`);
      toast({ title: `${r.orderCode} marked ready to collect` });
      refresh();
    } catch (e) {
      toast({ title: "Couldn't mark it", description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await apiRequest('POST', `/api/outsource-work/outsource-orders/${order._id}/cancel`, { reason: cancelReason });
      toast({ title: 'Cancelled', description: res?.message });
      setShowCancel(false);
    } catch (e) {
      toast({ title: 'Cancel failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); refresh(); }
  };

  return (
    <Dialog open={!!orderId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading || !order ? (
          <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {order.orderNo} · {order.vendor?.supplierName || order.vendorName}
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ORDER_STATUS_TONE[order.status]}`}>{order.status}</span>
              </DialogTitle>
              <DialogDescription>
                {inr(order.grandTotal)}{order.timePending ? ' + time not entered yet' : ''} · created by {who(order.createdBy)} on {new Date(order.createdAt).toLocaleString()}
                {order.approval?.required && order.approval?.decision && order.approval.decision !== 'Pending' && ` · ${order.approval.decision} by ${who(order.approval.reviewedBy)}${order.approval.remarks ? ` — "${order.approval.remarks}"` : ''}`}
                {order.status === 'Pending Approval' && ` · waiting for the Company Admin (${[(order.approval?.reasons?.includes('limit') || !order.approval?.reasons?.length) && `above the ${inr(order.approval?.threshold)} limit`, order.approval?.reasons?.includes('time') && 'a time-based rate to check'].filter(Boolean).join('; ')})`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {order.lines.map(l => {
                const toSend = l.requests.filter(r => r.status === 'Ordered');
                return (
                  <div key={l._id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{l.itemName} <span className="font-mono text-xs text-slate-400">{l.itemCode}</span></p>
                        <p className="text-xs text-slate-500">{l.stepNames.join(' › ')} · {l.qty} {l.qtyUnit} · {inr(l.amount)} + {l.gstPercent}% = <b>{inr(l.lineTotal)}</b>{l.timePending && <span className="text-violet-700"> + time-based (not entered yet)</span>}{l.expectedBy ? ` · back by ${new Date(l.expectedBy).toLocaleDateString()}` : ''}</p>
                        {(l.stepRates || []).length > 0 && (
                          <ul className="mt-1 space-y-1">
                            {l.stepRates.map(sr => (
                              <li key={sr.step} className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                                <span className="font-medium text-slate-700">{sr.step}</span>
                                <span className={sr.time?.minutes == null && ['minute', 'hour'].includes(sr.type) ? 'text-violet-700' : ''}>{stepBasis(sr, l.qty, l.qtyUnit)}</span>
                                {['minute', 'hour'].includes(sr.type) && <StepTime order={order} line={l} sr={sr} canEdit={canEdit} onDone={refresh} />}
                                {sr.time?.byName && <span className="text-slate-400">· by {sr.time.byName}</span>}
                              </li>
                            ))}
                          </ul>
                        )}
                        {l.dispatch?.trip && toSend.length > 0 && <p className="text-[11px] text-violet-700">On Dispatch trip {l.dispatch.tripNo} — Dispatch sends it (Vendor Pickups){l.dispatch.bringBack ? '; the vehicle waits and brings it back' : ''}.</p>}
                        {!l.dispatch?.trip && toSend.length > 0 && live && <p className="text-[11px] text-slate-500">Waiting for Dispatch to plan a trip (Vendor Pickups).</p>}
                      </div>
                    </div>
                    {l.combinedMaterial?.length > 0 && (
                      <p className="text-[11px] text-violet-700">
                        Material from Store for this line, cut in one run: {l.combinedMaterial.map(c => `${c.itemName} — ${c.pieces} ${c.kind === 'length' ? 'length' : 'sheet'}${c.pieces === 1 ? '' : 's'}${c.method === 'plan' ? ' (Sheet Plan)' : ''}`).join('; ')}
                      </p>
                    )}
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {l.requests.map(r => (
                        <div key={r._id} className="flex items-center justify-between gap-2 py-1.5 text-sm flex-wrap">
                          <span className="text-slate-700">
                            <span className="font-mono text-xs">{r.orderCode}</span> · {r.qty} {l.qtyUnit}
                            {r.kind === 'handoff' && r.stepIndices?.length > 0 && <span className="text-[11px] text-slate-400"> · step {r.stepIndices.map(i => i + 1).join(', ')} on its order</span>}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${REQ_TONE[r.status]}`}>{r.status}</span>
                            {r.status === 'Received' && (
                              r.lostQty > 0 && !(r.arrivals || []).length
                                ? <span className="text-[11px] text-amber-700">0 back, {r.lostQty} not coming</span>
                                : l.timePending && !r.acceptance?.appliedKeys?.length
                                ? <span className="text-[11px] text-violet-700">payable once the time is entered</span>
                                : r.acceptance?.appliedKeys?.length > 0
                                ? <span className="text-[11px] text-slate-500">QC: {r.acceptance.acceptedQty} accepted{r.acceptance.rejectedQty > 0 && <span className="text-red-600"> · {r.acceptance.rejectedQty} not</span>}{!r.acceptance.decidedAt && ' · rest waiting'}</span>
                                : <span className="text-[11px] text-slate-400">waiting for QC</span>
                            )}
                            {r.problem && <span className="text-[11px] text-red-600">{r.problem}</span>}
                            {r.status === 'Sent' && r.vendorReady?.at && <span className="text-[11px] text-emerald-700">vendor says ready</span>}
                            {r.status === 'Sent' && r.short?.at && <span className="text-[11px] text-amber-700">short: {r.short.count} back ({r.short.from}){r.short.note ? ` — ${r.short.note}` : ''}</span>}
                            {/* Back in parts (2026-10-26): pieces wait at Store for the rest. */}
                            {r.status === 'Sent' && (r.arrivals?.length > 0 || r.lostQty > 0) && (() => {
                              const atStore = (r.arrivals || []).filter(a => a.receivedAt).reduce((s, a) => s + a.count, 0);
                              const taken = (r.arrivals || []).reduce((s, a) => s + a.count, 0);
                              const withVendor = Math.max(0, r.qty - taken - (r.lostQty || 0));
                              return <span className="text-[11px] text-teal-700">{atStore} of {r.qty} back at Store{taken > atStore ? ` · ${taken - atStore} on the way` : ''} · {withVendor} still with the vendor{r.lostQty ? ` · ${r.lostQty} not coming` : ''}{r.returnDispatch?.trip ? ` (Dispatch collects the rest — ${r.returnDispatch.tripNo})` : ''}</span>;
                            })()}
                            {r.status === 'Sent' && !r.arrivals?.length && (r.returnDispatch?.trip || r.collected?.at) && (
                              <span className="text-[11px] text-violet-700">{r.collected?.at ? `collected (${r.collected.tripNo}) — Store receives it` : `Dispatch collects it (${r.returnDispatch.tripNo})`}</span>
                            )}
                            {canEdit && live && r.status === 'Sent' && l.qtyUnit === 'pcs' && notComing?.r?._id !== r._id && (
                              <Button size="sm" variant="ghost" className="h-7 text-[11px] text-slate-600" title="Lost, or kept / scrapped by the vendor — they won't come back" onClick={() => setNotComing({ r, qty: '', reason: '' })}>Not coming</Button>
                            )}
                            {notComing?.r?._id === r._id && (
                              <span className="flex items-center gap-1 flex-wrap">
                                <Input type="number" min="1" className="h-7 w-16" placeholder="qty" value={notComing.qty} onChange={e => setNotComing({ ...notComing, qty: e.target.value })} />
                                <Input className="h-7 w-48" placeholder="why (e.g. lost at the vendor)" value={notComing.reason} onChange={e => setNotComing({ ...notComing, reason: e.target.value })} />
                                {warningDialog}
                                <Button size="sm" className="h-7" disabled={busy || !notComing.qty || !notComing.reason.trim() || !lostPickOk} onClick={writeOff}>Write off</Button>
                                <Button size="sm" variant="ghost" className="h-7" onClick={() => setNotComing(null)}>×</Button>
                                {Number(notComing.qty) > 0 && (
                                  <span className="block w-full text-left">
                                    <SerialPicker mode="scpPieces" orderId={String(r.jobWorkOrder || r.productionOrder)} qty={Number(notComing.qty)} onFloor={r.qty} title="Serial numbers in the lost pieces"
                                      value={lostPick} onChange={setLostPick} onValidity={(ok) => setLostPickOk(ok)} />
                                  </span>
                                )}
                              </span>
                            )}
                            {canEdit && live && r.status === 'Sent' && !r.vendorReady?.at && !r.collected?.at && (
                              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => markReady(r)}>Vendor says ready</Button>
                            )}
                          </span>
                          {r.materialPlan?.length > 0 && r.status !== 'Released' && (
                            <ul className="basis-full text-[11px] text-slate-500 pl-2">
                              {r.materialPlan.map((row, i) => <li key={i}>· {planText(row)}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="text-xs text-slate-600 grid sm:grid-cols-2 gap-x-6 gap-y-1 border-t pt-2">
                <p>Work {inr(order.subtotal)} + GST {inr(order.lineGst)} ({order.gstType === 'IGST' ? 'IGST' : 'CGST + SGST'})</p>
                {order.charges?.length > 0 && <p>Charges {order.charges.map(c => `${c.label} ${inr(c.amount)}`).join(', ')} + GST {inr(order.chargesGst)}</p>}
                {(order.paymentTerms?.advancePercent != null || order.paymentTerms?.advanceFlat != null || order.paymentTerms?.creditDays != null) && (
                  <p>Terms: {order.paymentTerms.advanceType === 'flat' && order.paymentTerms.advanceFlat != null ? `${inr(order.paymentTerms.advanceFlat)} flat advance` : order.paymentTerms.advancePercent != null ? `${order.paymentTerms.advancePercent}% advance` : 'no advance'}{order.paymentTerms.creditDays != null ? ` · ${order.paymentTerms.creditDays} credit days` : ''}</p>
                )}
                {order.notes && <p>Note: {order.notes}</p>}
              </div>

              {order.bill && (
                <div className="border-t pt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    Bill {order.bill.invoiceNo}
                    <span className={`normal-case text-[11px] px-2 py-0.5 rounded-full border ${BILL_TONE[order.bill.stage] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{billLabel(order.bill.stage)}</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
                    <p>Total <b>{inr(order.bill.totalAmount)}</b></p>
                    <p>Advance {order.bill.advanceAmount > 0 ? <b>{inr(order.bill.advancePaid)} of {inr(order.bill.advanceAmount)}</b> : 'none'}</p>
                    <p>Work accepted <b>{inr(order.bill.acceptedValue)}</b></p>
                    <p>Paid <b>{inr(order.bill.paidAmount)}</b></p>
                  </div>
                  <p className="text-xs text-slate-600">
                    {order.bill.payableNow && (order.bill.payableNow.advance > 0 || order.bill.payableNow.material > 0)
                      ? <>Can pay now: {[order.bill.payableNow.advance > 0 && `advance ${inr(order.bill.payableNow.advance)}`, order.bill.payableNow.material > 0 && `work ${inr(order.bill.payableNow.material)}`].filter(Boolean).join(' · ')} — on Vendor Payment.</>
                      : order.bill.stage === 'Paid' ? 'Fully paid.' : 'Nothing payable yet — work becomes payable as it passes QC.'}
                    {order.bill.dueDate && order.bill.stage === 'Payable' && <> Full payment due {new Date(order.bill.dueDate).toLocaleDateString('en-IN')}.</>}
                  </p>
                  {order.bill.adjustments?.length > 0 && (
                    <ul className="text-[11px] text-slate-500">
                      {order.bill.adjustments.map((a, i) => <li key={i}>−{inr(a.amount)} · {a.reason || a.kind}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {order.activity?.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">History</p>
                  <ul className="space-y-0.5">
                    {[...order.activity].reverse().map((a, i) => (
                      <li key={i} className="text-xs text-slate-600">{new Date(a.at).toLocaleString()} · {a.byName} — {a.summary}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter className="flex-wrap gap-2">
              {canEdit && order.status === 'Rejected' && (
                <Button variant="outline" onClick={() => onEdit(order)}><Pencil className="w-4 h-4 mr-1.5" />Edit and send again</Button>
              )}
              {canEdit && order.status !== 'Cancelled' && nothingOut && (
                showCancel ? (
                  <span className="flex items-center gap-2">
                    {order.bill?.paidAmount > 0 && <span className="text-xs text-amber-700">{inr(order.bill.paidAmount)} paid goes to Refunds & credits</span>}
                    <Input className="h-9 w-56" placeholder="Reason (optional)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                    <Button variant="destructive" disabled={busy} onClick={cancel}>Confirm cancel</Button>
                  </span>
                ) : <Button variant="outline" className="text-red-600 border-red-200" onClick={() => setShowCancel(true)}><Ban className="w-4 h-4 mr-1.5" />Cancel order</Button>
              )}
              <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OutsourceOrdersView({ openOrderId, onOpened }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // { order, views }
  const searchText = useDebouncedValue(search.trim(), 400);
  useEffect(() => { setPage(1); }, [searchText, status]);
  // Opened from elsewhere (a request's "Ordered — OSO-…").
  useEffect(() => { if (openOrderId) { setOpenId(openOrderId); onOpened?.(); } }, [openOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ['outsource-orders', status, searchText, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: '20' });
      if (status !== 'all') p.set('status', status);
      if (searchText) p.set('search', searchText);
      return apiRequest('GET', `/api/outsource-work/outsource-orders?${p.toString()}`);
    },
    keepPreviousData: true,
  });
  const orders = data?.data || [];
  const counts = data?.counts || {};
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  // Edit a rejected order: its requests' current views (they're free again).
  const startEdit = async (order) => {
    const res = await apiRequest('GET', '/api/outsource-work/requests');
    const keys = new Set(order.lines.flatMap(l => l.requests.map(r => (r.kind === 'jobWork' ? `jobWork:${r.jobWorkOrder}` : `handoff:${r.productionOrder}:${r.handoffId}`))));
    setEditing({ order, views: (res?.data || []).filter(v => keys.has(v.key) && v.ready) });
    setOpenId(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <Input placeholder="Search order no., vendor, part or production order…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {s === 'all' ? 'All' : s}{s !== 'all' && counts[s] ? ` (${counts[s]})` : ''}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Vendor</th><th className="px-4 py-2.5">Work</th>
                <th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Payment</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No outsource orders yet — pick requests on the Requests tab to make one.</td></tr>
              ) : orders.map(o => (
                <tr key={o._id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(o._id)}>
                  <td className="px-4 py-2.5"><p className="font-mono font-semibold text-slate-800">{o.orderNo}</p><p className="text-[11px] text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p></td>
                  <td className="px-4 py-2.5 text-slate-700">{o.vendorName}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{o.lines.map(l => `${l.itemName} · ${l.stepNames.join(' › ')} (${l.qty} ${l.qtyUnit})`).join('; ')}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{inr(o.grandTotal)}{o.timePending && <span className="block text-[10px] font-normal text-violet-700">+ time not entered</span>}</td>
                  <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full border ${ORDER_STATUS_TONE[o.status]}`}>{o.status}</span></td>
                  <td className="px-4 py-2.5 text-xs">{o.billStage ? <><span className={`text-[11px] px-2 py-0.5 rounded-full border ${BILL_TONE[o.billStage] || ""}`}>{billLabel(o.billStage)}</span>{o.billBalance > 0 && o.billStage !== "Cancelled" && <span className="block text-[11px] text-slate-500 mt-0.5">{inr(o.billBalance)} left</span>}</> : <span className="text-slate-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
          <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total})</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
        </div>
      )}

      {openId && <OrderDetailDialog orderId={openId} onClose={() => setOpenId(null)} onEdit={startEdit} />}
      {editing && (
        <NewOutsourceOrderDialog open requests={editing.views} editOrder={editing.order}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['outsource-orders'] }); qc.invalidateQueries({ queryKey: ['outsource-requests'] }); }} />
      )}
    </div>
  );
}
