import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Search, RotateCw, PackageX, RefreshCcw, Ban, Undo2, Wallet } from 'lucide-react';

// QC rejections of purchased material (procurement-v2, accounts Slice 3,
// 2026-10-12 — client's cases). QC failing a purchase job makes one of these;
// Purchase asks the vendor and records the answer here. Nothing is emailed to
// the vendor automatically. Used on Purchase → Purchase Orders → QC Rejections
// and on Accounts → Purchases → QC Rejections.
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const STATUS_TONE = {
  'Awaiting vendor answer': 'bg-red-50 text-red-700 border-red-200',
  'Replacement expected': 'bg-sky-50 text-sky-700 border-sky-200',
  'Replaced': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Refund due': 'bg-amber-50 text-amber-800 border-amber-200',
  'Refunded': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Credited': 'bg-violet-50 text-violet-700 border-violet-200',
  'Written off': 'bg-slate-100 text-slate-600 border-slate-300',
  'Taken off the bill': 'bg-slate-50 text-slate-600 border-slate-200',
};

export const OUTCOMES = [
  { value: 'replace', icon: RefreshCcw, label: 'Vendor will replace it', effect: 'The bill stays the same. The quantity is expected again on the same PO line — Store receives it there and QC checks it again.' },
  { value: 'refund', icon: Undo2, label: 'Vendor takes it back and refunds', effect: 'Taken off the bill. Any advance already paid on it is owed back — Accounts records the refund when it arrives.' },
  { value: 'credit', icon: Wallet, label: 'Vendor takes it back and gives credit', effect: 'Taken off the bill. Any advance already paid on it stays with the vendor as credit, used on a later payment.' },
  { value: 'refused', icon: Ban, label: 'Vendor refuses to replace or refund', effect: 'Taken off the bill (we don\'t pay for it). Any advance already paid on it is written off. Counts against the vendor and puts them on Watchlist.' },
];

export function RejectionAnswerDialog({ open, onOpenChange, rejection, onDone }) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const changing = rejection?.status === 'Replacement expected';
  useEffect(() => { if (open) { setOutcome(''); setDate(''); setNote(''); } }, [open]);
  if (!rejection) return null;
  const choices = changing ? OUTCOMES.filter(o => o.value !== 'replace') : OUTCOMES;

  const save = async () => {
    if (!outcome) return toast({ title: 'Choose what the vendor agreed to', variant: 'destructive' });
    if (outcome === 'replace' && !date) return toast({ title: 'Enter the date the vendor will send the replacement', variant: 'destructive' });
    if (outcome === 'refused' && !note.trim()) return toast({ title: 'Add a note on what the vendor said', variant: 'destructive' });
    setSaving(true);
    try {
      const res = await apiRequest('PUT', `/api/accounts/purchases/rejections/${rejection._id}/answer`, { outcome, expectedDate: date || undefined, note });
      toast({ title: res?.message || 'Answer recorded' });
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast({ title: 'Not saved', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackageX className="w-4 h-4 text-red-600" /> {changing ? 'The replacement didn\'t come — change the answer' : 'What did the vendor agree to?'}</DialogTitle>
          <DialogDescription>
            {rejection.number} · {rejection.poNumber} · {rejection.vendorName}: {rejection.rejectedQty} {rejection.qtyUnit} of <strong>{rejection.itemName}</strong> rejected by QC — {rejection.reason || 'no reason given'} ({inr(rejection.value)}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {choices.map(o => (
            <label key={o.value} className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${outcome === o.value ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type="radio" name="outcome" className="mt-1" checked={outcome === o.value} onChange={() => setOutcome(o.value)} />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800"><o.icon className="w-3.5 h-3.5" /> {o.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{o.effect}</span>
              </span>
            </label>
          ))}
          {outcome === 'replace' && (
            <label className="block text-xs text-slate-600 space-y-1">
              <span>When will the vendor send it? <span className="text-red-500">*</span></span>
              <Input type="date" className="h-9 text-sm w-48" min={localDay(new Date())} value={date} onChange={e => setDate(e.target.value)} />
            </label>
          )}
          <label className="block text-xs text-slate-600 space-y-1">
            <span>Note {outcome === 'refused' ? <span className="text-red-500">*</span> : '(optional)'}</span>
            <Input className="h-9 text-sm" value={note} onChange={e => setNote(e.target.value)} placeholder={outcome === 'refused' ? 'What the vendor said' : 'e.g. who you spoke to'} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || !outcome}>{saving ? 'Saving…' : 'Record answer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const VIEWS = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Settled' },
  { value: 'all', label: 'All' },
];

export default function QcRejections({ canAnswer = true, onCounts }) {
  const [view, setView] = useState('open');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 400);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view, page: String(page), limit: '20' });
      if (q) params.set('search', q);
      const res = await apiRequest('GET', `/api/accounts/purchases/rejections?${params}`);
      setData(res?.data || null);
      onCounts?.(res?.data?.counts || null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [view, q, page]);

  const rows = data?.rejections || [];
  const pag = data?.pagination;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map(v => (
          <button key={v.value} type="button" onClick={() => { setView(v.value); setPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${view === v.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
            {v.label}{v.value === 'open' && data?.counts?.open ? ` (${data.counts.open})` : ''}
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9 h-9" placeholder="REJ, PO, vendor or item…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={load}><RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>
      <p className="text-[11px] text-slate-500">QC-rejected purchase material. Ask the vendor and record their answer — nothing is sent to the vendor automatically. The PO's full payment waits until every rejection on it is settled.</p>

      <div className="bg-white border rounded-lg divide-y">
        {loading ? <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
          : rows.length === 0 ? <p className="py-12 text-center text-slate-400 text-sm">{view === 'open' ? 'No rejections waiting.' : 'Nothing here.'}</p>
            : rows.map(r => {
              const rep = r.replacement?.purchaseRequest;
              const canChange = r.status === 'Replacement expected' && rep && rep.status !== 'Received';
              return (
                <div key={r._id} className="p-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{r.number}</span>
                      {r.itemName}
                      <span className="text-slate-500 font-normal">· {r.rejectedQty} {r.qtyUnit}</span>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.status] || ''}`}>{r.status}</Badge>
                      {r.replacementOf && <Badge variant="outline" className="text-[10px]">replacement failed again</Badge>}
                    </p>
                    <p className="text-xs text-slate-600">{r.poNumber} · {r.vendorName} · QC {r.qcJobRef}: "{r.reason || 'no reason'}" · <strong>{inr(r.value)}</strong> · {day(r.createdAt)}</p>
                    {r.outcome && (
                      <p className="text-xs text-slate-600">
                        {OUTCOMES.find(o => o.value === r.outcome)?.label}
                        {r.outcome === 'replace' && r.replacement?.expectedDate ? ` — expected ${day(r.replacement.expectedDate)}${rep ? ` (${rep.requestId}: ${rep.status})` : ''}` : ''}
                        {r.advanceShare > 0 ? ` · advance on it ${inr(r.advanceShare)}${r.moneyBack ? ` (${r.moneyBack.status})` : ''}` : ''}
                        {r.note ? ` · "${r.note}"` : ''}
                        {r.recordedByName ? ` — ${r.recordedByName}, ${day(r.recordedAt)}` : ''}
                      </p>
                    )}
                  </div>
                  {canAnswer && (r.status === 'Awaiting vendor answer' || canChange) && (
                    <Button size="sm" variant={r.status === 'Awaiting vendor answer' ? 'default' : 'outline'} onClick={() => setAnswering(r)}>
                      {r.status === 'Awaiting vendor answer' ? 'Record vendor\'s answer' : 'Change answer'}
                    </Button>
                  )}
                </div>
              );
            })}
      </div>
      {pag?.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-xs text-slate-500">Page {pag.page} of {pag.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pag.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
      <RejectionAnswerDialog open={!!answering} onOpenChange={(v) => { if (!v) setAnswering(null); }} rejection={answering} onDone={load} />
    </div>
  );
}
