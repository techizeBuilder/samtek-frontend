import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react';

// Company Admin → Purchase Approvals → Purchase Orders → Outsource Orders
// (outsource-v2 slice 2, 2026-10-20, D4). Outsource (job-work) orders whose
// final total is above the company's outsource order limit (Settings) wait
// here. Approve → it can go to the vendor; Reject (reason required) → its
// requests are free again and Purchase can edit and send it again. Approved
// lists every real order (approved here or within the limit). Each line shows
// what was paid before for the same part + steps.
// Backend: /api/outsource-approvals (outsourceOrderController.js).
const STATUS_TABS = ['Pending', 'Approved', 'Rejected'];
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const who = (u) => u?.fullName || u?.username || 'Unknown';
// Pricing types (2026-10-22): one step's price as the admin reads it.
// Once the time is entered it shows it (2026-10-24 — it kept saying "time later").
const timeText = (m) => { const v = Math.round(Number(m) || 0); const h = Math.floor(v / 60); return h ? `${h} h${v % 60 ? ` ${v % 60} min` : ''}` : `${v} min`; };
const stepPrice = (x) => {
  const t = x.type || 'piece';
  if (t === 'line') return `${inr(x.rate)} for the line`;
  if (t === 'operation') return `${inr(x.rate)}/${(x.operationName || 'operation').replace(/s$/, '')} × ${x.operationsPerPiece}`;
  if (t === 'minute' || t === 'hour') {
    const per = t === 'minute' ? '/min' : '/h';
    return x.time?.minutes != null ? `${timeText(x.time.minutes)} × ${inr(x.rate)}${per} = ${inr(x.amount)}` : `${inr(x.rate)}${per} — time later`;
  }
  return `${inr(x.rate)}/pc`;
};

function OrderCard({ order, onReview, busy }) {
  const [open, setOpen] = useState(order.status === 'Pending Approval');
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const isPending = order.status === 'Pending Approval';
  const overLimit = order.approval?.required;
  const terms = order.paymentTerms || {};

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <button type="button" className="text-left min-w-0 flex-1" onClick={() => setOpen(o => !o)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{order.vendor?.supplierName || order.vendorName}</span>
              <span className="font-mono text-xs text-gray-400">{order.orderNo}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">Outsource</span>
              {!isPending && order.status !== 'Rejected' && <span className="text-[10px] text-gray-500 border rounded-full px-2 py-0.5">{order.status}</span>}
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {inr(order.grandTotal)}
              {order.timePending && <span className="text-xs font-normal ml-1 text-violet-700">+ time-based steps (time not entered yet)</span>}
              {order.approval?.threshold != null && (
                <span className={`text-xs font-normal ml-2 ${order.approval?.reasons?.includes('limit') || (overLimit && !order.approval?.reasons?.length) ? 'text-amber-700' : 'text-blue-700'}`}>
                  {order.approval?.reasons?.includes('limit') || (overLimit && !order.approval?.reasons?.length) ? 'above' : 'within'} your {inr(order.approval.threshold)} limit
                </span>
              )}
            </p>
            {order.approval?.reasons?.includes('time') && (
              <p className="text-xs text-violet-700 mt-0.5">Has a per minute / per hour price — check the rate (your "approve time-based orders" setting). The time comes later; you'll be notified.</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              {overLimit
                ? <>Requested by {who(order.approval?.requestedBy || order.createdBy)} · {new Date(order.approval?.requestedAt || order.createdAt).toLocaleString()}</>
                : <>Created by {who(order.createdBy)} · {new Date(order.createdAt).toLocaleString()}</>}
            </p>
            {!isPending && overLimit && order.approval?.decision && (
              <p className="text-xs text-gray-500 mt-0.5">
                {order.approval.decision} by {who(order.approval?.reviewedBy)}
                {order.approval?.reviewedAt ? ` on ${new Date(order.approval.reviewedAt).toLocaleString()}` : ''}
                {order.approval?.remarks ? ` — "${order.approval.remarks}"` : ''}
              </p>
            )}
          </button>
          {isPending && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busy} onClick={() => onReview(order._id, 'approve', '')}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />Approve
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setShowReject(s => !s)}>
                  <XCircle className="h-4 w-4 mr-1.5" />Reject
                </Button>
              </div>
              {showReject && (
                <div className="w-72 space-y-2">
                  <Textarea rows={2} className="text-sm" placeholder="Reason (required) — Purchase sees it" value={reason} onChange={e => setReason(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
                    <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={() => onReview(order._id, 'reject', reason.trim())}>Confirm reject</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {open && (
          <div className="mt-3 space-y-3">
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left px-3 py-2">Part · steps</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Rate</th>
                    <th className="text-right px-3 py-2">GST</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-left px-3 py-2">Paid before</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map(l => {
                    const ph = l.priceHistory;
                    return (
                      <tr key={l._id} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{l.itemName} <span className="font-mono text-[11px] text-gray-400">{l.itemCode}</span></p>
                          <p className="text-xs text-gray-500">{l.stepRates?.length ? l.stepRates.map(x => `${x.step} ${stepPrice(x)}`).join(' + ') : l.stepNames.join(' › ')}</p>
                          <p className="text-[11px] text-gray-400">for {l.requests.map(r => r.orderCode).join(', ')}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{l.qty} {l.qtyUnit}</td>
                        <td className="px-3 py-2 text-right">{inr(l.ratePerPiece)}{(l.stepRates || []).some(x => x.type && x.type !== 'piece') && <span className="block text-[10px] text-gray-400">avg / {l.qtyUnit === 'units' ? 'unit' : 'pc'}</span>}</td>
                        <td className="px-3 py-2 text-right">{l.gstPercent}%</td>
                        <td className="px-3 py-2 text-right font-semibold">{inr(l.lineTotal)}{l.timePending && <span className="block text-[10px] font-normal text-violet-700">+ time later</span>}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {!ph || !ph.count ? <span className="text-gray-400">No earlier orders{ph?.unit && ph.unit !== '/pc avg' ? ' at this price type' : ''}</span> : (
                            <>
                              <p>Last {inr(ph.last.rate)}{ph.unit || ''} ({ph.last.vendorName})</p>
                              <p>Average {inr(ph.average)}{ph.unit || ''} over {ph.count}</p>
                              {ph.vendorLast && <p>This vendor last {inr(ph.vendorLast.rate)}{ph.unit || ''}</p>}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-gray-600 grid sm:grid-cols-2 gap-x-6 gap-y-1">
              <p>Work {inr(order.subtotal)} + GST {inr(order.lineGst)} ({order.gstType === 'IGST' ? 'IGST' : 'CGST + SGST'})</p>
              {order.charges?.length > 0 && <p>Charges {order.charges.map(c => `${c.label} ${inr(c.amount)}`).join(', ')} + GST {inr(order.chargesGst)}</p>}
              {(terms.advancePercent != null || terms.advanceFlat != null || terms.creditDays != null) && (
                <p>Terms: {terms.advanceType === 'flat' && terms.advanceFlat != null ? `${inr(terms.advanceFlat)} flat advance` : terms.advancePercent != null ? `${terms.advancePercent}% advance` : 'no advance'}{terms.creditDays != null ? ` · ${terms.creditDays} credit days` : ''}</p>
              )}
              {order.notes && <p>Note: {order.notes}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OutsourceApprovalsTab({ initialStatus, initialSearch } = {}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  // A notification's link may open a status, searched to its order (2026-10-23).
  const [status, setStatusRaw] = useState(['Pending', 'Approved', 'Rejected'].includes(initialStatus) ? initialStatus : 'Pending');
  // Paged on the server, 20 a page, with a search (2026-10-23 — Approved /
  // Rejected only ever showed the newest 50).
  const [page, setPage] = useState(1);
  const [search, setSearchRaw] = useState(initialSearch || '');
  const searchText = useDebouncedValue(search.trim(), 400);
  const setStatus = (s) => { linkTries.current = []; setStatusRaw(s); setPage(1); };
  const setSearch = (v) => { setSearchRaw(v); setPage(1); };
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['outsource-approvals', status, searchText, page],
    queryFn: () => apiRequest('GET', `/api/outsource-approvals?status=${status}&page=${page}&limit=20${searchText ? `&search=${encodeURIComponent(searchText)}` : ''}`),
    placeholderData: keepPreviousData,
  });
  const orders = data?.data || [];
  const pg = data?.pagination || { page: 1, pages: 1, total: 0 };
  // Opened from a notification for an order that's been decided since: the
  // Pending search is empty — try Approved, then Rejected (once each).
  const linkTries = useRef(initialSearch ? STATUS_TABS.filter(s => s !== status) : []);
  useEffect(() => {
    if (!data || isLoading || isPlaceholderData || orders.length || searchText !== (initialSearch || '').trim() || !linkTries.current.length) return;
    setStatusRaw(linkTries.current.shift());
  }, [data, isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewM = useMutation({
    mutationFn: ({ id, decision, remarks }) => apiRequest('PUT', `/api/outsource-approvals/${id}/review`, { decision, remarks }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['outsource-approvals'] });
      qc.invalidateQueries({ queryKey: ['purchase-dashboard'] });
      toast({ title: vars.decision === 'approve' ? 'Approved' : 'Rejected', description: res?.message });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Outsource (job-work) orders above your outsource order limit (Settings) wait here before they can go to the vendor.
        Approved lists every real outsource order. No quotations here — Purchase types the price; "Paid before" shows earlier orders for the same part and steps.
      </p>
      <div className="flex gap-1.5 flex-wrap items-center">
        {STATUS_TABS.map(s => (
          <button key={s} type="button" onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
            {s}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
          <Input className="pl-8 h-8" placeholder="Order no., vendor or part…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Clock className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">No {status.toLowerCase()} outsource orders.</p></div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => <OrderCard key={o._id} order={o} busy={reviewM.isPending} onReview={(id, decision, remarks) => reviewM.mutate({ id, decision, remarks })} />)}
        </div>
      )}
      {pg.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pg.page <= 1}>Previous</Button>
          <span className="text-sm text-gray-500">Page {pg.page} of {pg.pages} ({pg.total})</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pg.page >= pg.pages}>Next</Button>
        </div>
      )}
    </div>
  );
}
