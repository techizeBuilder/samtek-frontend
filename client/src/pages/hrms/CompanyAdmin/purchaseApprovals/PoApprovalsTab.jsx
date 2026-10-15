import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, History, Ban, ScrollText } from 'lucide-react';
import { PoHistoryDialog } from '@/components/accounts/purchase/AuditLog';
import { GstSplitNote } from '@/components/accounts/purchase/GstSplit';
import QuoteHistoryDialog from '@/components/accounts/purchase/QuoteHistoryDialog';
import { BoughtBeforeTag } from '@/components/accounts/purchase/PriceCheck';
import { ApprovalReasonBadges, SelectionCheckDetails, SelectionCheckLine, QuoteTermsChangeDetails } from '@/components/accounts/purchase/SelectionCheck';

// Company Admin → Purchase & Vendor Approval → PO Approvals (procurement-v2,
// 2026-10-08). The Company Admin sees EVERY PO:
//   - Pending — the final total (goods + charges + all GST) is above the
//     company's PO approval threshold. Approving makes it a real PO (requests
//     linked, invoice created, PO emailed to the vendor, Store sees it);
//     rejecting (reason required) sends Purchase back to pick another vendor
//     / price.
//   - Approved — every real PO: the ones approved here, plus the ones Purchase
//     created directly (within the limit, or no limit set), each with a badge
//     saying which.
//   - Rejected.
// Every card has "All quotes" — all the quotations (offers) behind the PO.
// Since 2026-10-09 (gap 12) a PO also comes here when it fails the vendor
// selection check (not enough vendors asked, or another vendor quoted the
// whole PO for less) — whatever its value. The card shows why (reason
// badges) and the check as saved on the PO, with Purchase's reason.
// Gap 13 (2026-10-09): Pending also holds Purchase's requests to CANCEL a
// real PO (or short close what isn't received) — approving cancels it,
// reopens its requests on RFQ/PO, cancels / reduces the invoice and emails
// the vendor; refusing (reason required) keeps the PO as it is.
// Backend: /api/po-approvals (poApprovalController.js).
const STATUS_TABS = ['Pending', 'Approved', 'Rejected'];
const PAGE_SIZES = [10, 20, 50];
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const who = (u) => u?.fullName || u?.username || 'Unknown';

const MODE_BADGE = {
  approved: { label: 'Approved by you', cls: 'bg-green-50 text-green-700 border-green-200' },
  'within-limit': { label: 'Created directly — within limit', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  'no-limit': { label: 'Created directly — no limit set', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

function POCard({ po, onReview, busy, onHistory, warnAt }) {
  const [poHistoryOpen, setPoHistoryOpen] = useState(false);
  const [open, setOpen] = useState(po.status === 'Pending Approval' || po.pendingKind === 'cancellation');
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const isPending = po.status === 'Pending Approval';
  const isCancelReq = po.pendingKind === 'cancellation';
  const openCancel = (po.cancellations || []).find(c => c.status === 'Requested') || null;
  const cp = po.cancelPreview || null;
  const cancelLineIds = new Set(cp?.lineIds || []);
  const shortClosed = (po.cancellations || []).some(c => c.status === 'Approved' && c.kind === 'ShortClose');
  const direct = po.approvalMode === 'within-limit' || po.approvalMode === 'no-limit';
  const mode = MODE_BADGE[po.approvalMode];
  const terms = po.paymentTerms || {};
  const goods = po.totalAmount || 0;
  const lineGst = po.taxAmount || 0;
  // Lines priced at/above the warning % over what we last paid this vendor
  // for the item (delivered purchases before this PO) — "Bought before".
  const overLimit = (po.approvalReasons || []).includes('threshold');
  const risen = (po.items || []).filter(l => l.priceCheck?.changePercent != null && l.priceCheck.changePercent > 0 && l.priceCheck.changePercent >= warnAt);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <button type="button" className="text-left min-w-0 flex-1" onClick={() => setOpen(o => !o)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{po.supplier?.supplierName || 'Vendor'}</span>
              <span className="font-mono text-xs text-gray-400">{po.purchaseOrderNumber}</span>
              {mode && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mode.cls}`}>{mode.label}</span>}
              {!direct && <ApprovalReasonBadges reasons={po.approvalReasons} />}
              {isCancelReq && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 inline-flex items-center gap-1"><Ban className="w-3 h-3" />{cp?.kind === 'ShortClose' ? 'Short close request' : 'Cancellation request'}</span>}
              {shortClosed && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">Short closed</span>}
              {!isPending && po.status !== 'Rejected' && <span className="text-[10px] text-gray-500 border rounded-full px-2 py-0.5">{po.status}</span>}
              {risen.length > 0 && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300">Price up vs last bought on {risen.length} line{risen.length === 1 ? '' : 's'}</span>}
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {inr(po.grandTotal)}
              {po.approval?.threshold != null && (
                <span className={`text-xs font-normal ml-2 ${overLimit ? 'text-amber-700' : 'text-blue-700'}`}>
                  {overLimit ? 'above' : 'within'} your ₹{Number(po.approval.threshold).toLocaleString('en-IN')} limit
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {direct
                ? <>Created by {who(po.createdBy)} · {new Date(po.createdAt).toLocaleString()}</>
                : <>Requested by {who(po.approval?.requestedBy || po.createdBy)} · {new Date(po.approval?.requestedAt || po.createdAt).toLocaleString()}</>}
            </p>
            {po.selectionCheck && <p className="mt-0.5"><SelectionCheckLine check={po.selectionCheck} /></p>}
            {po.quoteTermsCheck?.changes?.length > 0 && (
              <p className="mt-0.5 text-[11px] text-orange-700">Charges / terms changed from {po.quoteTermsCheck.from} — {po.quoteTermsCheck.changes.length} change{po.quoteTermsCheck.changes.length === 1 ? '' : 's'}, with Purchase's reason</p>
            )}
            {!isPending && !direct && po.approval?.decision && (
              <p className="text-xs text-gray-500 mt-0.5">
                {po.approval.decision} by {who(po.approval?.reviewedBy)}
                {po.approval?.reviewedAt ? ` on ${new Date(po.approval.reviewedAt).toLocaleString()}` : ''}
                {po.approval?.remarks ? ` — "${po.approval.remarks}"` : ''}
              </p>
            )}
          </button>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onHistory(po)}>
                <History className="h-4 w-4 mr-1.5" />All quotes
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPoHistoryOpen(true)} title="Every step of this PO — who, when">
                <ScrollText className="h-4 w-4 mr-1.5" />History
              </Button>
              {(isPending || isCancelReq) && (
                <>
                  <Button size="sm" className={isCancelReq ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled={busy || (isCancelReq && !cp?.lineIds?.length)} onClick={() => onReview(po._id, 'approve', '', isCancelReq ? 'cancellation' : 'approval')}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />{isCancelReq ? (cp?.kind === 'ShortClose' ? 'Approve short close' : 'Approve cancellation') : 'Approve'}
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setShowReject(v => !v)}>
                    <XCircle className="h-4 w-4 mr-1.5" />{isCancelReq ? 'Keep the PO' : 'Reject'}
                  </Button>
                </>
              )}
            </div>
            {(isPending || isCancelReq) && showReject && (
              <div className="w-72 space-y-2">
                <Textarea rows={2} className="text-sm" placeholder={isCancelReq ? 'Why keep the PO? (required — Purchase sees this)' : 'Reason (required — Purchase sees this)'} value={reason} onChange={e => setReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
                  <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={() => onReview(po._id, 'reject', reason.trim(), isCancelReq ? 'cancellation' : 'approval')}>{isCancelReq ? 'Confirm — keep the PO' : 'Confirm Reject'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {open && (
          <div className="mt-3 border-t pt-3 space-y-3 text-sm">
            {isCancelReq && openCancel && (
              <div className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2 space-y-1 text-xs">
                <p className="text-[11px] uppercase text-gray-500 font-semibold">{cp?.kind === 'ShortClose' ? 'Short close requested' : 'Cancellation requested'}</p>
                <p className="text-gray-800">
                  <span className="font-medium">Why:</span> {(openCancel.reasons || []).join(', ')}{openCancel.note ? ` — "${openCancel.note}"` : ''}
                  {' '}<span className="text-gray-500">({openCancel.side === 'Vendor' ? "vendor's side — their quote won't be reused" : 'our side'})</span>
                </p>
                <p className="text-gray-600">Asked by {who(openCancel.requestedBy)} · {openCancel.requestedAt ? new Date(openCancel.requestedAt).toLocaleString() : ''}</p>
                {!cp?.lineIds?.length ? (
                  <p className="text-red-700">Everything has been received since it was asked — nothing is left to cancel. Keep the PO.</p>
                ) : (
                  <p className="text-gray-700">
                    {cp.kind === 'ShortClose' ? "Cancels only what isn't received: " : 'Cancels every line: '}
                    {(po.items || []).filter(l => cancelLineIds.has(String(l._id))).map(l => l.itemName).join(', ')}.
                    {Object.keys(cp.requests || {}).length > 0 && (
                      <> Requests {Object.entries(cp.requests).map(([id, rid]) => `${rid}${(openCancel.closeRequests || []).map(String).includes(id) ? ' (no longer needed)' : ''}`).join(', ')} go back to RFQ/PO unless marked.</>
                    )}
                  </p>
                )}
                {cp?.invoice && (
                  <p className="text-gray-700">
                    Invoice {cp.invoice.invoiceNo}: {inr(cp.invoice.totalAmount)}
                    {cp.invoice.paidAmount > 0
                      ? <span className="text-amber-800 font-medium"> — {inr(cp.invoice.paidAmount)} already paid; what's paid above the new total becomes a credit with the vendor.</span>
                      : ' — nothing paid yet.'}
                  </p>
                )}
              </div>
            )}
            {(po.cancellations || []).filter(c => c.status !== 'Requested').map((c, ci) => (
              <p key={c._id || ci} className={`text-xs ${c.status === 'Approved' ? 'text-red-700' : 'text-gray-500'}`}>
                {c.status === 'Approved' ? (c.kind === 'ShortClose' ? 'Short closed' : 'Cancelled') : 'Cancellation refused'} by {who(c.reviewedBy)}{c.reviewedAt ? ` on ${new Date(c.reviewedAt).toLocaleDateString()}` : ''} — {(c.reasons || []).join(', ')}{c.note ? ` (${c.note})` : ''}{c.remarks ? `. Remarks: "${c.remarks}"` : ''}{c.invoiceNote ? `. ${c.invoiceNote}` : ''}
              </p>
            ))}
            {po.selectionCheck && (
              <div className={`rounded-md border px-3 py-2 ${po.selectionCheck.passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                <p className="text-[11px] uppercase text-gray-500 font-semibold mb-1">Vendor selection check{po.selectionCheck.checkedAt ? <span className="normal-case font-normal text-gray-400"> · as at {new Date(po.selectionCheck.checkedAt).toLocaleString()}</span> : null}</p>
                <SelectionCheckDetails check={po.selectionCheck} />
              </div>
            )}
            <QuoteTermsChangeDetails check={po.quoteTermsCheck} />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] uppercase text-gray-400 text-left">
                    <th className="font-semibold pb-1">Item</th>
                    <th className="font-semibold pb-1 text-right">Qty × Rate</th>
                    <th className="font-semibold pb-1 text-right">GST</th>
                    <th className="font-semibold pb-1 text-right">Amount</th>
                    <th className="font-semibold pb-1 text-right pl-3">Bought before</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.items || []).map((l, i) => (
                    <tr key={l._id || i} className="border-t">
                      <td className="py-1">{l.itemName}{l.item?.code ? <span className="font-mono text-[11px] text-blue-600 ml-1">{l.item.code}</span> : null}</td>
                      <td className="py-1 text-right">{l.quantity} {l.purchaseUnit || ''} × {inr(l.unitPrice)}</td>
                      <td className="py-1 text-right">{l.gstInclusive ? 'incl. in rate' : `${l.gstRate || 0}% = ${inr(l.gstAmount)}`}</td>
                      <td className="py-1 text-right">{inr((l.totalPrice || 0) + (l.gstAmount || 0))}</td>
                      <td className="py-1 text-right pl-3">
                        {l.priceCheck
                          ? <BoughtBeforeTag compact history={l.priceCheck.history} vendorId={po.supplier?._id} vendorName={po.supplier?.supplierName} itemName={l.itemName} unit={l.purchaseUnit} quotePrice={l.priceCheck.comparablePrice} warnAt={warnAt} />
                          : <span className="text-[11px] text-gray-400">Never bought before</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(po.charges || []).length > 0 && (
              <div>
                <p className="text-[11px] uppercase text-gray-400 font-semibold mb-1">Charges</p>
                {po.charges.map((c, i) => (
                  <div key={i} className="flex justify-between text-gray-700">
                    <span>{c.label}{c.gstPercent ? ` (+${c.gstPercent}% GST)` : ''}</span>
                    <span>{inr((c.amount || 0) + (c.gstAmount || 0))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-gray-600 max-w-md">
              <span>Goods</span><span className="text-right">{inr(goods)}</span>
              <span>GST on items</span><span className="text-right">{inr(lineGst)}</span>
              <span>Charges</span><span className="text-right">{inr(po.chargesTotal)}</span>
              <span>GST on charges</span><span className="text-right">{inr(po.chargesGstTotal)}</span>
              {po.gstSplit && (lineGst + (po.chargesGstTotal || 0)) > 0 && (
                <><span>GST split</span><GstSplitNote className="text-right text-xs" split={po.gstSplit} gstAmount={lineGst + (po.chargesGstTotal || 0)} /></>
              )}
              <span className="font-semibold text-gray-900 border-t pt-1">Total</span><span className="text-right font-semibold text-gray-900 border-t pt-1">{inr(po.grandTotal)}</span>
            </div>
            <div>
              <p className="text-[11px] uppercase text-gray-400 font-semibold mb-1">Payment terms</p>
              <p className="text-gray-700">
                Advance {terms.advancePercent != null ? `${terms.advancePercent}%` : '—'} · Credit {terms.creditDays != null ? `${terms.creditDays} days` : '—'}
                {(terms.others || []).map(o => ` · ${o.label}: ${o.value}`).join('')}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Transport: {po.transportBy === 'Company' ? 'we pick up' : 'vendor delivers'}</p>
            </div>
          </div>
        )}
        <PoHistoryDialog open={poHistoryOpen} onOpenChange={setPoHistoryOpen} poId={po._id} poNumber={po.purchaseOrderNumber} vendorName={po.supplier?.supplierName} />
      </CardContent>
    </Card>
  );
}

export default function PoApprovalsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('Pending');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [historyPo, setHistoryPo] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['po-approvals', status, page, limit],
    queryFn: () => apiRequest('GET', `/api/po-approvals?status=${status}&page=${page}&limit=${limit}`),
  });
  const purchases = data?.purchases || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: purchases.length };

  const reviewM = useMutation({
    mutationFn: ({ id, decision, remarks, kind }) => apiRequest('PUT', `/api/po-approvals/${id}/${kind === 'cancellation' ? 'cancel-review' : 'review'}`, { decision, remarks }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['po-approvals'] });
      const title = vars.kind === 'cancellation'
        ? (vars.decision === 'approve' ? 'Cancellation approved' : 'PO kept')
        : (vars.decision === 'approve' ? 'PO approved' : 'PO rejected');
      toast({ title, description: res?.message || 'Purchase has been notified.' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const changeStatus = (s) => { setStatus(s); setPage(1); };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Every purchase order. <b>Pending</b> — above your approval limit (set in Settings), or Purchase chose a vendor that failed the selection check (not enough vendors asked, or another vendor quoted it for less); they don't exist as orders until you approve them. Pending also shows Purchase's requests to <b>cancel</b> a PO.
        <b> Approved</b> — POs you approved and POs Purchase created directly within the limit.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {STATUS_TABS.map(s => (
            <button
              key={s} type="button" onClick={() => changeStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="text-xs text-gray-500 flex items-center gap-1.5">
          Per page
          <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} className="border rounded-md px-2 py-1 text-xs bg-white">
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Clock className="h-8 w-8 mx-auto mb-2" /><p className="text-sm">No {status.toLowerCase()} POs.</p></div>
      ) : (
        purchases.map(po => (
          <POCard key={po._id} po={po} busy={reviewM.isPending} warnAt={data?.priceJumpWarnPercent ?? 10} onHistory={setHistoryPo} onReview={(id, decision, remarks, kind) => reviewM.mutate({ id, decision, remarks, kind })} />
        ))
      )}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} POs)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}>Next</Button>
        </div>
      )}
      <QuoteHistoryDialog
        open={!!historyPo}
        onOpenChange={(v) => { if (!v) setHistoryPo(null); }}
        endpoint={historyPo ? `/api/po-approvals/${historyPo._id}/quote-history` : null}
        title={historyPo ? `All quotes — ${historyPo.purchaseOrderNumber} (${historyPo.supplier?.supplierName || 'vendor'})` : ''}
        vendorId={historyPo?.supplier?._id || null}
        vendorName={historyPo?.supplier?.supplierName || ''}
      />
    </div>
  );
}
