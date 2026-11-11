import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

// New Outsource Order (outsource-v2 slice 2, 2026-10-20 — D1/D2/D4). Lines
// come from the picked requests: the same part with the same steps left
// merges into one line (2 + 3 → 5). Each line picks how many of the NEXT
// steps it covers; each step gets its own price per piece / unit (2026-10-21,
// the line's price is their sum), with what was paid before for that step. The vendor list is the approved vendors whose
// Services cover every step ("show all" lifts that). GST type comes from the
// two GSTINs (changeable), charges use Purchase Settings' charge names.
// Totals mirror the server (outsourceOrderController.readOrderBody).
// Edit mode (`editOrder`, a Rejected order): the same form, saved with PUT.
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const normStep = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
// Today as YYYY-MM-DD in the user's own time zone (an ISO slice would be UTC).
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const STAGE_TONE = { Watchlist: 'bg-orange-50 text-orange-700 border-orange-200', Probationary: 'bg-sky-50 text-sky-700 border-sky-200' };

// Pricing types (client change 2, 2026-10-22 — docs/outsource-v2/pricing-types-logic-2026-10.md).
// Mirrors server/services/outsourcePricingService.js.
const PRICE_TYPES = [
  ['piece', 'Per piece'],
  ['line', 'Whole line'],
  ['operation', 'Per job work'],
  ['minute', 'Per minute'],
  ['hour', 'Per hour'],
];
const isTime = (t) => t === 'minute' || t === 'hour';
// A step's amount — null for a time-based step (its time is entered later).
function stepAmount(type, rate, qty, op) {
  const r = Number(rate) || 0;
  if (type === 'line') return r2(r);
  if (type === 'operation') return r2(r * (op?.perPiece || 0) * qty);
  if (isTime(type)) return null;
  return r2(r * qty);
}
function rateHint(type, unit, op) {
  if (type === 'line') return '₹ for the line';
  if (type === 'operation') return `₹ / ${op?.name?.replace(/s$/, '') || 'operation'}`;
  if (type === 'minute') return '₹ / min';
  if (type === 'hour') return '₹ / hour';
  return `₹ / ${unit}`;
}
function basisText(type, rate, qty, qtyUnit, op) {
  if (rate === '' || rate == null) return '';
  const amt = stepAmount(type, rate, qty, op);
  if (type === 'line') return `whole line (${qty} ${qtyUnit}) ${inr(rate)}`;
  if (type === 'operation') return `${qty} ${qtyUnit} × ${op?.perPiece} ${op?.name} × ${inr(rate)} = ${inr(amt)}`;
  if (isTime(type)) return 'time entered later on the order';
  return `${qty} ${qtyUnit} × ${inr(rate)} = ${inr(amt)}`;
}

// The picked request views → lines (same item + same steps left).
function groupLines(views) {
  const map = new Map();
  for (const v of views) {
    const k = `${v.item}|${v.stepsLeft.map(normStep).join('›')}`;
    if (!map.has(k)) {
      map.set(k, {
        key: k, item: v.item, itemCode: v.itemCode, itemName: v.itemName, orderKind: v.orderKind, qtyUnit: v.qtyUnit,
        stepsLeft: v.stepsLeft, requests: [], stepCount: v.stepsLeft.length,
        // step → { type, rate } (pricing types, 2026-10-22)
        stepRates: {}, stepOperations: v.stepOperations || {}, gstPercent: '', expectedBy: '',
      });
    }
    map.get(k).requests.push(v);
  }
  return [...map.values()];
}

// Earlier prices for this part, per step (2026-10-21).
function usePriceHistory(item, steps, vendor) {
  const { data } = useQuery({
    queryKey: ['outsource-price-history', item, steps.join('|'), vendor || ''],
    queryFn: () => apiRequest('GET', `/api/outsource-work/price-history?item=${item}&steps=${encodeURIComponent(steps.join('|'))}${vendor ? `&vendor=${vendor}` : ''}`),
    enabled: !!item && steps.length > 0,
  });
  return data?.data || null;
}
// Earlier prices of the SAME type only (R8) — a per-hour rate is never
// averaged with a per-piece one.
function StepPriceHelp({ ph, unitText }) {
  if (!ph) return null;
  if (!ph.count) return <p className="text-[11px] text-slate-400">No earlier price of this type</p>;
  return (
    <p className="text-[11px] text-slate-500">
      Last {inr(ph.last.rate)}{unitText} ({ph.last.vendorName}) · avg {inr(ph.average)} ({ph.count})
      {ph.vendorLast ? ` · this vendor ${inr(ph.vendorLast.rate)}` : ''}
    </p>
  );
}
const UNIT_SUFFIX = { piece: '/pc', line: ' line', operation: '/op', minute: '/min', hour: '/h' };
function StepPrices({ line, steps, vendor, qty, onChange }) {
  const ph = usePriceHistory(line.item, steps, vendor);
  const unit = line.qtyUnit === 'units' ? 'unit' : 'piece';
  return (
    <div className="space-y-2">
      {steps.map(s => {
        const sr = line.stepRates[s] || { type: 'piece', rate: '' };
        const op = line.stepOperations?.[s] || null;
        const set = (patch) => onChange({ ...line.stepRates, [s]: { ...sr, ...patch } });
        return (
          <div key={s} className="grid grid-cols-1 sm:grid-cols-[minmax(0,8rem)_8.5rem_10rem_1fr] items-center gap-2">
            <span className="text-xs text-slate-700 truncate" title={s}>{s}</span>
            <select className="h-8 border rounded px-1 text-xs" value={sr.type} onChange={e => set({ type: e.target.value })}>
              {PRICE_TYPES.map(([t, label]) => (
                <option key={t} value={t} disabled={t === 'operation' && !op}>
                  {label}{t === 'operation' ? (op ? ` (${op.perPiece} ${op.name}/${unit})` : ' — no count in BOM') : ''}
                </option>
              ))}
            </select>
            <Input type="number" min="0" placeholder={rateHint(sr.type, unit, op)} value={sr.rate ?? ''} onChange={e => set({ rate: e.target.value })} className="h-8 text-sm" title={rateHint(sr.type, unit, op)} />
            <div className="min-w-0">
              <p className={`text-[11px] ${isTime(sr.type) ? 'text-violet-700' : 'text-slate-600'}`}>{basisText(sr.type, sr.rate, qty, line.qtyUnit, op)}</p>
              <StepPriceHelp ph={ph?.byStepType?.[s]?.[sr.type]} unitText={UNIT_SUFFIX[sr.type]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function NewOutsourceOrderDialog({ open, onClose, requests = [], editOrder = null, onSaved }) {
  const { toast } = useToast();
  const [lines, setLines] = useState([]);
  const [vendor, setVendor] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [gstType, setGstType] = useState('');
  const [charges, setCharges] = useState([]);
  const [advancePercent, setAdvancePercent] = useState('');
  // Advance as a % of the known amount, or a flat amount (2026-10-22, R7).
  const [advanceType, setAdvanceType] = useState('percent');
  const [advanceFlat, setAdvanceFlat] = useState('');
  const [creditDays, setCreditDays] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  // Material not ready (2026-10-23): ordering is allowed, with this tick.
  const [ackMaterial, setAckMaterial] = useState(false);
  const [serverMaterialMsg, setServerMaterialMsg] = useState(''); // the server found a shortage the list didn't

  // Fresh form on open (from the picked requests, or the rejected order).
  useEffect(() => {
    if (!open) return;
    const ls = groupLines(requests);
    if (editOrder) {
      for (const l of ls) {
        const old = editOrder.lines.find(o => String(o.item) === String(l.item) && l.requests.some(r => o.requests.some(x => (x.jobWorkOrder && String(x.jobWorkOrder) === String(r.jobWorkOrder)) || (x.handoffId && String(x.handoffId) === String(r.handoffId)))));
        if (old) {
          const stepRates = old.stepRates?.length
            ? Object.fromEntries(old.stepRates.map(x => [x.step, { type: x.type || 'piece', rate: String(x.rate) }]))
            : (old.stepNames.length === 1 ? { [old.stepNames[0]]: { type: 'piece', rate: String(old.ratePerPiece) } } : {});
          Object.assign(l, { stepCount: Math.min(old.stepNames.length, l.stepsLeft.length), stepRates, gstPercent: String(old.gstPercent), expectedBy: old.expectedBy ? String(old.expectedBy).slice(0, 10) : '' });
        }
      }
      setVendor(String(editOrder.vendor?._id || editOrder.vendor || ''));
      setGstType(editOrder.gstType || '');
      setCharges((editOrder.charges || []).map(c => ({ label: c.label, amount: String(c.amount), gstPercent: String(c.gstPercent) })));
      setAdvancePercent(editOrder.paymentTerms?.advancePercent ?? '');
      setAdvanceType(editOrder.paymentTerms?.advanceType === 'flat' ? 'flat' : 'percent');
      setAdvanceFlat(editOrder.paymentTerms?.advanceFlat ?? '');
      setCreditDays(editOrder.paymentTerms?.creditDays ?? '');
      setNotes(editOrder.notes || '');
    } else {
      setVendor(''); setGstType(''); setCharges([]); setAdvancePercent(''); setAdvanceType('percent'); setAdvanceFlat(''); setCreditDays(''); setNotes('');
    }
    setLines(ls);
    setShowAll(false);
    setAckMaterial(false);
    setServerMaterialMsg('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineSteps = (l) => l.stepsLeft.slice(0, Number(l.stepCount) || 1);
  const lineQty = (l) => l.requests.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const srOf = (l, s) => l.stepRates[s] || { type: 'piece', rate: '' };
  // The line's known amount: every step that isn't time-based (R2).
  const lineKnown = (l) => {
    const qty = lineQty(l);
    let amount = 0; let pending = false;
    for (const s of lineSteps(l)) {
      const sr = srOf(l, s);
      const a = stepAmount(sr.type, sr.rate, qty, l.stepOperations?.[s]);
      if (a == null) pending = true; else amount += a;
    }
    return { qty, amount: r2(amount), pending };
  };
  const allSteps = [...new Set(lines.flatMap(lineSteps))];
  const { data: vendorsResp, isLoading: vendorsLoading } = useQuery({
    queryKey: ['outsource-vendors', allSteps.join('|'), showAll],
    queryFn: () => apiRequest('GET', `/api/outsource-work/vendors?steps=${encodeURIComponent(allSteps.join('|'))}${showAll ? '&all=true' : ''}`),
    enabled: open && allSteps.length > 0,
  });
  const vendors = vendorsResp?.data || [];
  const vendorRow = vendors.find(v => String(v._id) === String(vendor)) || null;
  // The vendor's GST type, unless Purchase changed it.
  useEffect(() => { if (vendorRow && !editOrder) setGstType(vendorRow.gstType || 'CGST_SGST'); }, [vendorRow?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: settingsResp } = useQuery({ queryKey: ['purchase-settings'], queryFn: () => apiRequest('GET', '/api/purchase-settings'), enabled: open });
  // No transport charges on an Outsource Order — outsource transport is ours
  // (Dispatch). Same rule as the server (assertNoTransportCharge).
  const chargeLabels = (settingsResp?.settings?.chargeLabels || [])
    .filter(c => !c.isTransport && !/\b(transport|transportation|freight|cartage|carriage|shipping|delivery)\b/i.test(c.name));

  const setLine = (i, patch) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const totals = useMemo(() => {
    const ls = lines.map(l => {
      const { qty, amount, pending } = lineKnown(l);
      const gst = r2(amount * (Number(l.gstPercent) || 0) / 100);
      return { qty, amount, gst, pending };
    });
    const cs = charges.filter(c => c.label && Number(c.amount) > 0).map(c => ({ amount: r2(c.amount), gst: r2(Number(c.amount) * (Number(c.gstPercent) || 0) / 100) }));
    const subtotal = r2(ls.reduce((s, l) => s + l.amount, 0));
    const lineGst = r2(ls.reduce((s, l) => s + l.gst, 0));
    const chargesTotal = r2(cs.reduce((s, c) => s + c.amount, 0));
    const chargesGst = r2(cs.reduce((s, c) => s + c.gst, 0));
    const hasTime = ls.some(l => l.pending);
    return { ls, subtotal, lineGst, chargesTotal, chargesGst, grand: r2(subtotal + lineGst + chargesTotal + chargesGst), hasTime };
  }, [lines, charges]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nothing known yet (every step time-based, no charges) → only a flat advance (R7).
  const flatOnly = totals.grand <= 0 && totals.hasTime;
  const advType = flatOnly ? 'flat' : advanceType;

  const materialWarnings = [
    ...lines.flatMap(l => l.requests.filter(r => r.materialWarning).map(r => `${l.itemName} (${r.orderCode}): ${r.materialWarning.replace(/^Material not ready: /, '')}`)),
    ...(serverMaterialMsg ? [serverMaterialMsg.replace(/^Material not ready — /, '').replace(/\. The vendor can't.*$/, '')] : []),
  ];
  // GST % is not pre-filled and is optional: left empty = no GST (a vendor who doesn't charge GST).
  // A charge row must have its name picked (2026-10-24 — "Add" no longer
  // pre-picks the first one); an empty row with no amount is just ignored.
  const chargesOk = charges.every(c => c.label || !(Number(c.amount) > 0));
  const ready = vendor && lines.length > 0 && chargesOk && (!materialWarnings.length || ackMaterial) && lines.every(l => !l.expectedBy || l.expectedBy >= todayLocal()) && lines.every(l => lineSteps(l).every(s => {
    const sr = srOf(l, s);
    return sr.rate !== '' && sr.rate != null && Number(sr.rate) >= 0 && (sr.type !== 'operation' || l.stepOperations?.[s]);
  }));

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        vendor, showAllVendors: showAll, gstType: gstType || undefined, acknowledgeMaterialNotReady: ackMaterial,
        lines: lines.map(l => ({
          requests: l.requests.map(r => r.key), stepCount: Number(l.stepCount),
          stepRates: lineSteps(l).map(s => ({ type: srOf(l, s).type, rate: Number(srOf(l, s).rate) })), gstPercent: Number(l.gstPercent) || 0, expectedBy: l.expectedBy || null,
        })),
        charges: charges.map(c => ({ label: c.label, amount: Number(c.amount) || 0, gstPercent: Number(c.gstPercent) || 0 })),
        paymentTerms: advType === 'flat'
          ? { advanceType: 'flat', advanceFlat: advanceFlat === '' ? null : Number(advanceFlat), advancePercent: null, creditDays: creditDays === '' ? null : Number(creditDays) }
          : { advanceType: 'percent', advancePercent: advancePercent === '' ? null : Number(advancePercent), creditDays: creditDays === '' ? null : Number(creditDays) },
        notes,
      };
      const res = editOrder
        ? await apiRequest('PUT', `/api/outsource-work/outsource-orders/${editOrder._id}`, body)
        : await apiRequest('POST', '/api/outsource-work/outsource-orders', body);
      toast({ title: editOrder ? 'Order sent again' : 'Outsource order created', description: res?.message });
      onSaved?.(res?.data);
      onClose();
    } catch (e) {
      if (/Material not ready/.test(e.message || '') && !ackMaterial) setServerMaterialMsg(e.message);
      toast({ title: 'Could not save', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editOrder ? `Edit ${editOrder.orderNo} and send again` : 'New Outsource Order'}</DialogTitle>
          <DialogDescription>
            The same part with the same steps left is one line. Each line covers the next step(s) — the rest stays open for another order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {lines.map((l, i) => {
            const t = totals.ls[i] || {};
            return (
              <div key={l.key} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{l.itemName} <span className="font-mono text-xs text-slate-400">{l.itemCode}</span></p>
                    <p className="text-xs text-slate-500">{t.qty} {l.qtyUnit} · for {l.requests.map(r => `${r.orderCode}${r.qtyUnit === 'units' ? ` (${r.qty})` : ''}`).join(', ')}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{inr(t.amount + t.gst)}{t.pending && <span className="block text-[11px] font-normal text-violet-700 text-right">+ time-based, entered later</span>}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Steps on this order</p>
                  <div className="flex flex-wrap gap-1.5">
                    {l.stepsLeft.map((s, k) => (
                      <button key={s} type="button" onClick={() => setLine(i, { stepCount: k + 1 })}
                        className={`text-xs px-2 py-1 rounded border ${k < l.stepCount ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-500 border-slate-200'}`}>
                        {k + 1}. {s}
                      </button>
                    ))}
                  </div>
                  {l.stepCount < l.stepsLeft.length && <p className="text-[11px] text-slate-400 mt-1">{l.stepsLeft.slice(l.stepCount).join(' › ')} stays open for a later order.</p>}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Price, per step</p>
                  <StepPrices line={l} steps={lineSteps(l)} vendor={vendor} qty={t.qty} onChange={(stepRates) => setLine(i, { stepRates })} />
                  {lineSteps(l).length > 1 && <p className="text-[11px] text-slate-600 mt-1">Together: <b>{inr(t.amount)}</b>{t.pending ? ' + the time-based step(s)' : ''}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500">GST %</label>
                    <Input type="number" min="0" max="100" placeholder="Empty = no GST" value={l.gstPercent} onChange={e => setLine(i, { gstPercent: e.target.value })} className="h-8" />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">Expected back (optional)</label>
                    {/* Not in the past (2026-10-23) — the server refuses it too. */}
                    <Input type="date" min={todayLocal()} value={l.expectedBy} onChange={e => setLine(i, { expectedBy: e.target.value })} className="h-8" />
                    {l.expectedBy && l.expectedBy < todayLocal() && <p className="text-[11px] text-red-600 mt-0.5">Can't be in the past.</p>}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">Vendor</p>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> Show all approved vendors
              </label>
            </div>
            {vendorsLoading ? <p className="text-xs text-slate-400">Loading vendors…</p> : vendors.length === 0 ? (
              <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />No approved vendor's Services cover {allSteps.join(', ')}. Tick "show all" or add the service in Vendor Master.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
                {vendors.map(v => (
                  <label key={v._id} className={`flex items-start gap-2 text-sm border rounded px-2 py-1.5 cursor-pointer ${String(vendor) === String(v._id) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" className="mt-1" checked={String(vendor) === String(v._id)} onChange={() => setVendor(String(v._id))} />
                    <span className="min-w-0">
                      <span className="font-medium text-slate-800">{v.supplierName}</span>
                      {STAGE_TONE[v.stage] && <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full border ${STAGE_TONE[v.stage]}`}>{v.stage}</span>}
                      <span className="block text-[11px] text-slate-500">
                        {v.gstType === 'IGST' ? 'IGST (other state)' : v.gstType === 'CGST_SGST' ? 'CGST + SGST' : 'GST type unknown'}
                        {!v.covers && <span className="text-amber-700"> · doesn't list {v.missing.join(', ')}</span>}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {vendorRow && !vendorRow.covers && <p className="text-[11px] text-amber-700">This vendor's Services don't list {vendorRow.missing.join(', ')} — allowed because "show all" is ticked.</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Charges</p>
                  <p className="text-[11px] text-slate-500">Only what the vendor bills (setup, packing, testing…). Transport isn't charged here — Dispatch arranges every trip and records any freight on it.</p>
                </div>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setCharges(cs => [...cs, { label: '', amount: '', gstPercent: '' }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add
                </Button>
              </div>
              {charges.length === 0 && <p className="text-[11px] text-slate-400">No charges.{chargeLabels.length === 0 ? ' Charge names come from Purchase → Settings.' : ''}</p>}
              {charges.map((c, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <select className={`h-8 border rounded px-1 text-sm flex-1 min-w-0 ${!c.label && Number(c.amount) > 0 ? 'border-red-400 text-red-600' : ''}`} value={c.label}
                    onChange={e => { const tpl = chargeLabels.find(x => x.name === e.target.value); setCharges(cs => cs.map((x, j) => (j === i ? { ...x, label: e.target.value, gstPercent: String(tpl?.defaultGstPercent ?? x.gstPercent) } : x))); }}>
                    <option value="">Choose…</option>
                    {chargeLabels.map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
                  </select>
                  <Input type="number" placeholder="₹" className="h-8 w-24" value={c.amount} onChange={e => setCharges(cs => cs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                  <Input type="number" placeholder="GST %" className="h-8 w-20" value={c.gstPercent} onChange={e => setCharges(cs => cs.map((x, j) => (j === i ? { ...x, gstPercent: e.target.value } : x)))} />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCharges(cs => cs.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-800">Terms</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    Advance:
                    <label className="flex items-center gap-1"><input type="radio" disabled={flatOnly} checked={advType === 'percent'} onChange={() => setAdvanceType('percent')} />% of known</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={advType === 'flat'} onChange={() => setAdvanceType('flat')} />Flat ₹</label>
                  </div>
                  {advType === 'flat'
                    ? <Input type="number" min="0" className="h-8" placeholder="₹ e.g. 200" value={advanceFlat} onChange={e => setAdvanceFlat(e.target.value)} />
                    : <Input type="number" min="0" max="100" className="h-8" placeholder="%" value={advancePercent} onChange={e => setAdvancePercent(e.target.value)} />}
                  {flatOnly && <p className="text-[10px] text-slate-500 mt-0.5">Every step is per minute / per hour — nothing is known yet, so only a flat advance.</p>}
                  {!flatOnly && advType === 'percent' && totals.hasTime && <p className="text-[10px] text-slate-500 mt-0.5">% of the known {inr(totals.grand)} — time-based steps add nothing to it.</p>}
                </div>
                <div><label className="text-[11px] text-slate-500">Credit days</label><Input type="number" min="0" className="h-8" value={creditDays} onChange={e => setCreditDays(e.target.value)} /></div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">GST type</label>
                <select className="h-8 border rounded px-1 text-sm w-full" value={gstType} onChange={e => setGstType(e.target.value)}>
                  <option value="CGST_SGST">CGST + SGST (same state)</option>
                  <option value="IGST">IGST (other state)</option>
                </select>
              </div>
              <Textarea rows={2} className="text-sm" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="border-t pt-2 text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
            <p>Work <b>{inr(totals.subtotal)}</b></p>
            <p>GST <b>{inr(totals.lineGst)}</b></p>
            <p>Charges <b>{inr(totals.chargesTotal + totals.chargesGst)}</b></p>
            <p className="text-base">Total <b>{inr(totals.grand)}</b></p>
            {totals.hasTime && <p className="col-span-2 sm:col-span-4 text-[11px] text-violet-700">Plus the per minute / per hour steps: their amount is added when Purchase enters the time on the order. The approval limit is checked on the known total.</p>}
          </div>

          {materialWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1.5">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />Material not ready yet</p>
              <ul className="text-xs text-amber-800 list-disc pl-5 space-y-0.5">
                {materialWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
              <p className="text-xs text-amber-900">These parts are still being made (or short). You can order now to book the vendor and price, but the vendor won't get the work until it's in stock — Dispatch sends it then.</p>
              <label className="flex items-center gap-2 text-sm text-amber-900 font-medium cursor-pointer">
                <input type="checkbox" checked={ackMaterial} onChange={e => setAckMaterial(e.target.checked)} /> I understand — order anyway
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !ready} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? 'Saving…' : editOrder ? 'Send again' : 'Create order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
