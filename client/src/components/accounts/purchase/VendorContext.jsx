import React from 'react';

// Vendor context on the RFQ/PO vendor card (point 10, 2026-10-10; vendor
// score 2026-10-13): the vendor score out of 100 and what's behind it —
// on-time deliveries, the share QC accepted — and the vendor's standing. All
// from /api/suppliers/vendor-ratings (vendorScoreService +
// vendorApprovalService.getVendorStanding):
//   Watchlist     — score below the Company Admin's line, or refused to settle a QC rejection
//   Probationary  — fewer than 3 POs with a delivery received yet
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

const STAGE = {
  Watchlist: { cls: 'bg-red-50 text-red-700 border-red-200', label: 'Watchlist' },
  Probationary: { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Probationary', title: 'Fewer than 3 POs delivered so far — not much history yet.' },
};

const RISK = {
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-800 border-amber-200',
  High: 'bg-red-50 text-red-700 border-red-200',
};

export function VendorContextLine({ ctx }) {
  const stage = ctx?.stage ? STAGE[ctx.stage] : null;
  const onTime = ctx?.counts?.onTime || { on: 0, total: 0 };
  const qcAccepted = ctx?.counts?.qc?.acceptedPct ?? null;
  const tone = (p) => (p == null ? 'text-slate-500' : p >= 90 ? 'text-emerald-700' : p >= 70 ? 'text-amber-700' : 'text-red-700');
  const scoreTone = (s) => (s == null ? 'text-slate-500' : s >= 80 ? 'text-emerald-700' : s >= 60 ? 'text-amber-700' : 'text-red-700');
  const onTimePct = pct(onTime.on, onTime.total);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
      {ctx?.score != null ? (
        <>
          <span className={`font-semibold tabular-nums ${scoreTone(ctx.score)}`} title={`Vendor score — price, quality, delivery, credit terms, warranty, response${ctx.limitedHistory ? ' (limited history)' : ''}. See Vendor Ratings.`}>
            {ctx.score}/100{ctx.limitedHistory ? '*' : ''}
          </span>
          {onTime.total > 0 && (
            <span className={tone(onTimePct)} title="Deliveries received on or before the date the vendor first promised (last 12 months)">
              On time {onTime.on}/{onTime.total} ({onTimePct}%)
            </span>
          )}
          {qcAccepted != null && (
            <span className={tone(qcAccepted)} title="Share of received quantity QC accepted (last 12 months)">
              QC accepted {qcAccepted}%
            </span>
          )}
        </>
      ) : (
        <span>No history yet</span>
      )}
      {stage && <span className={`text-[10px] font-semibold px-1.5 py-0 rounded-full border ${stage.cls}`} title={ctx.watchReason || stage.title || ''}>{stage.label}</span>}
      {/* Risk class from Vendor Master — every level shows (user, 2026-10-10). */}
      {RISK[ctx?.riskClass] && <span className={`text-[10px] font-semibold px-1.5 py-0 rounded-full border ${RISK[ctx.riskClass]}`} title="Risk class set in Vendor Master">{ctx.riskClass} risk</span>}
    </span>
  );
}
