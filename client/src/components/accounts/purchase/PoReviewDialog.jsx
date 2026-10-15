import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Trash2, CreditCard, ShieldAlert, TrendingUp } from 'lucide-react';
import { BoughtBeforeTag, comparablePrice, vendorCheck } from './PriceCheck';
import { SelectionCheckDetails } from './SelectionCheck';
import { GstSplitNote } from './GstSplit';
import { gstSplitFor } from '@/lib/gstStates';
import { compareWithQuotation, TERMS_CHANGE_REASONS } from '@/lib/poQuoteTerms';

// Review & create PO (procurement-v2, 2026-10-08). Everything decided per
// order is entered HERE, not on the vendor:
//   - GST — each line's GST is the QUOTE's (read-only since 2026-10-14; the
//     server takes rate / GST / warranty from the quote, never this page); a
//     wrong GST is re-quoted. A line whose quoted rate includes GST adds
//     nothing on top
//   - charges — whole-PO, pre-filled from the vendor's quotation; a name from
//     the Purchase template (or typed), flat ₹ + its own GST %
//   - payment terms — built-in Advance % (paid when the PO is placed; the
//     delivery days count from it) and Credit Days (the full payment is due
//     that long after everything passes QC) + the vendor's other terms (our
//     template terms are added by choice, 2026-10-14)
//   - any change to the quotation's charges / terms needs a reason; charges
//     above the quotation need the Company Admin (2026-10-14,
//     lib/poQuoteTerms.js = the server's services/poQuoteTermsService.js)
//   - transport — who brings the goods (company pickup = no freight line)
// If the final total is above the Company Admin's threshold, the PO is sent
// for approval instead of created (server decides — this preview just says so).
// The server recomputes every number; this is only the preview.
// Vendor selection check (gap 12, 2026-10-09): on open, the server checks
// enough vendors were asked and nobody quoted this whole PO for less (landed
// cost). A failed check needs a reason and goes to the Company Admin, even
// under the ₹ limit — the server runs the same check again on create.
// Pre-filled (all editable) from the vendor's own quotation: each line's GST %
// from its quote, and charges + payment terms from the most recent emailed
// quotation request they submitted behind these lines.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => `₹${round2(n).toLocaleString('en-IN')}`;
const pct = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0; };
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');

export default function PoReviewDialog({ open, onOpenChange, vendor, lines, settings, company = null, priceJumpWarnPercent = null, onCreated }) {
  const { toast } = useToast();
  const [charges, setCharges] = useState([]);      // [{label, amount, gstPercent}]
  const [quoted, setQuoted] = useState(null);      // the quotation's { charges, paymentTerms } — the baseline
  const [tcReasons, setTcReasons] = useState([]);  // why charges / terms differ from it
  const [tcNote, setTcNote] = useState('');
  const [advancePercent, setAdvancePercent] = useState('');
  const [creditDays, setCreditDays] = useState('');
  const [terms, setTerms] = useState([]);          // [{label, value, custom}]
  const [prefill, setPrefill] = useState(null);    // { from: request, others: [numbers] }
  const [transportBy, setTransportBy] = useState('Vendor');
  const [outstanding, setOutstanding] = useState(null);
  const [saving, setSaving] = useState(false);
  const [check, setCheck] = useState(null);        // selection check result
  const [checkState, setCheckState] = useState('idle'); // idle | loading | error
  const [exReasons, setExReasons] = useState([]);
  const [exNote, setExNote] = useState('');

  const chargeLabels = settings?.chargeLabels || [];
  const termLabels = settings?.termLabels || [];
  const threshold = settings?.poApprovalThreshold;

  // Fresh form every time it opens for a vendor, pre-filled from their quotation.
  useEffect(() => {
    if (!open) return;
    // The vendor's quotations behind these lines — emailed requests they
    // submitted and manual quotations (which carry charges + terms too since
    // 2026-10-09) — newest first.
    const requests = new Map();
    for (const l of lines) {
      const qr = l.quotationRequest;
      if (qr?._id && qr.status === 'Submitted') requests.set(String(qr._id), { ...qr, at: qr.submittedAt });
      const mq = l.manualQuotation;
      if (mq?._id) requests.set(String(mq._id), { ...mq, at: mq.createdAt || mq.quoteDate, manual: true });
    }
    const sorted = [...requests.values()].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    const from = sorted[0] || null;
    const vt = from?.paymentTerms || {};
    const vendorOthers = vt.others || [];
    setCharges((from?.charges || []).map(c => ({ label: c.label, amount: String(c.amount ?? ''), gstPercent: String(c.gstPercent ?? 0) })));
    setAdvancePercent(vt.advancePercent != null ? String(vt.advancePercent) : '');
    setCreditDays(vt.creditDays != null ? String(vt.creditDays) : '');
    // Only the vendor's own terms; our template terms are added by choice
    // (2026-10-14) — never listed blank.
    setTerms(vendorOthers.map(o => ({ label: o.label, value: o.value, custom: !termLabels.some(t => same(t.name, o.label)) })));
    setQuoted(from ? { charges: from.charges || [], paymentTerms: vt } : null);
    setTcReasons([]); setTcNote('');
    setPrefill(from ? { from, others: sorted.slice(1).map(q => q.number) } : null);
    setTransportBy('Vendor');
    setOutstanding(null);
    setExReasons([]); setExNote('');
    loadCheck();
    apiRequest('GET', `/api/accounts/purchases/outstanding?vendorId=${vendor._id}`)
      // What we already owe this vendor and haven't paid (2026-10-12) —
      // not material still on order, and not this PO.
      .then(res => setOutstanding(res?.data?.[0]?.pending || { total: 0, advance: 0, material: 0, noPo: 0, overdue: 0 }))
      .catch(() => setOutstanding(null));
  }, [open, vendor?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only lines made from quotes on an item card take part (all of them, on RFQ/PO).
  const groupIds = lines.map(l => l.itemQuoteGroup).filter(Boolean);
  const loadCheck = () => {
    setCheck(null);
    if (!groupIds.length) { setCheckState('idle'); return; }
    setCheckState('loading');
    apiRequest('POST', '/api/item-quote-groups/selection-check', { vendor: vendor._id, groups: groupIds })
      .then(res => { setCheck(res?.data || null); setCheckState('idle'); })
      .catch(() => setCheckState('error'));
  };
  const toggleReason = (r) => setExReasons(rs => (rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]));

  const toggleTcReason = (r) => setTcReasons(rs => (rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]));

  const computed = useMemo(() => {
    let goods = 0;
    let lineGstTotal = 0;
    const rows = lines.map(l => {
      const amount = round2(Number(l.quantity) * Number(l.unitPrice));
      // The quote's GST — read-only (no GST given on an old quote = 0%).
      const rate = l.gstInclusive ? 0 : pct(l.gstPercent);
      const gst = l.gstInclusive ? 0 : round2(amount * rate / 100);
      goods += amount;
      lineGstTotal += gst;
      // "Bought before": the quoted rate (before GST) vs what we last paid
      // THIS vendor for the item (delivered purchases).
      const comparable = comparablePrice(l.unitPrice, l.gstInclusive, l.gstPercent);
      const changePct = vendorCheck(l.priceHistory, vendor?._id, comparable).pct;
      return { ...l, amount, rate, gst, comparable, changePct };
    });
    const cleanCharges = charges.filter(c => String(c.label).trim() && Number(c.amount) > 0);
    const chargesTotal = round2(cleanCharges.reduce((s, c) => s + Number(c.amount), 0));
    const chargesGst = round2(cleanCharges.reduce((s, c) => s + Number(c.amount) * pct(c.gstPercent) / 100, 0));
    const grand = round2(goods + lineGstTotal + chargesTotal + chargesGst);
    return { rows, goods: round2(goods), lineGstTotal: round2(lineGstTotal), chargesTotal, chargesGst, grand };
  }, [lines, charges, vendor?._id]);

  // Charges / terms vs the vendor's quotation (the server re-checks).
  const termsCmp = useMemo(() => (quoted ? compareWithQuotation(quoted, {
    charges: charges.map(c => ({ label: c.label, amount: Number(c.amount) || 0, gstPercent: pct(c.gstPercent) })),
    paymentTerms: { advancePercent, creditDays, others: terms },
  }) : null), [quoted, charges, advancePercent, creditDays, terms]);
  const termsChanged = !!termsCmp?.changes.length;
  const chargesAbove = !!termsCmp?.chargesAbove;
  const tcReasonMissing = termsChanged && (!tcReasons.length || (tcReasons.includes('Other') && !tcNote.trim()));

  const overThreshold = threshold != null && computed.grand > Number(threshold);
  const selectionFailed = !!check && !check.passed;
  const needsApproval = overThreshold || selectionFailed || chargesAbove;
  const reasonMissing = selectionFailed && (!exReasons.length || (exReasons.includes('Other') && !exNote.trim()));
  const warnAt = priceJumpWarnPercent ?? settings?.priceJumpWarnPercent ?? 10;
  const risen = computed.rows.filter(l => l.changePct != null && l.changePct > 0 && l.changePct >= warnAt);
  // Credit limit (Vendor Master) vs what we already owe this vendor and
  // haven't paid — old bills, unpaid advances, received + QC-passed material.
  // The PO being created isn't part of it (user, 2026-10-12).
  const owedPct = vendor?.creditLimit && outstanding ? outstanding.total / vendor.creditLimit : null;

  const addCharge = (labelName) => {
    const tpl = chargeLabels.find(c => c.name === labelName);
    setCharges(cs => [...cs, { label: labelName || '', amount: '', gstPercent: tpl ? String(tpl.defaultGstPercent ?? 0) : '0' }]);
  };
  const setCharge = (i, patch) => setCharges(cs => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setTerm = (i, patch) => setTerms(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTerm = (name) => setTerms(ts => [...ts, { label: name || '', value: '', custom: !name }]);
  const termChoices = termLabels.filter(t => !terms.some(x => same(x.label, t.name)));

  const submit = async () => {
    if (reasonMissing) {
      toast({ title: 'Give the reason for choosing this vendor', description: exReasons.includes('Other') ? 'Add a note explaining "Other".' : 'Pick at least one reason in the Vendor selection check.', variant: 'destructive' });
      return;
    }
    if (tcReasonMissing) {
      toast({ title: 'Say why the charges / terms differ from the quotation', description: tcReasons.includes('Other') ? 'Add a note explaining "Other".' : 'Pick at least one reason under "Changed from the quotation".', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const items = computed.rows.map(l => ({
        item: l.itemId,
        itemName: l.itemName,
        purchaseRequests: l.purchaseRequestIds,
        vendorBidId: l.vendorBidId,
        itemQuoteGroup: l.itemQuoteGroup,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        deliveryDays: l.deliveryDays,
        warrantyMonths: l.warrantyMonths || 0,
        gstInclusive: !!l.gstInclusive,
        gstPercent: l.gstInclusive ? 0 : l.rate,
        ...(l.purchaseUnit ? { purchaseQuantity: l.quantity, purchaseUnit: l.purchaseUnit, purchaseUnitType: l.purchaseUnitType } : {}),
      }));
      const res = await apiRequest('POST', '/api/accounts/purchases/orders', {
        supplier: vendor._id,
        items,
        purchaseRequests: [...new Set(computed.rows.flatMap(l => l.purchaseRequestIds.map(String)))],
        transportBy,
        charges: charges.map(c => ({ label: String(c.label).trim(), amount: Number(c.amount) || 0, gstPercent: pct(c.gstPercent) })),
        paymentTerms: {
          advancePercent: advancePercent === '' ? null : Number(advancePercent),
          creditDays: creditDays === '' ? null : Number(creditDays),
          others: terms.map(t => ({ label: String(t.label).trim(), value: String(t.value).trim() })).filter(t => t.label && t.value),
        },
        ...(selectionFailed ? { selectionException: { reasons: exReasons, note: exNote.trim() } } : {}),
        ...(termsChanged ? { termsChange: { reasons: tcReasons, note: tcNote.trim() } } : {}),
      });
      toast({
        title: res?.pendingApproval ? 'Sent for Company Admin approval' : 'PO created',
        description: res?.message,
      });
      onOpenChange(false);
      onCreated?.(res);
    } catch (err) {
      toast({ title: 'Could not create PO', description: err.message, variant: 'destructive' });
      // Quotes may have moved since the check loaded — show the current one.
      loadCheck();
    } finally {
      setSaving(false);
    }
  };

  if (!vendor) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review PO — {vendor.supplierName}</DialogTitle>
          <DialogDescription>Prices and GST are the vendor's quote. Charges and payment terms come from their quotation — any change needs a reason. Nothing is created until you confirm.</DialogDescription>
        </DialogHeader>

        {prefill && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Charges and payment terms are pre-filled from <b>{prefill.from.number}</b> — {vendor.supplierName}'s {prefill.from.manual ? 'manual quotation entered' : 'quotation'} on {fmtDay(prefill.from.at)}. If you change any of them, you'll be asked why.
            {prefill.others.length > 0 && <> Some items were quoted earlier on {prefill.others.join(', ')}; charges and terms carry over from one quotation to the next, so the newest one ({prefill.from.number}) holds the vendor's current ones. See All quotes.</>}
            {prefill.from.vendorRemarks && <span className="block mt-0.5 text-blue-700">Vendor's remarks: "{prefill.from.vendorRemarks}"</span>}
          </div>
        )}

        {/* Lines + GST */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Items &amp; GST</p>
            <span className="text-[11px] text-slate-400">As quoted — a wrong rate or GST is fixed by a new quotation</span>
          </div>
          <div className="border rounded-md divide-y">
            {computed.rows.map(l => (
              <div key={l.key} className="px-3 py-2 text-sm flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-[180px] font-medium text-slate-800">
                  {l.itemName}
                  {l.sizeLabel && <span className="block text-[11px] font-mono font-normal text-slate-500">{l.sizeLabel}{l.pieces ? ` × ${l.pieces} pcs` : ''}</span>}
                  <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-normal text-slate-500 mt-0.5">
                    <BoughtBeforeTag history={l.priceHistory} vendorId={vendor._id} vendorName={vendor.supplierName} itemName={l.itemName} unit={l.purchaseUnit} quotePrice={l.comparable} warnAt={warnAt} />
                  </span>
                </span>
                <span className="text-slate-500 text-xs">{l.sizeLabel ? '≈ ' : ''}{l.quantity} {l.purchaseUnit || ''} × {inr(l.unitPrice)} = {inr(l.amount)}</span>
                {l.gstInclusive ? (
                  <span className="text-[11px] text-slate-500 border rounded-full px-2 py-0.5">GST included in rate</span>
                ) : (
                  <span className="text-[11px] text-slate-600 border rounded-full px-2 py-0.5" title="The GST % the vendor quoted">
                    {l.gstPercent != null ? `GST ${l.rate}% (quoted) = ${inr(l.gst)}` : 'No GST quoted (0%)'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Charges */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase">Charges (whole PO)</p>
            <div className="flex items-center gap-1.5">
              <select className="border rounded-md px-2 py-1 text-xs bg-white" value="" onChange={e => { if (e.target.value) addCharge(e.target.value === '__other' ? '' : e.target.value); }}>
                <option value="">+ Add charge…</option>
                {chargeLabels.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                <option value="__other">Other (type a name)</option>
              </select>
            </div>
          </div>
          {charges.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No charges on this PO.{transportBy === 'Company' ? ' (We pick up — no freight from the vendor.)' : ''}</p>
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
          {chargeLabels.length === 0 && <p className="text-[11px] text-slate-400 mt-1">Charge names come from Purchase → Settings.</p>}
        </div>

        {/* Payment terms */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Payment terms</p>
          <div className="grid grid-cols-2 gap-3">
            {/* 2026-10-12 (client): the advance is paid when the PO is placed and
                the vendor's delivery days count from that payment; the full
                payment is due Credit Days after everything is received and
                QC-passed. */}
            <label className="text-xs text-slate-600">Advance % <span className="text-slate-400">(delivery days start when it's paid)</span>
              <Input className="h-8 text-sm mt-0.5" type="number" min="0" max="100" value={advancePercent} onChange={e => setAdvancePercent(e.target.value)} placeholder="e.g. 30" />
            </label>
            <label className="text-xs text-slate-600">Credit days <span className="text-slate-400">(after everything is received + QC-passed; blank = pay straight away)</span>
              <Input className="h-8 text-sm mt-0.5" type="number" min="0" value={creditDays} onChange={e => setCreditDays(e.target.value)} placeholder="e.g. 45" />
            </label>
            {terms.map((t, i) => (
              <div key={i} className="col-span-2 flex items-center gap-2">
                {t.custom
                  ? <Input className="h-8 w-44 text-sm" value={t.label} onChange={e => setTerm(i, { label: e.target.value })} placeholder="Term name" />
                  : <span className="w-44 text-xs text-slate-600 shrink-0">{t.label}</span>}
                <Input className="h-8 flex-1 text-sm" value={t.value} onChange={e => setTerm(i, { value: e.target.value })} placeholder="Details" />
                <button type="button" onClick={() => setTerms(ts => ts.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          {/* Our template terms are added by choice, like charges (2026-10-14). */}
          <select className="mt-1.5 border rounded-md px-2 py-1 text-xs bg-white text-blue-700" value="" onChange={e => { if (e.target.value) addTerm(e.target.value === '__other' ? '' : e.target.value); }}>
            <option value="">+ Add a term…</option>
            {termChoices.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            <option value="__other">Other (type a name)</option>
          </select>
        </div>

        {/* Changed from the vendor's quotation (2026-10-14) — needs a reason */}
        {termsChanged && (
          <div className={`rounded-md border px-3 py-2 space-y-1.5 ${chargesAbove ? 'border-orange-200 bg-orange-50/70' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-xs font-semibold text-slate-600 uppercase">Changed from the quotation{prefill?.from?.number ? ` ${prefill.from.number}` : ''}</p>
            <ul className="list-disc pl-4 text-xs text-slate-700">
              {termsCmp.changes.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            {chargesAbove && (
              <p className="text-xs text-orange-800">Charges {inr(termsCmp.poChargesTotal)} vs {inr(termsCmp.quotedChargesTotal)} quoted (with GST) — charges above the quotation need the Company Admin's approval.</p>
            )}
            <p className="text-xs text-slate-700">Why? <span className="text-red-500">*</span> <span className="text-slate-400">— saved on the PO; the Company Admin sees it.</span></p>
            <div className="flex flex-wrap gap-1.5">
              {TERMS_CHANGE_REASONS.map(r => (
                <button
                  key={r} type="button" onClick={() => toggleTcReason(r)}
                  className={`text-[11px] rounded-full border px-2.5 py-0.5 ${tcReasons.includes(r) ? 'bg-slate-700 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Input className="h-8 text-sm bg-white" value={tcNote} onChange={e => setTcNote(e.target.value)} placeholder={tcReasons.includes('Other') ? 'Explain "Other" *' : 'Note (optional)'} />
          </div>
        )}

        {/* Transport */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">Transport:</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name="po-transport" checked={transportBy === 'Vendor'} onChange={() => setTransportBy('Vendor')} /> Vendor delivers
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name="po-transport" checked={transportBy === 'Company'} onChange={() => setTransportBy('Company')} /> We pick up
          </label>
        </div>

        {/* Totals */}
        <div className="text-sm space-y-1 border-t pt-2">
          <div className="flex justify-between text-slate-500"><span>Goods</span><span>{inr(computed.goods)}</span></div>
          <div className="flex justify-between text-slate-500"><span>GST on items</span><span>{inr(computed.lineGstTotal)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Charges</span><span>{inr(computed.chargesTotal)}</span></div>
          <div className="flex justify-between text-slate-500"><span>GST on charges</span><span>{inr(computed.chargesGst)}</span></div>
          <div className="flex justify-between font-semibold text-slate-900 text-base border-t pt-1.5 mt-1"><span>Grand Total</span><span>{inr(computed.grand)}</span></div>
          {/* Point 15: CGST + SGST vs IGST — from our GSTIN and the vendor's (fixed when the PO is created). */}
          {company && (computed.lineGstTotal + computed.chargesGst) > 0 && (
            <div className="flex justify-between text-xs gap-3">
              <span className="text-slate-500">GST split</span>
              <GstSplitNote className="text-right" gstAmount={computed.lineGstTotal + computed.chargesGst} split={gstSplitFor({ ourGstin: company.gst, ourState: company.state, theirGstin: vendor.gstNumber, theirState: vendor.address?.state })} />
            </div>
          )}
        </div>

        {risen.length > 0 && (
          <p className="text-xs flex items-center gap-1.5 text-amber-800">
            <TrendingUp className="w-3.5 h-3.5" />
            {risen.map(l => `${l.itemName} +${l.changePct}%`).join(', ')} above what we last paid {vendor.supplierName} (warning at {warnAt}%). Check before creating.
          </p>
        )}
        {outstanding && (outstanding.total > 0 || vendor?.creditLimit > 0) && (
          <div className={`text-xs rounded-md border px-3 py-2 ${(owedPct != null && owedPct >= 1) || outstanding.overdue > 0 ? 'border-red-200 bg-red-50 text-red-800' : owedPct != null && owedPct >= 0.7 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            <p className="flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5" />
              {outstanding.total > 0 ? <>Unpaid to {vendor.supplierName}: {inr(outstanding.total)}</> : <>Nothing unpaid to {vendor.supplierName}</>}
              {vendor?.creditLimit > 0 ? <> of {inr(vendor.creditLimit)} credit limit ({Math.round((owedPct || 0) * 100)}%)</> : null}
              {owedPct != null && owedPct >= 1 && <> — over the limit</>}
            </p>
            {outstanding.total > 0 && (
              <p className="mt-0.5 pl-5">
                {[
                  outstanding.material > 0 && `received + QC-passed ${inr(outstanding.material)}`,
                  outstanding.advance > 0 && `advances due ${inr(outstanding.advance)}`,
                  outstanding.noPo > 0 && `bills without a PO ${inr(outstanding.noPo)}`,
                  outstanding.overdue > 0 && `${inr(outstanding.overdue)} overdue`,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}
        {/* Vendor selection check (gap 12) */}
        {groupIds.length > 0 && (
          <div className={`rounded-md border px-3 py-2 space-y-2 ${selectionFailed ? 'border-rose-200 bg-rose-50/60' : check ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`}>
            <p className="text-xs font-semibold text-slate-600 uppercase">Vendor selection check</p>
            {checkState === 'loading' && <p className="text-xs text-slate-500">Comparing with the other vendors' quotes…</p>}
            {checkState === 'error' && (
              <p className="text-xs text-slate-600">
                Couldn't load the check — the server will still run it when you create the PO.{' '}
                <button type="button" className="text-blue-700 underline" onClick={loadCheck}>Try again</button>
              </p>
            )}
            {check && <SelectionCheckDetails check={check} showReason={false} />}
            {selectionFailed && (
              <div className="space-y-1.5 border-t border-rose-200 pt-2">
                <p className="text-xs text-slate-700">Why this vendor? <span className="text-red-500">*</span> <span className="text-slate-400">— the Company Admin sees this with the comparison above.</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {(check.exceptionReasons || []).map(r => (
                    <button
                      key={r} type="button" onClick={() => toggleReason(r)}
                      className={`text-[11px] rounded-full border px-2.5 py-0.5 ${exReasons.includes(r) ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-rose-400'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <Input className="h-8 text-sm bg-white" value={exNote} onChange={e => setExNote(e.target.value)} placeholder={exReasons.includes('Other') ? 'Explain "Other" *' : 'Note (optional)'} />
              </div>
            )}
            {check && <p className="text-[10px] text-slate-400">Compared on the vendors' quotations as they quoted them — changes you make on this form don't change the comparison.</p>}
          </div>
        )}

        {needsApproval && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Needs the Company Admin: {[
                overThreshold ? `the total is above the ₹${Number(threshold).toLocaleString('en-IN')} limit` : null,
                selectionFailed ? 'this vendor choice is an exception to the selection check' : null,
                chargesAbove ? 'the charges are above the vendor\'s quotation' : null,
              ].filter(Boolean).join('; ')}.
              {' '}It will be <b>sent for approval</b> — it becomes a real PO (sent to the vendor, invoice made, Store sees it) only once approved. Its items stay locked until then.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" onClick={submit} disabled={saving || lines.length === 0 || checkState === 'loading'}>
            {saving ? 'Saving...' : needsApproval ? `Send for approval (${inr(computed.grand)})` : `Create PO (${inr(computed.grand)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
