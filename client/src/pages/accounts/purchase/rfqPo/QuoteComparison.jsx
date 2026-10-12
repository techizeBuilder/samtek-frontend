import React from 'react';
import { Award } from 'lucide-react';

// Per-item quote comparison (point 11, 2026-10-10) — inside an expanded item
// card on RFQ/PO, below "Select requests": every vendor's current quote for
// this one item side by side. "Landed" here = rate + GST (nothing on top when
// the rate includes GST); whole-quotation charges (freight…) aren't split
// per item, so they're left out — the PO-level selection check counts them.
// The lowest usable quote (submitted, valid, matching the current quantity)
// is marked. Information only: the order is still placed per vendor.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => `₹${round2(n).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');

const perUnitLanded = (q) => (q.gstInclusive ? Number(q.unitPrice) : Number(q.unitPrice) * (1 + (Number(q.gstPercent) || 0) / 100));
const usable = (q) => q.status === 'Submitted' && !q.isExpired && !q.isStale;

export default function QuoteComparison({ quotes = [], unit = '' }) {
  if (!quotes.length) {
    return <p className="text-xs text-slate-400 italic">No quotes for this item yet — ask vendors from the vendor cards on the right.</p>;
  }
  const priced = quotes.filter(q => q.status === 'Submitted' || q.status === 'Selected');
  const waiting = quotes.filter(q => q.status === 'Invited');
  const declined = quotes.filter(q => q.status === 'Declined');
  const best = priced.filter(usable).sort((a, b) => perUnitLanded(a) - perUnitLanded(b))[0] || null;
  const sorted = [...priced].sort((a, b) => perUnitLanded(a) - perUnitLanded(b));

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-slate-500 uppercase">Quotes compared ({priced.length})</p>
      {priced.length > 0 && (
        <div className="border rounded-md overflow-x-auto thin-scrollbar bg-white">
          <table className="w-full text-xs min-w-[480px]">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 text-left border-b">
                <th className="px-2 py-1 font-semibold">Vendor</th>
                <th className="px-2 py-1 font-semibold text-right">Rate{unit ? `/${unit}` : ''}</th>
                <th className="px-2 py-1 font-semibold">GST</th>
                <th className="px-2 py-1 font-semibold text-right">With GST</th>
                <th className="px-2 py-1 font-semibold text-right">Line total</th>
                <th className="px-2 py-1 font-semibold">Delivery</th>
                <th className="px-2 py-1 font-semibold">Valid</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(q => {
                const isBest = best && String(best._id) === String(q._id);
                const dim = !usable(q);
                const landed = perUnitLanded(q);
                const diff = best && !isBest && usable(q) ? round2(((landed - perUnitLanded(best)) / perUnitLanded(best)) * 100) : null;
                return (
                  <tr key={q._id} className={isBest ? 'bg-emerald-50/70' : dim ? 'text-slate-400' : ''}>
                    <td className="px-2 py-1">
                      <span className="font-medium">{q.vendorName}</span>
                      {isBest && <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold"><Award className="w-3 h-3" />Lowest</span>}
                      {diff != null && diff > 0 && <span className="ml-1 text-[10px] text-slate-500">+{diff}%</span>}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{inr(q.unitPrice)}</td>
                    <td className="px-2 py-1">{q.gstInclusive ? 'incl.' : q.gstPercent != null ? `${q.gstPercent}%` : '—'}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{inr(landed)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{inr(landed * (Number(q.quantity) || 0))}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{q.deliveryDays ? `${q.deliveryDays} d` : '—'}{q.warrantyMonths ? ` · ${q.warrantyMonths}m wty` : ''}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {q.isExpired ? <span className="text-red-600">Expired</span>
                        : q.isStale ? <span className="text-amber-700" title="Quoted for a different quantity — re-sync or re-quote">Old qty</span>
                          : q.validUntil ? `till ${day(q.validUntil)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(waiting.length > 0 || declined.length > 0) && (
        <p className="text-[11px] text-slate-500">
          {waiting.length > 0 && <>Waiting for: {waiting.map(q => q.vendorName).join(', ')}. </>}
          {declined.length > 0 && <>Can't supply: {declined.map(q => q.vendorName).join(', ')}.</>}
        </p>
      )}
      {priced.length > 0 && <p className="text-[10px] text-slate-400">"With GST" is per {unit || 'unit'}; freight and other whole-quotation charges aren't included here — the PO review compares those.</p>}
    </div>
  );
}
