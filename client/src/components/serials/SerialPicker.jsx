// Serial number work step 2 (2026-10-31): pick the vendor serial numbers /
// stickers of what's handed over — Store's transfer, Dispatch's handover
// (mode 'stock'), Production's return (mode 'issued'). The same pick rule as
// the server (services/serialTrailService.js pickRule): pick at least
// qty − untracked, at most min(qty, tracked).
// mode 'inside': the serials built into a stickerless part Production returns.
// mode 'defective': what's tracked under a Defective Inventory row. A part holds
// several, so both ask for at least 1, or "Nothing tracked inside".
// mode 'scpPieces': the source serials of Sub Child Part pieces scrapped by QC
// (jobId) or lost at a vendor (orderId). qty and onFloor are in pieces.
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, Search, AlertTriangle } from 'lucide-react';

export function pickRule({ qty, tracked, untracked }) {
  const q = Math.max(0, Math.round(Number(qty) || 0));
  const t = Math.max(0, Number(tracked) || 0);
  const u = Math.max(0, Number(untracked) || 0);
  return { qty: q, min: Math.max(0, Math.min(q, t, q - u)), max: Math.min(q, t) };
}
export const emptyPick = () => ({ unitIds: [], labelIds: [] });
export const pickedCount = (v) => (v?.unitIds?.length || 0) + (v?.labelIds?.length || 0);

const USE_TEXT = { BuiltIn: 'built into the product — followed to the customer', UsedToMake: 'used to make the product — its trail ends at this order' };

// mode 'stock': itemCode | itemId. mode 'issued' / 'inside': + orderId, and `onFloor`
// (what Production holds of it; the rest of that is untracked). mode 'defective':
// itemCode = the row's material code, `onFloor` = the row's quantity.
// nothingInside / onNothingInside: the "Nothing tracked inside" tick.
// onValidity(ok, rule) — tells the parent whether the pick fits the rule.
// extraUntracked: stock already taken out for this handover (a sale from stock
// deducts at its QC job) — counts back in as room for untracked pieces.
export default function SerialPicker({ mode = 'stock', itemCode, itemId, orderId, onFloor, qty, value, onChange, onValidity, extraUntracked = 0, nothingInside = false, onNothingInside, jobId, title = 'Serial numbers' }) {
  const [search, setSearch] = useState('');
  const isPieces = mode === 'scpPieces';
  const key = isPieces ? (jobId || orderId) : (itemId || itemCode);
  const needsOrder = mode === 'issued' || mode === 'inside';
  const params = new URLSearchParams(isPieces
    ? (jobId ? { jobId } : { orderId: orderId || '' })
    : { ...(itemId ? { itemId } : { itemCode: itemCode || '' }), ...(needsOrder ? { orderId: orderId || '' } : {}) });
  const { data, isLoading } = useQuery({
    queryKey: ['/api/serial-numbers', mode, key, orderId || ''],
    queryFn: () => apiRequest('GET', `/api/serial-numbers/${isPieces ? 'scp-pieces' : mode}?${params.toString()}`),
    enabled: !!key && (!needsOrder || !!orderId),
  });
  const d = data?.data || {};
  const rows = useMemo(() => [
    ...(d.units || []).map(u => ({ id: u._id, kind: 'unit', own: mode !== 'defective' || u.own, no: u.serialNumber, sub: [mode === 'stock' ? '' : u.itemName, u.vendorName, u.poNumber].filter(Boolean).join(' · ') })),
    ...(d.labels || []).map(l => ({ id: l._id, kind: 'label', own: true, no: l.labelNo, sub: `sticker${l.builtIn?.orderNo ? ` · built in ${l.builtIn.orderNo}` : ''}` })),
  ], [d.units, d.labels]);
  const tracked = rows.length;
  const ownRows = rows.filter(r => r.own);
  const insideRows = rows.filter(r => !r.own);
  const stockForPick = (d.stock || 0) + (Number(extraUntracked) || 0);
  const perPiece = isPieces ? (d.perPiece || 1) : 1;
  const untracked = mode === 'stock' ? Math.max(0, stockForPick - tracked - (d.unlabelled || 0)) : Math.max(0, (Number(onFloor) || 0) * perPiece - ownRows.length);
  const v = value || emptyPick();
  const picked = new Set([...(v.unitIds || []), ...(v.labelIds || [])].map(String));
  const count = picked.size;
  // Parts waiting for a sticker only block a handover that needs them.
  const blocked = mode === 'stock' && (d.unlabelled || 0) > 0 && (Number(qty) || 0) > Math.max(0, stockForPick - d.unlabelled);
  const holdsSeveral = mode === 'inside' || (mode === 'defective' && insideRows.length > 0);
  const base = mode === 'inside' ? { qty: 0, min: 0, max: 0 } : pickRule({ qty: (Number(qty) || 0) * perPiece, tracked: ownRows.length, untracked });
  const rule = { ...base, min: Math.max(base.min, holdsSeveral && !nothingInside ? 1 : 0), max: base.max + insideRows.length + (mode === 'inside' ? ownRows.length : 0) };
  const ownCount = rows.filter(r => r.own && picked.has(String(r.id))).length;
  const ok = !blocked && (tracked === 0 || (mode === 'inside'
    ? (nothingInside || count >= 1)
    : (ownCount >= base.min && ownCount <= base.max && (!holdsSeveral || nothingInside || count >= 1))));

  useEffect(() => { onValidity?.(ok, rule); }, [ok, rule.min, rule.max]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (ids) => {
    const byId = new Map(rows.map(r => [String(r.id), r]));
    onChange?.({ unitIds: ids.filter(i => byId.get(i)?.kind === 'unit'), labelIds: ids.filter(i => byId.get(i)?.kind === 'label') });
  };
  const toggle = (id) => { const s = new Set(picked); s.has(String(id)) ? s.delete(String(id)) : s.add(String(id)); set([...s]); };
  const pickOldest = (n) => set(rows.slice(0, n).map(r => String(r.id)));

  if (!key || isLoading) return null;
  if (blocked) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Only {Math.max(0, stockForPick - d.unlabelled)} can go now: {d.unlabelled} of this part hold tracked serial numbers and have no sticker yet. Label them on Store → Label carriers first.</span>
      </div>
    );
  }
  if (tracked === 0) return null;
  const shown = search ? rows.filter(r => `${r.no} ${r.sub}`.toLowerCase().includes(search.toLowerCase())) : rows;
  const need = rule.min === rule.max ? `${rule.min}` : `${rule.min}–${rule.max}`;
  return (
    <div className={`rounded-md border p-3 space-y-2 ${ok ? 'border-slate-200 bg-slate-50' : 'border-amber-300 bg-amber-50/60'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Tag className="h-4 w-4" /> {title} — pick {need}</span>
        <span className={`text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>{count} picked</span>
      </div>
      <p className="text-[11px] text-slate-500">
        {isPieces ? `${tracked} on this order with a serial number, ${perPiece} per piece. Tick the ones in these pieces.`
          : mode === 'inside' ? 'Built into this part by the order that made it. Tick the ones inside what you\'re returning.'
          : mode === 'defective' ? `${tracked} tracked under this row. Tick the ones in what you're handling.`
          : mode === 'stock'
          ? `${tracked} with a serial number in stock${untracked ? `, ${untracked} without` : ''}.`
          : `${tracked} with a serial number on this order${untracked ? `, ${untracked} without` : ''}.`}
        {d.item?.productionUse ? ` This item is ${USE_TEXT[d.item.productionUse]}.` : (mode === 'stock' ? ' R&D hasn\'t said how this item is used in production yet.' : '')}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-slate-400" />
          <Input className="h-8 pl-7 text-xs" placeholder="Find a serial / sticker" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {rule.qty > 0 && !holdsSeveral && <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => pickOldest(Math.max(rule.min, Math.min(rule.qty, rule.max)))}>Pick the oldest {Math.max(rule.min, Math.min(rule.qty, rule.max))}</Button>}
      </div>
      <div className="max-h-44 overflow-y-auto rounded border border-slate-200 bg-white divide-y divide-slate-100">
        {shown.map(r => (
          <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-slate-50">
            <input type="checkbox" checked={picked.has(String(r.id))} disabled={nothingInside} onChange={() => toggle(r.id)} />
            <span className="font-mono text-slate-800">{r.no}</span>
            <span className="text-slate-400 truncate">{r.sub}</span>
          </label>
        ))}
        {!shown.length && <p className="px-2 py-2 text-xs text-slate-400">No match.</p>}
      </div>
      {holdsSeveral && onNothingInside && (
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" checked={nothingInside} onChange={(e) => { onNothingInside(e.target.checked); if (e.target.checked) onChange?.(emptyPick()); }} />
          Nothing tracked inside
        </label>
      )}
    </div>
  );
}
