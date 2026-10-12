import React from 'react';

// CGST + SGST vs IGST on a PO (point 15, 2026-10-10). The GST amount never
// changes — this only says how it splits. `split` = the PO's gstSplit (fixed
// on the server when the PO was created) or one worked out for a preview
// (lib/gstStates.js gstSplitFor).
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const inr = (n) => `₹${round2(n).toLocaleString('en-IN')}`;

export function GstSplitNote({ split, gstAmount, className = '' }) {
  if (!split) return null;
  if (!split.type) {
    return (
      <span className={`text-amber-700 ${className}`}>
        GST type unknown — {split.missing === 'company' ? "the company's GSTIN / state isn't set (Company Admin → My Company)" : "the vendor's GSTIN / state isn't set (Vendor Master)"}.
      </span>
    );
  }
  const where = split.type === 'CGST_SGST' ? `both in ${split.ours?.name}` : `${split.theirs?.name} → ${split.ours?.name}`;
  return (
    <span className={`text-slate-500 ${className}`}>
      {split.type === 'CGST_SGST'
        ? <>CGST {inr(gstAmount / 2)} + SGST {inr(gstAmount / 2)}</>
        : <>IGST {inr(gstAmount)}</>}
      <span className="text-slate-400"> ({where})</span>
    </span>
  );
}
