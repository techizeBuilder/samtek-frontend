import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Award, Zap, Clock, AlertTriangle, RefreshCw, Lock, Store, Mail, History, XCircle, CalendarX, FileCheck, Pencil, BellRing } from 'lucide-react';
import { formatDims } from '@/lib/fabricationDims';
import PoReviewDialog from '@/components/accounts/purchase/PoReviewDialog';
import QuoteHistoryDialog from '@/components/accounts/purchase/QuoteHistoryDialog';
import { VendorContextLine } from '@/components/accounts/purchase/VendorContext';
import { BoughtBeforeTag, comparablePrice, shortDay } from '@/components/accounts/purchase/PriceCheck';
import { CHANNEL_META, ManualQuotationDialog, QuotationRequestDialog, requestWaitingLabel, inr } from './rfqShared';

// RFQ/PO page — RIGHT side: vendors (procurement-v2, 2026-10-08). Only
// Company-Admin-approved, active vendors linked (Vendor Master) to at least
// one CONSIDERED item show — considered = the items ticked on the left, or
// every listed item when none is ticked. Ranked by how many considered items
// they cover ("k/N" badge), then by the chosen sort. Each covered item is one
// row: that vendor's latest quote for it, and a tick. Ticked rows can be
//   - quoted manually: "Manual quotation" — the vendor's WhatsApp / PDF /
//     email evidence plus each item's price, saved together (2026-10-09),
//   - emailed: ONE quotation-request email for all of them (the vendor prices
//     every item, plus charges / payment terms, on one page), or
//   - ordered: rows with a submitted, up-to-date quote go into ONE PO
//     (batching, as before) through the review dialog.
const gstLabel = (q) => (q.gstInclusive ? ' incl. GST' : q.gstPercent != null ? ` + ${q.gstPercent}% GST` : ' + GST');
export const SORTS = [
  { key: 'price', label: 'Lowest quoted total' },
  { key: 'rating', label: 'Best rating' },
  { key: 'delivery', label: 'Fastest delivery' },
  { key: 'name', label: 'Name' },
];

// The quantity on a row, clickable (2026-10-09): jumps to the item's card on
// the left to change it. A fabrication size shows its pieces and the
// calculated kg.
function QtyLink({ card, qty, unit, pieces = null, onFocusItem }) {
  const g = card.group;
  const isFab = !!g?.sizeKey;
  const text = isFab
    ? `${pieces ?? g.pieces ?? g.requestedPieces} pcs · ≈ ${qty} ${unit || ''}`
    : `${qty} ${unit || ''}`;
  if (!onFocusItem) return <span>{text}</span>;
  return (
    <button
      type="button"
      onClick={() => onFocusItem(card.key)}
      title={isFab ? 'Change the pieces on the left' : 'Change the quantity on the left'}
      className="inline-flex items-center gap-0.5 text-blue-700 underline decoration-dotted underline-offset-2 hover:text-blue-900"
    >
      {text}<Pencil className="w-2.5 h-2.5" />
    </button>
  );
}

function VendorRow({ row, vendor, onChanged, checked, onToggle, canTick, quoteRules, onFocusItem }) {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [reminding, setReminding] = useState(false);
  const { card, quote: q, isCheapest, isFastest, canBatch } = row;
  const group = card.group;
  const held = group?.heldByPO;
  const awaiting = q && q.status === 'Invited';
  const declined = q && q.status === 'Declined';
  const priced = q && q.status === 'Submitted';
  const waiting = awaiting ? requestWaitingLabel(q) : null;
  // "Bought before": this quote against what we last paid THIS vendor for the
  // item (delivered, same unit, before GST). Click → every vendor's prices.
  const history = group?.priceHistory || null;
  const comparable = priced ? comparablePrice(q.unitPrice, q.gstInclusive, q.gstPercent) : null;

  // Point 16 (2026-10-10): re-email the vendor the same link as a reminder
  // (the whole quotation request; at most once a day).
  const remind = async () => {
    setReminding(true);
    try {
      const res = await apiRequest('POST', `/api/quotation-requests/${q.quotationRequest._id}/remind`);
      toast({ title: 'Reminder sent', description: res?.message });
      onChanged();
    } catch (err) {
      toast({ title: 'Reminder not sent', description: err.message, variant: 'destructive' });
    } finally {
      setReminding(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      await apiRequest('PATCH', `/api/item-quote-groups/quotes/${q._id}/sync`);
      toast({ title: 'Quotation synced to the current quantity' });
      onChanged();
    } catch (err) {
      toast({ title: 'Could not sync', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="px-3 py-2">
      <div className="flex items-start gap-2">
        <input
          type="checkbox" className="mt-1" checked={checked} disabled={!canTick} onChange={onToggle}
          title={!canTick ? (held ? `On ${held}, waiting for approval` : 'Select requests / set a quantity on the left first')
            : canBatch ? 'Tick to email a quotation request or include in this vendor\'s PO' : 'Tick to email a quotation request'}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 flex-wrap">
            {card.item.name}
            {card.sizeValues && <span className="text-[10px] font-mono font-normal text-slate-500">{formatDims(card.sizeValues)}</span>}
            {q && <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 border border-slate-200 rounded-full px-1.5">
              {React.createElement(CHANNEL_META[q.source]?.icon || Clock, { className: 'w-2.5 h-2.5' })} {q.quotationRequest?.number || q.manualQuotation?.number || q.source}
            </span>}
            {isCheapest && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]"><Award className="w-2.5 h-2.5 mr-0.5" />Cheapest</Badge>}
            {isFastest && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]"><Zap className="w-2.5 h-2.5 mr-0.5" />Fastest</Badge>}
            {q?.isStale && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Quoted at qty {q.quantity} — now {group.quantity}</Badge>}
            {q?.isExpired && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]"><CalendarX className="w-2.5 h-2.5 mr-0.5" />Expired {shortDay(q.validUntil)}</Badge>}
          </p>
          <p className="text-xs text-slate-500">
            {!group ? 'Select requests on the left first'
              : !q ? <>No quotation yet · <QtyLink card={card} qty={group.quantity} unit={group.purchaseUnit} onFocusItem={onFocusItem} /></>
                : awaiting ? <span className={`${waiting.tone === 'red' ? 'text-red-600' : 'text-amber-600'} inline-flex items-center gap-1`}><Clock className="w-3 h-3" /> {waiting.text}</span>
                  : declined ? <span className="text-slate-500 inline-flex items-center gap-1"><XCircle className="w-3 h-3" /> Not quoted by vendor{q.quotationRequest?.number ? ` (${q.quotationRequest.number})` : ''}</span>
                    : <>₹{q.unitPrice}{q.purchaseUnit ? `/${q.purchaseUnit}` : ''}{gstLabel(q)} · <QtyLink card={card} qty={q.quantity} unit={q.purchaseUnit} pieces={q.fabricationDimensionLines?.[0]?.quantity ?? null} onFocusItem={onFocusItem} /> · {q.deliveryDays}d{q.warrantyMonths ? ` · ${q.warrantyMonths}m warranty` : ''} · <b className="text-slate-700">{inr(q.unitPrice * q.quantity)}</b></>}
          </p>
          {group && (history || (priced && q.validUntil)) && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
              <BoughtBeforeTag
                history={history} vendorId={vendor._id} vendorName={vendor.supplierName}
                itemName={card.item.name} unit={group.purchaseUnit}
                quotePrice={comparable} warnAt={quoteRules?.priceJumpWarnPercent}
              />
              {priced && history && q.gstInclusive && q.gstPercent == null && <span className="text-slate-400">Price includes GST at an unknown rate — not compared</span>}
              {priced && !q.isExpired && q.validUntil && <span className="text-slate-400">Valid till {shortDay(q.validUntil)}</span>}
            </p>
          )}
          {q?.isExpired && (
            <p className="text-[11px] text-red-600">Quotes are valid for {quoteRules?.quoteValidityDays || 30} days — get a fresh quote (email request or manual quotation) before ordering.</p>
          )}
          {held && <p className="text-[11px] text-amber-700 flex items-center gap-1"><Lock className="w-3 h-3" /> On {held}, waiting for approval</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {awaiting && waiting?.canRemind && q.quotationRequest?._id && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-amber-200 text-amber-700" onClick={remind} disabled={reminding} title={`Email ${vendor.supplierName} the same link again, marked as a reminder (${q.quotationRequest.number}, all its open items)`}>
              <BellRing className="w-3 h-3 mr-1" />{reminding ? '...' : 'Remind'}
            </Button>
          )}
          {q?.isStale && q.source === 'Manual' && !awaiting && !held && (
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-amber-200 text-amber-700" onClick={sync} disabled={syncing}>
              <RefreshCw className="w-3 h-3 mr-1" />{syncing ? '...' : 'Sync'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// A row can be ticked when its item has a group with a quantity that isn't
// locked by a PO waiting for approval.
const canTickRow = (r) => !!(r.card.group && !r.card.group.heldByPO && r.card.group.quantity > 0);

// Rows on a vendor card, grouped (user, 2026-10-11): priced quotes together
// at the top, then expired / old-quantity prices, waiting for a reply, "can't
// supply", and items with nothing yet last. Within a group, the left side's
// order is kept (stable sort).
const rowRank = (r) => {
  const q = r.quote;
  if (!q) return 4;
  if (q.status === 'Submitted') return q.isExpired || q.isStale ? 1 : 0;
  if (q.status === 'Invited') return 2;
  if (q.status === 'Declined') return 3;
  return 4;
};

function VendorCard({ entry, considered, settings, company, quoteRules, onChanged, onPOCreated, onFocusItem }) {
  const { vendor, coverage, context } = entry;
  const rows = [...entry.rows].sort((a, b) => rowRank(a) - rowRank(b));
  const tickable = rows.filter(canTickRow);
  const batchable = rows.filter(r => r.canBatch);
  // Every row that can be ticked starts ticked (user, 2026-10-09) — but only
  // while this vendor hasn't been asked about anything here yet. Once it has a
  // quote, a waiting request or a "can't supply" on any row, nothing is
  // pre-ticked: Purchase ticks what they want (user, 2026-10-10).
  const freshVendor = !rows.some(r => r.quote);
  const [picked, setPicked] = useState(() => new Set(freshVendor ? tickable.map(r => r.card.key) : []));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // When the rows change (an item ticked on the left, a new card, a quote),
  // rows that just BECAME tickable start ticked; ticks the user removed stay
  // removed; rows that can't be ticked any more drop out.
  const tickableKey = tickable.map(r => r.card.key).join(',');
  const prevTickable = useRef(new Set(tickable.map(r => r.card.key)));
  useEffect(() => {
    const before = prevTickable.current;
    const tickableKeys = new Set(tickable.map(r => r.card.key));
    setPicked(prev => {
      const next = new Set([...prev].filter(k => tickableKeys.has(k)));
      if (freshVendor) for (const k of tickableKeys) if (!before.has(k)) next.add(k);
      return next;
    });
    prevTickable.current = tickableKeys;
  }, [tickableKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key) => setPicked(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const requestRows = tickable.filter(r => picked.has(r.card.key));
  const historyGroups = (requestRows.length ? requestRows : rows).map(r => r.card.group?._id).filter(Boolean);
  const lines = batchable.filter(r => picked.has(r.card.key)).map(r => ({
    key: r.card.group._id,
    itemId: r.card.group.item?._id || r.card.item._id,
    itemName: r.card.item.name,
    sizeLabel: r.card.sizeValues ? formatDims(r.card.sizeValues) : '',
    pieces: r.quote.fabricationDimensionLines?.[0]?.quantity ?? null,
    purchaseRequestIds: (r.card.group.purchaseRequests || []).map(pr => pr._id || pr),
    vendorBidId: r.quote._id,
    itemQuoteGroup: r.card.group._id,
    quantity: r.quote.quantity,
    unitPrice: r.quote.unitPrice,
    deliveryDays: r.quote.deliveryDays,
    warrantyMonths: r.quote.warrantyMonths || 0,
    gstInclusive: !!r.quote.gstInclusive,
    gstPercent: r.quote.gstPercent ?? null,
    priceHistory: r.card.group.priceHistory || null,
    quotationRequest: r.quote.quotationRequest || null,
    manualQuotation: r.quote.manualQuotation || null,
    purchaseUnit: r.quote.purchaseUnit,
    purchaseUnitType: r.quote.purchaseUnitType,
  }));
  const goods = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-indigo-50 p-1.5 rounded-md shrink-0"><Store className="h-4 w-4 text-indigo-600" /></div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{vendor.supplierName}</p>
            {/* Point 10 (2026-10-10): rating, on-time, QC pass, standing. */}
            <VendorContextLine ctx={context} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {historyGroups.length > 0 && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-600" onClick={() => setHistoryOpen(true)} title={requestRows.length ? 'All quotes (offers) for the ticked items' : 'All quotes (offers) for these items'}>
              <History className="w-3.5 h-3.5 mr-1" /> All quotes
            </Button>
          )}
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${coverage === considered ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            {coverage}/{considered} items
          </span>
        </div>
      </div>
      <div className="divide-y">
        {rows.map(r => (
          <VendorRow
            key={r.card.key}
            row={r}
            vendor={vendor}
            onChanged={onChanged}
            checked={canTickRow(r) && picked.has(r.card.key)}
            canTick={canTickRow(r)}
            onToggle={() => toggle(r.card.key)}
            quoteRules={quoteRules}
            onFocusItem={onFocusItem}
          />
        ))}
      </div>
      {tickable.length > 0 && (
        <div className="px-3 py-2 border-t bg-slate-50 rounded-b-lg flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {requestRows.length} ticked{lines.length ? <> · {lines.length} quoted · goods {inr(goods)}</> : ''}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50"
              disabled={requestRows.length === 0 || !vendor.email}
              title={!vendor.email ? 'No email address in Vendor Master' : 'One email for all ticked items'}
              onClick={() => setRequestOpen(true)}
            >
              <Mail className="w-3.5 h-3.5 mr-1" /> Email quotation request{requestRows.length ? ` (${requestRows.length})` : ''}
            </Button>
            <Button
              size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50"
              disabled={requestRows.length === 0}
              title="The vendor quoted outside our email link (WhatsApp, PDF, email…) — attach the proof and enter the prices"
              onClick={() => setManualOpen(true)}
            >
              <FileCheck className="w-3.5 h-3.5 mr-1" /> Manual quotation{requestRows.length ? ` (${requestRows.length})` : ''}
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700" disabled={lines.length === 0} onClick={() => setReviewOpen(true)} title={lines.length ? '' : 'Tick items with a submitted, up-to-date quotation'}>
              Review &amp; create PO{lines.length ? ` (${lines.length})` : ''}
            </Button>
          </div>
        </div>
      )}
      <QuotationRequestDialog open={requestOpen} onOpenChange={setRequestOpen} vendor={vendor} rows={requestRows} onSent={onChanged} />
      <ManualQuotationDialog open={manualOpen} onOpenChange={setManualOpen} vendor={vendor} rows={requestRows} validityDays={quoteRules?.quoteValidityDays || 30} settings={settings} onSaved={onChanged} />
      <QuoteHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        endpoint={`/api/item-quote-groups/quote-history?groups=${historyGroups.join(',')}`}
        title={`All quotes — ${vendor.supplierName}'s items`}
        vendorId={vendor._id}
        vendorName={vendor.supplierName}
      />
      <PoReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        vendor={vendor}
        lines={lines}
        settings={settings}
        company={company}
        priceJumpWarnPercent={quoteRules?.priceJumpWarnPercent}
        onCreated={(res) => { onChanged(); onPOCreated?.(res); }}
      />
    </div>
  );
}

export default function RfqVendorList({ ranked, considered, consideredIsAll, sortBy, setSortBy, settings, company = null, quoteRules, onChanged, onPOCreated, onFocusItem }) {
  return (
    <div className="space-y-2">
      <div className="bg-white rounded-lg border p-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {ranked.length} approved vendor{ranked.length === 1 ? '' : 's'} cover {consideredIsAll ? 'the listed items' : 'the selected items'} — ranked by how many of the <b>{considered}</b> {consideredIsAll ? 'listed' : 'selected'} item{considered === 1 ? '' : 's'} they supply.
        </p>
        <label className="text-xs text-slate-500 flex items-center gap-1.5">
          Then by
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-md px-2 py-1 text-xs bg-white">
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {ranked.length === 0 ? (
        <p className="text-slate-400 py-10 text-center text-sm">No approved vendor is linked to {consideredIsAll ? 'these items' : 'the selected items'} in Vendor Master yet.</p>
      ) : ranked.map(entry => (
        <VendorCard key={entry.vendor._id} entry={entry} considered={considered} settings={settings} company={company} quoteRules={quoteRules} onChanged={onChanged} onPOCreated={onPOCreated} onFocusItem={onFocusItem} />
      ))}
    </div>
  );
}

