import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Search, LineChart, X } from 'lucide-react';
import { PeriodChips, periodRange, inrPlain } from './PriceCheck';

// Price History (2026-10-12, client): what we paid for an item — from one
// vendor or all — over the last 7 days, 30 days, 1 year, all time or a
// custom range: average, last and lowest, per vendor, and every delivery
// behind them. Same numbers as "Bought before" on RFQ/PO and the PO cards:
// delivered purchases (dated when Store received them), before GST, one
// purchase unit at a time. Used on Purchase → Price History and the Company
// Admin's Vendors → Price History.
const longDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function Figure({ label, value, sub }) {
  return (
    <div className="bg-white border rounded-lg p-3 min-w-[150px] flex-1">
      <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
    </div>
  );
}

export default function PriceHistory() {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [options, setOptions] = useState([]);
  const [item, setItem] = useState(null);
  const [vendorId, setVendorId] = useState('');
  const [unit, setUnit] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) return;
    apiRequest('GET', `/api/price-history/items?search=${encodeURIComponent(q)}`)
      .then(res => setOptions(res?.data || []))
      .catch(() => setOptions([]));
  }, [q, item]);

  const range = periodRange(period, custom);
  useEffect(() => {
    if (!item) return;
    if (period === 'custom' && !custom.from && !custom.to) return;
    const params = new URLSearchParams({ itemId: item._id });
    if (vendorId) params.set('vendorId', vendorId);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    if (unit != null) params.set('unit', unit);
    setLoading(true); setError('');
    apiRequest('GET', `/api/price-history?${params}`)
      .then(res => { setData(res?.data || null); if (unit == null) setUnit(res?.data?.unit ?? ''); })
      .catch(err => { setError(err.message); setData(null); })
      .finally(() => setLoading(false));
  }, [item?._id, vendorId, unit, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (it) => { setItem(it); setVendorId(''); setUnit(null); setData(null); };
  const clear = () => { setItem(null); setData(null); setSearch(''); setVendorId(''); setUnit(null); };
  const per = data?.unit ? `/${data.unit}` : '';
  const s = data?.summary;
  const vendorRows = s ? Object.entries(s.byVendor || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.avg - b.avg) : [];
  const vendorName = vendorId ? data?.vendors?.find(v => v.id === vendorId)?.name : '';

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <LineChart className="w-5 h-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800">Price history</p>
          <p className="text-xs text-slate-500">What we paid for an item — from one vendor or all — over a period: average, last and lowest. Delivered purchases only, before GST, dated when Store received them.</p>
        </div>
      </div>

      {/* Item */}
      {!item ? (
        <div className="space-y-2 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search an item we've bought (name or code)…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="border rounded-lg divide-y bg-white max-h-72 overflow-y-auto">
            {options.length === 0 ? <p className="text-sm text-slate-400 p-3">{q ? 'No ordered item matches.' : 'No items ordered yet.'}</p>
              : options.map(it => (
                <button key={it._id} type="button" onClick={() => pick(it)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                  {it.name} <span className="text-xs text-slate-400 font-mono">{it.code}</span>
                </button>
              ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white text-sm font-medium">
            {item.name} <span className="text-xs text-slate-400 font-mono">{item.code}</span>
            <button type="button" onClick={clear} className="text-slate-400 hover:text-red-600" title="Pick another item"><X className="w-3.5 h-3.5" /></button>
          </span>
          <select className="border rounded-md px-2 h-9 text-sm bg-white" value={vendorId} onChange={e => setVendorId(e.target.value)}>
            <option value="">All vendors</option>
            {(data?.vendors || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {(data?.units || []).length > 1 && (
            <select className="border rounded-md px-2 h-9 text-sm bg-white" value={unit ?? ''} onChange={e => setUnit(e.target.value)} title="Prices in different units are never mixed">
              {data.units.map(u => <option key={u.unit} value={u.unit}>per {u.unit || 'unit'} ({u.count})</option>)}
            </select>
          )}
          <PeriodChips period={period} onPeriod={setPeriod} custom={custom} onCustom={setCustom} />
        </div>
      )}

      {item && (loading ? <p className="text-sm text-slate-400">Loading…</p>
        : error ? <p className="text-sm text-red-600">{error}</p>
          : period === 'custom' && !custom.from && !custom.to ? <p className="text-sm text-slate-500">Pick the dates.</p>
            : !s ? <p className="text-sm text-slate-500 bg-white border rounded-lg p-4">No deliveries of {item.name}{vendorName ? ` from ${vendorName}` : ''} in this period{data?.unit ? ` (per ${data.unit})` : ''}.</p>
              : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Figure label="Average" value={`${inrPlain(s.avg)}${per}`} sub={`${s.count} deliver${s.count === 1 ? 'y' : 'ies'}${vendorName ? ` · ${vendorName}` : ' · all vendors'}`} />
                    <Figure label="Last" value={`${inrPlain(s.last.price)}${per}`} sub={`${s.last.vendorName} · ${longDay(s.last.date)}`} />
                    <Figure label="Lowest" value={`${inrPlain(s.lowest.price)}${per}`} sub={`${s.lowest.vendorName} · ${longDay(s.lowest.date)}`} />
                  </div>

                  {!vendorId && vendorRows.length > 1 && (
                    <div className="border rounded-lg overflow-x-auto bg-white thin-scrollbar">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead>
                          <tr className="text-[11px] uppercase text-slate-400 text-left bg-slate-50">
                            <th className="px-3 py-2 font-semibold">Vendor</th>
                            <th className="px-3 py-2 font-semibold text-right">Average</th>
                            <th className="px-3 py-2 font-semibold text-right">Last</th>
                            <th className="px-3 py-2 font-semibold text-right">Lowest</th>
                            <th className="px-3 py-2 font-semibold text-right">Deliveries</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {vendorRows.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setVendorId(v.id)} title="Show only this vendor">
                              <td className="px-3 py-2">{v.last.vendorName}</td>
                              <td className="px-3 py-2 text-right font-medium">{inrPlain(v.avg)}{per}</td>
                              <td className="px-3 py-2 text-right whitespace-nowrap">{inrPlain(v.last.price)} <span className="text-[11px] text-slate-400">{longDay(v.last.date)}</span></td>
                              <td className="px-3 py-2 text-right">{inrPlain(v.lowest.price)}</td>
                              <td className="px-3 py-2 text-right">{v.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Deliveries ({data.deliveries.length})</p>
                    <div className="border rounded-lg divide-y bg-white text-sm max-h-96 overflow-y-auto thin-scrollbar">
                      {data.deliveries.map((d, i) => (
                        <div key={i} className="px-3 py-1.5 flex items-center gap-3">
                          <span className="text-slate-500 w-28 shrink-0">{longDay(d.date)}</span>
                          <span className="flex-1 min-w-0 truncate">{d.vendorName}</span>
                          <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">{d.poNumber}</span>
                          {d.quantity ? <span className="text-xs text-slate-500 w-20 text-right">{d.quantity} {data.unit}</span> : <span className="w-20" />}
                          <span className="w-28 text-right font-medium">{inrPlain(d.price)}{per}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {vendorId && <Button size="sm" variant="ghost" onClick={() => setVendorId('')}>Show all vendors</Button>}
                </div>
              ))}
    </div>
  );
}
