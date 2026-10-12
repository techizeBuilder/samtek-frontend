import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock } from 'lucide-react';

// Delivery follow-up (2026-10-10, client blueprint §17 step 13): the vendor
// gave a new date for one PO line — record it with their reason. The old
// date stays in the line's history and the PO's History; Store is told.
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ReviseDeliveryDateDialog({ open, onOpenChange, po, line, onDone }) {
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const today = localDay(new Date());

  useEffect(() => { if (open) { setDate(''); setReason(''); } }, [open]);

  const save = async () => {
    if (!date) return toast({ title: 'Pick the new expected date', variant: 'destructive' });
    if (date < today) return toast({ title: 'The new date can\'t be in the past', variant: 'destructive' });
    if (!reason.trim()) return toast({ title: 'Give the reason for the new date', variant: 'destructive' });
    setSaving(true);
    try {
      const res = await apiRequest('PATCH', `/api/accounts/purchases/orders/${po._id}/lines/${line._id}/expected-date`, { date, reason: reason.trim() });
      toast({ title: 'Date changed', description: res?.message });
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast({ title: 'Could not change the date', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!po || !line) return null;
  const current = line.expectedDeliveryDate || po.expectedDeliveryDate;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClock className="w-4 h-4 text-sky-600" /> New delivery date</DialogTitle>
          <DialogDescription>
            {line.itemName} on {po.purchaseOrderNumber}{po.supplier?.supplierName ? ` (${po.supplier.supplierName})` : ''}. Currently expected {current ? new Date(current).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-xs text-slate-600 space-y-1 block">
            <span>New expected date <span className="text-red-500">*</span></span>
            <Input id="revise-date" type="date" min={today} className="h-9 text-sm" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label className="text-xs text-slate-600 space-y-1 block">
            <span>Reason — what the vendor said <span className="text-red-500">*</span></span>
            <Input id="revise-reason" className="h-9 text-sm" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Transport strike, material at plant on 18 Oct" />
          </label>
          <p className="text-[11px] text-slate-400">Store is told the new date. The old date stays in this line's history and the PO's History.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save new date'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
