import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, PackagePlus, ArrowDownToLine } from 'lucide-react';
import NewOutsourceOrderDialog from './NewOutsourceOrderDialog';

// Out Source Work → Requests (outsource-v2 slice 2, 2026-10-20). Every
// outsource request with Purchase — how they arrive is unchanged:
//   - a Sub Child Part with every step Out Source → its job-work order
//     (Purchase only)
//   - a Sub Child Part whose first step is Out Source → its step-0 hand-off
//   - a Child Part / Machine → when Production sends it
// Tick ready requests and make an Outsource Order (D1). The vendor filter
// keeps only the requests whose next step that vendor's Services cover. A
// request that isn't ready says why (ordered on OSO-…, with the vendor, in
// QC, rework). A trip sent before Outsource Orders existed is received here.
// Backend: GET /api/outsource-work/requests (outsourceOrderController.js).
const KIND_LABEL = { SubChildPart: 'Sub Child Part', ChildPart: 'Child Part', Machine: 'Machine' };
const KIND_TONE = {
  SubChildPart: 'bg-teal-50 text-teal-700 border-teal-200',
  ChildPart: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Machine: 'bg-purple-50 text-purple-700 border-purple-200',
};
const LENGTH_UNITS = ['Millimeter', 'Centimeter', 'Meter', 'Inch', 'Foot'];

// A trip sent before Outsource Orders existed (no order) — received with the
// old routes. The server says if a cost or a leftover is needed.
function LegacyReceiveDialog({ view, onClose, onDone }) {
  const { toast } = useToast();
  const [cost, setCost] = useState('');
  const [len, setLen] = useState(''); const [lenUnit, setLenUnit] = useState('Millimeter');
  const [wid, setWid] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const body = {};
    if (cost !== '') body.totalJobWorkCost = Number(cost);
    if (len !== '') Object.assign(body, { leftoverLengthValue: Number(len), leftoverLengthUnit: lenUnit, leftoverWidthValue: wid ? Number(wid) : undefined, leftoverWidthUnit: lenUnit });
    setBusy(true);
    try {
      const url = view.kind === 'jobWork'
        ? `/api/purchase/sub-child-job-work/${view.jobWorkOrder}/rounds/${view.openTrip.roundId}/receive`
        : `/api/outsource-work/orders/${view.productionOrder}/handoffs/${view.handoffId}/rounds/${view.openTrip.roundId}/receive`;
      await apiRequest('PUT', url, body);
      toast({ title: 'Received', description: `${view.orderCode} received.` });
      onDone();
    } catch (e) {
      toast({ title: 'Receive failed', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Receive {view.orderCode}</DialogTitle>
          <DialogDescription>Sent before Outsource Orders existed. Fill the cost / leftover only if this receive asks for them.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {view.kind === 'jobWork' && (
            <div><label className="text-xs text-slate-600">Total job work cost (if this finishes the order)</label><Input type="number" value={cost} onChange={e => setCost(e.target.value)} /></div>
          )}
          <p className="text-xs text-slate-600">Leftover after a whole-sheet send (0 if none):</p>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Length" type="number" value={len} onChange={e => setLen(e.target.value)} />
            <Input placeholder="Width (sheet)" type="number" value={wid} onChange={e => setWid(e.target.value)} />
            <select className="h-9 border rounded px-1 text-sm" value={lenUnit} onChange={e => setLenUnit(e.target.value)}>{LENGTH_UNITS.map(u => <option key={u}>{u}</option>)}</select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white"><ArrowDownToLine className="w-4 h-4 mr-2" />Receive</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Finished requests, 20 a page from the server, newest first (2026-10-23).
function DoneRequests({ searchText, orderKind }) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [searchText, orderKind]);
  const q = useQuery({
    queryKey: ['outsource-requests-done', searchText, orderKind, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchText) p.set('search', searchText);
      if (orderKind) p.set('orderKind', orderKind);
      return apiRequest('GET', `/api/outsource-work/requests/done?${p.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
  const rows = q.data?.data || [];
  const pg = q.data?.pagination || { page: 1, pages: 1, total: 0 };
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-600">Done <span className="font-normal text-slate-400">({pg.total})</span></p>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase">
                <th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Part</th><th className="px-3 py-2.5">From</th>
                <th className="px-3 py-2.5">Steps</th><th className="px-3 py-2.5 text-right">Qty</th><th className="px-3 py-2.5">Finished</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
                : !rows.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No finished requests{searchText ? ' match' : ' yet'}.</td></tr>
                : rows.map(v => (
                  <tr key={v.key} className="border-b align-top">
                    <td className="px-3 py-2.5"><Badge variant="outline" className={KIND_TONE[v.orderKind]}>{KIND_LABEL[v.orderKind] || v.orderKind}</Badge></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-slate-800">{v.itemName}</p><p className="font-mono text-[11px] text-slate-400">{v.itemCode}</p></td>
                    <td className="px-3 py-2.5 text-xs font-mono text-slate-600">{v.orderCode}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{(v.steps || []).join(' › ')}</td>
                    <td className="px-3 py-2.5 text-right">{v.qty} <span className="text-[11px] text-slate-400">{v.qtyUnit}</span></td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{v.doneAt ? new Date(v.doneAt).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {pg.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(x => Math.max(1, x - 1))} disabled={pg.page <= 1}>Previous</Button>
          <span className="text-sm text-slate-500">Page {pg.page} of {pg.pages} ({pg.total})</span>
          <Button variant="outline" size="sm" onClick={() => setPage(x => x + 1)} disabled={pg.page >= pg.pages}>Next</Button>
        </div>
      )}
    </div>
  );
}

// mode (2026-10-21): 'new' = requests still to order (ready) — tick and order;
// 'progress' = requests already on an order (ordered / with the vendor / at
// Store / in QC), plus done ones with "Show done". Same API, split by `ready`.
export default function OutsourceRequestsView({ onOpenOrder, mode = 'new' }) {
  const qc = useQueryClient();
  const { hasFeatureAccess } = usePermissions();
  const isNew = mode === 'new';
  const canPurchaseEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
  const canEdit = canPurchaseEdit && isNew;
  const [search, setSearch] = useState('');
  const [orderKind, setOrderKind] = useState('');
  const [vendorPick, setVendor] = useState('');
  const vendor = isNew ? vendorPick : '';
  const [showDonePick, setShowDone] = useState(false);
  // "Show done" (2026-10-23): finished requests come from their own paged
  // endpoint (DoneRequests below), never mixed into this unpaged list.
  const showDone = !isNew && showDonePick;
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [legacy, setLegacy] = useState(null);
  const searchText = useDebouncedValue(search.trim(), 400);

  const { data, isLoading } = useQuery({
    queryKey: ['outsource-requests', searchText, orderKind, vendor, false],
    queryFn: () => {
      const p = new URLSearchParams();
      if (searchText) p.set('search', searchText);
      if (orderKind) p.set('orderKind', orderKind);
      if (vendor) p.set('vendor', vendor);
      return apiRequest('GET', `/api/outsource-work/requests?${p.toString()}`);
    },
  });
  const views = (data?.data || []).filter(v => (isNew ? v.ready : !v.ready));
  const { data: vendorsResp } = useQuery({
    queryKey: ['outsource-vendors', 'all'],
    queryFn: () => apiRequest('GET', '/api/outsource-work/vendors?all=true'),
  });
  const vendors = vendorsResp?.data || [];
  const selectedViews = useMemo(() => views.filter(v => selected.has(v.key) && v.ready), [views, selected]);
  const toggle = (key) => setSelected(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['outsource-requests'] }); qc.invalidateQueries({ queryKey: ['outsource-orders'] }); };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input placeholder="Search code, name or order…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {isNew && (
              <select className="h-9 border rounded-md px-2 text-sm md:w-64" value={vendor} onChange={e => { setVendor(e.target.value); setSelected(new Set()); }}>
                <option value="">All requests (no vendor filter)</option>
                {vendors.map(v => <option key={v._id} value={v._id}>Requests {v.supplierName} can do</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {['', 'SubChildPart', 'ChildPart', 'Machine'].map(k => (
              <button key={k || 'all'} type="button" onClick={() => setOrderKind(k)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${orderKind === k ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {k ? KIND_LABEL[k] : 'All types'}
              </button>
            ))}
            {!isNew && (
              <label className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto">
                <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> Show done
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-slate-600">{views.length} request{views.length === 1 ? '' : 's'}{isNew ? ' ready to order' : ' on an order'}</p>
        {canEdit && (
          <Button disabled={!selectedViews.length} onClick={() => setCreating(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
            <PackagePlus className="w-4 h-4 mr-1.5" />Create Outsource Order{selectedViews.length ? ` (${selectedViews.length})` : ''}
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase">
                {isNew && <th className="px-3 py-2.5 w-8"></th>}<th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Part</th>
                <th className="px-3 py-2.5">From</th><th className="px-3 py-2.5">Steps</th><th className="px-3 py-2.5 text-right">Qty</th><th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={isNew ? 7 : 6} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : views.length === 0 ? (
                <tr><td colSpan={isNew ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                  {!isNew ? 'No request is on an order right now.' : vendor ? 'No ready request whose next step this vendor does.' : 'New outsource requests appear here when they reach Purchase.'}
                </td></tr>
              ) : views.map(v => {
                const legacyTrip = v.openTrip && v.openTrip.status === 'Sent' && !v.openTrip.outsourceOrder;
                return (
                  <tr key={v.key} className={`border-b align-top ${v.ready ? 'hover:bg-slate-50' : 'bg-slate-50/40'}`}>
                    {isNew && (
                      <td className="px-3 py-2.5">
                        <input type="checkbox" disabled={!v.ready || !canEdit} checked={selected.has(v.key)} onChange={() => toggle(v.key)} title="Add to an order" />
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={KIND_TONE[v.orderKind]}>{KIND_LABEL[v.orderKind] || v.orderKind}</Badge>
                      {v.fullyOutsourced && <p className="text-[10px] text-slate-500 mt-0.5">Fully outsourced</p>}
                    </td>
                    <td className="px-3 py-2.5"><p className="font-medium text-slate-800">{v.itemName}</p><p className="font-mono text-[11px] text-slate-400">{v.itemCode}</p></td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      <span className="font-mono">{v.orderCode}</span>
                      {v.unitNumbers?.length > 0 && <p className="text-[11px] text-slate-400">unit{v.unitNumbers.length === 1 ? '' : 's'} {v.unitNumbers.join(', ')}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {v.steps.map(s => {
                          const done = (v.stepsReceived || []).includes(s);
                          const left = v.stepsLeft.includes(s);
                          return (
                            <span key={s} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : left ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{s}</span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{v.qty} <span className="text-[11px] font-normal text-slate-400">{v.qtyUnit}</span></td>
                    <td className="px-3 py-2.5 text-xs">
                      {v.ready ? (
                        <>
                          <span className="text-emerald-700 font-semibold">Ready to order</span>
                          {/* 2026-10-23: what Store must hand over isn't in stock yet (e.g. parts still being made). */}
                          {v.materialWarning && <p className="text-[11px] text-amber-700 mt-0.5 max-w-xs">⚠ {v.materialWarning}</p>}
                        </>
                      ) : (
                        <span className="text-slate-600">
                          {v.waiting}
                          {v.openTrip?.order && (
                            <> — <button type="button" className="text-blue-600 hover:underline font-mono" onClick={() => onOpenOrder(v.openTrip.order._id)}>{v.openTrip.order.orderNo}</button> · {v.openTrip.order.vendorName}</>
                          )}
                        </span>
                      )}
                      {legacyTrip && canPurchaseEdit && (
                        <div className="mt-1">
                          <Button size="sm" variant="outline" className="h-7 text-emerald-700 border-emerald-200" onClick={() => setLegacy(v)}>
                            <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />Receive (sent before orders)
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showDone && <DoneRequests searchText={searchText} orderKind={orderKind} />}

      <NewOutsourceOrderDialog open={creating} requests={selectedViews} onClose={() => setCreating(false)}
        onSaved={(order) => { setSelected(new Set()); refresh(); if (order?._id) onOpenOrder(order._id); }} />
      {legacy && <LegacyReceiveDialog view={legacy} onClose={() => setLegacy(null)} onDone={() => { setLegacy(null); refresh(); }} />}
    </div>
  );
}
