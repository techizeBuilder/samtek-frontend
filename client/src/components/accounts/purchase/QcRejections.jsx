import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Search, RotateCw, PackageX, RefreshCcw, Ban, Undo2, Wallet } from 'lucide-react';
import RejectionEvidence from '@/components/qc/RejectionEvidence';
import QcCheckRow from '@/components/qc/QcCheckRow';

// QC rejections of purchased material (procurement-v2, accounts Slice 3,
// 2026-10-12 — client's cases). QC failing a purchase job makes one of these;
// Purchase asks the vendor and records the answer here. Nothing is emailed to
// the vendor automatically. Lives on Purchase → Purchase Orders → QC Rejections
// only (2026-10-19; the old Accounts → Purchases → QC Rejections page was the
// same list and now redirects there).
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// A replacement must come within a week (client, 2026-10-29) — the date
// starts at a week from today and nothing later can be picked.
const REPLACEMENT_MAX_DAYS = 7;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return localDay(d); };

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
  useEffect(() => { if (open) { setOutcome(''); setDate(inDays(REPLACEMENT_MAX_DAYS)); setNote(''); } }, [open]);
  if (!rejection) return null;
  const choices = changing ? OUTCOMES.filter(o => o.value !== 'replace') : OUTCOMES;

  const save = async () => {
    if (!outcome) return toast({ title: 'Choose what the vendor agreed to', variant: 'destructive' });
    if (outcome === 'replace' && !date) return toast({ title: 'Enter the date the vendor will send the replacement', variant: 'destructive' });
    if (outcome === 'refused' && !note.trim()) return toast({ title: 'Add a note on what the vendor said', variant: 'destructive' });
    setSaving(true);
    try {
      // One answer for the whole rejection; "for all" on a PO line's decision
      // records it on each request's REJ (2026-10-30).
      const ids = rejection._groupIds || [rejection._id];
      let res = null;
      for (const rid of ids) res = await apiRequest('PUT', `/api/accounts/purchases/rejections/${rid}/answer`, { outcome, expectedDate: date || undefined, note });
      toast({ title: ids.length > 1 ? `Answer recorded on ${ids.length} rejections` : (res?.message || 'Answer recorded') });
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
        {/* What to show the vendor while asking them (2026-10-30). */}
        <div className="rounded-lg border border-slate-200 p-2.5 space-y-1.5">
          <RejectLineText r={rejection} />
          {!(rejection.lines || []).length && <RejectionEvidence showEmpty failedChecks={rejection.parameter ? [] : rejection.failedChecks} photos={rejection.photos} downloadName={rejection.number} />}
          {snapshotMarked(rejection) && <ChecklistSnapshotButton rejection={rejection} />}
        </div>
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
              <span>When will the vendor send it? <span className="text-red-500">*</span> <span className="text-slate-400">(within a week)</span></span>
              <Input type="date" className="h-9 text-sm w-48" min={localDay(new Date())} max={inDays(REPLACEMENT_MAX_DAYS)} value={date} onChange={e => setDate(e.target.value)} />
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

// A reject breakdown line (2026-10-30): "2 × Rust — rust patches", the fault
// highlighted. Older rejections show QC's reason.
function RejectLineText({ r }) {
  if ((r.lines || []).length) {
    // One rejection, its reasons (2026-10-30): each line with its severity and photos.
    return (
      <div className="space-y-1.5">
        {r.lines.map((l, i) => (
          <div key={i}>
            <p className="text-sm">
              <span className="font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">{l.qty} × {l.parameter}</span>
              {l.severity && <span className="ml-1 text-[10px] text-slate-500">({l.severity})</span>}
              <span className="text-slate-800"> — {l.remark}</span>
            </p>
            {(l.photos || []).length > 0 && <div className="mt-1"><RejectionEvidence compact photos={l.photos} downloadName={`${r.number}-${i + 1}`} /></div>}
          </div>
        ))}
      </div>
    );
  }
  if (!r.parameter) return <p className="text-xs text-slate-700">QC's reason: <span className="font-medium text-red-700">"{r.reason || 'no reason given'}"</span></p>;
  return (
    <p className="text-sm">
      <span className="font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">{r.rejectedQty} × {r.parameter}</span>
      <span className="text-slate-800"> — {r.remark || r.reason}</span>
    </p>
  );
}

// The job's checklist as it stood at that QC decision — kept on the REJ.
// Shown only when QC marked something then: a reject with breakdown lines
// needs no checks (2026-10-31), and a list of untouched rows tells Purchase
// nothing — the lines are the reason. A row QC left unmarked reads "Not
// checked" (not "Pending": nothing is waiting on it any more).
// And only when it describes THESE pieces (checklistApplies, 2026-10-31): no
// breakdown lines (one piece), or the whole lot failed — not a partial reject
// with lines, where the list is the lot's and the rest go on to pass. Older
// REJs (null) keep the marked-rows rule.
const snapshotMarked = (r) => r?.checklistApplies !== false && (r?.checklistSnapshot || []).some(c => c.status === 'Pass' || c.status === 'Fail');
function ChecklistSnapshotButton({ rejection }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">View QC checklist</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>QC checklist — {rejection.qcJobRef || 'QC'}</DialogTitle>
            <DialogDescription>{rejection.itemName} · as it stood when QC decided ({day(rejection.createdAt)}).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(rejection.checklistSnapshot || []).map((row, i) => <QcCheckRow key={i} row={row.status === 'Pass' || row.status === 'Fail' ? row : { ...row, status: 'Not checked' }} readOnly />)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Consecutive REJs of one QC decision (shared decisionId) → one group.
function groupByDecision(rows) {
  const groups = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (r.decisionId && last && last.decisionId === r.decisionId) last.rows.push(r);
    else groups.push({ decisionId: r.decisionId || null, rows: [r] });
  }
  groups.forEach(g => g.rows.sort((x, y) => String(x.number).localeCompare(String(y.number))));
  return groups;
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
            : groupByDecision(rows).map(g => {
              const first = g.rows[0];
              const grouped = g.rows.length > 1 || !!first.parameter || (first.lines || []).length > 0;
              const allAwaiting = g.rows.length > 1 && g.rows.every(x => x.status === 'Awaiting vendor answer');
              return (
                <div key={g.decisionId || first._id} className="p-3 space-y-2">
                  {grouped && (
                    // One QC decision (2026-10-30): its lines below, each its own REJ.
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{first.qcJobRef || 'QC'}</span>
                      <span>· {day(first.createdAt)} · {Math.round(g.rows.reduce((t, x) => t + x.rejectedQty, 0) * 1000) / 1000} {first.qtyUnit} of <strong>{first.itemName}</strong> rejected</span>
                      <span>· {first.poNumber} · {first.vendorName}</span>
                      {snapshotMarked(first) && <ChecklistSnapshotButton rejection={first} />}
                      {canAnswer && allAwaiting && (
                        // A PO line's decision made one REJ per request — one answer for all of them.
                        <Button size="sm" className="ml-auto h-7 text-xs" onClick={() => setAnswering({
                          ...first, _groupIds: g.rows.map(x => x._id),
                          rejectedQty: Math.round(g.rows.reduce((t, x) => t + x.rejectedQty, 0) * 1000) / 1000,
                          value: g.rows.reduce((t, x) => t + (Number(x.value) || 0), 0),
                          lines: g.rows.flatMap(x => x.lines || []),
                          number: g.rows.map(x => x.number).join(', '),
                        })}>
                          Record answer for all ({g.rows.length})
                        </Button>
                      )}
                    </div>
                  )}
                  {g.rows.map(r => {
                    const rep = r.replacement?.purchaseRequest;
                    const canChange = r.status === 'Replacement expected' && rep && rep.status !== 'Received';
                    return (
                      <div key={r._id} className={`flex flex-wrap items-start justify-between gap-3 ${grouped ? 'border-l-2 border-red-200 pl-3' : ''}`}>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{r.number}</span>
                            {!grouped && <>{r.itemName}<span className="text-slate-500 font-normal">· {r.rejectedQty} {r.qtyUnit}</span></>}
                            {r.severity && <span className={`text-[10px] font-semibold border rounded-full px-1.5 py-0.5 ${r.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : r.severity === 'Major' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{r.severity}</span>}
                            <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.status] || ''}`}>{r.status}</Badge>
                            {r.replacementOf && <Badge variant="outline" className="text-[10px]">replacement failed again</Badge>}
                            <span className="text-xs font-normal text-slate-500">{inr(r.value)}</span>
                          </p>
                          <RejectLineText r={r} />
                          {!grouped && <p className="text-xs text-slate-500">{r.poNumber} · {r.vendorName} · {r.qcJobRef || 'QC'} · {day(r.createdAt)}</p>}
                          {/* QC's photos (and, before the breakdown, its failed checks) — to share with the vendor. */}
                          {!(r.lines || []).length && <RejectionEvidence compact showEmpty={!r.parameter} failedChecks={r.parameter ? [] : r.failedChecks} photos={r.photos} downloadName={r.number} />}
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
