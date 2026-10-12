import React from 'react';
import { Star } from 'lucide-react';

// Vendor context on the RFQ/PO vendor card (point 10, 2026-10-10): the
// computed rating and what's behind it — on-time deliveries, QC passes — and
// the vendor's standing. All from /api/suppliers/vendor-ratings
// (vendorRatingService + vendorApprovalService.getVendorStanding):
//   Watchlist     — rating below 3.0 over at least 5 events
//   Probationary  — fewer than 3 POs with a delivery received yet
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

const STAGE = {
  Watchlist: { cls: 'bg-red-50 text-red-700 border-red-200', label: 'Watchlist', title: 'Rating below 3.0 over at least 5 deliveries / QC results — check before ordering.' },
  Probationary: { cls: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Probationary', title: 'Fewer than 3 POs delivered so far — not much history yet.' },
};

const RISK = {
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-800 border-amber-200',
  High: 'bg-red-50 text-red-700 border-red-200',
};

export function VendorContextLine({ ctx }) {
  const stage = ctx?.stage ? STAGE[ctx.stage] : null;
  const onTime = ctx?.onTime || { on: 0, total: 0 };
  const qc = ctx?.qc || { pass: 0, total: 0 };
  const hasHistory = (ctx?.eventCount || 0) > 0;
  const tone = (p) => (p == null ? 'text-slate-500' : p >= 90 ? 'text-emerald-700' : p >= 70 ? 'text-amber-700' : 'text-red-700');
  const onTimePct = pct(onTime.on, onTime.total);
  const qcPct = pct(qc.pass, qc.total);
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
      {hasHistory ? (
        <>
          <span className="inline-flex items-center gap-0.5" title={`Rating from ${ctx.eventCount} deliveries and QC results (5 = good, 1 = bad)`}>
            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />{ctx.rating}
          </span>
          {onTime.total > 0 && (
            <span className={tone(onTimePct)} title="Deliveries received on or before the date the vendor first promised">
              On time {onTime.on}/{onTime.total} ({onTimePct}%)
            </span>
          )}
          {qc.total > 0 && (
            <span className={tone(qcPct)} title="QC results that passed (each partial rejection counts as a fail)">
              QC pass {qc.pass}/{qc.total} ({qcPct}%)
            </span>
          )}
        </>
      ) : (
        <span>No deliveries yet</span>
      )}
      {stage && <span className={`text-[10px] font-semibold px-1.5 py-0 rounded-full border ${stage.cls}`} title={stage.title}>{stage.label}</span>}
      {/* Risk class from Vendor Master — every level shows (user, 2026-10-10). */}
      {RISK[ctx?.riskClass] && <span className={`text-[10px] font-semibold px-1.5 py-0 rounded-full border ${RISK[ctx.riskClass]}`} title="Risk class set in Vendor Master">{ctx.riskClass} risk</span>}
    </span>
  );
}
