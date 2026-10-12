import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { Warehouse, AlertTriangle, ChevronRight } from 'lucide-react';
import { formatDims } from '@/lib/fabricationDims';

// RFQ/PO item card — stock context (procurement-v2 gap 9, 2026-10-09).
// A small button on the card: Stock · Reserved · Free · Incoming · Min.
// Clicking it opens the details: which orders reserved it, which order each
// request is for, and the open POs bringing it in. Kept off the card itself
// so the page doesn't get busier (user decision).
//   Reserved = still to be issued to orders (reserving never takes stock);
//   Free = Stock − Reserved. Stock / reserved / free / min are in the stock
//   unit (pieces for a fabrication size); incoming is in the PO's own unit.
// Server: itemQuoteGroupController getRfqBoard (group.stock) and
// GET /api/item-quote-groups/:id/stock-detail (services/stockContextService.js).
const n = (v) => (Math.round((Number(v) || 0) * 1000) / 1000).toLocaleString('en-IN');
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');
const incomingText = (list) => (list?.length ? list.map(i => `${n(i.quantity)} ${i.unit}`).join(' + ') : '0');

export function StockChip({ stock, onClick }) {
  if (!stock) return null;
  const warn = stock.short || stock.belowMin;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      title="Stock details — reserved orders, requests, incoming POs"
      className={`inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] border rounded-md px-1.5 py-0.5 text-left ${warn ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
    >
      <Warehouse className="w-3 h-3 shrink-0" />
      <span>Stock {n(stock.stock)}</span>
      <span>· Reserved {n(stock.reserved)}</span>
      <span className={stock.short ? 'font-semibold text-red-600' : 'font-semibold'}>· Free {n(stock.free)} {stock.unit}</span>
      <span>· Incoming {incomingText(stock.incoming)}</span>
      {stock.minStock > 0 && <span>· Min {n(stock.minStock)}{stock.belowMin && <AlertTriangle className="w-3 h-3 inline ml-0.5 text-amber-600" />}</span>}
      <ChevronRight className="w-3 h-3 opacity-60" />
    </button>
  );
}

export function StockDetailDialog({ open, onOpenChange, groupId, itemName }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !groupId) return;
    setLoading(true); setError('');
    apiRequest('GET', `/api/item-quote-groups/${groupId}/stock-detail`)
      .then(res => setData(res?.data || null))
      .catch(err => { setData(null); setError(err.message); })
      .finally(() => setLoading(false));
  }, [open, groupId]);

  const s = data?.summary;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Warehouse className="w-4 h-4 text-indigo-600" /> Stock — {data?.item?.name || itemName}</DialogTitle>
          <DialogDescription>
            {data?.size ? <>Size {formatDims(data.size)} · </> : null}
            Reserving doesn't take stock — Store's transfer does. Free = In stock − Reserved (still to issue to orders).
          </DialogDescription>
        </DialogHeader>

        {loading ? <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
          : error ? <p className="text-sm text-red-600 py-6 text-center">{error}</p>
            : s && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    ['In stock', `${n(s.stock)} ${s.unit}`],
                    ['Reserved', `${n(s.reserved)} ${s.unit}`],
                    ['Free', `${n(s.free)} ${s.unit}`, s.short ? 'text-red-600' : 'text-emerald-700'],
                    ['Incoming', incomingText(s.incoming)],
                    ['Min stock', s.minStock > 0 ? `${n(s.minStock)} ${s.unit}` : '—', s.belowMin ? 'text-amber-700' : ''],
                  ].map(([label, value, cls]) => (
                    <div key={label} className="border rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase font-semibold text-slate-400">{label}</p>
                      <p className={`text-sm font-semibold ${cls || 'text-slate-800'}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {(s.short || s.belowMin) && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {s.short ? `Orders need ${n(-s.free)} ${s.unit} more than is in stock.` : 'Free stock is at or below the minimum.'}
                    {' '}Incoming POs: {incomingText(s.incoming)}.
                  </p>
                )}
                {!s.sizeFound && <p className="text-xs text-amber-700">This size isn't in the item's catalog, so its stock can't be read.</p>}

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Requests on this card — what each is for</p>
                  {data.requests.length === 0 ? <p className="text-xs text-slate-400">No requests selected.</p> : (
                    <div className="border rounded-lg divide-y text-xs">
                      {data.requests.map(r => (
                        <div key={r.requestId} className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                          <span><span className="font-mono text-slate-500 mr-2">{r.requestId}</span>{r.forText}</span>
                          <span className="text-slate-600">{r.pieces ? `${r.pieces} pcs · ` : ''}{n(r.quantity)} {r.unit}{r.priority === 'High' ? <span className="ml-1.5 text-red-600 font-medium">High</span> : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Reserved by orders — earliest claim first</p>
                  {data.reservations.length === 0 ? <p className="text-xs text-slate-400">Nothing reserved.</p> : (
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-xs min-w-[520px]">
                        <thead><tr className="text-left text-slate-400 bg-slate-50">
                          <th className="px-3 py-1.5 font-medium">Order</th><th className="px-3 py-1.5 font-medium">Type</th><th className="px-3 py-1.5 font-medium">For</th>
                          <th className="px-3 py-1.5 font-medium text-right">Reserved</th><th className="px-3 py-1.5 font-medium text-right">Issued</th><th className="px-3 py-1.5 font-medium text-right">Still to issue</th>
                        </tr></thead>
                        <tbody className="divide-y">
                          {data.reservations.map((r, i) => (
                            <tr key={i} className={r.remaining === 0 ? 'text-slate-400' : ''}>
                              <td className="px-3 py-1.5 font-mono">{r.orderCode}{r.salesOrder && <span className="block font-sans text-[10px] text-slate-400">sales {r.salesOrder}</span>}</td>
                              <td className="px-3 py-1.5">{r.kind}</td>
                              <td className="px-3 py-1.5">{r.forWhat || '—'} <span className="text-[10px] text-slate-400">{day(r.reservedAt)}</span></td>
                              <td className="px-3 py-1.5 text-right">{n(r.reserved)}</td>
                              <td className="px-3 py-1.5 text-right">{n(r.issued)}</td>
                              <td className="px-3 py-1.5 text-right font-medium">{r.remaining === 0 ? 'done' : n(r.remaining)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Incoming — open POs not yet received</p>
                  {data.incoming.length === 0 ? <p className="text-xs text-slate-400">No open POs for this{data.size ? ' size' : ' item'}.</p> : (
                    <div className="border rounded-lg divide-y text-xs">
                      {data.incoming.map((p, i) => (
                        <div key={i} className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                          <span><span className="font-mono text-slate-500 mr-2">{p.poNumber}</span>{p.vendorName} <span className="text-slate-400">· {p.status}{p.expected ? ` · due ${day(p.expected)}` : ''}</span></span>
                          <span className="text-slate-700">{p.pieces != null ? `${p.pieces} pcs · ` : ''}{n(p.quantity)} {p.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
      </DialogContent>
    </Dialog>
  );
}
