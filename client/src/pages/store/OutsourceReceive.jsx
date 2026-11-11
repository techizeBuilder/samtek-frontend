import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, RotateCw, Factory, PackageCheck, Warehouse, History, Hash, Search } from 'lucide-react';
import SerialPicker, { emptyPick } from '@/components/serials/SerialPicker';
import { useConfirmWarnings } from '@/components/serials/useConfirmWarnings';

// Store → Outsource Receive (2026-10-21; was Material Transfers' "From
// Outsource" tab — outsource-v2 slice 7, docs/outsource-v2/slice-7-returns-store-receive.md).
// Its own page, like Purchase Orders' receive: Material Transfers only transfers.
//   - To receive: what Dispatch collected, by Outsource Order and trip.
//     Store's count must match Dispatch's (else Report short); the receive
//     sends it to QC. A job-work order's cost comes from the order. Sheet /
//     length offcuts back from the vendor go into stock (optional) — not
//     parts, tools or other items (2026-10-23).
//   - At Store: returned units waiting here. Once a unit's QC passes and its
//     next step is in-house, it goes to Production by itself (2026-10-25). Work
//     whose next step is outsourced again stays here for the next trip.
//   - Received: every receive, who counted it, and the leftovers entered.

const fmt = (n) => (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString('en-IN');
const inr = (n) => `₹${fmt(n)}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

// One leftover / unused-material record from a receive, in words.
function returnedText(x) {
  if (x.kind === 'item') return `${fmt(x.qty)} ${x.unit} ${x.itemName} unused`;
  const v = x.values || {};
  const size = v.width ? `${fmt(v.width)} × ${fmt(v.length)} mm` : `${fmt(v.length)} mm`;
  return `${fmt(x.pieces || 1)} × ${x.itemName} ${x.kind === 'leftover' ? 'leftover' : 'offcut'} ${size}`;
}

function ReceiveRow({ x, onDone }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(String(x.expectedCount ?? x.collectedCount ?? ''));
  // Dispatch hasn't entered the collection (2026-10-26): Store doesn't wait —
  // its count is checked against what was sent, and records the collection.
  const notCollected = x.collectedCount == null;
  // Pieces can come back in parts (2026-10-26): fewer is "the rest still with
  // the vendor" — these wait at Store until the rest is back.
  const partNow = x.pieces && count !== '' && Number(count) > 0 && Number(count) < Number(x.expectedCount) && notCollected;
  const restAfter = x.pieces ? Math.max(0, Number(x.sentQty || 0) - Number(x.backQty || 0) - Number(x.lostQty || 0) - (Number(count) || 0)) : 0;
  // Units in part (2026-10-26, 3c): tick which units came — the rest stay
  // with the vendor as their own request.
  const unitsPart = !x.pieces && x.unitNumbers?.length > 1 && count !== '' && Number(count) > 0 && Number(count) < Number(x.qty);
  const [units, setUnits] = useState([]);
  const [left, setLeft] = useState({ len: '', wid: '' });
  const [offcuts, setOffcuts] = useState({}); // key → { len, wid, pcs }
  const [short, setShort] = useState(null);   // { count, note } | null

  const post = async (url, body, okMsg) => {
    setBusy(true);
    try {
      const res = await apiRequest('POST', url, body);
      toast({ title: res.message || okMsg });
      onDone();
    } catch (e) {
      toast({ title: 'Couldn\'t do that', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const receive = () => post(`/api/dispatch-trips/${x.tripId}/jobs/${x.jobId}/store-receive`, {
    requestId: x.requestId, count: Number(count),
    ...(unitsPart ? { unitNumbers: units } : {}),
    leftover: x.leftoverRequired ? { leftoverLengthValue: left.len, leftoverLengthUnit: 'Millimeter', leftoverWidthValue: left.wid, leftoverWidthUnit: 'Millimeter' } : undefined,
    returned: {
      offcuts: Object.entries(offcuts).filter(([, o]) => Number(o.pcs) > 0).map(([key, o]) => ({ key, lengthValue: Number(o.len), lengthUnit: 'Millimeter', widthValue: Number(o.wid), widthUnit: 'Millimeter', pieces: Number(o.pcs) })),
    },
  }, 'Received');

  return (
    <div className="p-4 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{x.itemName} <span className="text-xs font-normal text-slate-500">({(x.stepNames || []).join(' › ')})</span></p>
          {notCollected
            ? <p className="text-xs text-slate-500"><span className="font-mono">{x.orderCode}</span> · on {x.tripNo} · Dispatch hasn't entered the collection — your count is checked against {x.backQty ? 'what is still with the vendor' : 'what was sent'} (<b>{fmt(x.expectedCount)} {x.unit}</b>){x.pieces ? ' — fewer is fine, the rest waits at the vendor' : ''}</p>
            : <p className="text-xs text-slate-500"><span className="font-mono">{x.orderCode}</span> · Dispatch collected <b>{fmt(x.collectedCount)} {x.unit}</b></p>}
          {x.backQty > 0 && <p className="text-xs text-teal-700">{fmt(x.backQty)} of {fmt(x.sentQty)} {x.unit} already back at Store{x.lostQty ? ` · ${fmt(x.lostQty)} not coming` : ''}</p>}
          {x.storeShort && <p className="text-xs text-amber-700">Reported short by Store: {fmt(x.storeShort.count)} counted{x.storeShort.note ? ` — ${x.storeShort.note}` : ''}. Dispatch and Store are finding the rest — receive once the count matches.</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Store counts</span>
          <Input type="number" min="0" className="h-8 w-20" value={count} onChange={e => setCount(e.target.value)} />
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={busy || count === '' || (unitsPart && units.length !== Number(count))} onClick={receive}>{partNow ? `Receive ${fmt(count)} — ${fmt(restAfter)} still with the vendor` : 'Receive'}</Button>
          <Button size="sm" variant="outline" className="text-amber-700 border-amber-300" onClick={() => setShort(short ? null : { count: '', note: '' })}>Report short</Button>
        </div>
      </div>
      {unitsPart && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600">
          Which unit{Number(count) === 1 ? '' : 's'} came back?
          {x.unitNumbers.map(n => (
            <label key={n} className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={units.includes(n)} onChange={e => setUnits(e.target.checked ? [...units, n] : units.filter(u => u !== n))} /> Unit {n}
            </label>
          ))}
          <span className="text-amber-700">the other{Number(x.qty) - Number(count) === 1 ? '' : 's'} stay with the vendor</span>
        </div>
      )}
      {short && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          Store counted <Input type="number" min="0" className="h-7 w-28" placeholder="counted" value={short.count} onChange={e => setShort({ ...short, count: e.target.value })} />
          <Input className="h-7 w-48" placeholder="note" value={short.note} onChange={e => setShort({ ...short, note: e.target.value })} />
          <Button size="sm" variant="outline" className="h-7 text-amber-700 border-amber-300" disabled={busy}
            onClick={() => post(`/api/dispatch-trips/${x.tripId}/jobs/${x.jobId}/store-short`, { requestId: x.requestId, count: short.count, note: short.note }, 'Reported short')}>Report</Button>
        </div>
      )}
      {x.leftoverRequired && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-600">
          Leftover from the whole {x.leftoverIsSheet ? 'sheet' : 'length'} sent (0 if none):
          <Input className="h-7 w-32" placeholder="length (mm)" value={left.len} onChange={e => setLeft({ ...left, len: e.target.value })} />
          {x.leftoverIsSheet && <Input className="h-7 w-32" placeholder="width (mm)" value={left.wid} onChange={e => setLeft({ ...left, wid: e.target.value })} />}
        </div>
      )}
      {/* Sheet / length offcuts only — parts, tools and other items don't come back (2026-10-23). */}
      {x.returnable?.length > 0 && (
        <div className="text-xs text-slate-600 rounded-md border border-slate-200 p-2 space-y-1.5">
          <p className="font-medium text-slate-700">Leftover back from the vendor (optional) — goes into stock</p>
          {(x.returnable || []).map(g => {
            const o = offcuts[g.key] || {};
            const set = (k) => (e) => setOffcuts(p => ({ ...p, [g.key]: { ...o, [k]: e.target.value } }));
            return (
              <div key={g.key} className="flex items-center gap-1.5 flex-wrap">
                {g.itemName} {g.kind === 'sheetArea' ? 'sheet' : 'length'} left:
                <Input className="h-7 w-32" placeholder="length (mm)" value={o.len ?? ''} onChange={set('len')} />
                {g.kind === 'sheetArea' && <Input className="h-7 w-32" placeholder="width (mm)" value={o.wid ?? ''} onChange={set('wid')} />}
                <Input className="h-7 w-20" placeholder="pieces" value={o.pcs ?? ''} onChange={set('pcs')} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// One card per Outsource Order on a return trip (like To Dispatch).
function ReceiveGroup({ rows, onDone }) {
  const head = rows[0];
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-emerald-50/50 border-b border-slate-100 py-3">
        <CardTitle className="text-base text-slate-800 flex items-center gap-2 flex-wrap">
          <Hash className="h-4 w-4 text-emerald-600" />Outsource Order: {head.orderNo}
          <span className="text-xs font-normal text-slate-500">· {rows.length} to receive</span>
        </CardTitle>
        <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap"><Truck className="w-3.5 h-3.5" />{head.tripNo} · {head.vehicleNumber} ← <b className="text-slate-700">{head.vendorName}</b></p>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-slate-100 bg-white">
        {rows.map(x => <ReceiveRow key={`${x.tripId}-${x.requestId}`} x={x} onDone={onDone} />)}
      </CardContent>
    </Card>
  );
}

// Work waiting at Store (2026-10-25): no "Hand to Production" any more — work
// whose next step is in-house goes to Production by itself once QC passes it
// (or at the receive, with no QC). What stays here waits for QC, a rework, or
// its next outsource trip.
function AtStoreCard({ o }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold text-slate-800">{o.orderCode} · {o.itemName}</p>
        </div>
        <div className="divide-y border rounded-md">
          {o.units.map(u => (
            <div key={u.unitIndex} className="flex items-center gap-2 px-3 py-1.5 text-xs">
              <span className="font-semibold">{o.orderKind === 'SubChildPart' ? 'Batch' : `Unit ${u.unitNumber}`}</span>
              <span className="text-slate-500">{(u.stepNames || []).join(' › ')} · {u.outsourceOrderNo}</span>
              <span className={u.state === 'ready' ? 'text-emerald-700' : 'text-slate-500'}>{u.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Paged on the server (2026-10-21): search, receive dates, 20 a page.
function ReceivedList() {
  const [search, setSearchRaw] = useState('');
  const [from, setFromRaw] = useState('');
  const [to, setToRaw] = useState('');
  const [page, setPage] = useState(1);
  const searchText = useDebouncedValue(search.trim(), 400);
  const resetPage = (fn) => (v) => { fn(v); setPage(1); };
  const setSearch = resetPage(setSearchRaw); const setFrom = resetPage(setFromRaw); const setTo = resetPage(setToRaw);
  const q = useQuery({
    queryKey: ['store-outsource-received', searchText, from, to, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchText) p.set('search', searchText);
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      return apiRequest('GET', `/api/dispatch-trips/store/received?${p.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
  const rows = q.data?.data || [];
  const pg = q.data?.pagination || { page: 1, pages: 1, total: 0 };
  const filtered = !!(searchText || from || to);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input placeholder="Search order, part, vendor, trip or order code…" className="pl-9 h-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          Received from <Input type="date" className="h-9 w-36 bg-white" value={from} onChange={e => setFrom(e.target.value)} />
          to <Input type="date" className="h-9 w-36 bg-white" value={to} onChange={e => setTo(e.target.value)} />
        </span>
        {filtered && <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setFrom(''); setTo(''); }}>Clear</Button>}
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase">
                <th className="px-3 py-2.5">Received</th><th className="px-3 py-2.5">Part · steps</th><th className="px-3 py-2.5">Order</th>
                <th className="px-3 py-2.5">From · trip</th><th className="px-3 py-2.5 text-right">Collected</th><th className="px-3 py-2.5 text-right">Store counted</th>
                <th className="px-3 py-2.5">Leftover entered</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : !rows.length ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">{filtered ? 'Nothing received matches.' : 'Nothing received from outsource vendors yet.'}</td></tr>
              ) : rows.map(r => (
                <tr key={`${r.tripId}-${r.orderCode}-${r.receivedAt}`} className="border-b align-top hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{when(r.receivedAt)}<p className="text-[11px] text-slate-400">by {r.receivedBy || '—'}</p></td>
                  <td className="px-3 py-2.5"><p className="font-medium text-slate-800">{r.itemName}</p><p className="text-[11px] text-slate-500">{(r.stepNames || []).join(' › ')}</p></td>
                  <td className="px-3 py-2.5 text-xs"><p className="font-mono text-slate-700">{r.orderNo}</p><p className="font-mono text-[11px] text-slate-400">{r.orderCode}</p></td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{r.vendorName}<p className="text-[11px] text-slate-400">{r.tripNo} · {r.vehicleNumber}</p></td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-600">{r.collectedCount != null ? `${fmt(r.collectedCount)} ${r.unit}` : '—'}<p className="text-[11px] text-slate-400">{r.collectedViaStore ? "at Store's receive" : r.collectedBy}</p></td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{fmt(r.receivedCount)} <span className="text-[11px] font-normal text-slate-400">{r.unit}</span></td>
                  <td className="px-3 py-2.5 text-xs">
                    {(r.returned || []).length
                      ? (r.returned || []).map((x, i) => <p key={i} className="text-emerald-700">{returnedText(x)}</p>)
                      : <span className="text-slate-400">None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      {pg.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pg.page <= 1}>Previous</Button>
          <span className="text-sm text-slate-500">Page {pg.page} of {pg.pages} ({pg.total} received)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pg.page >= pg.pages}>Next</Button>
        </div>
      )}
    </div>
  );
}

// Pieces back in part (2026-10-26): they wait here until the rest is back from
// the vendor (Dispatch collects it) or is written off as not coming.
function NotComing({ x, onDone }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { runChecked, warningDialog } = useConfirmWarnings();
  const [lostPick, setLostPick] = useState(emptyPick());
  const [lostPickOk, setLostPickOk] = useState(true);
  const submit = async () => {
    setBusy(true);
    try {
      const res = await runChecked((acknowledgeWarnings) => apiRequest('POST', '/api/dispatch-trips/store/not-coming', { outsourceOrder: x.outsourceOrder, requestId: x.requestId, qty: Number(qty), reason, lostUnitIds: lostPick.unitIds, acknowledgeWarnings }));
      if (!res) return; // went back to pick
      toast({ title: res.message || 'Written off' });
      setOpen(false); onDone();
    } catch (e) {
      toast({ title: "Couldn't do that", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };
  if (!open) return <Button size="sm" variant="outline" className="h-7 text-[11px] text-slate-600" onClick={() => setOpen(true)} title="Lost, or kept / scrapped by the vendor — they won't come back">Not coming</Button>;
  return (
    <span className="flex items-center gap-1 flex-wrap justify-end">
      <Input type="number" min="1" max={x.withVendor} className="h-7 w-16" placeholder="qty" value={qty} onChange={e => setQty(e.target.value)} />
      <Input className="h-7 w-48" placeholder="why (e.g. lost at the vendor)" value={reason} onChange={e => setReason(e.target.value)} />
      {warningDialog}
      <Button size="sm" className="h-7" disabled={busy || !qty || !reason.trim() || !lostPickOk} onClick={submit}>Write off</Button>
      <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>×</Button>
      {Number(qty) > 0 && (
        <span className="block w-full text-left">
          <SerialPicker mode="scpPieces" orderId={String(x.holderId)} qty={Number(qty)} onFloor={x.sentQty} title="Serial numbers in the lost pieces"
            value={lostPick} onChange={setLostPick} onValidity={(ok) => setLostPickOk(ok)} />
        </span>
      )}
    </span>
  );
}

function PartlyBack({ rows, onDone }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b bg-teal-50/60">
          <p className="font-semibold text-slate-800">Back in part — waiting for the rest</p>
          <p className="text-xs text-slate-500">These go to QC / the next step together with the rest. Dispatch collects what's still with the vendor — or, if the vendor lost / scrapped some, write them off ("Not coming").</p>
        </div>
        <div className="divide-y">
          {rows.map(x => (
            <div key={String(x.requestId)} className="px-4 py-3 text-sm flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{x.itemName} <span className="text-xs font-normal text-slate-500">({(x.stepNames || []).join(' › ')})</span></p>
                <p className="text-xs text-slate-500"><span className="font-mono">{x.orderCode}</span> · {x.orderNo} · {x.vendorName}{x.onTrip ? ` · rest on ${x.onTrip}` : ''}</p>
                <p className="text-[11px] text-slate-400">{x.arrivals.map(a => `${fmt(a.count)} on ${a.tripNo}`).join(' · ')}</p>
              </div>
              <div className="text-xs text-right space-y-1">
                <p><b className="text-teal-700">{fmt(x.backQty)} of {fmt(x.sentQty)} {x.unit}</b> at Store<br /><span className="text-amber-700">{fmt(x.withVendor)} still with the vendor</span>{x.lostQty ? <><br /><span className="text-slate-500">{fmt(x.lostQty)} not coming</span></> : null}</p>
                {x.withVendor > 0 && <NotComing x={x} onDone={onDone} />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OutsourceReceive() {
  const qc = useQueryClient();
  const recvQ = useQuery({ queryKey: ['store-outsource-receive'], queryFn: () => apiRequest('GET', '/api/dispatch-trips/store/receive').then(r => r.data || []) });
  const atQ = useQuery({ queryKey: ['store-outsource-at-store'], queryFn: () => apiRequest('GET', '/api/dispatch-trips/store/at-store').then(r => r.data || []) });
  // Pieces back in part, waiting for the rest (2026-10-26).
  const partQ = useQuery({ queryKey: ['store-outsource-partly-back'], queryFn: () => apiRequest('GET', '/api/dispatch-trips/store/partly-back').then(r => r.data || []) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['store-outsource-receive'] });
    qc.invalidateQueries({ queryKey: ['store-outsource-at-store'] });
    qc.invalidateQueries({ queryKey: ['store-outsource-partly-back'] });
    qc.invalidateQueries({ queryKey: ['store-outsource-received'] });
  };
  // Requests of the same Outsource Order on the same return trip.
  const groups = useMemo(() => {
    const m = new Map();
    for (const x of recvQ.data || []) {
      const k = `${x.orderNo}|${x.tripId}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    }
    return [...m.entries()];
  }, [recvQ.data]);
  const toReceive = (recvQ.data || []).length;
  const atStore = (atQ.data || []).reduce((s, o) => s + o.units.length, 0) + (partQ.data || []).length;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <PackageCheck className="h-8 w-8 text-emerald-600" />
            Outsource Receive
          </h1>
          <p className="text-slate-500 mt-1">Outsourced work Dispatch brought back from the vendor. Store counts it, receives it (→ QC) and puts any leftover into stock.</p>
        </div>
        <Button variant="outline" className="bg-white" onClick={refresh}><RotateCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      <Tabs defaultValue="receive" className="w-full">
        <TabsList className="bg-white border border-slate-200 h-12 p-1 rounded-xl shadow-sm">
          <TabsTrigger value="receive" className="rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
            <PackageCheck className="w-4 h-4 mr-2" />To receive{toReceive ? ` (${toReceive})` : ''}
          </TabsTrigger>
          <TabsTrigger value="at-store" className="rounded-lg data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
            <Warehouse className="w-4 h-4 mr-2" />At Store{atStore ? ` (${atStore})` : ''}
          </TabsTrigger>
          <TabsTrigger value="received" className="rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
            <History className="w-4 h-4 mr-2" />Received
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="receive" className="m-0 space-y-3">
            {recvQ.isLoading ? <p className="text-slate-400 py-10 text-center">Loading…</p>
              : !groups.length ? <p className="text-slate-400 py-10 text-center">Nothing collected waiting to be received. Dispatch collects the work at the vendor first (Vendor Pickups).</p>
              : groups.map(([k, rows]) => <ReceiveGroup key={k} rows={rows} onDone={refresh} />)}
          </TabsContent>
          <TabsContent value="at-store" className="m-0 space-y-3">
            <p className="text-sm text-slate-500">Returned work waits here while it's in QC, out for rework, or waiting for its next outsource trip. Once QC passes it (or straight away with no QC) and its next step is in-house, it goes to Production by itself.</p>
            {(partQ.data || []).length > 0 && <PartlyBack rows={partQ.data} onDone={refresh} />}
            {atQ.isLoading ? <p className="text-slate-400 py-10 text-center">Loading…</p>
              : !(atQ.data || []).length ? (partQ.data || []).length ? null : <p className="text-slate-400 py-10 text-center">No returned work waiting at Store.</p>
              : atQ.data.map(o => <AtStoreCard key={o.productionOrder} o={o} onDone={refresh} />)}
          </TabsContent>
          <TabsContent value="received" className="m-0">
            <ReceivedList />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
