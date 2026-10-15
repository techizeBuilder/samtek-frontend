import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { Search, Info, FlaskConical, Wrench, Shield, Quote, ClipboardList, Hourglass, PackageCheck, X } from 'lucide-react';
import { fabricationPieceCount } from '@/lib/fabricationDims';

// Purchase-facing PR list — a fresh component, not a refactor of
// PurchaseRequest.jsx (that file is shared with Store's own
// /store/purchases/requests route and stays untouched). Shows each PR's
// live quote status (No Quotes / N Quotes / In Batch PO) computed from the
// new quote endpoints rather than a stored status, so nothing here needs an
// enum migration.
const statusColor = {
  Pending: 'bg-slate-100 text-slate-700 border-slate-200',
  Approved: 'bg-amber-100 text-amber-700 border-amber-200',
  Ordered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Received: 'bg-blue-100 text-blue-700 border-blue-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
};

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Pending', 'Approved', 'Ordered', 'Received', 'Rejected'];
// A request "Rejected" was closed without being bought — Store refused it, a
// cancelled PO's "no longer needed", or a replacement withdrawn. Shown as
// "Closed" + its reason so it isn't mistaken for a QC rejection (2026-10-15).
const statusLabel = (s) => (s === 'Rejected' ? 'Closed' : s);

// What actually raised this PR — requestFromDepartment is NOT this: every
// real creation path hardcodes it to 'Store' (confirmed in
// purchaseRequestController.js — see classifyRaisedBy there), so a
// Department filter/column was always going to show "Store" for nearly
// everything regardless of real origin. This is computed server-side from
// the fields each path actually sets distinctly (pr.raisedBy, attached by
// getPurchaseRequests).
export const RAISED_BY_META = {
  autoReorder: { label: 'Auto Reorder (Low Stock)', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  cascade: { label: 'Production Shortfall', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  salesOrder: { label: 'Sales Order', cls: 'bg-teal-100 text-teal-700 border-teal-200' },
  manual: { label: 'Manual (Store Transfer)', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  qcExchange: { label: 'QC Exchange/Return', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export default function PurchaseRequestsTab({ onGoToQuote }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // Ask the server once typing pauses, not on every key (2026-10-10).
  const searchText = useDebouncedValue(searchTerm.trim(), 400);
  // Status/Department/Priority are real DB fields — filtered server-side
  // (same query-param pattern RFQ Management already used for status), so
  // pagination/totals stay correct instead of only reflecting whatever's on
  // the current page. Quote Status below is different: it's computed, not
  // stored (see quoteStatusFor), so it can only ever filter what's already
  // loaded on the current page — a real limitation, not a bug, same
  // "pragmatic for now" tradeoff already made for By Item/By Vendor's
  // client-side pagination.
  const [statusFilter, setStatusFilter] = useState('');
  const [raisedByFilter, setRaisedByFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState(null); // null | 'noQuote' | 'quoted' | 'batched'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [quoteCounts, setQuoteCounts] = useState({}); // prId -> count
  const [specsPR, setSpecsPR] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchText, page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (raisedByFilter) params.set('raisedBy', raisedByFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      const res = await apiRequest('GET', `/api/purchase-requests?${params.toString()}`);
      const list = res?.purchaseRequests || res?.data || [];
      setRequests(list);
      setPagination(res?.pagination || { page: 1, pages: 1, total: list.length });
      // Quote counts resolved per-PR, in parallel — only for the current
      // page's rows now that this is server-paginated, not the whole table.
      const entries = await Promise.all(list.map(async (pr) => {
        try {
          const qres = await apiRequest('GET', `/api/purchase-requests/${pr._id}/quotes`);
          return [pr._id, (qres?.data || []).length];
        } catch {
          return [pr._id, 0];
        }
      }));
      setQuoteCounts(Object.fromEntries(entries));
    } catch (err) {
      console.error('Failed to load purchase requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); /* eslint-disable-next-line */ }, [searchText, statusFilter, raisedByFilter, priorityFilter, page]);
  const changeSearch = (value) => { setSearchTerm(value); setPage(1); };
  const changeFilter = (setter) => (value) => { setter(value); setPage(1); };

  const quoteStatusFor = (pr) => {
    if (pr.purchaseOrder) return { key: 'batched', label: 'In Batch PO', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    const n = quoteCounts[pr._id] || 0;
    if (n === 0) return { key: 'noQuote', label: 'No Quotes', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
    return { key: 'quoted', label: `${n} Quote${n > 1 ? 's' : ''}`, cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  const noQuoteCount = requests.filter(pr => !pr.purchaseOrder && !(quoteCounts[pr._id] > 0)).length;
  const quotedCount = requests.filter(pr => !pr.purchaseOrder && quoteCounts[pr._id] > 0).length;
  const batchedCount = requests.filter(pr => pr.purchaseOrder).length;
  const toggleQuoteFilter = (key) => setQuoteStatusFilter(f => f === key ? null : key);
  const visibleRequests = quoteStatusFilter ? requests.filter(pr => quoteStatusFor(pr).key === quoteStatusFilter) : requests;

  const anyFilterActive = searchTerm || statusFilter || raisedByFilter || priorityFilter || quoteStatusFilter;
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setRaisedByFilter('');
    setPriorityFilter('');
    setQuoteStatusFilter(null);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Clicking a card filters the table below to that quote status —
          computed client-side, so it only ever narrows what's on the
          current page (see the note on quoteStatusFilter above). */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'noQuote', label: 'No Quotes Yet', value: noQuoteCount, icon: Hourglass, color: 'text-slate-500', bg: 'bg-slate-100', ring: 'ring-slate-400' },
          { key: 'quoted', label: 'Quoted', value: quotedCount, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-400' },
          { key: 'batched', label: 'In Batch PO', value: batchedCount, icon: PackageCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-400' },
        ].map((s, i) => (
          <Card
            key={i}
            role="button"
            onClick={() => toggleQuoteFilter(s.key)}
            className={`border-none shadow-sm cursor-pointer transition-shadow hover:shadow-md ${quoteStatusFilter === s.key ? `ring-2 ${s.ring}` : ''}`}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.bg} p-2.5 rounded-lg`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by product, PR id, or item code..." value={searchTerm} onChange={e => changeSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => changeFilter(setStatusFilter)(e.target.value)} className="border rounded-md p-2 text-sm bg-white">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={raisedByFilter} onChange={e => changeFilter(setRaisedByFilter)(e.target.value)} className="border rounded-md p-2 text-sm bg-white">
          <option value="">All origins</option>
          {Object.entries(RAISED_BY_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => changeFilter(setPriorityFilter)(e.target.value)} className="border rounded-md p-2 text-sm bg-white">
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {anyFilterActive && (
          <button type="button" onClick={clearFilters} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No purchase requests found.</div>
          ) : visibleRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              None on this page match that Quote Status — try Next page, or clear the Quote Status filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Raised By</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quotes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRequests.map(pr => {
                  const qs = quoteStatusFor(pr);
                  return (
                    <TableRow key={pr._id}>
                      <TableCell className="font-mono text-xs">{pr.requestId}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {pr.item?.code || pr.materialCode || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {pr.productName}
                          {pr.item && (
                            <button type="button" onClick={() => setSpecsPR(pr)} className="text-slate-400 hover:text-blue-600">
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {pr.fabricationDimensionLines?.length > 0
                          ? `${fabricationPieceCount(pr.fabricationDimensionLines)} Pieces`
                          : `${pr.quantity} ${pr.unit || ''}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={RAISED_BY_META[pr.raisedBy]?.cls || ''}>
                          {RAISED_BY_META[pr.raisedBy]?.label || pr.raisedBy}
                        </Badge>
                      </TableCell>
                      <TableCell>{pr.priority}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor[pr.status] || ''} title={pr.status === 'Rejected' ? (pr.rejectionReason || 'Closed without being bought') : undefined}>{statusLabel(pr.status)}</Badge>
                        {pr.status === 'Rejected' && pr.rejectionReason && (
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px] truncate" title={pr.rejectionReason}>{pr.rejectionReason}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={qs.cls}>{qs.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!pr.purchaseOrder && pr.status !== 'Rejected' && (
                          // "Vendor Quotation" (client design change D4) — opens
                          // RFQ/PO with this request's item already picked.
                          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" onClick={() => onGoToQuote?.(pr.item?._id || null)}>
                            <Quote className="w-3.5 h-3.5 mr-1" /> Vendor Quotation
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
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
          <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} requests)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}>Next</Button>
        </div>
      )}

      {/* R&D Specifications — migrated from RFQManagement.jsx verbatim, the
          only place this information was shown before. */}
      <Dialog open={!!specsPR} onOpenChange={(open) => !open && setSpecsPR(null)}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <FlaskConical className="w-5 h-5 text-blue-600" /> R&D Specifications
            </DialogTitle>
            <DialogDescription>Master Inventory parameters for <strong>{specsPR?.productName}</strong>.</DialogDescription>
          </DialogHeader>
          {specsPR?.item && (
            <div className="space-y-4 py-3">
              {specsPR.item.specifications?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-slate-400" /> Technical Requirements
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-md overflow-hidden text-sm">
                    {specsPR.item.specifications.map((spec, i) => (
                      <div key={i} className="flex border-b border-slate-100 last:border-0">
                        <div className="w-1/3 bg-slate-100 px-3 py-2 text-slate-600 font-medium">{spec.key}</div>
                        <div className="w-2/3 px-3 py-2 text-slate-900">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!specsPR.item.fabricationRef && specsPR.item.warranty?.type && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-400" /> Warranty Requirements
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm grid grid-cols-2 gap-2">
                    <div><span className="text-slate-500 text-xs uppercase block mb-1">Period</span><span className="font-medium text-slate-900">{specsPR.item.warranty.period} Months</span></div>
                    <div><span className="text-slate-500 text-xs uppercase block mb-1">Type</span><span className="font-medium text-slate-900">{specsPR.item.warranty.type}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpecsPR(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
