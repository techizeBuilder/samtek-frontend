// Store → Label carriers (serial number work step 2, 2026-10-31). A made part
// or machine that holds tracked serial numbers went into stock: stick one of
// the printed stickers on it, enter its number and say what's inside it. Until
// then it can't be issued from stock.
// One entry per part since 2026-11-05: sticker numbers come from a range or by
// hand, what's inside is a suggestion Store checks, and a whole part saves at once.
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { rangeOf } from '@/components/accounts/purchase/SerialNumbersInput';
import { startRow, usedInPool, fillStickers, emptyStickerRows, fillInside, saveList } from './labelCarrierFill';
import { Tag, Search, RotateCw, ChevronLeft, ChevronRight, ChevronDown, ListPlus, Plus, Wand2 } from 'lucide-react';

const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '');

function Pager({ pg, page, setPage }) {
  if (!(pg.pages > 1)) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm text-slate-600">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
      Page {pg.page} of {pg.pages} · {pg.total}
      <Button size="sm" variant="outline" disabled={page >= pg.pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
}

// One part inside a row: a dropdown per piece it usually holds, + for one more.
function InsideCell({ type, pool, row, used, onChange }) {
  const options = pool.options.filter(o => o.itemName === type);
  const chosen = row.picks[type] || [];
  const usual = pool.types.find(t => t.itemName === type)?.perPiece || 0;
  const slots = Math.max(usual, chosen.length);
  const free = options.filter(o => !used.has(String(o.id)) && !chosen.includes(String(o.id)));
  if (!options.length) return <span className="text-xs text-slate-300">—</span>;
  const setSlot = (i, val) => {
    const list = Array.from({ length: slots }, (_, n) => chosen[n] || '');
    list[i] = val;
    onChange(list);
  };
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: slots }, (_, i) => (
        <select key={i} className="h-8 rounded-md border border-slate-300 bg-white px-1.5 text-xs font-mono max-w-[11rem]" value={chosen[i] || ''} onChange={e => setSlot(i, e.target.value)}>
          <option value="">Pick…</option>
          {options.filter(o => String(o.id) === chosen[i] || (!used.has(String(o.id)) && !chosen.includes(String(o.id)))).map(o => (
            <option key={o.id} value={String(o.id)}>{o.no}{o.sub ? ` · ${o.sub}` : ''}</option>
          ))}
        </select>
      ))}
      {free.length > 0 && chosen.filter(Boolean).length >= slots && (
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="One more in this piece" onClick={() => onChange([...chosen, ''])}><Plus className="h-3.5 w-3.5" /></Button>
      )}
    </div>
  );
}

function WaitingEntry({ group, onLeftover }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rows, setRows] = useState({});
  const [prefix, setPrefix] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [problem, setProblem] = useState('');
  const q = useQuery({
    queryKey: ['part-labels-waiting', group._id],
    queryFn: () => apiRequest('GET', `/api/part-labels/waiting/${group._id}`).then(r => r.data),
  });
  const pieces = q.data?.pieces || [];
  const pools = q.data?.pools || {};

  // New pieces get a row; what's typed on the others stays through a refresh.
  useEffect(() => {
    setRows(cur => {
      const next = {};
      for (const p of pieces) next[p._id] = cur[p._id] || startRow(p, pools[p.pool]);
      return next;
    });
  }, [q.data]);

  const types = [...new Set(Object.values(pools).flatMap(p => p.types.map(t => t.itemName)))];
  const range = rangeOf(prefix, from, to);
  const empty = emptyStickerRows(pieces, rows);
  const toSave = saveList(pieces, pools, rows);
  const update = (id, patch) => setRows(r => ({ ...r, [id]: { ...r[id], ...patch } }));

  const save = useMutation({
    mutationFn: () => apiRequest('POST', '/api/part-labels/bulk', { rows: toSave }),
    onSuccess: (r) => {
      setProblem(r.failed?.length ? r.message : '');
      toast({ title: r.message || 'Saved' });
      setFrom(''); setTo('');
      qc.invalidateQueries({ queryKey: ['part-labels'] });
      qc.invalidateQueries({ queryKey: ['part-labels-groups'] });
      qc.invalidateQueries({ queryKey: ['part-labels-waiting'] });
      if (r.leftover?.length) onLeftover(r.leftover);
    },
    onError: (e) => { setProblem(e.message); toast({ title: 'Not saved', description: 'Nothing was saved. See the list above the Save button.', variant: 'destructive' }); },
  });

  if (q.isLoading) return <p className="text-xs text-slate-400 py-3">Loading…</p>;
  if (!pieces.length) return <p className="text-xs text-slate-400 py-3">Nothing waiting here any more.</p>;
  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1 w-28">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Prefix</p>
          <Input className="h-8 text-sm font-mono" placeholder="C-" value={prefix} onChange={e => setPrefix(e.target.value)} />
        </div>
        <div className="space-y-1 w-20">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">From</p>
          <Input className="h-8 text-sm font-mono" placeholder="101" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1 w-20">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">To</p>
          <Input className="h-8 text-sm font-mono" placeholder="120" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={!range || !empty} onClick={() => setRows(r => fillStickers(pieces, r, range))}>
          <ListPlus className="h-3.5 w-3.5 mr-1" /> Fill {range ? Math.min(range.length, empty) : ''}
        </Button>
        {types.length > 0 && (
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setRows(r => fillInside(pieces, pools, r))}>
            <Wand2 className="h-3.5 w-3.5 mr-1" /> Fill what's inside
          </Button>
        )}
        {q.data?.lastLabelNo && <p className="text-xs text-slate-500 ml-auto self-center">Last sticker used: <span className="font-mono">{q.data.lastLabelNo}</span></p>}
      </div>
      {types.length > 0 && <p className="text-xs text-amber-700">Fill what's inside is only a suggestion, in list order. Read the nameplates and change any row that doesn't match before saving.</p>}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left font-medium px-2 py-1.5">Piece</th>
              <th className="text-left font-medium px-2 py-1.5">Sticker</th>
              {types.map(t => <th key={t} className="text-left font-medium px-2 py-1.5">{t}</th>)}
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pieces.map(p => {
              const row = rows[p._id];
              if (!row) return null;
              const pool = pools[p.pool];
              const used = usedInPool(pieces, rows, p.pool, p._id);
              return (
                <tr key={p._id} className={row.nothing ? 'bg-slate-50 text-slate-400' : ''}>
                  <td className="px-2 py-1.5 whitespace-nowrap">{p.orderNo} · unit {p.unitIndex}<span className="text-slate-400"> · {day(p.createdAt)}</span></td>
                  <td className="px-2 py-1.5">
                    <Input className="h-8 w-32 text-xs font-mono" disabled={row.nothing} placeholder="as printed" value={row.no} onChange={e => update(p._id, { no: e.target.value })} />
                  </td>
                  {types.map(t => (
                    <td key={t} className="px-2 py-1.5">
                      {row.nothing ? <span className="text-slate-300">—</span> : (
                        <InsideCell type={t} pool={pool} row={row} used={used} onChange={list => update(p._id, { picks: { ...row.picks, [t]: list } })} />
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    <Button type="button" size="sm" variant={row.nothing ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => update(p._id, { nothing: !row.nothing, no: '' })}>
                      {row.nothing ? 'Undo: nothing inside' : 'Nothing inside'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {problem && <div className="rounded-md border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700 space-y-0.5">{problem.split(' · ').map((m, i) => <p key={i}>{m}</p>)}</div>}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-slate-500">Only rows with a sticker number or Nothing inside are saved. The rest keep waiting.</p>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={save.isPending || !toSave.length} onClick={() => save.mutate()}>
          <Tag className="h-4 w-4 mr-1" /> Save {toSave.length} {toSave.length === 1 ? 'row' : 'rows'}
        </Button>
      </div>
    </div>
  );
}

// The stickers of one part, with pages of their own.
function DoneEntry({ group, status, search }) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search]);
  const q = useQuery({
    queryKey: ['part-labels', status, group._id, search, page],
    queryFn: () => apiRequest('GET', `/api/part-labels?${new URLSearchParams({ status, item: group._id, page, limit: 20, ...(search ? { search } : {}) })}`),
    keepPreviousData: true,
  });
  const rows = q.data?.data || [];
  if (q.isLoading) return <p className="text-xs text-slate-400 py-3">Loading…</p>;
  return (
    <div className="mt-3 space-y-2">
      <div className="rounded border border-slate-200 bg-white divide-y divide-slate-100">
        {rows.map(l => (
          <div key={l._id} className="px-2 py-1.5 text-xs">
            <p className="text-slate-500">Built in {l.builtIn?.orderNo} · unit {l.builtIn?.unitIndex} · into stock {day(l.createdAt)}</p>
            {l.status === 'Labelled' && (
              <p className="text-slate-600 mt-0.5">
                Sticker <span className="font-mono font-semibold">{l.labelNo}</span> · holds {[...(l.contains?.units || []).map(u => u.serialNumber), ...(l.contains?.labels || []).map(x => x.labelNo)].join(', ')}
                {l.place?.kind && l.place.kind !== 'Stock' ? ` · now: ${l.place.kind}${l.place.orderNo ? ` (${l.place.orderNo})` : ''}` : ' · in stock'}
              </p>
            )}
          </div>
        ))}
      </div>
      <Pager pg={q.data?.pagination || { pages: 1 }} page={page} setPage={setPage} />
    </div>
  );
}

export default function LabelCarriers() {
  const [tab, setTab] = useState('Unlabelled');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [leftover, setLeftover] = useState([]);
  const q = useQuery({
    queryKey: ['part-labels-groups', tab, search, page],
    queryFn: () => apiRequest('GET', `/api/part-labels/groups?${new URLSearchParams({ status: tab, page, limit: 20, ...(search ? { search } : {}) })}`),
    keepPreviousData: true,
  });
  const groups = q.data?.data || [];
  const pg = q.data?.pagination || { page: 1, pages: 1, total: 0 };
  const noun = (n) => (tab === 'Labelled' ? `${n} sticker${n === 1 ? '' : 's'}` : tab === 'Unlabelled' ? `${n} waiting` : `${n} piece${n === 1 ? '' : 's'}`);
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2"><Tag className="h-5 w-5 text-blue-600" /> Label carriers</h1>
          <p className="text-sm text-slate-500 max-w-2xl">Parts and machines that went into stock holding tracked serial numbers. Stick one of the printed stickers on each, enter its number and say what's inside it. Until then it can't be issued from stock.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => q.refetch()}><RotateCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {['Unlabelled', 'Labelled', 'Not needed'].map(t => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => { setTab(t); setPage(1); setOpen(null); }}>
            {t === 'Unlabelled' ? `Waiting for a sticker${q.data?.waiting != null ? ` (${q.data.waiting})` : ''}` : t === 'Labelled' ? 'Labelled' : 'Nothing inside'}
          </Button>
        ))}
        <div className="relative ml-auto">
          <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-slate-400" />
          <Input className="h-8 pl-7 text-xs w-60" placeholder="Part, order or sticker" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      {leftover.map(l => (
        <div key={l.orderNo} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 flex items-start justify-between gap-3">
          <span>Every unit of {l.orderNo} is done, but these serial numbers weren't paired with any: <span className="font-mono">{l.serials.join(', ')}</span>. Check they weren't missed.</span>
          <Button size="sm" variant="ghost" onClick={() => setLeftover(cur => cur.filter(x => x.orderNo !== l.orderNo))}>Dismiss</Button>
        </div>
      ))}
      {q.isLoading ? <p className="text-slate-400 py-10 text-center">Loading…</p>
        : !groups.length ? <p className="text-slate-400 py-10 text-center">{tab === 'Unlabelled' ? 'Nothing waiting for a sticker.' : tab === 'Labelled' ? 'No labelled parts yet.' : 'None marked as having nothing inside.'}</p>
        : (
          <div className="space-y-2">
            {groups.map(g => (
              <Card key={g._id} className="border-slate-200">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium text-slate-800">{g.itemName} <span className="font-mono text-xs text-blue-600">{g.itemCode}</span></p>
                      <p className="text-xs text-slate-500">
                        {noun(g.count)}{tab === 'Labelled' ? ` · ${g.inStock} in stock` : ''} · from {g.orders.slice(0, 3).join(', ')}{g.orders.length > 3 ? ` +${g.orders.length - 3} more` : ''}
                      </p>
                    </div>
                    <Button size="sm" variant={open === g._id ? 'default' : 'outline'} onClick={() => setOpen(open === g._id ? null : g._id)}>
                      {tab === 'Unlabelled' ? <Tag className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                      {open === g._id ? 'Close' : tab === 'Unlabelled' ? 'Label them' : 'View'}
                    </Button>
                  </div>
                  {open === g._id && (tab === 'Unlabelled'
                    ? <WaitingEntry group={g} onLeftover={(list) => setLeftover(cur => [...cur.filter(x => !list.some(y => y.orderNo === x.orderNo)), ...list])} />
                    : <DoneEntry group={g} status={tab} search={search} />)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      <Pager pg={pg} page={page} setPage={setPage} />
    </div>
  );
}
