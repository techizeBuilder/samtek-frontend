import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, RotateCw, Hash } from 'lucide-react';
import SerialPicker from '@/components/serials/SerialPicker';
import { useConfirmWarnings } from '@/components/serials/useConfirmWarnings';

// Store → Dispatch for outsource work (outsource-v2 slice 6, 2026-10-20 —
// docs/outsource-v2/material-logic-2026-10.md). Each Dispatch trip job lists
// what Store gives from the Outsource Order line's material plan:
//   - sheets / lengths, combined for the line: pick catalog pieces and / or
//     offcuts that cover the area / length; record any offcut Store keeps
//   - items by quantity
//   - cut pieces (Store cuts them): the stock size and how many pieces
// "Hand over" moves the stock and books each order its share.
// Grouped by Outsource Order + trip (2026-10-21): one card per order, a line
// per Outsource Order line, "Hand over all" or one line at a time.

const fmt = (n) => (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString('en-IN');
const sizeText = (v, kind) => (kind === 'sheetArea'
  ? `${fmt(v?.width)} × ${fmt(v?.length)} mm (t ${fmt(v?.thickness)})`
  : `${fmt(v?.length)} mm`);
const amount = (n, kind) => (kind === 'sheetArea' ? `${fmt(n / 1e6)} m²` : `${fmt(n / 1000)} m`);

function GroupPicker({ g, value, onChange }) {
  const options = [g.catalog && { ...g.catalog, isLeftover: false }, ...(g.leftovers || []).map(l => ({ ...l, isLeftover: true }))].filter(Boolean);
  const pieces = value.sources || {};
  const capacity = options.reduce((s, o) => s + (Number(pieces[o._id]) || 0) * o.capacity, 0);
  const enough = capacity + 1e-6 >= g.total;
  const kept = value.kept || {};
  return (
    <div className="rounded-md border border-slate-200 p-2 space-y-1.5">
      <p className="text-sm"><b>{g.itemName}</b> — this line needs <b>{amount(g.total, g.kind)}</b> → {g.pieces} {g.kind === 'length' ? 'length' : 'sheet'}{g.pieces === 1 ? '' : 's'}{g.method === 'plan' ? ' (Sheet Plan)' : ''}</p>
      {options.map(o => (
        <div key={o._id} className="flex items-center gap-2 text-xs">
          <Input type="number" min="0" className="h-7 w-16" value={pieces[o._id] ?? ''} onChange={e => onChange({ ...value, sources: { ...pieces, [o._id]: e.target.value } })} />
          <span>{o.isLeftover ? 'offcut' : 'catalog'} {sizeText(o.values, g.kind)} · {o.subStock} in stock</span>
        </div>
      ))}
      <p className={`text-[11px] ${enough ? 'text-emerald-700' : 'text-red-600'}`}>Picked: {amount(capacity, g.kind)} of {amount(g.total, g.kind)}</p>
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
        Offcut Store keeps (optional):
        <Input className="h-7 w-32" placeholder="length (mm)" value={kept.length ?? ''} onChange={e => onChange({ ...value, kept: { ...kept, length: e.target.value } })} />
        {g.kind === 'sheetArea' && <Input className="h-7 w-32" placeholder="width (mm)" value={kept.width ?? ''} onChange={e => onChange({ ...value, kept: { ...kept, width: e.target.value } })} />}
        <Input className="h-7 w-20" placeholder="pieces" value={kept.count ?? ''} onChange={e => onChange({ ...value, kept: { ...kept, count: e.target.value } })} />
      </div>
      <p className="text-[11px] text-slate-400">Cut it here and keep the offcut, or send the whole {g.kind === 'length' ? 'length' : 'sheet'} — then record what the vendor sends back when Store receives the work (Store → Outsource Receive).</p>
    </div>
  );
}

function CutPicker({ c, value, onChange }) {
  const src = (c.options || []).find(o => String(o._id) === String(value.source));
  const capacity = src ? src.capacity * (Number(value.pieces) || 0) : 0;
  const need = c.cuts * (c.cutLengthMm || 0);
  return (
    <div className="rounded-md border border-slate-200 p-2 space-y-1.5 text-xs">
      <p className="text-sm"><b>{c.itemName}</b> — Store cuts <b>{fmt(c.cuts)} × {fmt(c.cutLengthMm)} mm</b></p>
      <div className="flex items-center gap-2 flex-wrap">
        <select className="h-7 rounded border border-slate-300 px-1" value={value.source || ''} onChange={e => onChange({ ...value, source: e.target.value })}>
          <option value="">Pick the stock size…</option>
          {(c.options || []).map(o => <option key={o._id} value={o._id}>{o.isLeftover ? 'offcut' : 'catalog'} {fmt(o.values?.length)} mm · {o.subStock} in stock</option>)}
        </select>
        <Input type="number" min="0" className="h-7 w-16" placeholder="pcs" value={value.pieces ?? ''} onChange={e => onChange({ ...value, pieces: e.target.value })} />
        <span className={capacity + 1e-6 >= need ? 'text-emerald-700' : 'text-slate-500'}>{fmt(capacity)} of {fmt(need)} mm</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        Offcut Store keeps (optional):
        <Input className="h-7 w-32" placeholder="length (mm)" value={value.keptLength ?? ''} onChange={e => onChange({ ...value, keptLength: e.target.value })} />
        <Input className="h-7 w-20" placeholder="pieces" value={value.keptCount ?? ''} onChange={e => onChange({ ...value, keptCount: e.target.value })} />
      </div>
    </div>
  );
}

// The store-handover body for one job from what Store picked.
function handoverBody(job, groups, cuts, serials = {}) {
  const s = job.store || {};
  return {
    // Serial number work step 2: the serial numbers / stickers Store hands over, per item.
    serials,
    groups: Object.fromEntries((s.groups || []).map(g => {
      const v = groups[g.key] || {};
      const k = v.kept || {};
      return [g.key, {
        sources: Object.entries(v.sources || {}).filter(([, n]) => Number(n) > 0).map(([variantId, n]) => ({ variantId, pieces: Number(n) })),
        keptLeftover: Number(k.count) > 0 ? { lengthValue: Number(k.length), lengthUnit: 'Millimeter', widthValue: Number(k.width), widthUnit: 'Millimeter', pieceCount: Number(k.count) } : null,
      }];
    })),
    cuts: Object.fromEntries((s.cuts || []).map(c => {
      const v = cuts[c.key] || {};
      return [c.key, {
        sourceVariantId: v.source, stockPiecesConsumed: Number(v.pieces),
        leftover: Number(v.keptCount) > 0 ? { lengthValue: Number(v.keptLength), lengthUnit: 'Millimeter', pieceCount: Number(v.keptCount) } : null,
      }];
    })),
  };
}
const initialGroups = (job) => Object.fromEntries((job.store?.groups || []).map(g => [g.key, { sources: g.catalog ? { [g.catalog._id]: g.pieces } : {} }]));
const jobKey = (j) => `${j.tripId}-${j.jobId}`;

// One Outsource Order line on the trip, inside its order's card.
function JobSection({ job, groups, setGroups, cuts, setCuts, serials, setSerials, busy, onHandOver }) {
  const s = job.store || {};
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className="font-semibold text-slate-800">{job.itemName} <span className="text-xs font-normal text-slate-500">({(job.stepNames || []).join(' › ')})</span></p>
        <Button size="sm" variant="outline" className="h-7 border-blue-300 text-blue-700 hover:bg-blue-50" disabled={busy || !!job.problem} onClick={onHandOver}>Hand over this line</Button>
      </div>
      {job.problem && <p className="text-xs text-red-600">{job.problem}</p>}
      {(s.groups || []).map(g => <GroupPicker key={g.key} g={g} value={groups[g.key] || {}} onChange={v => setGroups({ ...groups, [g.key]: v })} />)}
      {(s.cuts || []).map(c => <CutPicker key={c.key} c={c} value={cuts[c.key] || {}} onChange={v => setCuts({ ...cuts, [c.key]: v })} />)}
      {(s.items || []).length > 0 && (
          <div className="rounded-md border border-slate-200 divide-y text-sm">
            {s.items.map(i => (
              <div key={i.key} className="px-2 py-1.5 space-y-1.5">
                <div className="flex justify-between">
                  <span>{i.itemName}</span>
                  <span className={i.inStock + 1e-9 >= i.qty ? 'text-slate-700' : 'text-red-600'}>{fmt(i.qty)} {i.unit} <span className="text-xs text-slate-400">({fmt(i.inStock)} in stock)</span></span>
                </div>
                <SerialPicker mode="stock" itemId={i.itemId} qty={i.qty}
                  value={serials?.[String(i.itemId)]} onChange={v => setSerials({ ...(serials || {}), [String(i.itemId)]: v })} />
              </div>
            ))}
          </div>
        )}
        {(s.wip || []).map((w, n) => (
          <p key={n} className="text-xs text-slate-600">{fmt(w.qty)} {w.unit} {w.itemName} ({w.orderCode}) — the pieces kept at Store between trips.</p>
        ))}
    </div>
  );
}

// One card per Outsource Order on a trip (like Pending Transfers' card per
// production order): the trip once in the header, each line below with its
// own picks. "Hand over all" hands the lines over one by one and stops at
// the first refusal, so what went is never in doubt.
function OrderGroup({ jobs, onDone }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [groupsBy, setGroupsBy] = useState(() => Object.fromEntries(jobs.map(j => [jobKey(j), initialGroups(j)])));
  const [cutsBy, setCutsBy] = useState({});
  const [serialsBy, setSerialsBy] = useState({});
  const { runChecked, warningDialog } = useConfirmWarnings();
  const head = jobs[0];
  const ready = jobs.filter(j => !j.problem);

  const send = (job, acknowledgeWarnings) => apiRequest('POST', `/api/dispatch-trips/${job.tripId}/jobs/${job.jobId}/store-handover`,
    { ...handoverBody(job, groupsBy[jobKey(job)] || initialGroups(job), cutsBy[jobKey(job)] || {}, serialsBy[jobKey(job)] || {}), acknowledgeWarnings });
  // null = Store went back.
  const sendChecked = (job) => runChecked((ack) => send(job, ack));

  const handOverOne = async (job) => {
    setBusy(true);
    try {
      const res = await sendChecked(job);
      if (!res) return;
      toast({ title: res.message || `${job.itemName} handed over` });
      onDone();
    } catch (e) {
      toast({ title: `Couldn't hand over ${job.itemName}`, description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const handOverAll = async () => {
    setBusy(true);
    let done = 0;
    try {
      for (const job of ready) {
        if (!await sendChecked(job)) {
          toast({ title: `Stopped at ${job.itemName}`, description: `${done} line${done === 1 ? '' : 's'} handed over before it.` });
          return;
        }
        done += 1;
      }
      toast({ title: `${head.orderNo}: ${done} line${done === 1 ? '' : 's'} handed over to Dispatch` });
    } catch (e) {
      const failed = ready[done];
      toast({ title: `Stopped at ${failed?.itemName}`, description: `${done ? `${done} line${done === 1 ? '' : 's'} handed over before it. ` : ''}${e.message}`, variant: 'destructive' });
    } finally { setBusy(false); onDone(); }
  };

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-blue-50/50 border-b border-slate-100 py-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
              <Hash className="h-4 w-4 text-blue-500" />Outsource Order: {head.orderNo}
              <span className="text-xs font-normal text-slate-500">· {jobs.length} line{jobs.length === 1 ? '' : 's'}</span>
            </CardTitle>
            <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap"><Truck className="w-3.5 h-3.5" />{head.tripNo} · {head.date ? new Date(head.date).toLocaleDateString('en-IN') : ''} · {head.vehicleNumber}{head.driverName ? ` · ${head.driverName}` : ''} → <b className="text-slate-700">{head.vendorName}</b></p>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={busy || !ready.length} onClick={handOverAll}>
            Hand over all{ready.length > 1 ? ` (${ready.length})` : ''} to Dispatch
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-slate-100 bg-white">
        {jobs.map(j => (
          <JobSection key={jobKey(j)} job={j} busy={busy}
            groups={groupsBy[jobKey(j)] || initialGroups(j)} setGroups={v => setGroupsBy(p => ({ ...p, [jobKey(j)]: v }))}
            cuts={cutsBy[jobKey(j)] || {}} setCuts={v => setCutsBy(p => ({ ...p, [jobKey(j)]: v }))}
            serials={serialsBy[jobKey(j)] || {}} setSerials={v => setSerialsBy(p => ({ ...p, [jobKey(j)]: v }))}
            onHandOver={() => handOverOne(j)} />
        ))}
      </CardContent>
      {warningDialog}
    </Card>
  );
}

export default function OutsourceToDispatchTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['store-outsource-to-dispatch'], queryFn: () => apiRequest('GET', '/api/dispatch-trips/store/pending').then(r => r.data || []) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['store-outsource-to-dispatch'] });
  // Lines of the same Outsource Order on the same trip, in the server's order.
  const orderGroups = useMemo(() => {
    const m = new Map();
    for (const j of q.data || []) {
      const k = `${j.orderNo}|${j.tripId}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(j);
    }
    return [...m.entries()];
  }, [q.data]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Material Dispatch takes to outsource vendors, by trip. It comes straight from Store; Production doesn't issue it.</p>
        <Button size="sm" variant="outline" onClick={refresh}><RotateCw className="w-3.5 h-3.5 mr-1" />Refresh</Button>
      </div>
      {q.isLoading ? <p className="text-slate-400 py-10 text-center">Loading…</p>
        : !(q.data || []).length ? <p className="text-slate-400 py-10 text-center">Nothing to hand over to Dispatch.</p>
        : orderGroups.map(([k, jobs]) => <OrderGroup key={k} jobs={jobs} onDone={refresh} />)}
    </div>
  );
}
