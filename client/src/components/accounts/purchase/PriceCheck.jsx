import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Receipt } from 'lucide-react';

// "Bought before" (procurement-v2, 2026-10-09) — what we actually PAID on
// earlier DELIVERED purchases of an item, to judge whether a new quote is
// high or low. Not to be confused with "All quotes" (QuoteHistoryDialog):
// those are the OFFERS vendors made for one PO.
//
// The server sends the history already filtered to the same purchase unit
// and taken back to pre-GST prices (services/quoteChecksService.js). On a
// vendor's row / PO line the tag compares the quote with THAT vendor's own
// last bought price (user decision); clicking it opens every vendor's prices
// for the item. At or above the company's "price-rise warning %" (Purchase
// Settings) the tag turns amber. Warning only.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const inrPlain = (n) => `₹${round2(n).toLocaleString('en-IN')}`;
export const shortDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');
const longDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// Pre-GST price, or null when an "incl. GST" price has no rate to take it back with.
export function comparablePrice(price, inclusive, gstPercent) {
  const p = Number(price);
  if (!(p > 0)) return null;
  if (!inclusive) return p;
  const r = Number(gstPercent);
  return r > 0 ? p / (1 + r / 100) : null;
}

export function priceChangePct(price, reference) {
  const p = Number(price);
  const ref = Number(reference);
  if (!(p > 0) || !(ref > 0)) return null;
  return Math.round(((p - ref) / ref) * 1000) / 10;
}

// This vendor's own last bought price, and the quote's % change against it.
export function vendorCheck(history, vendorId, quotePrice) {
  const theirs = history?.byVendor?.[String(vendorId)] || null;
  return { theirs, pct: theirs && quotePrice != null ? priceChangePct(quotePrice, theirs.last.price) : null };
}

const pctTone = (pct, warnAt) => {
  if (pct == null) return 'neutral';
  if (pct > 0 && pct >= Number(warnAt ?? 10)) return 'warn';
  return pct > 0 ? 'up' : pct < 0 ? 'down' : 'same';
};
const TONE_CLS = {
  warn: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
  up: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
  same: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
  down: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  neutral: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
};
const pctText = (pct) => (pct === 0 ? 'Same as' : `${pct > 0 ? '+' : ''}${pct}% vs`);

// The pop-up: every vendor's bought-before prices for one item.
export function BoughtBeforeDialog({ open, onOpenChange, itemName, unit, history, vendorId = null, vendorName = '', quotePrice = null, warnAt = 10 }) {
  const per = unit ? `/${unit}` : '';
  const vendors = history
    ? Object.entries(history.byVendor || {}).map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => a.last.price - b.last.price)
    : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-600" /> Bought before — {itemName}</DialogTitle>
          <DialogDescription>
            What we paid on earlier <b>delivered</b> purchases of this item{unit ? <>, per {unit}</> : ''}, before GST. These are past purchases, not quotes — the offers for an order are under <b>All quotes</b>.
          </DialogDescription>
        </DialogHeader>

        {quotePrice != null && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            This quote{vendorName ? ` from ${vendorName}` : ''}: <b>{inrPlain(quotePrice)}{per}</b> before GST
          </div>
        )}

        {!history ? (
          <p className="text-sm text-slate-500 py-6 text-center">Never bought before{unit ? ` in ${unit}` : ''} — nothing to compare with yet.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              All vendors: last <b>{inrPlain(history.last.price)}{per}</b> ({history.last.vendorName}, {longDay(history.last.date)}) · lowest <b>{inrPlain(history.lowest.price)}</b> ({history.lowest.vendorName}) · average <b>{inrPlain(history.avg)}</b> · {history.count} deliver{history.count === 1 ? 'y' : 'ies'}
            </p>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 text-left bg-slate-50">
                    <th className="px-3 py-2 font-semibold">Vendor</th>
                    <th className="px-3 py-2 font-semibold text-right">Last bought</th>
                    <th className="px-3 py-2 font-semibold text-right">Lowest</th>
                    <th className="px-3 py-2 font-semibold text-right">Average</th>
                    <th className="px-3 py-2 font-semibold text-right">Deliveries</th>
                    {quotePrice != null && <th className="px-3 py-2 font-semibold text-right">This quote vs their last</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendors.map(v => {
                    const pct = quotePrice != null ? priceChangePct(quotePrice, v.last.price) : null;
                    const mine = vendorId && String(v.id) === String(vendorId);
                    const tone = pctTone(pct, warnAt);
                    return (
                      <tr key={v.id} className={mine ? 'bg-blue-50/60' : ''}>
                        <td className="px-3 py-2">{v.last.vendorName}{mine && <span className="ml-1.5 text-[10px] font-semibold text-blue-700">THIS VENDOR</span>}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{inrPlain(v.last.price)}{per} <span className="text-[11px] text-slate-400">{shortDay(v.last.date)}</span></td>
                        <td className="px-3 py-2 text-right">{inrPlain(v.lowest.price)}</td>
                        <td className="px-3 py-2 text-right">{inrPlain(v.avg)}</td>
                        <td className="px-3 py-2 text-right">{v.count}</td>
                        {quotePrice != null && (
                          <td className={`px-3 py-2 text-right font-medium ${tone === 'warn' ? 'text-amber-700' : tone === 'down' ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {pct == null ? '—' : `${pct > 0 ? '+' : ''}${pct}%`}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {vendorId && !history.byVendor?.[String(vendorId)] && (
              <p className="text-xs text-slate-500">{vendorName || 'This vendor'} hasn't delivered this item before.</p>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Recent deliveries</p>
              <div className="border rounded-lg divide-y text-xs">
                {(history.recent || []).map((r, i) => (
                  <div key={i} className="px-3 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 w-24 shrink-0">{longDay(r.date)}</span>
                    <span className="flex-1 min-w-0 truncate">{r.vendorName}</span>
                    <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">{r.poNumber}</span>
                    <span className="w-24 text-right font-medium">{inrPlain(r.price)}{per}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// The tag on a vendor row / PO line: this vendor's own last bought price
// (and the quote's % change against it). Click → every vendor's prices.
//   priced:  "+12% vs last bought from them ₹120/kg (5 Oct)"
//   no quote: "Last bought from them ₹120/kg (5 Oct)"
//   new:     "Not bought from them before"
// Renders nothing when nobody has delivered this item before.
export function BoughtBeforeTag({ history, vendorId, vendorName, itemName, unit, quotePrice = null, warnAt = 10, compact = false }) {
  const [open, setOpen] = useState(false);
  if (!history) return null;
  const per = unit ? `/${unit}` : '';
  const { theirs, pct } = vendorCheck(history, vendorId, quotePrice);
  const tone = pctTone(pct, warnAt);
  const Icon = pct == null ? null : pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  let text;
  if (!theirs) text = compact ? 'New vendor for this item' : 'Not bought from them before';
  else if (pct != null) text = compact ? `${pct > 0 ? '+' : ''}${pct}% vs ${inrPlain(theirs.last.price)}` : `${pctText(pct)} last bought from them ${inrPlain(theirs.last.price)}${per} (${shortDay(theirs.last.date)})`;
  else text = compact ? `Last ${inrPlain(theirs.last.price)}` : `Last bought from them ${inrPlain(theirs.last.price)}${per} (${shortDay(theirs.last.date)})`;
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Bought before — click to see what every vendor was paid for this item"
        className={`inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-1.5 py-0.5 whitespace-nowrap cursor-pointer ${TONE_CLS[tone]}`}
      >
        {Icon && <Icon className="w-2.5 h-2.5" />}{text}<ChevronRight className="w-2.5 h-2.5 opacity-60" />
      </button>
      <BoughtBeforeDialog
        open={open} onOpenChange={setOpen}
        itemName={itemName} unit={unit} history={history}
        vendorId={vendorId} vendorName={vendorName} quotePrice={quotePrice} warnAt={warnAt}
      />
    </>
  );
}

// Item level (the item card on RFQ/PO): every vendor's last / lowest / average. Click → the same pop-up.
export function ItemBoughtBefore({ history, itemName, unit, className = '' }) {
  const [open, setOpen] = useState(false);
  if (!history) return <span className={`text-slate-400 ${className}`}>Never bought before{unit ? ` in ${unit}` : ''}</span>;
  const per = unit ? `/${unit}` : '';
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }} title="Click to see what every vendor was paid" className={`text-left hover:text-blue-700 hover:underline ${className}`}>
        Bought before: last {inrPlain(history.last.price)}{per} ({history.last.vendorName}, {shortDay(history.last.date)})
        {history.count > 1 && <> · lowest {inrPlain(history.lowest.price)} · avg {inrPlain(history.avg)}</>}
        {' '}· {history.count} deliver{history.count === 1 ? 'y' : 'ies'}
      </button>
      <BoughtBeforeDialog open={open} onOpenChange={setOpen} itemName={itemName} unit={unit} history={history} />
    </>
  );
}
