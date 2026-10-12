import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Receipt, RotateCw, Search, X, Package, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SelectionCheckDetails, SelectionCheckLine } from './SelectionCheck';
import { GstSplitNote } from './GstSplit';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const toneClass = {
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
};

const poStatusColor = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Sent: 'bg-blue-100 text-blue-700 border-blue-200',
  Acknowledged: 'bg-amber-100 text-amber-700 border-amber-200',
  'Partially Received': 'bg-orange-100 text-orange-700 border-orange-200',
  Received: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 border-amber-300',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};
const paymentStatusColor = {
  'Pending': 'bg-slate-100 text-slate-600 border-slate-200',
  'Partially Paid': 'bg-amber-100 text-amber-700 border-amber-200',
  'Paid': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Overdue': 'bg-red-100 text-red-700 border-red-200',
  'Cancelled': 'bg-slate-100 text-slate-400 border-slate-200',
};

export const ACTIVE_STATUSES = ['Draft', 'Sent', 'Acknowledged', 'Partially Received'];
export const DONE_STATUSES = ['Received', 'Cancelled'];
// Purchase's own Purchase Orders tab also shows POs waiting for / refused
// Company Admin approval (procurement-v2). Store keeps the two lists above
// — it never sees a PO that isn't a real order yet.
export const PURCHASE_ACTIVE_STATUSES = ['Pending Approval', ...ACTIVE_STATUSES];
export const PURCHASE_DONE_STATUSES = [...DONE_STATUSES, 'Rejected'];

// A PO line's linked PR(s) — one line can carry several since the item-wise
// PR consolidation redesign (2026-10). Mirrors purchaseController.js's own
// prIdsOf exactly (frontend has no access to that backend helper).
function prIdsOf(line) {
  return line.purchaseRequests?.length ? line.purchaseRequests : (line.purchaseRequest ? [line.purchaseRequest] : []);
}

// Expected receipts (2026-10-10): which calendar-day bucket a live, not yet
// received line falls in — same rule as the server's
// services/deliveryFollowUpService.js (due soon = the next 3 days).
const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
// A PO with an advance has no dates until the full advance is paid — the
// vendor's delivery days count from that day (2026-10-12).
export const awaitingAdvance = (po) => po?.deliveryClock?.startsOn === 'advance' && !po.deliveryClock.startedAt;
function lineDue(it, po, isReceived) {
  if (it.cancelled?.at || isReceived) return null;
  if (awaitingAdvance(po)) return { bucket: 'advance', days: it.deliveryDays || null };
  const date = it.expectedDeliveryDate || po.expectedDeliveryDate;
  if (!date) return null;
  const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / DAY_MS);
  if (diff < 0) return { bucket: 'overdue', date, days: -diff };
  if (diff === 0) return { bucket: 'today', date, days: 0 };
  if (diff <= 3) return { bucket: 'soon', date, days: diff };
  return { bucket: 'later', date, days: diff };
}
const lineIsReceived = (it) => {
  const refs = prIdsOf(it);
  return refs.length > 0 && refs.every(pr => pr?.status === 'Received');
};
const shortDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
function DueBadge({ due }) {
  if (!due) return null;
  const map = {
    overdue: ['bg-red-50 text-red-700 border-red-200', `Overdue · ${due.days} day${due.days === 1 ? '' : 's'}`],
    today: ['bg-amber-50 text-amber-800 border-amber-200', 'Due today'],
    soon: ['bg-sky-50 text-sky-700 border-sky-200', `Due ${shortDay(due.date)}`],
    later: ['bg-slate-50 text-slate-500 border-slate-200', `Due ${shortDay(due.date)}`],
    advance: ['bg-violet-50 text-violet-700 border-violet-200', due.days ? `Waiting for advance · ${due.days} days after` : 'Waiting for advance'],
  };
  const [cls, label] = map[due.bucket];
  const title = due.bucket === 'advance'
    ? 'The delivery days start when the advance is paid'
    : `Expected ${new Date(due.date).toLocaleDateString('en-IN')}`;
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${cls}`} title={title}>{label}</span>;
}
const DUE_CHIPS = [
  { value: '', label: 'All' },
  { value: 'overdue', label: 'Overdue', tone: 'text-red-700' },
  { value: 'today', label: 'Due today', tone: 'text-amber-800' },
  { value: 'soon', label: 'Due in 3 days', tone: 'text-sky-700' },
];

// Shared "group by PO, expand to lines" view (2026-10) — originally built
// for ByVendorTab.jsx's own Active POs/Order History tabs (read-only,
// Accounts-only), extracted here so Store's receive page can reuse the
// exact same grouping instead of its old flat per-PR table. `apiBase` lets
// each caller point at its own permission-scoped listing endpoint (Accounts
// uses /api/accounts/purchases/orders; Store can't reach that router at
// all, so it uses /api/purchase-requests/orders — same getPurchases
// controller underneath, see getPurchaseOrdersForStore). `renderLineAction`
// is optional — when a caller passes it, it renders inside each expanded
// line row (Store's receive button); omitted entirely, this behaves
// exactly as ByVendorTab.jsx's original read-only view always has.
// `renderPoActions(po, reload)` is optional too — buttons at the foot of an
// expanded PO (Purchase's All quotes / Send PO email, procurement-v2).
export default function PurchaseOrderList({
  scopeStatuses, emptyMessage, expandPONumber,
  apiBase = '/api/accounts/purchases/orders',
  renderLineAction = null,
  renderPoActions = null,
  // Expected receipts (2026-10-10): Overdue / Due today / Due in 3 days chips.
  showDueFilter = false,
}) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  // Ask the server once typing pauses, not on every key (2026-10-10).
  const searchText = useDebouncedValue(searchTerm.trim(), 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [dueCounts, setDueCounts] = useState(null);
  const [expanded, setExpanded] = useState(null); // Purchase _id

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status: statusFilter || scopeStatuses.join(',') });
      if (searchText) params.set('search', searchText);
      if (showDueFilter && dueFilter) params.set('due', dueFilter);
      const res = await apiRequest('GET', `${apiBase}?${params.toString()}`);
      setPurchases(res?.purchases || []);
      setDueCounts(res?.dueCounts || null);
      setPagination(res?.pagination || { page: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, searchText, statusFilter, dueFilter]);
  // A PO just created/landed elsewhere in this tab (see onPOCreated) auto-
  // expands here so Purchase actually sees it, instead of having to go find it.
  useEffect(() => {
    if (!expandPONumber) return;
    const match = purchases.find(p => p.purchaseOrderNumber === expandPONumber);
    if (match) setExpanded(match._id);
  }, [expandPONumber, purchases]);

  const changeSearch = (value) => { setSearchTerm(value); setPage(1); };
  const changeStatus = (value) => { setStatusFilter(value); setPage(1); };
  const anyFilterActive = searchTerm || statusFilter;
  const clearFilters = () => { setSearchTerm(''); setStatusFilter(''); setPage(1); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by PO number..." value={searchTerm} onChange={e => changeSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => changeStatus(e.target.value)} className="border rounded-md p-2 text-sm bg-white">
          <option value="">All ({scopeStatuses.join(' / ')})</option>
          {scopeStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {anyFilterActive && (
          <button type="button" onClick={clearFilters} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
        <Button size="sm" variant="outline" className="ml-auto" onClick={load}><RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      {showDueFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          {DUE_CHIPS.map(c => {
            const n = c.value ? (dueCounts?.[c.value] || 0) : null;
            const active = dueFilter === c.value;
            return (
              <button
                key={c.value || 'all'} type="button" onClick={() => { setDueFilter(c.value); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${active ? 'bg-slate-800 text-white border-slate-800' : `bg-white border-slate-200 hover:border-slate-400 ${c.tone || 'text-slate-600'}`}`}
              >
                {c.label}{n != null ? ` (${n})` : ''}
              </button>
            );
          })}
          <span className="text-[11px] text-slate-400 ml-1">POs with a line in each window, by its expected date.</span>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading...</div>
          ) : purchases.length === 0 ? (
            <div className="py-16 text-center text-slate-400">{emptyMessage}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map(po => {
                  const isOpen = expanded === po._id;
                  return (
                    <React.Fragment key={po._id}>
                      <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(isOpen ? null : po._id)}>
                        <TableCell className="font-mono text-xs flex items-center gap-1.5">
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          {po.purchaseOrderNumber}
                        </TableCell>
                        <TableCell>{po.supplier?.supplierName || '—'}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{awaitingAdvance(po) ? <span className="text-violet-700">After advance</span> : po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={po.transportBy === 'Company' ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>
                            {po.transportBy === 'Company' ? <Truck className="w-3 h-3 mr-1" /> : null}
                            {po.transportBy === 'Company' ? 'We pick up' : 'Vendor delivers'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={poStatusColor[po.status] || ''}>{po.status}</Badge>
                          {(po.cancellations || []).some(c => c.status === 'Requested') && <Badge variant="outline" className="ml-1 bg-red-50 text-red-700 border-red-200">Cancel requested</Badge>}
                          {po.status !== 'Cancelled' && (po.items || []).some(it => lineDue(it, po, lineIsReceived(it))?.bucket === 'overdue') && <Badge variant="outline" className="ml-1 bg-red-50 text-red-700 border-red-200">Overdue</Badge>}
                          {(po.cancellations || []).some(c => c.status === 'Approved' && c.kind === 'ShortClose') && <Badge variant="outline" className="ml-1 bg-slate-50 text-slate-600 border-slate-200">Short closed</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={paymentStatusColor[po.paymentStatus] || ''}>{po.paymentStatus}</Badge>
                          {awaitingAdvance(po) && po.status !== 'Cancelled' && <Badge variant="outline" className="ml-1 bg-violet-50 text-violet-700 border-violet-200">Advance due</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-800">{inr(po.grandTotal)}</TableCell>
                        <TableCell className="text-right text-slate-500">{po.items?.length || 0}</TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-slate-50 p-4">
                            <div className="space-y-2">
                              <div className="border rounded-md divide-y bg-white">
                                {(po.items || []).map((it, i) => {
                                  // Real per-line receive status (2026-10) —
                                  // it.receivedQuantity is dead for any PO
                                  // made through the new quote->batch flow
                                  // (only the old RFQ-era receive endpoint
                                  // ever wrote it); the linked
                                  // PurchaseRequest(s)' own status is the
                                  // real signal. Item-wise PR consolidation
                                  // (2026-10) — a line can now carry SEVERAL
                                  // PRs (purchaseRequests, plural) instead
                                  // of just one; "Received" means every PR
                                  // on this line is, not just one — still
                                  // binary per PR (a PR receives in one
                                  // status transition, not several partial
                                  // rounds), just aggregated across more
                                  // than one PR when a line has them.
                                  const prRefs = prIdsOf(it);
                                  const receivedCount = prRefs.filter(pr => pr?.status === 'Received').length;
                                  const isReceived = prRefs.length > 0 && receivedCount === prRefs.length;
                                  // Cancelled line (gap 13: the whole PO, or a short close) —
                                  // kept for the record, never received.
                                  const isCancelled = !!it.cancelled?.at;
                                  const receiveCls = isCancelled
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : isReceived
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                    : prRefs.length
                                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                                      : 'bg-slate-100 text-slate-400 border-slate-200';
                                  // "N/M received" — explicitly PRs, not
                                  // pieces/kg, since those live in the
                                  // quantity shown right next to this badge
                                  // and the two numbers can look alike at a
                                  // glance (e.g. "400 Kilogram" vs "0/12
                                  // PRs" for the very same line).
                                  const receiveLabel = isCancelled
                                    ? 'Cancelled'
                                    : isReceived
                                    ? 'Received'
                                    : prRefs.length > 1
                                      ? `${receivedCount}/${prRefs.length} PRs received`
                                      : prRefs.length
                                        ? 'Awaiting receipt'
                                        : 'Unlinked';
                                  // A line itself has no purchase-unit field
                                  // (just quantity/unitPrice) — read it off
                                  // whichever linked PR has one, since that
                                  // gets synced back at batch time.
                                  const lineUnit = it.purchaseUnit || prRefs.find(pr => pr?.purchaseUnit)?.purchaseUnit || '';
                                  const due = po.status === 'Cancelled' ? null : lineDue(it, po, isReceived);
                                  const lastRevision = (it.deliveryDateHistory || []).slice(-1)[0];
                                  return (
                                    <div key={i} className="flex flex-wrap items-center justify-between px-3 py-2 text-sm gap-x-3 gap-y-1">
                                      <span className="flex items-center gap-1.5 min-w-0">
                                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className={`truncate ${isCancelled ? 'line-through text-slate-400' : ''}`}>{it.itemName}</span>
                                        <DueBadge due={due} />
                                      </span>
                                      <span className="flex items-center gap-2 shrink-0">
                                        <span className="text-slate-600">{it.quantity} {lineUnit} × {inr(it.unitPrice)}{it.itemChargesTotal > 0 ? ` + ${inr(it.itemChargesTotal)} charges` : ''}{it.gstInclusive ? ' (incl. GST)' : it.gstRate ? ` + ${it.gstRate}% GST` : ''} = {inr(it.totalPrice + (it.itemChargesTotal || 0) + (it.gstAmount || 0))}</span>
                                        <Badge variant="outline" className={`text-[10px] ${receiveCls}`}>{receiveLabel}</Badge>
                                        {renderLineAction && !isCancelled && po.status !== 'Cancelled' && renderLineAction(it, po, { isReceived, prRefs })}
                                      </span>
                                      {lastRevision && (
                                        <p className="basis-full text-[11px] text-slate-500 pl-5">
                                          Date changed{lastRevision.from ? ` from ${shortDay(lastRevision.from)}` : ''} to {shortDay(lastRevision.to)} — {lastRevision.reason}
                                          {it.deliveryDateHistory.length > 1 ? ` (changed ${it.deliveryDateHistory.length} times)` : ''}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {po.poCharges?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {po.poCharges.map((c, i) => (
                                    <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${c.waived ? toneClass.good : toneClass.warn}`}>
                                      <Receipt className="w-3 h-3" /> {c.name}{c.waived ? ' waived' : `: ${inr(c.amount)}`}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* PO-time charges (procurement-v2) — typed on the PO, whole-PO. */}
                              {po.charges?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {po.charges.map((c, i) => (
                                    <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${toneClass.warn}`}>
                                      <Receipt className="w-3 h-3" /> {c.label}: {inr(c.amount)}{c.gstPercent ? ` + ${c.gstPercent}% GST` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {po.paymentTerms && (po.paymentTerms.advancePercent != null || po.paymentTerms.creditDays != null || po.paymentTerms.others?.length > 0) && (
                                <p className="text-xs text-slate-600">
                                  <span className="font-medium">Payment terms:</span>
                                  {' '}Advance {po.paymentTerms.advancePercent != null ? `${po.paymentTerms.advancePercent}%` : '—'}
                                  {po.deliveryClock?.startedAt && po.deliveryClock.startsOn === 'advance' ? ` (paid ${shortDay(po.deliveryClock.startedAt)})` : ''}
                                  {' · '}Credit {po.paymentTerms.creditDays ? `${po.paymentTerms.creditDays} days after everything passes QC` : 'none (pay when everything passes QC)'}
                                  {(po.paymentTerms.others || []).map(o => ` · ${o.label}: ${o.value}`).join('')}
                                </p>
                              )}
                              {po.status === 'Pending Approval' && (
                                <p className="text-xs text-amber-700">
                                  Waiting for Company Admin approval — {(() => {
                                    // POs from before 2026-10-09 saved no reasons: those were all the ₹ limit.
                                    const reasons = po.approval?.reasons?.length ? po.approval.reasons : ['threshold'];
                                    return [
                                      reasons.includes('threshold') ? `total above the ₹${Number(po.approval?.threshold || 0).toLocaleString('en-IN')} limit` : null,
                                      reasons.includes('selection') ? 'vendor selection exception' : null,
                                    ].filter(Boolean).join(' + ');
                                  })()}. Not sent to the vendor or Store yet.
                                </p>
                              )}
                              {/* Vendor selection check saved on the PO (gap 12, 2026-10-09) */}
                              {po.selectionCheck && (po.selectionCheck.passed
                                ? <p><SelectionCheckLine check={po.selectionCheck} /></p>
                                : (
                                  <div className="rounded-md border border-rose-200 bg-rose-50/50 px-3 py-2">
                                    <p className="text-[11px] uppercase text-slate-500 font-semibold mb-1">Vendor selection check</p>
                                    <SelectionCheckDetails check={po.selectionCheck} />
                                  </div>
                                ))}
                              {/* Cancellations (gap 13) — every request, newest first. */}
                              {[...(po.cancellations || [])].reverse().map((c, ci) => (
                                <p key={c._id || ci} className={`text-xs ${c.status === 'Approved' ? 'text-red-700' : c.status === 'Requested' ? 'text-amber-700' : 'text-slate-500'}`}>
                                  {c.status === 'Requested'
                                    ? <>Cancellation asked {fmtDate(c.requestedAt)} — waiting for the Company Admin. Store can still receive meanwhile.</>
                                    : c.status === 'Approved'
                                      ? <>{c.kind === 'ShortClose' ? 'Short closed' : 'Cancelled'} {fmtDate(c.reviewedAt)} (approved by the Company Admin){c.invoiceNote ? ` — ${c.invoiceNote}` : ''}{c.emailSent ? ' Vendor emailed.' : ' Vendor NOT emailed.'}</>
                                      : <>Cancellation refused {fmtDate(c.reviewedAt)}{c.remarks ? `: "${c.remarks}"` : ''}.</>}
                                  {' '}<span className="text-slate-500">Reason: {(c.reasons || []).join(', ')}{c.note ? ` — ${c.note}` : ''} ({c.side === 'Vendor' ? "vendor's side" : 'our side'})</span>
                                </p>
                              ))}
                              {po.status === 'Rejected' && (
                                <p className="text-xs text-red-700">Rejected by the Company Admin{po.approval?.remarks ? `: ${po.approval.remarks}` : ''}. Its items are free to quote / order again on RFQ/PO.</p>
                              )}
                              <p className="text-xs text-slate-500">
                                Goods {inr(po.totalAmount)} + GST {inr((po.taxAmount || 0) + (po.chargesGstTotal || 0))} + Charges {inr((po.chargesTotal || 0) + (po.poChargesTotal || 0) + (po.items || []).reduce((s, it) => s + (it.itemChargesTotal || 0), 0))} = <strong>{inr(po.grandTotal)}</strong>
                                {/* Point 15: how that GST splits (fixed when the PO was created). */}
                                {po.gstSplit && ((po.taxAmount || 0) + (po.chargesGstTotal || 0)) > 0 && (
                                  <> · <GstSplitNote split={po.gstSplit} gstAmount={(po.taxAmount || 0) + (po.chargesGstTotal || 0)} /></>
                                )}
                              </p>
                              {renderPoActions && <div className="flex flex-wrap items-center gap-2 pt-1">{renderPoActions(po, load)}</div>}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
          <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} orders)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}>Next</Button>
        </div>
      )}
    </div>
  );
}
