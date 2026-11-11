import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, RotateCw, Factory, Warehouse, CheckCircle2, Clock, Ban, MapPin, AlertTriangle, BellRing, Search } from 'lucide-react';

// Vendor Pickups (outsource-v2 slice 6, 2026-10-20 — docs/outsource-v2/
// dispatch-design-2026-10.md). "Dispatch sends, Store receives":
//   - Purchase: "We pick up" POs → Dispatch picks them up (Store's PO receive
//     is unchanged).
//   - Outsource: Outsource Order lines → Store and Production hand their
//     material to Dispatch (from the line's material plan), Dispatch delivers
//     it to the vendor.
// Tick one vendor's jobs → New trip (vehicle, driver, date; freight for a
// hired vehicle; challan / e-way bill numbers).
// Slice 7 (2026-10-21): "To collect" — requests with the vendor ("vendor
// says ready" first). On a trip Dispatch counts each one: Collected (must equal
// what was sent) or Report short (Purchase sorts it out); Store then receives.

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const TRIP_TONE = {
  Planned: 'bg-sky-50 text-sky-700 border-sky-200',
  Out: 'bg-amber-50 text-amber-800 border-amber-200',
  Done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-slate-50 text-slate-400 border-slate-200',
};
const today = () => new Date().toISOString().slice(0, 10);

function Check({ checked, onChange, disabled }) {
  return <input type="checkbox" className="h-4 w-4 accent-violet-600 mt-0.5" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />;
}

function Done({ stamp, label }) {
  return stamp?.at
    ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />{label} · {stamp.byName || ''} {new Date(stamp.at).toLocaleDateString('en-IN')}</span>
    : <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Clock className="w-3.5 h-3.5" />{label} — waiting</span>;
}

// A Store / Production handover to Dispatch: done, or still to come.
function HandOver({ stamp, who }) {
  return stamp?.at
    ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />handed over · {stamp.byName || ''} {new Date(stamp.at).toLocaleDateString('en-IN')}</span>
    : <span className="inline-flex items-center gap-1 text-[11px] text-amber-700"><Clock className="w-3.5 h-3.5" />not handed over yet — {who} hands it over</span>;
}

function NewTripDialog({ open, onClose, vendor, jobs, vehicles, onCreated }) {
  const { toast } = useToast();
  const [mode, setMode] = useState('regular');
  const [vehicleId, setVehicleId] = useState('');
  const [one, setOne] = useState({ number: '', type: 'Tempo', ownership: 'Hired', transporterName: '', transporterPhone: '' });
  const [saveAsRegular, setSaveAsRegular] = useState(false);
  const [f, setF] = useState({ date: today(), driverName: '', driverPhone: '', amount: '', paidBy: 'Cash', challanNo: '', ewayBillNo: '', notes: '' });
  const [busy, setBusy] = useState(false);
  // "Vehicle waits & brings it back" per send line (2026-10-21): pre-ticked
  // when the order line's Expected back is on or before the trip date.
  const [waitPick, setWaitPick] = useState({}); // lineId → true / false (touched)
  const sends = jobs.filter(j => j.kind === 'outsourceSend');
  const waitDefault = (j) => !!j._expectedBy && String(j._expectedBy).slice(0, 10) <= f.date;
  const waits = (j) => waitPick[j.lineId] ?? waitDefault(j);
  const vehicle = vehicles.find(v => v._id === vehicleId);
  const hired = mode === 'regular' ? vehicle?.ownership === 'Hired' : one.ownership === 'Hired';

  const pickVehicle = (id) => {
    setVehicleId(id);
    const v = vehicles.find(x => x._id === id);
    if (v) setF(p => ({ ...p, driverName: v.driverName || '', driverPhone: v.driverPhone || '' }));
  };
  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        vendor: vendor.vendor, date: f.date, driverName: f.driverName, driverPhone: f.driverPhone,
        jobs: jobs.map(({ _label, _expectedBy, ...j }) => (j.kind === 'outsourceSend' ? { ...j, bringBack: waits({ ...j, _expectedBy }) } : j)),
        challanNo: f.challanNo, ewayBillNo: f.ewayBillNo, notes: f.notes,
        ...(mode === 'regular' ? { vehicleId } : { oneTimeVehicle: one, saveAsRegular }),
        ...(hired ? { freight: { amount: Number(f.amount), paidBy: f.paidBy } } : {}),
      };
      const res = await apiRequest('POST', '/api/dispatch-trips', body);
      toast({ title: res.message || 'Trip planned' });
      onCreated();
    } catch (e) {
      toast({ title: 'Couldn\'t plan the trip', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New trip → {vendor?.vendorName}</DialogTitle>
          <DialogDescription>{jobs.length} job{jobs.length === 1 ? '' : 's'} · one vehicle, one vendor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-slate-500">Date</label>
            <Input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          </div>
          {sends.length > 0 && (
            <div className="rounded-md border border-teal-200 bg-teal-50/40 p-2 space-y-1.5">
              <p className="text-xs font-semibold text-slate-700">Outsource work on this trip</p>
              {sends.map(j => (
                <label key={j.lineId} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="accent-teal-600 mt-0.5" checked={waits(j)} onChange={e => setWaitPick(p => ({ ...p, [j.lineId]: e.target.checked }))} />
                  <span>
                    <b>{j._label}</b> — the vehicle waits &amp; brings it back
                    {j._expectedBy && <span className="text-slate-500"> · expected back {day(j._expectedBy)}</span>}
                  </span>
                </label>
              ))}
              <p className="text-[11px] text-slate-500">Ticked: once delivered, it goes on this trip to collect — no second trip, no second freight{hired ? ' (put the waiting in the freight)' : ''}. Unticked: collect it later from "To collect".</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'regular' ? 'default' : 'outline'} onClick={() => setMode('regular')}>Regular vehicle</Button>
            <Button size="sm" variant={mode === 'oneTime' ? 'default' : 'outline'} onClick={() => setMode('oneTime')}>One-time vehicle</Button>
          </div>
          {mode === 'regular' ? (
            <div>
              <label className="text-xs text-slate-500">Vehicle</label>
              <Select value={vehicleId} onValueChange={pickVehicle}>
                <SelectTrigger><SelectValue placeholder={vehicles.length ? 'Pick a vehicle' : 'No vehicles yet — add them on Vehicles, or use one-time'} /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v._id} value={v._id}>{v.number} · {v.type} · {v.ownership}{v.transporterName ? ` (${v.transporterName})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><label className="text-xs text-slate-500">Vehicle number</label><Input value={one.number} onChange={e => setOne({ ...one, number: e.target.value })} placeholder="UK07 CD 9876" /></div>
              <div>
                <label className="text-xs text-slate-500">Type</label>
                <Select value={one.type} onValueChange={v => setOne({ ...one, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Tempo', 'Pickup', 'Truck', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Own / hired</label>
                <Select value={one.ownership} onValueChange={v => setOne({ ...one, ownership: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Hired">Hired</SelectItem><SelectItem value="Own">Own</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-slate-500">Transporter</label><Input value={one.transporterName} onChange={e => setOne({ ...one, transporterName: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500">Transporter phone</label><Input value={one.transporterPhone} onChange={e => setOne({ ...one, transporterPhone: e.target.value })} /></div>
              <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" className="accent-violet-600" checked={saveAsRegular} onChange={e => setSaveAsRegular(e.target.checked)} /> Save as a regular vehicle
              </label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500">Driver</label><Input value={f.driverName} onChange={e => setF({ ...f, driverName: e.target.value })} /></div>
            <div><label className="text-xs text-slate-500">Driver phone</label><Input value={f.driverPhone} onChange={e => setF({ ...f, driverPhone: e.target.value })} /></div>
          </div>
          {hired && (
            <div className="grid grid-cols-2 gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
              <div><label className="text-xs text-slate-500">Freight (₹)</label><Input type="number" min="0" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
              <div>
                <label className="text-xs text-slate-500">Paid by</label>
                <Select value={f.paidBy} onValueChange={v => setF({ ...f, paidBy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Cash', 'Bank', 'Transporter bills'].map(t => <SelectItem key={t} value={t}>{t === 'Transporter bills' ? 'Transporter bills later' : t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="col-span-2 text-[11px] text-slate-500">Saved as a Dispatch expense (Transporting Cost) for this trip.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500">Challan no.</label><Input value={f.challanNo} onChange={e => setF({ ...f, challanNo: e.target.value })} /></div>
            <div><label className="text-xs text-slate-500">E-way bill no.</label><Input value={f.ewayBillNo} onChange={e => setF({ ...f, ewayBillNo: e.target.value })} /></div>
          </div>
          <div><label className="text-xs text-slate-500">Notes</label><Input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || (mode === 'regular' ? !vehicleId : !one.number.trim()) || (hired && !(Number(f.amount) > 0))} onClick={submit}>Plan trip</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Change a Planned trip's vehicle / driver / date (2026-10-24) — even after
// Store / Production handed over (cancel is refused then). Same vehicle and
// freight fields as New trip, pre-filled; a reason is required.
function ChangeTripDialog({ trip, vehicles, onClose, onSaved }) {
  const { toast } = useToast();
  const regular = trip.vehicle && vehicles.some(v => v._id === String(trip.vehicle));
  const [mode, setMode] = useState(regular ? 'regular' : 'oneTime');
  const [vehicleId, setVehicleId] = useState(regular ? String(trip.vehicle) : '');
  const ot = trip.oneTimeVehicle || {};
  const [one, setOne] = useState({ number: regular ? '' : (ot.number || trip.vehicleNumber || ''), type: ot.type || 'Tempo', ownership: trip.ownership || 'Hired', transporterName: ot.transporterName || '', transporterPhone: ot.transporterPhone || '' });
  const [saveAsRegular, setSaveAsRegular] = useState(false);
  const [f, setF] = useState({ date: String(trip.date || '').slice(0, 10) || today(), driverName: trip.driverName || '', driverPhone: trip.driverPhone || '', amount: trip.freight?.amount ? String(trip.freight.amount) : '', paidBy: trip.freight?.paidBy || 'Cash', reason: '' });
  const [busy, setBusy] = useState(false);
  // "The vehicle waits & brings it back" per send not delivered yet — a
  // hired vehicle may refuse to wait (2026-10-24).
  const sends = (trip.stops?.[0]?.jobs || []).filter(j => j.kind === 'outsourceSend' && !j.delivered?.at);
  const [waits, setWaits] = useState(() => Object.fromEntries(sends.map(j => [j._id, !!j.bringBack])));
  const vehicle = vehicles.find(v => v._id === vehicleId);
  const hired = mode === 'regular' ? vehicle?.ownership === 'Hired' : one.ownership === 'Hired';
  const pickVehicle = (id) => {
    setVehicleId(id);
    const v = vehicles.find(x => x._id === id);
    if (v) setF(p => ({ ...p, driverName: v.driverName || '', driverPhone: v.driverPhone || '' }));
  };
  const past = f.date && f.date < today();
  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        date: f.date, driverName: f.driverName, driverPhone: f.driverPhone, reason: f.reason, bringBack: waits,
        ...(mode === 'regular' ? { vehicleId } : { oneTimeVehicle: one, saveAsRegular }),
        ...(hired ? { freight: { amount: Number(f.amount), paidBy: f.paidBy } } : {}),
      };
      const res = await apiRequest('PUT', `/api/dispatch-trips/${trip._id}`, body);
      toast({ title: res.message || 'Trip changed' });
      onSaved();
    } catch (e) {
      toast({ title: "Couldn't change the trip", description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change {trip.tripNo} → {trip.stops?.[0]?.vendorName}</DialogTitle>
          <DialogDescription>Now {trip.vehicleNumber} ({trip.ownership}) · {day(trip.date)}. Whatever Store / Production handed over stays with Dispatch.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs text-slate-500">Date</label>
            <Input type="date" min={today()} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
            {past && <p className="text-[11px] text-red-600 mt-0.5">The trip date can't be in the past.</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={mode === 'regular' ? 'default' : 'outline'} onClick={() => setMode('regular')}>Regular vehicle</Button>
            <Button size="sm" variant={mode === 'oneTime' ? 'default' : 'outline'} onClick={() => setMode('oneTime')}>One-time vehicle</Button>
          </div>
          {mode === 'regular' ? (
            <div>
              <label className="text-xs text-slate-500">Vehicle</label>
              <Select value={vehicleId} onValueChange={pickVehicle}>
                <SelectTrigger><SelectValue placeholder="Pick a vehicle" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v._id} value={v._id}>{v.number} · {v.type} · {v.ownership}{v.transporterName ? ` (${v.transporterName})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><label className="text-xs text-slate-500">Vehicle number</label><Input value={one.number} onChange={e => setOne({ ...one, number: e.target.value })} placeholder="UK07 CD 9876" /></div>
              <div>
                <label className="text-xs text-slate-500">Type</label>
                <Select value={one.type} onValueChange={v => setOne({ ...one, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Tempo', 'Pickup', 'Truck', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Own / hired</label>
                <Select value={one.ownership} onValueChange={v => setOne({ ...one, ownership: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Hired">Hired</SelectItem><SelectItem value="Own">Own</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-slate-500">Transporter</label><Input value={one.transporterName} onChange={e => setOne({ ...one, transporterName: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500">Transporter phone</label><Input value={one.transporterPhone} onChange={e => setOne({ ...one, transporterPhone: e.target.value })} /></div>
              <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" className="accent-violet-600" checked={saveAsRegular} onChange={e => setSaveAsRegular(e.target.checked)} /> Save as a regular vehicle
              </label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-500">Driver</label><Input value={f.driverName} onChange={e => setF({ ...f, driverName: e.target.value })} /></div>
            <div><label className="text-xs text-slate-500">Driver phone</label><Input value={f.driverPhone} onChange={e => setF({ ...f, driverPhone: e.target.value })} /></div>
          </div>
          {hired && (
            <div className="grid grid-cols-2 gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
              <div><label className="text-xs text-slate-500">Freight (₹)</label><Input type="number" min="0" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
              <div>
                <label className="text-xs text-slate-500">Paid by</label>
                <Select value={f.paidBy} onValueChange={v => setF({ ...f, paidBy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Cash', 'Bank', 'Transporter bills'].map(t => <SelectItem key={t} value={t}>{t === 'Transporter bills' ? 'Transporter bills later' : t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="col-span-2 text-[11px] text-slate-500">The trip's Transporting Cost expense follows this{trip.freight?.amount > 0 ? ` (now ${inr(trip.freight.amount)})` : ''}.</p>
            </div>
          )}
          {!hired && trip.freight?.amount > 0 && <p className="text-[11px] text-amber-700">An own vehicle has no freight — the {inr(trip.freight.amount)} Transporting Cost expense will be removed.</p>}
          {sends.length > 0 && (
            <div className="rounded-md border border-teal-200 bg-teal-50/40 p-2 space-y-1.5">
              <p className="text-xs font-semibold text-slate-700">Outsource work on this trip</p>
              {sends.map(j => (
                <label key={j._id} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="accent-teal-600 mt-0.5" checked={!!waits[j._id]} onChange={e => setWaits(p => ({ ...p, [j._id]: e.target.checked }))} />
                  <span><b>{j.orderNo} · {j.itemName}</b> — the vehicle waits &amp; brings it back</span>
                </label>
              ))}
              <p className="text-[11px] text-slate-500">Unticked: collect it later from "To collect" (a new trip).</p>
            </div>
          )}
          <div><label className="text-xs text-slate-500">Reason *</label><Input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} placeholder="e.g. breakdown, vendor asked for Monday" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button disabled={busy || past || !f.date || !f.reason.trim() || (mode === 'regular' ? !vehicleId : !one.number.trim()) || (hired && !(Number(f.amount) > 0))} onClick={submit}>Save change</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A return job (slice 7): one row per request — count it (Collected) or Report short.
function ReturnJob({ trip, job, canEdit, busy, act }) {
  const [counts, setCounts] = useState({});
  const [shortFor, setShortFor] = useState(null); // requestId
  const [short, setShort] = useState({ count: '', note: '' });
  const uncounted = (job.returns || []).some(e => !e.collected?.at && !e.short?.at);
  return (
    <div className="px-3 py-2 space-y-1 text-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span>
          Collect <b>{job.orderNo}</b> · {job.itemName} <span className="text-xs text-slate-500">({(job.stepNames || []).join(' › ')})</span>
          {job.sameTrip && <span className="ml-1.5 text-[11px] text-teal-700">· the vehicle waited</span>}
        </span>
        {canEdit && uncounted && (
          <Button size="sm" variant="outline" className="h-7 text-slate-600" disabled={busy} title="The vendor isn't ready — it goes back to To collect for a later trip"
            onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${job._id}/collect-later`, {}, 'Left for a later trip')}>Not ready — collect later</Button>
        )}
      </div>
      {(job.returns || []).map(e => (
        <div key={e.requestId} className="flex items-center gap-2 flex-wrap text-xs text-slate-600 pl-2">
          {/* Pieces can come back in parts (2026-10-26): the entry is what was
              still with the vendor when the trip was planned. */}
          <span className="font-mono">{e.orderCode}</span> · {e.qty} {e.unit} {e.unit === 'pcs' ? 'to collect' : 'sent'}
          {e.lostNote && <span className="text-amber-700">· {e.lostNote}</span>}
          {e.collected?.at ? <Done stamp={e.collected} label={`Collected ${e.collected.count}${e.collected.count < e.qty ? ` of ${e.qty} · ${e.qty - e.collected.count} still with the vendor` : ''}${e.collected.viaStore ? " (at Store's receive)" : ''}`} />
            : e.short?.at ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />Short{e.short.from === 'Store' ? ' (Store)' : ''}: {e.short.count} back{e.short.note ? ` — ${e.short.note}` : ''}</span>
            : canEdit && (shortFor === String(e.requestId) ? (
              <span className="flex items-center gap-1">
                <Input className="h-7 w-28" type="number" min="0" placeholder="came back" value={short.count} onChange={ev => setShort({ ...short, count: ev.target.value })} />
                <Input className="h-7 w-40" placeholder="note" value={short.note} onChange={ev => setShort({ ...short, note: ev.target.value })} />
                <Button size="sm" variant="outline" className="h-7 text-amber-700 border-amber-300" disabled={busy}
                  onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${job._id}/short`, { requestId: e.requestId, count: short.count, note: short.note }, 'Reported short')}>Report</Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => setShortFor(null)}>×</Button>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {/* Dispatch counts at the vendor — left empty on purpose (a filled-in
                    number would just be clicked through; "Report short" relies on a real count). */}
                <Input className="h-7 w-20 placeholder:text-slate-300" type="number" min="0" placeholder="count" title={e.unit === 'pcs' ? `Count the pieces — ${e.qty} ${e.unit} to collect; fewer is fine, the rest stays with the vendor` : `Count the units — ${e.qty} ${e.unit} were sent`} value={counts[e.requestId] ?? ''} onChange={ev => setCounts({ ...counts, [e.requestId]: ev.target.value })} />
                <Button size="sm" className="h-7" disabled={busy || counts[e.requestId] === '' || counts[e.requestId] == null}
                  onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${job._id}/collected`, { counts: { [e.requestId]: Number(counts[e.requestId]) } }, 'Collected')}>Collected</Button>
                <Button size="sm" variant="outline" className="h-7 text-amber-700 border-amber-300" onClick={() => { setShortFor(String(e.requestId)); setShort({ count: '', note: '' }); }}>Report short</Button>
              </span>
            ))}
          {/* Store counted fewer than Dispatch collected (2026-10-27): inside the
              company — Dispatch and Store find the rest, then Store receives. */}
          {e.collected?.at && e.short?.from === 'Store' && !e.received?.at && (
            <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="w-3.5 h-3.5" />Store counted {e.short.count} of the {e.collected.count} collected{e.short.note ? ` — ${e.short.note}` : ''} · find the missing {e.collected.count - e.short.count}</span>
          )}
          {e.received?.at && <Done stamp={e.received} label={e.received.partial ? 'Store received (part — waiting for the rest)' : 'Store received'} />}
        </div>
      ))}
    </div>
  );
}

function TripCard({ trip, canEdit, onChanged, vehicles = [] }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const stop = trip.stops?.[0] || {};
  const act = async (url, body, okMsg) => {
    setBusy(true);
    try {
      const res = await apiRequest('POST', url, body || {});
      toast({ title: res.message || okMsg });
      onChanged();
    } catch (e) {
      toast({ title: 'Couldn\'t do that', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const live = ['Planned', 'Out'].includes(trip.status);
  const sendReady = (j) => (!j.store?.needed || j.store.handedOver?.at) && (j.production || []).every(p => p.handedOver?.at);
  // Batch "Delivered to vendor" (2026-10-21): every send on this trip that's
  // handed over and not yet delivered, one by one — stops at the first refusal.
  const deliverable = (stop.jobs || []).filter(j => j.kind === 'outsourceSend' && !j.delivered?.at && sendReady(j));
  const deliverAll = async () => {
    setBusy(true);
    let done = 0;
    try {
      for (const j of deliverable) {
        await apiRequest('POST', `/api/dispatch-trips/${trip._id}/jobs/${j._id}/delivered`, {});
        done += 1;
      }
      toast({ title: `${trip.tripNo}: ${done} line${done === 1 ? '' : 's'} delivered to ${stop.vendorName}` });
    } catch (e) {
      const failed = deliverable[done];
      toast({ title: `Stopped at ${failed?.orderNo} · ${failed?.itemName}`, description: `${done ? `${done} delivered before it. ` : ''}${e.message}`, variant: 'destructive' });
    } finally { setBusy(false); onChanged(); }
  };
  const nothingHanded =(stop.jobs || []).every(j => !j.pickedUp?.at && !j.delivered?.at && !j.store?.handedOver?.at && !(j.production || []).some(p => p.handedOver?.at)
    && !(j.returns || []).some(x => x.collected?.at || x.short?.at));
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-slate-800 flex items-center gap-2">
              {trip.tripNo}
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${TRIP_TONE[trip.status]}`}>{trip.status}</span>
            </p>
            <p className="text-sm text-slate-500">{day(trip.date)} · {trip.vehicleNumber} ({trip.ownership}){trip.driverName ? ` · ${trip.driverName}${trip.driverPhone ? ` ${trip.driverPhone}` : ''}` : ''}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{stop.vendorName}{stop.challanNo ? ` · challan ${stop.challanNo}` : ''}{stop.ewayBillNo ? ` · e-way ${stop.ewayBillNo}` : ''}</p>
            {trip.freight?.amount > 0 && <p className="text-xs text-amber-700">Freight {inr(trip.freight.amount)} · {trip.freight.paidBy}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && live && deliverable.length > 1 && (
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={busy} onClick={deliverAll}>
                <Truck className="w-3.5 h-3.5 mr-1" />Delivered all ({deliverable.length}) to vendor
              </Button>
            )}
            {canEdit && trip.status === 'Planned' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setChanging(true)}>
                <Truck className="w-3.5 h-3.5 mr-1" />Change vehicle / date
              </Button>
            )}
            {canEdit && trip.status === 'Planned' && nothingHanded && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200" disabled={busy}
                onClick={() => act(`/api/dispatch-trips/${trip._id}/cancel`, {}, 'Cancelled')}><Ban className="w-3.5 h-3.5 mr-1" />Cancel trip</Button>
            )}
          </div>
        </div>
        {(trip.activity || []).length > 0 && (
          <div className="text-xs">
            <button type="button" className="text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline" onClick={() => setShowHistory(s => !s)}>
              {showHistory ? 'Hide history' : `History (${trip.activity.length})`}
            </button>
            {showHistory && (
              <ul className="mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                {[...trip.activity].reverse().map((a, i) => (
                  <li key={i} className={a.action === 'changed' ? 'text-violet-700' : 'text-slate-600'}>
                    {new Date(a.at).toLocaleString('en-IN')} · {a.byName} — {a.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {changing && <ChangeTripDialog trip={trip} vehicles={vehicles} onClose={() => setChanging(false)} onSaved={() => { setChanging(false); onChanged(); }} />}
        <div className="border rounded-md divide-y">
          {(stop.jobs || []).map(j => {
            if (j.kind === 'poPickup') {
              // By line (2026-10-26). Store's receive can record the pickup
              // first ("at Store's receive"); a line can be left for later.
              const lines = j.poLines || [];
              const open = lines.filter(e => !e.later?.at && !e.pickedUp?.at);
              const canPick = canEdit && live && !j.pickedUp?.at && (!lines.length || open.length > 0);
              return (
                <div key={j._id} className="px-3 py-2 space-y-1 text-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-400" />Pick up <b>{j.poNumber}</b></span>
                    {canPick ? <Button size="sm" className="h-7" disabled={busy} onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${j._id}/picked-up`, {}, 'Picked up')}>Picked up</Button>
                      : !lines.length && <Done stamp={j.pickedUp} label={j.pickedUp?.viaStore ? "Picked up (at Store's receive)" : 'Picked up'} />}
                  </div>
                  {lines.map(e => (
                    <div key={String(e.lineId)} className="flex items-center justify-between gap-2 flex-wrap text-xs pl-5">
                      <span>{e.itemName} · {e.quantity}{e.unit ? ` ${e.unit}` : ''}</span>
                      {e.later?.at ? <span className="text-amber-700">Left for a later trip</span>
                        : e.pickedUp?.at ? (
                          <span className="inline-flex items-center gap-2">
                            <Done stamp={e.pickedUp} label={e.pickedUp.viaStore ? "Picked up (at Store's receive)" : e.received?.at ? 'Picked up · received at Store' : 'Picked up'} />
                            {/* Correction (2026-10-26): marked picked up but it wasn't on
                                the vehicle — until Store receives it (Store receives only
                                what really arrived). */}
                            {canEdit && trip.status !== 'Cancelled' && !e.received?.at && !e.pickedUp.viaStore && (
                              <Button size="sm" variant="ghost" className="h-6 text-[11px] text-amber-700" disabled={busy}
                                onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${j._id}/po-line-later`, { lineId: e.lineId }, 'Corrected — left for a later trip')}>Wasn't on the vehicle — later</Button>
                            )}
                          </span>
                        )
                        : canEdit && live && lines.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-6 text-[11px]" disabled={busy}
                            onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${j._id}/po-line-later`, { lineId: e.lineId }, 'Left for a later trip')}>Not ready — later</Button>
                        )}
                    </div>
                  ))}
                </div>
              );
            }
            if (j.kind === 'outsourceReturn') {
              return <ReturnJob key={j._id} trip={trip} job={j} canEdit={canEdit && live} busy={busy} act={act} />;
            }
            const ready = sendReady(j);
            // Fallback 2: delivered, not planned to come back, vendor is done — within
            // 24 h and still with the vendor, not on another trip (the server works
            // that out: job.canBringBack).
            const canBringBack = canEdit && j.canBringBack;
            return (
              <div key={j._id} className="px-3 py-2 space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    Send <b>{j.orderNo}</b> · {j.itemName} <span className="text-xs text-slate-500">({(j.stepNames || []).join(' › ')})</span>
                    {j.bringBack && <span className="ml-1.5 text-[11px] text-teal-700">↩ the vehicle waits &amp; brings it back</span>}
                  </span>
                  {j.delivered?.at ? (
                    <span className="flex items-center gap-2 flex-wrap">
                      <Done stamp={j.delivered} label="Delivered" />
                      {canBringBack && (
                        <Button size="sm" variant="outline" className="h-7 text-teal-700 border-teal-300" disabled={busy} title="The vendor finished while the vehicle is there — collect it on this trip"
                          onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${j._id}/bring-back`, {}, 'Comes back on this trip')}>Bring back on this trip</Button>
                      )}
                    </span>
                  ) : canEdit && live && (
                      <Button size="sm" className="h-7 bg-teal-600 hover:bg-teal-700 text-white" disabled={busy || !ready}
                        title={ready ? '' : 'Waiting for Store / Production to hand over'}
                        onClick={() => act(`/api/dispatch-trips/${trip._id}/jobs/${j._id}/delivered`, {}, 'Delivered')}>Delivered to vendor</Button>
                    )}
                </div>
                {/* Where Dispatch collects it (2026-10-23 — "Production ORD-…: 2 pcs · Handed over — waiting" didn't say so). */}
                {j.store?.needed && (
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600"><Warehouse className="w-3.5 h-3.5 text-slate-400" />Collect from <b>Store</b>: {j.store.summary} <HandOver stamp={j.store.handedOver} who="Store" /></div>
                )}
                {(j.production || []).map(p => (
                  <div key={p.productionOrder} className="flex items-center gap-2 flex-wrap text-xs text-slate-600"><Factory className="w-3.5 h-3.5 text-slate-400" />Collect from <b>Production</b> ({p.orderCode}): {p.summary} <HandOver stamp={p.handedOver} who="Production" /></div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VendorPickups() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('dispatches', 'vendorPickups', 'add');
  const canEdit = hasFeatureAccess('dispatches', 'vendorPickups', 'edit');
  const [tab, setTab] = useState('purchase');
  const [tripFilter, setTripFilterRaw] = useState('Planned,Out');
  // Trips are paged on the server (2026-10-21): search, dates, page.
  const [tripPage, setTripPage] = useState(1);
  const [tripSearch, setTripSearchRaw] = useState('');
  const [tripFrom, setTripFromRaw] = useState('');
  const [tripTo, setTripToRaw] = useState('');
  const tripSearchText = useDebouncedValue(tripSearch.trim(), 400);
  const resetPage = (fn) => (v) => { fn(v); setTripPage(1); };
  const setTripFilter = resetPage(setTripFilterRaw);
  const setTripSearch = resetPage(setTripSearchRaw);
  const setTripFrom = resetPage(setTripFromRaw);
  const setTripTo = resetPage(setTripToRaw);
  const [picked, setPicked] = useState({}); // key → { vendor, job }
  const [showNew, setShowNew] = useState(false);

  const waitingQ = useQuery({ queryKey: ['dispatch-waiting'], queryFn: () => apiRequest('GET', '/api/dispatch-trips/waiting').then(r => r.data || []) });
  const tripsQ = useQuery({
    queryKey: ['dispatch-trips', tripFilter, tripSearchText, tripFrom, tripTo, tripPage],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(tripPage), limit: '20' });
      if (tripFilter) p.set('status', tripFilter);
      if (tripSearchText) p.set('search', tripSearchText);
      if (tripFrom) p.set('from', tripFrom);
      if (tripTo) p.set('to', tripTo);
      return apiRequest('GET', `/api/dispatch-trips?${p.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
  const trips = tripsQ.data?.data || [];
  const tripPg = tripsQ.data?.pagination || { page: 1, pages: 1, total: 0 };
  const vehiclesQ = useQuery({ queryKey: ['dispatch-vehicles', 'active'], queryFn: () => apiRequest('GET', '/api/dispatch-trips/vehicles?active=true').then(r => r.data || []) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dispatch-waiting'] });
    qc.invalidateQueries({ queryKey: ['dispatch-trips'] });
  };

  const vendors = waitingQ.data || [];
  const pickedVendorId = Object.values(picked)[0]?.vendor || null;
  const pickedVendor = vendors.find(v => String(v.vendor) === String(pickedVendorId));
  const toggle = (key, vendor, job, on) => {
    setPicked(prev => {
      const next = String(prev[Object.keys(prev)[0]]?.vendor || vendor) === String(vendor) ? { ...prev } : {};
      if (on) next[key] = { vendor, job }; else delete next[key];
      return next;
    });
  };
  const counts = useMemo(() => ({
    purchase: vendors.reduce((s, v) => s + v.purchase.reduce((n, po) => n + po.items.length, 0), 0), // lines
    outsource: vendors.reduce((s, v) => s + v.outsource.length, 0),
    returns: vendors.reduce((s, v) => s + (v.returns || []).reduce((n, l) => n + l.requests.length, 0), 0),
  }), [vendors]);
  const markReady = async (outsourceOrder, requestId) => {
    try {
      await apiRequest('POST', '/api/dispatch-trips/vendor-ready', { outsourceOrder, requestId });
      refresh();
    } catch (e) { toast({ title: "Couldn't mark it", description: e.message, variant: 'destructive' }); }
  };
  // Return picks are per request; the trip gets one job per line. PO picks
  // are per line (2026-10-26); the trip gets one pickup job per PO.
  const tripJobs = () => {
    const out = []; const byLine = new Map(); const byPo = new Map();
    for (const { job } of Object.values(picked)) {
      if (job.kind === 'poLine') {
        const k = String(job.purchase);
        if (!byPo.has(k)) { byPo.set(k, { kind: 'poPickup', purchase: job.purchase, lineIds: [] }); out.push(byPo.get(k)); }
        byPo.get(k).lineIds.push(job.lineId);
        continue;
      }
      if (job.kind !== 'outsourceReturn') { out.push(job); continue; }
      const k = String(job.lineId);
      if (!byLine.has(k)) { byLine.set(k, { kind: 'outsourceReturn', outsourceOrder: job.outsourceOrder, lineId: job.lineId, requestIds: [] }); out.push(byLine.get(k)); }
      byLine.get(k).requestIds.push(job.requestId);
    }
    return out;
  };

  const vendorBlock = (v, kind) => {
    const rows = kind === 'purchase' ? v.purchase : kind === 'returns' ? (v.returns || []) : v.outsource;
    if (!rows.length) return null;
    return (
      <Card key={`${kind}-${v.vendor}`} className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          <div>
            <p className="font-semibold text-slate-800">{v.vendorName}</p>
            {v.address && <p className="text-xs text-slate-400">{v.address}{v.phone ? ` · ${v.phone}` : ''}</p>}
          </div>
          <div className="border rounded-md divide-y bg-slate-50">
            {kind === 'returns' ? v.returns.map(l => (
              <div key={`ret-${l.lineId}`} className="px-3 py-2 text-sm space-y-1">
                <p><b>{l.orderNo}</b> · {l.itemName} <span className="text-xs text-slate-500">({l.stepNames.join(' › ')}){l.sentAt ? ` · sent ${day(l.sentAt)}` : ''}</span></p>
                {l.requests.map(q => {
                  const k = `ret:${q.requestId}`;
                  return (
                    <label key={k} className="flex items-center gap-2 text-xs pl-2 cursor-pointer flex-wrap">
                      {canAdd && <Check checked={!!picked[k]} onChange={on => toggle(k, v.vendor, { kind: 'outsourceReturn', outsourceOrder: l.outsourceOrder, lineId: l.lineId, requestId: q.requestId }, on)} />}
                      <span className="font-mono">{q.orderCode}</span> · {q.qty} {l.qtyUnit}{q.backQty > 0 ? ` (${q.backQty} of ${q.sentQty} already back)` : ''}
                      {q.lostQty > 0 && <span className="text-amber-700">· {q.lostQty} not coming ({(q.lost || []).map(l => `${l.qty}: ${l.reason}`).join('; ')})</span>}
                      {q.vendorReady ? <span className="inline-flex items-center gap-1 text-emerald-700"><BellRing className="w-3 h-3" />Vendor says ready</span>
                        : canEdit && <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={(ev) => { ev.preventDefault(); markReady(l.outsourceOrder, q.requestId); }}>Vendor says ready</Button>}
                      {q.short && <span className="text-amber-700">Short last time: {q.short.count} back{q.short.note ? ` — ${q.short.note}` : ''}</span>}
                    </label>
                  );
                })}
              </div>
            )) : kind === 'purchase' ? v.purchase.map(po => (
              // By line (2026-10-26): tick the lines this trip picks up; the
              // rest stay here for another trip (Store can't receive them yet).
              <div key={`po:${po.purchase}`} className="px-3 py-2 text-sm space-y-1">
                <p><b>{po.poNumber}</b> <span className="text-xs text-slate-500">· {po.status} · expected {day(po.expectedDeliveryDate)}</span></p>
                {po.items.map(i => {
                  const k = `pol:${i.lineId}`;
                  return (
                    <label key={k} className="flex items-start gap-2 text-xs pl-2 cursor-pointer">
                      {canAdd && <Check checked={!!picked[k]} onChange={on => toggle(k, v.vendor, { kind: 'poLine', purchase: po.purchase, lineId: i.lineId }, on)} />}
                      <span className="flex-1 min-w-0">
                        {i.itemName} · {i.quantity}{i.purchaseUnit ? ` ${i.purchaseUnit}` : ''}
                        {i.sizes && <span className="block text-slate-500">{i.sizes}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )) : v.outsource.map(l => {
              const k = `os:${l.lineId}`;
              return (
                <label key={k} className={`flex items-start gap-2 px-3 py-2 text-sm ${l.sendable === false ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                  {/* 2026-10-23: no trip until Store has the material (no tick box). */}
                  {canAdd && (l.sendable === false
                    ? <span className="w-4 shrink-0" />
                    : <Check checked={!!picked[k]} onChange={on => toggle(k, v.vendor, { kind: 'outsourceSend', outsourceOrder: l.outsourceOrder, lineId: l.lineId, _label: `${l.orderNo} · ${l.itemName}`, _expectedBy: l.expectedBy || null }, on)} />)}
                  <span className="flex-1 min-w-0">
                    <b>{l.orderNo}</b> · {l.itemName} <span className="text-xs text-slate-500">({l.stepNames.join(' › ')}) · {l.qty} {l.qtyUnit} · {l.orderCodes.join(', ')}</span>
                    {l.sendable === false && <span className="block text-xs text-amber-700 font-medium"><AlertTriangle className="inline w-3 h-3 mr-1" />Waiting for material — {l.materialWarning.replace(/^Material not ready: /, '')}</span>}
                    {l.storeSummary && <span className="block text-xs text-slate-600"><Warehouse className="inline w-3 h-3 mr-1 text-slate-400" />From <b>Store</b>: {l.storeSummary}</span>}
                    {l.production.map(p => <span key={p.orderCode} className="block text-xs text-slate-600"><Factory className="inline w-3 h-3 mr-1 text-slate-400" />From <b>Production</b> ({p.orderCode}): {p.summary}</span>)}
                  </span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck className="h-6 w-6 text-violet-600" /> Vendor Pickups</h1>
          <p className="text-slate-500 text-sm mt-0.5">Trips to vendors: pick up "We pick up" POs, take outsource work to the vendor.</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}><RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      {Object.keys(picked).length > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex items-center justify-between gap-2 flex-wrap rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm">
          <span>{Object.keys(picked).length} job{Object.keys(picked).length === 1 ? '' : 's'} for <b>{pickedVendor?.vendorName}</b> (one trip goes to one vendor)</span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPicked({})}>Clear</Button>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setShowNew(true)}><Truck className="w-3.5 h-3.5 mr-1" />New trip</Button>
          </span>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="purchase">Purchase ({counts.purchase})</TabsTrigger>
          <TabsTrigger value="outsource">Outsource ({counts.outsource} to send · {counts.returns} to collect)</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
        </TabsList>
        <TabsContent value="purchase" className="space-y-3 mt-3">
          {waitingQ.isLoading ? <p className="text-slate-400 py-10 text-center">Loading…</p>
            : counts.purchase === 0 ? <p className="text-slate-400 py-10 text-center">No PO lines waiting to be picked up.</p>
            : vendors.map(v => vendorBlock(v, 'purchase'))}
        </TabsContent>
        <TabsContent value="outsource" className="space-y-3 mt-3">
          <h3 className="text-sm font-semibold text-slate-600">To send</h3>
          {waitingQ.isLoading ? <p className="text-slate-400 py-6 text-center">Loading…</p>
            : counts.outsource === 0 ? <p className="text-slate-400 py-6 text-center">No outsource work waiting to be sent.</p>
            : vendors.map(v => vendorBlock(v, 'outsource'))}
          <h3 className="text-sm font-semibold text-slate-600 pt-2">To collect (with the vendor)</h3>
          {waitingQ.isLoading ? null
            : counts.returns === 0 ? <p className="text-slate-400 py-6 text-center">Nothing with vendors right now.</p>
            : vendors.map(v => vendorBlock(v, 'returns'))}
        </TabsContent>
        <TabsContent value="trips" className="space-y-3 mt-3">
          <div className="flex gap-2 flex-wrap items-center">
            {[['Planned,Out', 'Live'], ['Done', 'Done'], ['', 'All']].map(([val, label]) => (
              <Button key={label} size="sm" variant={tripFilter === val ? 'default' : 'outline'} onClick={() => setTripFilter(val)}>{label}</Button>
            ))}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <Input className="pl-8 h-9 bg-white" placeholder="Trip, vehicle, vendor, OSO / PO no.…" value={tripSearch} onChange={e => setTripSearch(e.target.value)} />
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              From <Input type="date" className="h-9 w-36 bg-white" value={tripFrom} onChange={e => setTripFrom(e.target.value)} />
              to <Input type="date" className="h-9 w-36 bg-white" value={tripTo} onChange={e => setTripTo(e.target.value)} />
            </span>
            {(tripSearch || tripFrom || tripTo) && <Button size="sm" variant="ghost" onClick={() => { setTripSearch(''); setTripFrom(''); setTripTo(''); }}>Clear</Button>}
          </div>
          {tripsQ.isLoading ? <p className="text-slate-400 py-10 text-center">Loading…</p>
            : !trips.length ? <p className="text-slate-400 py-10 text-center">{tripSearchText || tripFrom || tripTo ? 'No trips match.' : 'No trips.'}</p>
            : trips.map(t => <TripCard key={t._id} trip={t} canEdit={canEdit} onChanged={refresh} vehicles={vehiclesQ.data || []} />)}
          {tripPg.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setTripPage(p => Math.max(1, p - 1))} disabled={tripPg.page <= 1}>Previous</Button>
              <span className="text-sm text-slate-500">Page {tripPg.page} of {tripPg.pages} ({tripPg.total} trips)</span>
              <Button variant="outline" size="sm" onClick={() => setTripPage(p => p + 1)} disabled={tripPg.page >= tripPg.pages}>Next</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showNew && pickedVendor && (
        <NewTripDialog open={showNew} onClose={() => setShowNew(false)} vendor={pickedVendor}
          jobs={tripJobs()} vehicles={vehiclesQ.data || []}
          onCreated={() => { setShowNew(false); setPicked({}); setTab('trips'); refresh(); qc.invalidateQueries({ queryKey: ['dispatch-vehicles'] }); }} />
      )}
    </div>
  );
}
