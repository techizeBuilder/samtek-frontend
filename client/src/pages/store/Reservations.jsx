import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Lock, Search, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, X, Info } from 'lucide-react';
import { formatDims } from '@/lib/fabricationDims';

// Store → Reservations (2026-10-09). Production orders (Machine / Child Part
// / Sub Child Part) and job-work orders RESERVE their material when they're
// created; Store's transfer issues it. Reserving never changes stock — this
// page is where Store sees what's spoken for:
//   In stock − Still to issue = Free
// per item (and per size for fabrication), with the orders behind it in the
// order they claimed it (earliest first — the order to serve them in).
// Backend: GET /api/inventory/reservations (reservationController.js).
const n = (v) => (Math.round((Number(v) || 0) * 1000) / 1000).toLocaleString('en-IN');
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const KIND_CLS = {
  Machine: 'bg-blue-50 text-blue-700 border-blue-200',
  'Child Part': 'bg-teal-50 text-teal-700 border-teal-200',
  'Sub Child Part': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Job work': 'bg-violet-50 text-violet-700 border-violet-200',
};

function ItemRow({ g, open, onToggle }) {
  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-start gap-2">
            {open ? <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <p className="font-medium text-slate-800">{g.name}</p>
              <p className="text-xs text-slate-500 font-mono">{g.code}</p>
              {g.size && <p className="text-[11px] text-slate-500 font-mono mt-0.5">Size: {formatDims(g.size)}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] font-normal">{g.kind}</Badge></td>
        <td className="px-4 py-3 text-right tabular-nums">{n(g.stock)}</td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-500">{n(g.reserved)}</td>
        <td className="px-4 py-3 text-right tabular-nums text-slate-500">{n(g.issued)}</td>
        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">{n(g.remaining)}</td>
        <td className="px-4 py-3 text-right tabular-nums">
          <span className={`font-semibold ${g.short ? 'text-red-600' : 'text-emerald-700'}`}>{n(g.free)}</span>
          <span className="text-[11px] text-slate-400 ml-1">{g.unit}</span>
          {g.short && <p className="text-[10px] text-red-600">short by {n(-g.free)}</p>}
        </td>
        <td className="px-4 py-3 text-right text-xs text-slate-500">{g.orders.length}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="bg-slate-50 px-4 pb-4 pt-1">
            <p className="text-[11px] text-slate-500 mb-1.5">Orders that reserved this, earliest claim first — serve them in this order.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs bg-white border rounded-md">
                <thead>
                  <tr className="text-left text-slate-400 bg-slate-50">
                    <th className="px-3 py-1.5 font-medium">#</th>
                    <th className="px-3 py-1.5 font-medium">Order</th>
                    <th className="px-3 py-1.5 font-medium">Type</th>
                    <th className="px-3 py-1.5 font-medium">For</th>
                    <th className="px-3 py-1.5 font-medium">Status</th>
                    <th className="px-3 py-1.5 font-medium">Reserved on</th>
                    <th className="px-3 py-1.5 font-medium text-right">Reserved</th>
                    <th className="px-3 py-1.5 font-medium text-right">Issued</th>
                    <th className="px-3 py-1.5 font-medium text-right">Still to issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {g.orders.map((o, i) => (
                    <tr key={`${o.orderId}-${o.line}-${i}`} className={o.remaining === 0 ? 'text-slate-400' : ''}>
                      <td className="px-3 py-1.5">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono">{o.code}{o.salesOrder && <span className="block text-[10px] text-slate-400 font-sans">sales {o.salesOrder}</span>}</td>
                      <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${KIND_CLS[o.kind] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{o.kind}</span></td>
                      <td className="px-3 py-1.5">{o.forWhat || '—'}{o.source && <span className="block text-[10px] text-slate-400">{o.source}</span>}</td>
                      <td className="px-3 py-1.5">{o.status || '—'}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">{day(o.reservedAt)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{n(o.reserved)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{n(o.issued)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{o.remaining === 0 ? 'done' : n(o.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Reservations() {
  const [search, setSearch] = useState('');
  const [onlyShort, setOnlyShort] = useState(false);
  const [kind, setKind] = useState('');
  const [open, setOpen] = useState(() => new Set());

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['/api/inventory/reservations'],
    queryFn: () => apiRequest('GET', '/api/inventory/reservations'),
  });
  const groups = data?.data || [];
  const summary = data?.summary || { items: 0, short: 0, orders: 0 };
  const kinds = useMemo(() => [...new Set(groups.map(g => g.kind))].sort(), [groups]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter(g => {
      if (onlyShort && !g.short) return false;
      if (kind && g.kind !== kind) return false;
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || String(g.code).toLowerCase().includes(q)
        || g.orders.some(o => String(o.code || '').toLowerCase().includes(q) || String(o.salesOrder || '').toLowerCase().includes(q));
    });
  }, [groups, search, onlyShort, kind]);

  const toggle = (key) => setOpen(s => { const next = new Set(s); next.has(key) ? next.delete(key) : next.add(key); return next; });

  return (
    <div className="p-6 space-y-5 bg-slate-50 min-h-screen">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Lock className="h-7 w-7 text-indigo-600" />
            Reservations
          </h1>
          <p className="text-slate-500 mt-1 max-w-3xl">
            Material that production and job-work orders have reserved. Reserving doesn't take stock — your transfer does.
            <b className="text-slate-700"> Free = In stock − Still to issue.</b>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Reserved items</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary.items}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Short (not enough stock)</p>
          <p className={`text-2xl font-bold mt-1 ${summary.short ? 'text-red-600' : 'text-emerald-700'}`}>{summary.short}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-slate-500 uppercase font-semibold">Orders holding reservations</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{summary.orders}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input className="pl-9 bg-white" placeholder="Find item, code or order number…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={kind} onChange={e => setKind(e.target.value)} className="border rounded-md px-2 h-9 text-sm bg-white">
          <option value="">All types</option>
          {kinds.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={onlyShort} onChange={e => setOnlyShort(e.target.checked)} /> Only short
        </label>
        {(search || kind || onlyShort) && (
          <button type="button" onClick={() => { setSearch(''); setKind(''); setOnlyShort(false); }} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              {groups.length === 0 ? 'Nothing is reserved right now.' : 'No reservations match these filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase text-slate-400 border-b">
                    <th className="px-4 py-2.5 font-semibold">Item</th>
                    <th className="px-4 py-2.5 font-semibold">Type</th>
                    <th className="px-4 py-2.5 font-semibold text-right">In stock</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Reserved</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Issued</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Still to issue</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Free</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map(g => <ItemRow key={g.key} g={g} open={open.has(g.key)} onToggle={() => toggle(g.key)} />)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 flex items-start gap-1.5 max-w-3xl">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          A reservation is made when an order is created, shrinks as you transfer material to it, comes back if Production returns it as defective,
          and disappears when the order is completed. Fabrication material is reserved per size, in pieces.
          {' '}<AlertTriangle className="w-3 h-3 inline text-red-500" /> Negative free stock means orders need more than you have — it is already on a purchase request or a production order.
        </span>
      </p>
    </div>
  );
}
