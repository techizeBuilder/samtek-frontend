import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fileHref } from '@/components/accounts/vendor/vendorUi';
import { Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

// Store → Serial Numbers (2026-10-13): every unit / lot received from a
// vendor — the serial on each piece of an item the vendor gave a warranty
// on, or the receipt's lot number otherwise — with where it came from, its
// QC result and the vendor's warranty months. Read only.
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const TONE = {
  'In QC': 'bg-blue-50 text-blue-700 border-blue-200',
  'Accepted': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Part rejected': 'bg-amber-50 text-amber-800 border-amber-200',
  'QC rejected': 'bg-red-50 text-red-700 border-red-200',
};
const STATUSES = ['all', 'In QC', 'Accepted', 'Part rejected', 'QC rejected'];
const KINDS = [['', 'Serials & lots'], ['serial', 'Serials only'], ['lot', 'Lots only']];
const LIMIT = 50;

export default function SerialNumbersTab() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (q) params.set('search', q);
  if (status !== 'all') params.set('status', status);
  if (kind) params.set('kind', kind);
  const { data, isLoading } = useQuery({
    queryKey: ['/api/serial-numbers', q, status, kind, page],
    queryFn: () => apiRequest('GET', `/api/serial-numbers?${params}`),
    keepPreviousData: true,
  });
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const reset = (fn) => (v) => { fn(v); setPage(1); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input className="pl-8 bg-white" placeholder="Serial, item, vendor or PO…" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        </div>
        <select className="border rounded-md px-2 h-9 text-sm bg-white" value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        <select className="border rounded-md px-2 h-9 text-sm bg-white" value={kind} onChange={(e) => reset(setKind)(e.target.value)}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{total} record{total === 1 ? '' : 's'}</span>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="text-left font-semibold px-3 py-2">Serial / Lot</th>
              <th className="text-left font-semibold px-3 py-2">Item</th>
              <th className="text-left font-semibold px-3 py-2">Vendor · PO</th>
              <th className="text-left font-semibold px-3 py-2">Received</th>
              <th className="text-left font-semibold px-3 py-2">Vendor warranty</th>
              <th className="text-left font-semibold px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 italic">{q || status !== 'all' || kind ? 'Nothing matches.' : 'Nothing received with a serial number yet.'}</td></tr>
            ) : rows.map(u => (
              <tr key={u._id} className="align-top">
                <td className="px-3 py-2">
                  <p className="font-mono font-semibold text-slate-800">{u.serialNumber}</p>
                  {u.isLot && <p className="text-[11px] text-slate-500">Lot · {u.lotQty} {u.qtyUnit}</p>}
                </td>
                <td className="px-3 py-2 text-slate-700">{u.itemName}</td>
                <td className="px-3 py-2">
                  <p className="text-slate-700">{u.vendorName || '—'}</p>
                  <p className="text-[11px] text-slate-500">{u.poNumber}</p>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {day(u.receivedAt)}
                  {u.receivedByName && <p className="text-[11px] text-slate-400">{u.receivedByName}</p>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {u.vendorWarrantyMonths > 0 ? <span className="text-slate-700">{u.vendorWarrantyMonths} months</span> : <span className="text-slate-400">None</span>}
                  {u.warrantyCardUrl && (
                    <a href={fileHref(u.warrantyCardUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                      <FileText className="w-3 h-3" /> Card
                    </a>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block text-[11px] font-semibold border rounded-full px-2 py-0.5 ${TONE[u.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{u.status}</span>
                  {u.isLot && u.rejectedQty > 0 && <p className="text-[11px] text-red-600 mt-0.5">{u.rejectedQty} {u.qtyUnit} rejected</p>}
                  {(u.rejections || []).map(r => (
                    <p key={r._id} className="text-[11px] text-slate-500 mt-0.5">{r.number} · {r.status}</p>
                  ))}
                  {u.claims?.count > 0 && (
                    <p className="text-[11px] text-violet-700 mt-0.5">
                      {u.claims.count} warranty claim{u.claims.count > 1 ? 's' : ''} · {u.claims.latestNumber} {u.claims.latestOutcome || u.claims.latestStatus}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
          <Button size="sm" variant="outline" className="h-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
          Page {page} of {pages}
          <Button size="sm" variant="outline" className="h-7" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
        </div>
      )}
    </div>
  );
}
