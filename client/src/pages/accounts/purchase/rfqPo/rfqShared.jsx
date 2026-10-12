import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Mail, ListChecks, FileCheck, Paperclip, Trash2 } from 'lucide-react';
import { fabricationPieceCount, formatDims } from '@/lib/fabricationDims';
import { RAISED_BY_META } from '../PurchaseRequestsTab';

// Pieces moved over unchanged in behaviour from the old By Item tab
// (ByItemTab.jsx, retired by the RFQ/PO page — procurement-v2, 2026-10-08):
// a PR row and the "Select requests" modal. The quote entry is new
// (2026-10-08/09): QuotationRequestDialog (email) and ManualQuotationDialog.
// The item-group logic underneath (ItemQuoteGroup — one card per item,
// combined quantity, selection = binary commitment once a PO is made) is the
// same; see models/ItemQuoteGroup.js.

export const CHANNEL_META = {
  Email: { icon: Mail, label: 'Email' },
  Manual: { icon: FileCheck, label: 'Manual (with evidence)' },
};

export const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;

export const prQtyLabel = (pr) =>
  pr.fabricationDimensionLines?.length > 0 ? `${fabricationPieceCount(pr.fabricationDimensionLines)} pcs` : `${pr.quantity} ${pr.unit || ''}`;

// "Manual quotation" (2026-10-09) — a quote the vendor gave outside our
// email link (WhatsApp, their PDF, an email, a written quote), entered for
// SEVERAL items at once and only WITH the evidence (client blueprint §10).
// The evidence and the prices are saved together (manualQuotationController):
// nothing is stored if anything fails, and a saved record can't be edited —
// a new manual quotation replaces it. A price that replaces this vendor's
// earlier quote for an item needs a reason.
export const MANUAL_CHANNELS = ['WhatsApp', 'Vendor PDF / letterhead', 'Email (outside the system)', 'Visit / written quote', 'Other'];
const MAX_FILES = 5;
const MAX_MB = 10;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
const OK_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sizeLabel = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const blankPrice = () => ({ unitPrice: '', gstPercent: '', gstInclusive: false, deliveryDays: '', warrantyMonths: '', remarks: '', revisionReason: '' });

export function ManualQuotationDialog({ open, onOpenChange, vendor, rows, validityDays = 30, settings, onSaved }) {
  const { toast } = useToast();
  const [channel, setChannel] = useState('');
  const [channelOther, setChannelOther] = useState('');
  const [quoteDate, setQuoteDate] = useState(localDay(new Date()));
  const [contactPerson, setContactPerson] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);
  const [prices, setPrices] = useState({}); // group id -> fields
  // The vendor's charges + payment terms, as quoted (2026-10-09) — the same
  // fields the vendor fills on the email link, so both channels compare on
  // landed cost in the PO-time vendor selection check, and pre-fill the PO.
  const [charges, setCharges] = useState([]);    // [{label, amount, gstPercent}]
  const [advancePercent, setAdvancePercent] = useState('');
  const [creditDays, setCreditDays] = useState('');
  const [terms, setTerms] = useState([]);        // [{label, value, custom}]
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Fresh form every time it opens (nothing is uploaded until Save).
  useEffect(() => {
    if (!open) return;
    setChannel(''); setChannelOther(''); setQuoteDate(localDay(new Date()));
    setContactPerson(''); setNotes(''); setFiles([]); setError('');
    setPrices(Object.fromEntries(rows.map(r => [String(r.card.group._id), blankPrice()])));
    setCharges([]); setAdvancePercent(''); setCreditDays('');
    setTerms([]);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = localDay(new Date());
  const oldest = localDay(new Date(Date.now() - validityDays * 86400000));
  const setPrice = (gid, patch) => setPrices(p => ({ ...p, [gid]: { ...p[gid], ...patch } }));
  const chargeLabels = settings?.chargeLabels || [];
  const addCharge = (name) => {
    const tpl = chargeLabels.find(c => c.name === name);
    setCharges(cs => [...cs, { label: name || '', amount: '', gstPercent: tpl ? String(tpl.defaultGstPercent ?? 0) : '0' }]);
  };
  const setCharge = (i, patch) => setCharges(cs => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setTerm = (i, patch) => setTerms(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const termLabels = settings?.termLabels || [];
  const addTerm = (name) => setTerms(ts => [...ts, { label: name || '', value: '', custom: !name }]);
  // A priced quote from this vendor that the new price would replace.
  // A reason is needed only over a still-valid quote for the same quantity;
  // replacing an expired / old-quantity quote is just a fresh quote (the
  // server notes why) — 2026-10-10.
  const currentOf = (r) => (r.quote && r.quote.status === 'Submitted' && !r.quote.isExpired && !r.quote.isStale ? r.quote : null);
  const supersededOf = (r) => (r.quote && r.quote.status === 'Submitted' && (r.quote.isExpired || r.quote.isStale) ? r.quote : null);

  const addFiles = (list) => {
    const picked = Array.from(list || []);
    const bad = picked.find(f => !OK_TYPES.includes(f.type));
    if (bad) { setError(`"${bad.name}" isn't allowed — use PDF, JPG, PNG, WEBP, DOC or DOCX.`); return; }
    const big = picked.find(f => f.size > MAX_MB * 1024 * 1024);
    if (big) { setError(`"${big.name}" is over ${MAX_MB} MB.`); return; }
    const next = [...files, ...picked];
    if (next.length > MAX_FILES) { setError(`Attach up to ${MAX_FILES} files.`); return; }
    setError('');
    setFiles(next);
  };

  const save = async () => {
    setError('');
    if (!files.length) return setError('Attach the evidence — the vendor\'s WhatsApp message, PDF quotation, email or written quote.');
    if (!channel) return setError('Pick how the vendor gave the quote.');
    if (channel === 'Other' && !channelOther.trim()) return setError('Type how the vendor gave the quote.');
    if (!quoteDate || quoteDate > today) return setError('The quote date can\'t be in the future.');
    if (quoteDate < oldest) return setError(`A quote from ${quoteDate} is already past the ${validityDays}-day quote validity — get a fresh quote.`);
    for (const r of rows) {
      const p = prices[String(r.card.group._id)] || {};
      const name = r.card.item.name;
      if (!(Number(p.unitPrice) > 0)) return setError(`Enter the rate for "${name}".`);
      if (!(Number(p.deliveryDays) >= 1)) return setError(`Enter the delivery time (days) for "${name}".`);
      if (currentOf(r) && !String(p.revisionReason || '').trim()) return setError(`"${name}" already has a quote from ${vendor.supplierName} — give the reason for the new price.`);
    }
    for (const c of charges) {
      const label = String(c.label).trim();
      if (!label && !(Number(c.amount) > 0)) continue; // an empty row is just ignored
      if (!label) return setError('Name each charge (e.g. Freight).');
      if (!(Number(c.amount) > 0)) return setError(`Enter the ₹ amount for "${label}", or remove it.`);
      const g = Number(c.gstPercent);
      if (!Number.isFinite(g) || g < 0 || g > 100) return setError(`GST % for "${label}" must be between 0 and 100.`);
    }
    for (const t of terms) {
      const label = String(t.label).trim();
      const value = String(t.value).trim();
      if (!label && !value) continue; // an empty row is just ignored
      if (!label) return setError('Name each payment term.');
      if (!value) return setError(`Enter what the vendor said for "${label}", or remove it.`);
    }

    const fd = new FormData();
    fd.append('vendor', vendor._id);
    fd.append('channel', channel);
    fd.append('channelOther', channelOther.trim());
    fd.append('quoteDate', quoteDate);
    fd.append('contactPerson', contactPerson.trim());
    fd.append('notes', notes.trim());
    fd.append('items', JSON.stringify(rows.map(r => {
      const p = prices[String(r.card.group._id)];
      return {
        group: r.card.group._id,
        unitPrice: p.unitPrice,
        gstPercent: p.gstInclusive ? '' : p.gstPercent,
        gstInclusive: p.gstInclusive,
        deliveryDays: p.deliveryDays,
        warrantyMonths: p.warrantyMonths,
        remarks: p.remarks,
        revisionReason: currentOf(r) ? p.revisionReason : '',
      };
    })));
    fd.append('charges', JSON.stringify(charges.map(c => ({ label: String(c.label).trim(), amount: Number(c.amount) || 0, gstPercent: Number(c.gstPercent) || 0 }))));
    fd.append('paymentTerms', JSON.stringify({
      advancePercent: advancePercent === '' ? null : Number(advancePercent),
      creditDays: creditDays === '' ? null : Number(creditDays),
      others: terms.map(t => ({ label: String(t.label).trim(), value: String(t.value).trim() })).filter(t => t.label && t.value),
    }));
    files.forEach(f => fd.append('files', f));

    setSaving(true);
    try {
      const res = await apiRequest('POST', '/api/manual-quotations', fd);
      toast({ title: res?.message || 'Manual quotation saved' });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save — nothing was saved.');
    } finally {
      setSaving(false);
    }
  };

  if (!vendor) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileCheck className="w-4 h-4 text-violet-600" /> Manual quotation — {vendor.supplierName}</DialogTitle>
          <DialogDescription>
            For a quote the vendor gave outside our email link. Attach the proof and enter the prices together — nothing is saved without evidence, and a saved quotation can't be edited (a new one replaces it).
          </DialogDescription>
        </DialogHeader>

        {/* Evidence */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase">Evidence</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-slate-600 space-y-1">
              <span>How did the vendor give the quote? <span className="text-red-500">*</span></span>
              <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full border rounded-md px-2 h-9 text-sm bg-white">
                <option value="">Choose…</option>
                {MANUAL_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {channel === 'Other' ? (
              <label className="text-xs text-slate-600 space-y-1">
                <span>Type how <span className="text-red-500">*</span></span>
                <Input className="h-9 text-sm" value={channelOther} onChange={e => setChannelOther(e.target.value)} placeholder="e.g. Courier letter, Telegram" />
              </label>
            ) : (
              <label className="text-xs text-slate-600 space-y-1">
                <span>Date on the evidence <span className="text-red-500">*</span></span>
                <Input className="h-9 text-sm" type="date" min={oldest} max={today} value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
              </label>
            )}
            {channel === 'Other' && (
              <label className="text-xs text-slate-600 space-y-1">
                <span>Date on the evidence <span className="text-red-500">*</span></span>
                <Input className="h-9 text-sm" type="date" min={oldest} max={today} value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
              </label>
            )}
            <label className="text-xs text-slate-600 space-y-1">
              <span>Vendor's contact person</span>
              <Input className="h-9 text-sm" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Optional" />
            </label>
          </div>
          <p className="text-[11px] text-slate-400">The quote is valid for {validityDays} days from the date on the evidence. A phone call alone isn't evidence — ask the vendor to confirm on WhatsApp or email and attach that.</p>

          <div className="border border-dashed rounded-md p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-600">Files <span className="text-red-500">*</span> <span className="text-slate-400">— PDF, JPG, PNG, WEBP, DOC, DOCX · up to {MAX_FILES} files, {MAX_MB} MB each</span></span>
              <label className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 cursor-pointer">
                <Paperclip className="w-3.5 h-3.5" /> Add files
                <input type="file" multiple accept={ACCEPT} className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
              </label>
            </div>
            {files.length === 0 ? <p className="text-xs text-slate-400 italic">No files yet.</p> : (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded px-2 py-1">
                    <span className="truncate">{f.name} <span className="text-slate-400">· {sizeLabel(f.size)}</span></span>
                    <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input className="h-9 text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" />
        </div>

        {/* Prices */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase">Prices ({rows.length} item{rows.length === 1 ? '' : 's'})</p>
          {rows.map(r => {
            const gid = String(r.card.group._id);
            const p = prices[gid] || blankPrice();
            const cur = currentOf(r);
            const fab = (r.card.group.purchaseRequests || []).some(pr => pr.fabricationDimensionLines?.length);
            return (
              <div key={gid} className="border rounded-md p-2.5 space-y-2">
                <p className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-2">
                  {r.card.item.name}
                  {r.card.sizeValues && <span className="text-[11px] font-mono font-normal text-slate-500">{formatDims(r.card.sizeValues)}</span>}
                  <span className="text-xs font-normal text-slate-500">{r.card.group.sizeKey ? `${r.card.group.pieces ?? r.card.group.requestedPieces} pcs · ≈ ` : ''}{r.card.group.quantity} {r.card.group.purchaseUnit || ''}</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Input className="h-8 text-sm" type="number" min="0" value={p.unitPrice} onChange={e => setPrice(gid, { unitPrice: e.target.value })} placeholder={`Rate ₹${r.card.group.purchaseUnit ? `/${r.card.group.purchaseUnit}` : ''} *`} />
                  <Input className="h-8 text-sm" type="number" min="0" max="100" value={p.gstInclusive ? '' : p.gstPercent} disabled={p.gstInclusive} onChange={e => setPrice(gid, { gstPercent: e.target.value })} placeholder={p.gstInclusive ? 'GST included' : 'GST % (optional)'} />
                  <Input className="h-8 text-sm" type="number" min="1" value={p.deliveryDays} onChange={e => setPrice(gid, { deliveryDays: e.target.value })} placeholder="Delivery days *" />
                  {!fab && <Input className="h-8 text-sm" type="number" min="0" value={p.warrantyMonths} onChange={e => setPrice(gid, { warrantyMonths: e.target.value })} placeholder="Warranty (months)" />}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={p.gstInclusive} onChange={e => setPrice(gid, { gstInclusive: e.target.checked })} /> Rate already includes GST
                  </label>
                  <Input className="h-8 text-sm flex-1 min-w-[180px]" value={p.remarks} onChange={e => setPrice(gid, { remarks: e.target.value })} placeholder="Remarks (brand, make, stock…)" />
                </div>
                {!cur && supersededOf(r) && (
                  <p className="text-[11px] text-slate-500">Replaces their {supersededOf(r).isExpired ? 'expired' : 'old-quantity'} quote ₹{supersededOf(r).unitPrice} — no reason needed, it's noted for you.</p>
                )}
                {cur && (
                  <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 space-y-1">
                    <p className="text-[11px] text-amber-800">
                      Replaces their current quote ₹{cur.unitPrice}{cur.purchaseUnit ? `/${cur.purchaseUnit}` : ''}
                      {cur.manualQuotation?.number ? ` (${cur.manualQuotation.number})` : cur.quotationRequest?.number ? ` (${cur.quotationRequest.number})` : ''} — the old one stays in All quotes.
                    </p>
                    <Input className="h-8 text-sm bg-white" value={p.revisionReason} onChange={e => setPrice(gid, { revisionReason: e.target.value })} placeholder="Reason for the new price * (e.g. negotiated, quantity discount)" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* The vendor's charges + payment terms */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Vendor's charges (whole quotation)</p>
            <select className="border rounded-md px-2 py-1 text-xs bg-white" value="" onChange={e => { if (e.target.value) addCharge(e.target.value === '__other' ? '' : e.target.value); }}>
              <option value="">+ Add charge…</option>
              {chargeLabels.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              <option value="__other">Other (type a name)</option>
            </select>
          </div>
          {charges.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No extra charges quoted. If the vendor said freight, packing, loading… is extra, add it — it counts when vendors are compared at PO time.</p>
          ) : (
            <div className="space-y-1.5">
              {charges.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="h-8 flex-1 text-sm" placeholder="Charge name" value={c.label} onChange={e => setCharge(i, { label: e.target.value })} />
                  <Input className="h-8 w-28 text-sm" type="number" min="0" placeholder="₹ amount" value={c.amount} onChange={e => setCharge(i, { amount: e.target.value })} />
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Input className="h-8 w-16 text-sm" type="number" min="0" max="100" value={c.gstPercent} onChange={e => setCharge(i, { gstPercent: e.target.value })} />% GST
                  </span>
                  <button type="button" onClick={() => setCharges(cs => cs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs font-semibold text-slate-500 uppercase">Vendor's payment terms</p>
            {/* Terms are added by choice, like charges — only the ones the vendor gave. */}
            <select className="border rounded-md px-2 py-1 text-xs bg-white" value="" onChange={e => { if (e.target.value) addTerm(e.target.value === '__other' ? '' : e.target.value); }}>
              <option value="">+ Add term…</option>
              {termLabels.filter(t => !terms.some(x => !x.custom && x.label === t.name)).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              <option value="__other">Other (type a name)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-600">Advance %
              <Input className="h-8 text-sm mt-0.5" type="number" min="0" max="100" value={advancePercent} onChange={e => setAdvancePercent(e.target.value)} placeholder="Optional" />
            </label>
            <label className="text-xs text-slate-600">Credit days
              <Input className="h-8 text-sm mt-0.5" type="number" min="0" value={creditDays} onChange={e => setCreditDays(e.target.value)} placeholder="Optional" />
            </label>
            {terms.map((t, i) => (
              <div key={i} className="col-span-2 flex items-center gap-2">
                {t.custom
                  ? <Input className="h-8 w-44 text-sm" value={t.label} onChange={e => setTerm(i, { label: e.target.value })} placeholder="Term name" />
                  : <span className="w-44 text-xs text-slate-600 shrink-0">{t.label}</span>}
                <Input className="h-8 flex-1 text-sm" value={t.value} onChange={e => setTerm(i, { value: e.target.value })} placeholder="What the vendor said" />
                <button type="button" onClick={() => setTerms(ts => ts.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700" onClick={save} disabled={saving || !rows.length}>
            {saving ? 'Saving…' : `Save manual quotation (${rows.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// One quotation-request email to a vendor for several items (procurement-v2,
// 2026-10-08). Confirms the ticked items, sends, then shows the request number
// and the vendor's link (to share by hand if the email didn't go out).
// Where a ticked item stands with this vendor (2026-10-10) — decides whether
// "Only items that need a quote" includes it.
//   new        — never asked, or the last request was closed / replaced
//   expired    — their price is past its validity
//   stale      — they priced a different quantity
//   unanswered — asked, but the link ran out or the email failed
//   valid      — a current price            (re-asked only with "All")
//   waiting    — asked, link still open      (re-asked only with "All")
//   declined   — said they can't supply      (re-asked only with "All")
export function quoteNeedOf(r) {
  const q = r.quote;
  if (!q || ['Superseded', 'Rejected'].includes(q.status)) return 'new';
  if (q.status === 'Submitted') return q.isExpired ? 'expired' : q.isStale ? 'stale' : 'valid';
  if (q.status === 'Invited') {
    const qr = q.quotationRequest;
    const linkGone = qr && (qr.status === 'Expired' || (qr.tokenExpiry && new Date(qr.tokenExpiry) < new Date()));
    return linkGone || qr?.emailStatus === 'Failed' ? 'unanswered' : 'waiting';
  }
  if (q.status === 'Declined') return 'declined';
  return 'new';
}
const NEED_LABEL = {
  new: ['No quote yet', 'text-slate-500'],
  expired: ['Quote expired — ask again', 'text-red-600'],
  stale: ['Quoted for an old quantity — ask again', 'text-amber-700'],
  unanswered: ['No reply, link ran out / email failed — ask again', 'text-amber-700'],
  valid: ['Has a valid quote — re-asked only with "All"', 'text-emerald-700'],
  waiting: ['Waiting for their reply — re-asked only with "All"', 'text-slate-500'],
  declined: ['Said they can\'t supply — re-asked only with "All"', 'text-slate-500'],
};
const NEEDS_QUOTE = ['new', 'expired', 'stale', 'unanswered'];

export function QuotationRequestDialog({ open, onOpenChange, vendor, rows, onSent }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const needed = rows.filter(r => NEEDS_QUOTE.includes(quoteNeedOf(r)));
  const hasChoice = needed.length > 0 && needed.length < rows.length;
  const [mode, setMode] = useState('needed'); // 'needed' | 'all'

  useEffect(() => { if (open) { setResult(null); setMode(needed.length ? 'needed' : 'all'); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // With nothing that needs a quote, the only choice is to re-ask everything.
  const sendRows = mode === 'needed' && needed.length ? needed : rows;
  const send = async () => {
    setSending(true);
    try {
      const res = await apiRequest('POST', '/api/quotation-requests', { vendor: vendor._id, groups: sendRows.map(r => r.card.group._id) });
      setResult({ ...res.data, warning: res.warning, message: res.message });
      if (!res.warning) toast({ title: res.message || 'Quotation request sent' });
      onSent?.();
    } catch (err) {
      toast({ title: 'Could not send the quotation request', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!vendor) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-600" /> Email quotation request — {vendor.supplierName}</DialogTitle>
          <DialogDescription>
            One email to <b>{vendor.email || 'no email on file'}</b> with a link where they price every item, add GST, charges and payment terms, and submit once. The link is valid for 7 days.
          </DialogDescription>
        </DialogHeader>
        {!result ? (
          <>
            {hasChoice && (
              <div className="space-y-1.5 rounded-md border bg-slate-50 p-2.5 text-sm">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="qr-mode" className="mt-1" checked={mode === 'needed'} onChange={() => setMode('needed')} />
                  <span><b>Only items that need a quote ({needed.length})</b><span className="block text-[11px] text-slate-500">New items, expired quotes, quotes for an old quantity, and requests that got no reply.</span></span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="qr-mode" className="mt-1" checked={mode === 'all'} onChange={() => setMode('all')} />
                  <span><b>All ticked items ({rows.length})</b><span className="block text-[11px] text-slate-500">Also re-asks items they've already priced or are still answering. Their new prices replace the old ones (kept in All quotes).</span></span>
                </label>
              </div>
            )}
            {!needed.length && rows.length > 0 && (
              <p className="text-[11px] text-amber-700">Every ticked item already has a valid quote, a request waiting, or a "can't supply" — sending re-asks all of them.</p>
            )}
            <div className="border rounded-md divide-y">
              {rows.map(r => {
                const need = quoteNeedOf(r);
                const included = sendRows.includes(r);
                const [label, tone] = NEED_LABEL[need];
                return (
                <div key={r.card.key} className={`px-3 py-2 text-sm flex items-center justify-between gap-2 ${included ? '' : 'opacity-50'}`}>
                  <span className="min-w-0">
                    <span className="font-medium text-slate-800">{r.card.item.name}</span>
                    {!included && <span className="ml-1.5 text-[10px] text-slate-500 border rounded px-1">not sent</span>}
                    {r.card.sizeValues && <span className="block text-[11px] font-mono text-slate-500">{formatDims(r.card.sizeValues)}</span>}
                    <span className={`block text-[11px] ${tone}`}>{label}</span>
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">{r.card.group.sizeKey ? `${r.card.group.pieces ?? r.card.group.requestedPieces} pcs · ≈ ` : ''}{r.card.group.quantity} {r.card.group.purchaseUnit || ''}</span>
                </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" onClick={send} disabled={sending || !sendRows.length || !vendor.email}>
                {sending ? 'Sending…' : `Send one email for ${sendRows.length} item${sendRows.length === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className={`rounded-md border px-3 py-2 text-sm ${result.warning ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              {result.warning || result.message}
            </div>
            <p className="text-xs text-slate-500">
              Request <b>{result.number}</b>. The vendor's link goes only to their email — it isn't shown here, so nobody else can submit prices as the vendor. If the email didn't arrive, send the request again or use Manual quotation.
            </p>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// "QR-0003 sent on 8 Oct" / "link expired" / "email failed" for a quote that
// is still waiting for the vendor (status Invited).
export function requestWaitingLabel(q) {
  const qr = q?.quotationRequest;
  if (!qr) return { tone: 'amber', text: "Awaiting the vendor's reply" };
  const sent = qr.sentAt ? new Date(qr.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
  if (qr.status === 'Expired' || (qr.tokenExpiry && new Date(qr.tokenExpiry) < new Date())) return { tone: 'red', text: `No reply — ${qr.number} link expired. Send a new request.` };
  if (qr.emailStatus === 'Failed') return { tone: 'red', text: `${qr.number}: the email didn't go out — send again or enter a manual quotation.` };
  // Point 16 (2026-10-10): the last reminder Purchase sent, if any.
  const lastReminder = (qr.vendorReminders || []).filter(r => r.emailStatus !== 'Failed').slice(-1)[0];
  const reminded = lastReminder ? ` · reminded ${new Date(lastReminder.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : '';
  return { tone: 'amber', text: `Waiting for reply — ${qr.number} sent ${sent}${reminded}`, canRemind: true };
}

export function PRBreakdownRow({ pr }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 text-xs gap-2">
      <span className="flex items-center gap-1.5 min-w-0">
        <span className="font-mono text-slate-400 shrink-0">{pr.requestId}</span>
        {RAISED_BY_META[pr.raisedBy] && (
          <Badge variant="outline" className={`${RAISED_BY_META[pr.raisedBy].cls} text-[9px] font-normal shrink-0`}>
            {RAISED_BY_META[pr.raisedBy].label}
          </Badge>
        )}
      </span>
      <span className="shrink-0 text-slate-500">{prQtyLabel(pr)}</span>
    </div>
  );
}

// Pick which of an item's pending requests this round covers. Everything is
// selected by default when the item first appears (auto-select); this is for
// holding a request back, or adding one that arrived later.
export function SelectPRsModal({ open, onOpenChange, item, prs, group, onConfirm }) {
  const [checked, setChecked] = useState(new Set());

  useEffect(() => {
    if (open) setChecked(new Set((group?.purchaseRequests || []).map(pr => String(pr._id || pr))));
  }, [open, group]);

  const toggle = (id) => setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allIds = prs.map(pr => String(pr._id));
  const allChecked = allIds.length > 0 && allIds.every(id => checked.has(id));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(allIds));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <ListChecks className="w-4 h-4" /> Select requests to combine
          </DialogTitle>
          <DialogDescription>
            {item ? <>{item.name} {item.code ? <span className="font-mono text-xs">({item.code})</span> : null}</> : 'This item'} — the combined quantity is summed from your selection, then you can still adjust it. A request you leave out stays pending for a later round.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between px-0.5">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} /> Select all
          </label>
          <span className="text-xs text-slate-400">{checked.size} of {prs.length} selected</span>
        </div>
        <div className="border rounded-md divide-y">
          {prs.map(pr => (
            <label key={pr._id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={checked.has(String(pr._id))} onChange={() => toggle(String(pr._id))} />
              <span className="flex-1 min-w-0">
                <span className="font-mono text-xs text-slate-400 mr-1.5">{pr.requestId}</span>
                {RAISED_BY_META[pr.raisedBy] && (
                  <Badge variant="outline" className={`${RAISED_BY_META[pr.raisedBy].cls} text-[9px] font-normal`}>{RAISED_BY_META[pr.raisedBy].label}</Badge>
                )}
              </span>
              <span className="text-slate-600 text-xs shrink-0">{prQtyLabel(pr)}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" onClick={() => onConfirm(Array.from(checked))}>
            Confirm selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
