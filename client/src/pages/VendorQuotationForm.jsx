import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'wouter';
import { CheckCircle, AlertCircle, Loader2, Send, Building2, Plus, Trash2, Package } from 'lucide-react';
import { formatDims } from '@/lib/fabricationDims';

// Public vendor quotation page (procurement-v2, 2026-10-08) — the link in
// ONE quotation-request email that covers several items (replaces the old
// one-item /vendor-bid/:token page for new requests). The vendor prices every
// item (price, GST %, "includes GST", delivery, warranty, remarks — or leaves
// it blank if they can't supply it), adds charges and payment terms (the
// company's template names, plus their own lines), and submits ONCE. After
// that the page is a read-only summary.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => `₹${round2(n).toLocaleString('en-IN')}`;
const pct = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0; };
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Shell({ tone = 'blue', children }) {
  const bg = { blue: 'from-blue-50 via-indigo-50 to-purple-50', red: 'from-red-50 to-orange-100', green: 'from-green-50 to-emerald-100' }[tone];
  return <div className={`min-h-screen bg-gradient-to-br ${bg} py-8 px-4`}>{children}</div>;
}

function Header({ data }) {
  return (
    <div className="bg-gradient-to-r from-blue-700 to-purple-700 rounded-2xl p-6 mb-5 text-white text-center shadow-lg">
      <Building2 className="w-9 h-9 mx-auto mb-2 opacity-90" />
      <h1 className="text-2xl font-bold">Request for Quotation</h1>
      <p className="text-blue-100 text-sm mt-1">{data.companyName} · {data.requestNo}</p>
    </div>
  );
}

function ItemHead({ it }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-800 flex items-center gap-1.5"><Package className="w-4 h-4 text-blue-500 shrink-0" />{it.itemName}
        {it.itemCode && <span className="text-xs font-normal text-slate-400">({it.itemCode})</span>}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">Quantity: <b className="text-slate-700">{it.quantity} {it.purchaseUnit || 'unit(s)'}</b></p>
      {it.fabricationDimensionLines?.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {it.fabricationDimensionLines.map((l, i) => (
            <p key={i} className="text-[11px] text-slate-500 font-mono">{formatDims(l.values)} × {l.quantity}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// Read-only view once the quotation is in.
function SubmittedSummary({ data }) {
  const s = data.submission || {};
  const terms = s.paymentTerms || {};
  return (
    <Shell tone="green">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-slate-800">Quotation submitted</h2>
            <p className="text-slate-500 text-sm mt-1">Thank you, <b>{data.vendorName}</b>. {data.requestNo} was submitted on {fmtDay(s.submittedAt)}. You'll hear from us by email if an order is placed.</p>
            {data.quoteValidityDays && s.submittedAt && (
              <p className="text-slate-400 text-xs mt-1">Your prices are taken as valid till {fmtDay(new Date(new Date(s.submittedAt).getTime() + data.quoteValidityDays * 86400000))}.</p>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Items</p>
          <div className="border rounded-xl divide-y mb-5">
            {data.items.map(it => {
              const a = it.answer;
              return (
                <div key={it.vendorBidId} className="p-3 flex flex-wrap justify-between gap-2">
                  <ItemHead it={it} />
                  <div className="text-sm text-right">
                    {!a || a.declined ? <span className="text-slate-400 italic">Not quoted</span> : (
                      <>
                        <p className="font-semibold text-slate-800">{inr(a.unitPrice)}{it.purchaseUnit ? ` / ${it.purchaseUnit}` : ''} {a.gstInclusive ? '(incl. GST)' : `+ ${a.gstPercent ?? 0}% GST`}</p>
                        <p className="text-xs text-slate-500">{a.deliveryDays} days{a.warrantyMonths ? ` · ${a.warrantyMonths} months warranty` : ''}</p>
                        {a.remarks && <p className="text-xs text-slate-500">{a.remarks}</p>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {s.charges?.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Charges</p>
              <div className="border rounded-xl divide-y mb-5">
                {s.charges.map((c, i) => (
                  <div key={i} className="p-3 flex justify-between text-sm"><span>{c.label}</span><span>{inr(c.amount)} + {c.gstPercent || 0}% GST</span></div>
                ))}
              </div>
            </>
          )}
          {(terms.advancePercent != null || terms.creditDays != null || terms.others?.length > 0) && (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Payment terms</p>
              <ul className="text-sm text-slate-700 space-y-1 mb-5 pl-4 list-disc">
                {terms.advancePercent != null && <li>Advance: {terms.advancePercent}%</li>}
                {terms.creditDays != null && <li>Credit: {terms.creditDays} days</li>}
                {(terms.others || []).map((o, i) => <li key={i}>{o.label}: {o.value}</li>)}
              </ul>
            </>
          )}
          {s.remarks && <p className="text-sm text-slate-600"><b>Remarks:</b> {s.remarks}</p>}
        </div>
      </div>
    </Shell>
  );
}

export default function VendorQuotationForm() {
  const { token } = useParams();
  const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [answers, setAnswers] = useState({});   // vendorBidId -> fields
  const [charges, setCharges] = useState([]);   // [{label, amount, gstPercent, offered}]
  const [advancePercent, setAdvancePercent] = useState('');
  const [creditDays, setCreditDays] = useState('');
  const [terms, setTerms] = useState([]);       // [{label, value, offered}]
  const [remarks, setRemarks] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/vendor-quotation/${token}`);
      const body = await res.json();
      if (!res.ok) { setError(body.message || 'This link is not valid.'); return; }
      const d = body.data;
      setData(d);
      setAnswers(Object.fromEntries(d.items.map(it => [String(it.vendorBidId), { unitPrice: '', gstPercent: '', gstInclusive: false, deliveryDays: '', warrantyMonths: '', remarks: '', cantSupply: false }])));
      // Charges and payment terms are added by choice (only the ones they give)
      // — terms 2026-10-09, charges 2026-10-14: a pre-listed charge with a
      // blank amount read like something the vendor was expected to charge.
      // Their OWN charges + terms from their last quotation are pre-filled
      // (2026-10-14): they carry on unless the vendor changes them.
      const carry = d.carryOver;
      const offeredCharge = new Set((d.offeredChargeLabels || []).map(c => c.name));
      const offeredTerm = new Set((d.offeredTermLabels || []).map(t => t.name));
      setCharges((carry?.charges || []).map(c => ({ label: c.label, amount: String(c.amount), gstPercent: String(c.gstPercent ?? 0), offered: offeredCharge.has(c.label) })));
      setAdvancePercent(carry?.paymentTerms?.advancePercent != null ? String(carry.paymentTerms.advancePercent) : '');
      setCreditDays(carry?.paymentTerms?.creditDays != null ? String(carry.paymentTerms.creditDays) : '');
      setTerms((carry?.paymentTerms?.others || []).map(t => ({ label: t.label, value: t.value, offered: offeredTerm.has(t.label) })));
    } catch {
      setError('Could not load the quotation. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAnswer = (id, patch) => setAnswers(a => ({ ...a, [id]: { ...a[id], ...patch } }));
  const setCharge = (i, patch) => setCharges(cs => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addCharge = (name) => {
    const offered = (data?.offeredChargeLabels || []).find(c => c.name === name);
    setCharges(cs => [...cs, { label: name || '', amount: '', gstPercent: String(offered?.defaultGstPercent ?? 0), offered: !!name }]);
  };
  const chargeChoices = (data?.offeredChargeLabels || []).filter(c => !charges.some(x => x.offered && x.label === c.name));
  const setTerm = (i, patch) => setTerms(ts => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTerm = (name) => setTerms(ts => [...ts, { label: name || '', value: '', offered: !!name }]);
  const termChoices = (data?.offeredTermLabels || []).filter(t => !terms.some(x => x.offered && x.label === t.name));

  const openItems = useMemo(() => (data?.items || []).filter(it => !it.replaced), [data]);

  const totals = useMemo(() => {
    let goods = 0; let itemGst = 0; let priced = 0;
    for (const it of openItems) {
      const a = answers[String(it.vendorBidId)];
      const price = Number(a?.unitPrice);
      if (!a || a.cantSupply || !(price > 0)) continue;
      priced += 1;
      const amount = price * Number(it.quantity || 0);
      goods += amount;
      if (!a.gstInclusive) itemGst += amount * pct(a.gstPercent) / 100;
    }
    const live = charges.filter(c => String(c.label).trim() && Number(c.amount) > 0);
    const chargesTotal = live.reduce((s, c) => s + Number(c.amount), 0);
    const chargesGst = live.reduce((s, c) => s + Number(c.amount) * pct(c.gstPercent) / 100, 0);
    return { priced, goods, itemGst, chargesTotal, chargesGst, grand: goods + itemGst + chargesTotal + chargesGst };
  }, [openItems, answers, charges]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    for (const it of openItems) {
      const a = answers[String(it.vendorBidId)];
      if (a.cantSupply || !(Number(a.unitPrice) > 0)) continue;
      if (!(Number(a.deliveryDays) >= 1)) { setFormError(`Enter the delivery time (days) for "${it.itemName}".`); return; }
      if (!a.gstInclusive && a.gstPercent === '') { setFormError(`Enter the GST % for "${it.itemName}" (0 if none), or tick "Price includes GST".`); return; }
    }
    const saidCantSupply = openItems.some(it => answers[String(it.vendorBidId)]?.cantSupply);
    if (!totals.priced && !saidCantSupply) { setFormError('Enter a price for at least one item, or tick "Can\'t supply" on the items you can\'t supply.'); return; }
    for (const c of charges) {
      const label = String(c.label).trim();
      if (!label && c.amount === '') continue;
      if (!label) { setFormError('Name each charge you added.'); return; }
      if (!(Number(c.amount) > 0)) { setFormError(`Enter the amount for "${label}" under charges, or remove it.`); return; }
    }
    for (const t of terms) {
      const label = String(t.label).trim();
      const value = String(t.value).trim();
      if (!label && !value) continue;
      if (!label) { setFormError('Name each payment term you added.'); return; }
      if (!value) { setFormError(`Fill in "${label}" under payment terms, or remove it.`); return; }
    }
    if (!window.confirm('You can submit this quotation only once. Submit now?')) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/vendor-quotation/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: openItems.map(it => {
            const a = answers[String(it.vendorBidId)];
            return a.cantSupply ? { vendorBidId: it.vendorBidId, unitPrice: 0, cantSupply: true } : {
              vendorBidId: it.vendorBidId,
              unitPrice: Number(a.unitPrice) || 0,
              gstPercent: a.gstInclusive ? null : a.gstPercent,
              gstInclusive: a.gstInclusive,
              deliveryDays: Number(a.deliveryDays) || 0,
              warrantyMonths: Number(a.warrantyMonths) || 0,
              remarks: a.remarks,
            };
          }),
          charges: charges.map(c => ({ label: String(c.label).trim(), amount: Number(c.amount) || 0, gstPercent: pct(c.gstPercent) })),
          paymentTerms: {
            advancePercent: advancePercent === '' ? null : Number(advancePercent),
            creditDays: creditDays === '' ? null : Number(creditDays),
            others: terms.map(t => ({ label: String(t.label).trim(), value: String(t.value).trim() })).filter(t => t.label && t.value),
          },
          remarks,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setFormError(body.message || 'Could not submit. Please try again.'); if (res.status === 409 || res.status === 410) load(); return; }
      await load();
    } catch {
      setFormError('Could not submit. Please check your internet connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm mx-auto">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading the quotation…</p>
        </div>
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell tone="red">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md mx-auto">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-5" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link problem</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </Shell>
    );
  }
  if (data.status === 'Submitted') return <SubmittedSummary data={data} />;

  return (
    <Shell>
      <form onSubmit={submit} className="max-w-3xl mx-auto">
        <Header data={data} />

        <div className="bg-white rounded-2xl shadow-md p-5 mb-5 border border-slate-100 text-sm text-slate-600">
          Hello <b className="text-slate-800">{data.vendorName}</b>, please quote for the items below. Leave an item blank (or tick "Can't supply") if you can't supply it.
          <span className="block text-xs text-slate-400 mt-1">
            This link is valid until {fmtDay(data.tokenExpiry)}. You can submit only once.
            {data.quoteValidityDays ? ` Your prices will be treated as valid for ${data.quoteValidityDays} days from the day you submit.` : ''}
          </span>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-5 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Items ({openItems.length})</p>
          {openItems.length === 0 && <p className="text-sm text-slate-500">There's nothing left to quote on this link.</p>}
          <div className="space-y-4">
            {data.items.map(it => {
              const id = String(it.vendorBidId);
              const a = answers[id] || {};
              if (it.replaced) {
                return (
                  <div key={id} className="border border-dashed rounded-xl p-3 bg-slate-50 opacity-70">
                    <ItemHead it={it} />
                    <p className="text-xs text-slate-500 mt-1">
                      {it.closedReason === 'replaced' ? 'No longer open on this link — please use our newer request for this item.' : 'No longer needed — no need to quote this item.'}
                    </p>
                  </div>
                );
              }
              const fab = it.fabricationDimensionLines?.length > 0;
              const amount = Number(a.unitPrice) * Number(it.quantity || 0);
              return (
                <div key={id} className={`border rounded-xl p-3 ${a.cantSupply ? 'bg-slate-50' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <ItemHead it={it} />
                    <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={!!a.cantSupply} onChange={e => setAnswer(id, { cantSupply: e.target.checked })} /> Can't supply
                    </label>
                  </div>
                  {!a.cantSupply && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <label className="text-xs text-slate-500">Price per {it.purchaseUnit || 'unit'} (₹)
                          <input type="number" min="0" step="0.01" className={`${inputCls} mt-0.5`} value={a.unitPrice} onChange={e => setAnswer(id, { unitPrice: e.target.value })} placeholder="e.g. 250" />
                        </label>
                        <label className="text-xs text-slate-500">GST %
                          <input type="number" min="0" max="100" step="0.01" className={`${inputCls} mt-0.5 disabled:bg-slate-100`} value={a.gstInclusive ? '' : a.gstPercent} disabled={a.gstInclusive} onChange={e => setAnswer(id, { gstPercent: e.target.value })} placeholder={a.gstInclusive ? 'included' : 'e.g. 18'} />
                        </label>
                        <label className="text-xs text-slate-500">Delivery (days)
                          <input type="number" min="1" className={`${inputCls} mt-0.5`} value={a.deliveryDays} onChange={e => setAnswer(id, { deliveryDays: e.target.value })} placeholder="e.g. 7" />
                        </label>
                        {!fab && (
                          <label className="text-xs text-slate-500">Warranty (months)
                            <input type="number" min="0" className={`${inputCls} mt-0.5`} value={a.warrantyMonths} onChange={e => setAnswer(id, { warrantyMonths: e.target.value })} placeholder="0 if none" />
                          </label>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!a.gstInclusive} onChange={e => setAnswer(id, { gstInclusive: e.target.checked })} /> Price already includes GST
                        </label>
                        {Number(a.unitPrice) > 0 && <span className="text-xs text-emerald-700 font-medium">Item value {inr(amount)}</span>}
                      </div>
                      <input className={`${inputCls} mt-2`} value={a.remarks} onChange={e => setAnswer(id, { remarks: e.target.value })} placeholder="Remarks — brand, make, stock… (optional)" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {data.carryOver && (
          <div className="rounded-2xl p-4 mb-5 border border-blue-200 bg-blue-50 text-sm text-blue-800">
            Your charges and payment terms below are carried over from your last quotation to us ({fmtDay(data.carryOver.at)}).
            If anything is different for this order, change or remove it — otherwise they carry on to this quotation.
          </div>
        )}

        {/* Charges */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-5 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Charges on the whole order</p>
          <p className="text-xs text-slate-400 mb-3">Add only the charges you will bill on this order (freight, packing…). GST % can be 0.</p>
          <div className="space-y-2">
            {charges.map((c, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                {c.offered
                  ? <span className="flex-1 min-w-[140px] text-sm text-slate-700">{c.label}</span>
                  : <input className={`${inputCls} flex-1 min-w-[140px]`} value={c.label} onChange={e => setCharge(i, { label: e.target.value })} placeholder="Charge name" />}
                <input type="number" min="0" className={`${inputCls} w-28`} value={c.amount} onChange={e => setCharge(i, { amount: e.target.value })} placeholder="₹ amount" />
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <input type="number" min="0" max="100" className={`${inputCls} w-20`} value={c.gstPercent} onChange={e => setCharge(i, { gstPercent: e.target.value })} />% GST
                </span>
                <button type="button" onClick={() => setCharges(cs => cs.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <select className={`${inputCls} mt-3 sm:w-64 bg-white text-blue-700`} value="" onChange={e => { if (e.target.value) addCharge(e.target.value === '__other' ? '' : e.target.value); }}>
            <option value="">+ Add a charge…</option>
            {chargeChoices.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            <option value="__other">Other (type your own)</option>
          </select>
        </div>

        {/* Payment terms */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-5 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3">Your payment terms</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="text-xs text-slate-500">Advance %
              <input type="number" min="0" max="100" className={`${inputCls} mt-0.5`} value={advancePercent} onChange={e => setAdvancePercent(e.target.value)} placeholder="e.g. 30" />
            </label>
            <label className="text-xs text-slate-500">Credit days
              <input type="number" min="0" className={`${inputCls} mt-0.5`} value={creditDays} onChange={e => setCreditDays(e.target.value)} placeholder="e.g. 45" />
            </label>
          </div>
          <div className="space-y-2">
            {terms.map((t, i) => (
              <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                {t.offered
                  ? <span className="sm:w-48 text-sm text-slate-700">{t.label}</span>
                  : <input className={`${inputCls} sm:w-48`} value={t.label} onChange={e => setTerm(i, { label: e.target.value })} placeholder="Term name" />}
                <input className={`${inputCls} flex-1`} value={t.value} onChange={e => setTerm(i, { value: e.target.value })} placeholder="Details" />
                <button type="button" onClick={() => setTerms(ts => ts.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <select className={`${inputCls} mt-3 sm:w-64 bg-white text-blue-700`} value="" onChange={e => { if (e.target.value) addTerm(e.target.value === '__other' ? '' : e.target.value); }}>
            <option value="">+ Add a payment term…</option>
            {termChoices.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            <option value="__other">Other (type your own)</option>
          </select>
        </div>

        {/* Remarks + total */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-5 border border-slate-100">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Remarks (optional)</label>
          <textarea rows={3} className={`${inputCls} resize-none`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Anything else we should know" />
          <div className="mt-4 text-sm space-y-1 border-t pt-3">
            <div className="flex justify-between text-slate-500"><span>Items priced</span><span>{totals.priced} of {openItems.length}</span></div>
            <div className="flex justify-between text-slate-500"><span>Goods</span><span>{inr(totals.goods)}</span></div>
            <div className="flex justify-between text-slate-500"><span>GST on items</span><span>{inr(totals.itemGst)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Charges + their GST</span><span>{inr(totals.chargesTotal + totals.chargesGst)}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-base border-t pt-1.5"><span>Total</span><span>{inr(totals.grand)}</span></div>
          </div>
        </div>

        {formError && <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
        <button
          type="submit"
          disabled={submitting || openItems.length === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</> : <><Send className="w-5 h-5" /> Submit quotation</>}
        </button>
        <p className="text-xs text-center text-slate-400 mt-3">You can submit only once — please check everything first.</p>
      </form>
    </Shell>
  );
}
