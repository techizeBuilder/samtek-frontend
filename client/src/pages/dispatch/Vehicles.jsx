import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Plus, Pencil } from 'lucide-react';

// Dispatch's regular vehicles (outsource-v2 slice 6, 2026-10-20 — T7). A trip
// picks one of these (driver pre-filled), or types a one-time vehicle.
const EMPTY = { number: '', type: 'Tempo', ownership: 'Own', transporterName: '', transporterPhone: '', driverName: '', driverPhone: '', capacityKg: '', active: true };

export default function Vehicles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('dispatches', 'vendorPickups', 'edit');
  const [edit, setEdit] = useState(null); // null | { ...vehicle } (no _id = new)
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['dispatch-vehicles', 'all'], queryFn: () => apiRequest('GET', '/api/dispatch-trips/vehicles').then(r => r.data || []) });

  const save = async () => {
    setBusy(true);
    try {
      const res = edit._id
        ? await apiRequest('PUT', `/api/dispatch-trips/vehicles/${edit._id}`, edit)
        : await apiRequest('POST', '/api/dispatch-trips/vehicles', edit);
      toast({ title: res.message || 'Saved' });
      setEdit(null);
      qc.invalidateQueries({ queryKey: ['dispatch-vehicles'] });
    } catch (e) {
      toast({ title: 'Couldn\'t save', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  const set = (k) => (e) => setEdit(p => ({ ...p, [k]: e?.target ? e.target.value : e }));

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck className="h-6 w-6 text-violet-600" /> Vehicles</h1>
          <p className="text-slate-500 text-sm mt-0.5">Regular vehicles for vendor trips. A one-time vehicle is typed on the trip itself.</p>
        </div>
        {canEdit && <Button size="sm" onClick={() => setEdit({ ...EMPTY })}><Plus className="w-3.5 h-3.5 mr-1" />Add vehicle</Button>}
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr><th className="px-4 py-2.5 text-left">Number</th><th className="px-4 py-2.5 text-left">Type</th><th className="px-4 py-2.5 text-left">Own / hired</th><th className="px-4 py-2.5 text-left">Driver</th><th className="px-4 py-2.5 text-left">Transporter</th><th className="px-4 py-2.5 text-right">Capacity</th><th className="px-4 py-2.5" /></tr>
            </thead>
            <tbody>
              {q.isLoading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
                : !(q.data || []).length ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No vehicles yet.</td></tr>
                : q.data.map(v => (
                  <tr key={v._id} className={`border-t ${v.active ? '' : 'opacity-50'}`}>
                    <td className="px-4 py-2.5 font-mono font-semibold">{v.number}{!v.active && <span className="ml-2 text-[11px] font-sans text-slate-500">inactive</span>}</td>
                    <td className="px-4 py-2.5">{v.type}</td>
                    <td className="px-4 py-2.5">{v.ownership}</td>
                    <td className="px-4 py-2.5">{v.driverName || '—'}{v.driverPhone ? ` · ${v.driverPhone}` : ''}</td>
                    <td className="px-4 py-2.5">{v.transporterName || '—'}{v.transporterPhone ? ` · ${v.transporterPhone}` : ''}</td>
                    <td className="px-4 py-2.5 text-right">{v.capacityKg ? `${v.capacityKg} kg` : '—'}</td>
                    <td className="px-4 py-2.5 text-right">{canEdit && <Button size="sm" variant="outline" className="h-7" onClick={() => setEdit({ ...v, capacityKg: v.capacityKg ?? '' })}><Pencil className="w-3.5 h-3.5" /></Button>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{edit?._id ? `Edit ${edit.number}` : 'Add vehicle'}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2"><label className="text-xs text-slate-500">Number</label><Input value={edit.number} onChange={set('number')} placeholder="UK07 AB 1234" /></div>
              <div>
                <label className="text-xs text-slate-500">Type</label>
                <Select value={edit.type} onValueChange={set('type')}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Tempo', 'Pickup', 'Truck', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Own / hired</label>
                <Select value={edit.ownership} onValueChange={set('ownership')}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Own">Own</SelectItem><SelectItem value="Hired">Hired (freight asked on each trip)</SelectItem></SelectContent></Select>
              </div>
              <div><label className="text-xs text-slate-500">Driver</label><Input value={edit.driverName} onChange={set('driverName')} /></div>
              <div><label className="text-xs text-slate-500">Driver phone</label><Input value={edit.driverPhone} onChange={set('driverPhone')} /></div>
              <div><label className="text-xs text-slate-500">Transporter</label><Input value={edit.transporterName} onChange={set('transporterName')} /></div>
              <div><label className="text-xs text-slate-500">Transporter phone</label><Input value={edit.transporterPhone} onChange={set('transporterPhone')} /></div>
              <div><label className="text-xs text-slate-500">Capacity (kg)</label><Input type="number" min="0" value={edit.capacityKg} onChange={set('capacityKg')} /></div>
              {edit._id && (
                <label className="flex items-center gap-2 text-xs text-slate-600 self-end pb-2">
                  <input type="checkbox" className="accent-violet-600" checked={!!edit.active} onChange={e => setEdit(p => ({ ...p, active: e.target.checked }))} /> Active
                </label>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button disabled={busy || !edit?.number?.trim()} onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
