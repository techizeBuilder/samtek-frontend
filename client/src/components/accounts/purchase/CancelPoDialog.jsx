import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Ban } from 'lucide-react';

// Cancelling a PO (procurement-v2 gap 13, 2026-10-09). A PO is never edited
// once ordered — a different price or quantity = cancel and order again.
// Purchase asks here; the Company Admin approves (PO Approvals). Nothing
// changes until then, and Store can still receive meanwhile — the server
// re-checks what's left when it's approved (services/poCancellationService.js).
//  - Nothing received → the whole PO. Some lines received → "short close":
//    only the lines not received yet.
//  - Each request on those lines goes back to RFQ/PO, unless marked "no
//    longer needed".
export const PO_CANCEL_REASONS = ['Vendor can\'t supply', 'Vendor changed price', 'Vendor delay', 'Need no longer exists', 'Ordered by mistake', 'Other'];
const VENDOR_SIDE = ['Vendor can\'t supply', 'Vendor changed price', 'Vendor delay'];
export const CANCELLABLE_STATUSES = ['Draft', 'Sent', 'Acknowledged', 'Partially Received'];

const prRefsOf = (line) => (line.purchaseRequests?.length ? line.purchaseRequests : (line.purchaseRequest ? [line.purchaseRequest] : []));
const lineReceived = (line) => {
  const refs = prRefsOf(line);
  if (refs.length) return refs.every(pr => pr?.status === 'Received');
  return Number(line.quantity) > 0 && Number(line.receivedQuantity) >= Number(line.quantity);
};
// The lines a cancel would take right now (the server checks again).
export const linesToCancel = (po) => (po.items || []).filter(l => !l.cancelled?.at && !lineReceived(l));
export const canAskToCancel = (po) => CANCELLABLE_STATUSES.includes(po.status)
  && !(po.cancellations || []).some(c => c.status === 'Requested')
  && linesToCancel(po).length > 0;

export default function CancelPoDialog({ open, onOpenChange, po, onDone }) {
  const { toast } = useToast();
  const [reasons, setReasons] = useState([]);
  const [side, setSide] = useState('');
  const [sideTouched, setSideTouched] = useState(false);
  const [note, setNote] = useState('');
  const [closeIds, setCloseIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasons([]); setSide(''); setSideTouched(false); setNote(''); setCloseIds(new Set());
  }, [open]);

  const lines = useMemo(() => (po ? linesToCancel(po) : []), [po]);
  const live = (po?.items || []).filter(l => !l.cancelled?.at);
  const full = lines.length > 0 && lines.length === live.length;
  const kept = live.filter(l => !lines.includes(l));

  const toggleReason = (r) => {
    const next = reasons.includes(r) ? reasons.filter(x => x !== r) : [...reasons, r];
    setReasons(next);
    // "Whose side" follows the reasons until Purchase picks it themselves.
    if (!sideTouched) setSide(next.some(x => VENDOR_SIDE.includes(x)) ? 'Vendor' : next.length ? 'Ours' : '');
  };
  const toggleClose = (id) => setCloseIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const submit = async () => {
    if (!reasons.length) return toast({ title: 'Pick at least one reason', variant: 'destructive' });
    if (reasons.includes('Other') && !note.trim()) return toast({ title: 'Add a note explaining "Other"', variant: 'destructive' });
    if (!side) return toast({ title: 'Say whose side the cancellation is on', variant: 'destructive' });
    setSaving(true);
    try {
      const res = await apiRequest('POST', `/api/accounts/purchases/orders/${po._id}/cancel-request`, {
        reasons, side, note: note.trim(), closeRequests: [...closeIds],
      });
      toast({ title: 'Sent to the Company Admin', description: res?.message });
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast({ title: 'Could not send the cancellation', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!po) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Ban className="w-4 h-4 text-red-600" /> {full ? 'Cancel PO' : 'Cancel the rest (short close)'} — {po.purchaseOrderNumber}</DialogTitle>
          <DialogDescription>
            Goes to the Company Admin for approval — nothing changes until then. A PO can't be edited: for a different price or quantity, cancel and order again from RFQ/PO.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase">{full ? 'Every line is cancelled' : `Lines not received yet (${lines.length})`}</p>
          <div className="border rounded-md divide-y">
            {lines.map(l => (
              <div key={l._id} className="px-3 py-2 text-sm space-y-1">
                <p className="flex justify-between gap-2"><span className="font-medium text-slate-800">{l.itemName}</span><span className="text-xs text-slate-500">{l.quantity} {l.purchaseUnit || ''}</span></p>
                {prRefsOf(l).filter(pr => pr?._id).map(pr => {
                  const closing = closeIds.has(String(pr._id));
                  return (
                    <div key={pr._id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-slate-400">{pr.requestId}</span>
                      <span className="inline-flex rounded-md border p-0.5">
                        <button type="button" onClick={() => closing && toggleClose(String(pr._id))} className={`px-2 py-0.5 rounded ${!closing ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>Back to RFQ/PO</button>
                        <button type="button" onClick={() => !closing && toggleClose(String(pr._id))} className={`px-2 py-0.5 rounded ${closing ? 'bg-red-600 text-white' : 'text-slate-600'}`}>No longer needed</button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {kept.length > 0 && <p className="text-[11px] text-slate-500">Already received and kept: {kept.map(l => l.itemName).join(', ')}.</p>}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-slate-700">Why? <span className="text-red-500">*</span></p>
          <div className="flex flex-wrap gap-1.5">
            {PO_CANCEL_REASONS.map(r => (
              <button key={r} type="button" onClick={() => toggleReason(r)}
                className={`text-[11px] rounded-full border px-2.5 py-0.5 ${reasons.includes(r) ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-red-400'}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <span>Whose side? <span className="text-red-500">*</span></span>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="cancel-side" checked={side === 'Vendor'} onChange={() => { setSide('Vendor'); setSideTouched(true); }} /> The vendor's</label>
            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="cancel-side" checked={side === 'Ours'} onChange={() => { setSide('Ours'); setSideTouched(true); }} /> Ours</label>
            <span className="text-[11px] text-slate-400">— on the vendor's side, their quote isn't reused</span>
          </div>
          <Input className="h-8 text-sm" value={note} onChange={e => setNote(e.target.value)} placeholder={reasons.includes('Other') ? 'Explain "Other" *' : 'Note (optional)'} />
        </div>

        <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-0.5">
          <li>Once approved: the vendor gets a cancellation email, and the invoice is {full ? 'cancelled' : 'reduced'} (never deleted).</li>
          <li>Any advance already paid is recorded as a credit with the vendor.</li>
          <li>Other vendors' quotes that are still valid come back on RFQ/PO.</li>
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Keep the PO</Button>
          <Button variant="destructive" onClick={submit} disabled={saving || !lines.length}>
            {saving ? 'Sending…' : 'Ask the Company Admin to cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
