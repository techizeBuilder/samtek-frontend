import React from 'react';
import { CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

// Vendor selection check at PO time (procurement-v2 gap 12, 2026-10-09).
// The server works it out (vendorSelectionCheckService.js) — this only shows
// it: in the PO review before creating, and as the snapshot saved on the PO
// for the Company Admin and Purchase afterwards (blueprint §11 "preserve the
// calculated score").
//   - competition: per item, how many approved vendors were asked
//   - basket: every vendor that quoted EVERY item of this PO, on landed cost
//     (price + GST + their quoted charges, counted once per quotation)
//   - item hints: an item quoted cheaper elsewhere — information only
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => `₹${round2(n).toLocaleString('en-IN')}`;

export const APPROVAL_REASON_META = {
  threshold: { label: 'Over the ₹ limit', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  selection: { label: 'Vendor selection exception', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
};

export function ApprovalReasonBadges({ reasons = [] }) {
  if (!reasons.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {reasons.map(r => APPROVAL_REASON_META[r] && (
        <span key={r} className={`text-[10px] font-medium border rounded-full px-2 py-0.5 ${APPROVAL_REASON_META[r].cls}`}>{APPROVAL_REASON_META[r].label}</span>
      ))}
    </span>
  );
}

// One-line status, for a list row.
export function SelectionCheckLine({ check }) {
  if (!check) return null;
  return check.passed ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Selection check passed</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-rose-700"><AlertTriangle className="w-3 h-3" /> Selection exception{check.exceptionReasons?.length ? `: ${check.exceptionReasons.join(', ')}` : ''}</span>
  );
}

// The full picture — failures, the landed-cost comparison, item hints and
// (on a saved PO) Purchase's reason.
export function SelectionCheckDetails({ check, showReason = true }) {
  if (!check) return null;
  const mine = check.thisVendor;
  const anyGstUnknown = (check.basket || []).some(b => b.gstUnknown);
  return (
    <div className="space-y-2 text-xs">
      {check.passed ? (
        <p className="flex items-start gap-1.5 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Enough vendors were asked for every item, and no vendor quoted this whole PO for less{mine ? <> — {inr(mine.landed)} landed</> : ''}.</span>
        </p>
      ) : (
        <ul className="space-y-0.5 text-rose-800">
          {(check.failures || []).map((f, i) => (
            <li key={i} className="flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{f}</span></li>
          ))}
        </ul>
      )}

      {(check.basket || []).length > 1 && (
        <div className="border rounded-md overflow-hidden bg-white">
          <p className="px-2 py-1 bg-slate-50 text-[11px] text-slate-500 border-b">Vendors who quoted every item on this PO — landed cost (price + GST + their charges), at this PO's quantities</p>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-slate-400">
              <tr><th className="text-left px-2 py-1 font-medium">Vendor</th><th className="text-right px-2 py-1 font-medium">Items + GST</th><th className="text-right px-2 py-1 font-medium">Charges</th><th className="text-right px-2 py-1 font-medium">Landed</th><th className="text-right px-2 py-1 font-medium">vs this PO</th></tr>
            </thead>
            <tbody className="divide-y">
              {check.basket.map(b => {
                const diff = mine ? round2(b.landed - mine.landed) : null;
                return (
                  <tr key={b.vendorId} className={b.isThisVendor ? 'bg-blue-50/60 font-medium' : ''}>
                    <td className="px-2 py-1">{b.vendorName}{b.isThisVendor && <span className="text-[10px] text-blue-700"> (this PO)</span>}{b.gstUnknown && <span className="text-slate-400"> *</span>}</td>
                    <td className="px-2 py-1 text-right">{inr(b.goodsAndGst)}</td>
                    <td className="px-2 py-1 text-right">{b.charges ? inr(b.charges) : '—'}</td>
                    <td className="px-2 py-1 text-right">{inr(b.landed)}</td>
                    <td className={`px-2 py-1 text-right ${diff == null || b.isThisVendor ? 'text-slate-400' : diff < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {b.isThisVendor || diff == null ? '—' : `${diff < 0 ? '−' : '+'}${inr(Math.abs(diff))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {anyGstUnknown && <p className="px-2 py-1 text-[10px] text-slate-400 border-t">* GST not given on a quote — counted as 0%.</p>}
        </div>
      )}

      {(check.competition || []).some(c => !c.passed) && (
        <p className="text-[11px] text-slate-500">
          Vendors asked: {(check.competition || []).map(c => `${c.itemName} ${c.asked}/${c.required}`).join(' · ')}
          <span className="text-slate-400"> (needed = the company minimum of {check.minVendorsPerItem}, or fewer if fewer approved vendors supply the item)</span>
        </p>
      )}

      {(check.itemHints || []).length > 0 && (
        <div className="text-[11px] text-slate-600 space-y-0.5">
          {check.itemHints.map((h, i) => (
            <p key={i} className="flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
              <span>{h.itemName}: {h.vendorName} quoted {inr(h.theirs)}/unit incl. GST vs {inr(h.ours)} here — a hint only; splitting the order can cost more in charges.</span>
            </p>
          ))}
        </div>
      )}

      {showReason && !check.passed && check.exceptionReasons?.length > 0 && (
        <p className="text-slate-700"><span className="font-medium">Purchase's reason:</span> {check.exceptionReasons.join(', ')}{check.exceptionNote ? ` — "${check.exceptionNote}"` : ''}</p>
      )}
    </div>
  );
}
