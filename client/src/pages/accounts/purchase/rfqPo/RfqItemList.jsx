import React, { useEffect, useRef, useState } from 'react';
import { formatDims } from '@/lib/fabricationDims';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, ChevronDown, ChevronUp, ListChecks, Search, Lock, CheckSquare, Square, X, PanelLeftClose, Receipt,
} from 'lucide-react';
import { RAISED_BY_META } from '../PurchaseRequestsTab';
import { PRBreakdownRow, SelectPRsModal } from './rfqShared';
import { ItemBoughtBefore } from '@/components/accounts/purchase/PriceCheck';
import { StockChip, StockDetailDialog } from '@/components/accounts/purchase/StockContext';
import QuoteComparison from './QuoteComparison';

// RFQ/PO page — LEFT side: what needs buying (procurement-v2, 2026-10-08).
// One card per item — and per SIZE for a fabrication item (2026-10-09),
// whose quantity is entered in pieces with the kg calculated — combining its
// pending requests (ItemQuoteGroup). Ticking
// a card's checkbox narrows/ranks the vendors on the right; with nothing
// ticked, the right side ranks vendors against ALL listed items. Search and
// filters never hide a card — matching cards move to the top (client ask).
export const PRIORITIES = ['Low', 'Medium', 'High'];

function ItemCard({ card, checked, onToggle, highlight, minVendors, eligibleCount, hasQuotes, quotes = [], onGroupUpdated, focusSignal }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [qtyDraft, setQtyDraft] = useState('');
  const [savingQty, setSavingQty] = useState(false);
  const [flash, setFlash] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const cardRef = useRef(null);
  const qtyRef = useRef(null);
  const { item, prs, group, meta } = card;
  const held = group?.heldByPO;
  // A fabrication size card (2026-10-09): ordered in PIECES, kg calculated.
  const isFab = !!(group?.sizeKey || card.sizeKey);
  const sizeLabel = card.sizeValues || group?.sizeValues ? formatDims(card.sizeValues || group.sizeValues) : '';

  useEffect(() => {
    setQtyDraft(group ? String(isFab ? (group.pieces ?? group.requestedPieces ?? '') : group.quantity) : '');
  }, [group?.quantity, group?.pieces]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clicked from a vendor row: open, scroll here, highlight, focus the box.
  useEffect(() => {
    if (!focusSignal) return;
    setOpen(true);
    setFlash(true);
    const t1 = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      qtyRef.current?.focus({ preventScroll: true });
      qtyRef.current?.select?.();
    }, 60);
    const t2 = setTimeout(() => setFlash(false), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [focusSignal]);

  const selectedIds = new Set((group?.purchaseRequests || []).map(pr => String(pr._id || pr)));
  const selectedPRs = prs.filter(pr => selectedIds.has(String(pr._id)));
  const newCount = prs.length - selectedPRs.length;
  const anyFabrication = isFab || prs.some(pr => pr.fabricationDimensionLines?.length > 0);

  const applySelection = async (newIds) => {
    try {
      const res = !group
        ? await apiRequest('POST', '/api/item-quote-groups', { purchaseRequests: newIds })
        : await apiRequest('PUT', `/api/item-quote-groups/${group._id}/selection`, { purchaseRequests: newIds });
      const unresolved = res?.unresolvedPurchaseRequests || [];
      if (unresolved.length) {
        toast({
          title: `Quantity doesn't include ${unresolved.length} request${unresolved.length > 1 ? 's' : ''}`,
          description: unresolved.map(u => `${u.requestId}: ${u.reason}`).join(' · '),
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Selection updated' });
      }
      setModalOpen(false);
      onGroupUpdated();
    } catch (err) {
      toast({ title: 'Could not update selection', description: err.message, variant: 'destructive' });
    }
  };

  const confirmSelection = (newIds) => {
    const changed = newIds.length !== selectedIds.size || newIds.some(id => !selectedIds.has(id));
    if (changed && hasQuotes) {
      const ok = window.confirm('This item already has a vendor quotation — changing the selected requests refreshes the combined quantity (you can adjust it again after), and quotations at the old quantity will need syncing or re-quoting. Continue?');
      if (!ok) return;
    }
    applySelection(newIds);
  };

  const saveQty = async () => {
    if (!group) return;
    if (isFab) {
      const pcs = Number(qtyDraft);
      if (pcs === (group.pieces ?? group.requestedPieces)) return;
      if (!Number.isInteger(pcs) || pcs < 1) {
        toast({ title: 'Enter the number of pieces (a whole number)', variant: 'destructive' });
        setQtyDraft(String(group.pieces ?? group.requestedPieces ?? ''));
        return;
      }
      if (group.requestedPieces != null && pcs < group.requestedPieces) {
        toast({ title: `The requests ask for ${group.requestedPieces} pieces`, description: 'You can order more, but not fewer.', variant: 'destructive' });
        setQtyDraft(String(group.pieces ?? group.requestedPieces));
        return;
      }
    } else if (!(Number(qtyDraft) > 0) || Number(qtyDraft) === group.quantity) return;
    setSavingQty(true);
    try {
      await apiRequest('PATCH', `/api/item-quote-groups/${group._id}`, isFab ? { pieces: Number(qtyDraft) } : { quantity: Number(qtyDraft) });
      onGroupUpdated();
    } catch (err) {
      toast({ title: 'Could not update quantity', description: err.message, variant: 'destructive' });
      setQtyDraft(String(isFab ? (group.pieces ?? group.requestedPieces ?? '') : group.quantity));
    } finally {
      setSavingQty(false);
    }
  };

  if (!item) {
    return (
      <div className="bg-white rounded-lg border border-amber-200 p-3 text-sm">
        <p className="font-medium text-slate-800">{prs[0]?.productName}</p>
        <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Doesn't match a real Inventory item — fix the item or the request's product name before it can be bought.
        </p>
      </div>
    );
  }

  return (
    <div ref={cardRef} className={`bg-white rounded-lg border p-3 transition-shadow ${flash ? 'border-violet-500 ring-4 ring-violet-200' : checked ? 'border-blue-500 ring-2 ring-blue-100' : highlight ? 'border-amber-300 ring-2 ring-amber-50' : 'border-slate-200'}`}>
      <div className="flex items-start gap-2.5">
        <input type="checkbox" className="mt-1" checked={checked} onChange={onToggle} title="Use this item to rank vendors on the right" />
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setOpen(o => !o)}>
          <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
            {item.name}
            {item.code && <span className="font-mono text-[11px] font-normal text-blue-600">{item.code}</span>}
            {anyFabrication && <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-normal">Fabrication</Badge>}
            {meta?.source && <span className="text-[10px] font-normal text-slate-400">{meta.source}</span>}
          </p>
          {sizeLabel && <p className="text-[11px] font-mono text-slate-600 mt-0.5">Size: {sizeLabel}</p>}
          <p className="text-xs text-slate-500 mt-0.5">
            {group
              ? <>{selectedPRs.length} of {prs.length} request{prs.length > 1 ? 's' : ''} · {isFab && <><b className="text-slate-700">{group.pieces ?? group.requestedPieces} pcs</b> → </>}<b className="text-slate-700">{isFab ? '≈ ' : ''}{group.quantity} {group.purchaseUnit || ''}</b>{isFab && <span className="text-slate-400"> (calculated)</span>}</>
              : `${prs.length} pending request${prs.length > 1 ? 's' : ''} · none selected`}
          </p>
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>
      {/* "Bought before" (2026-10-09): what this item cost on earlier delivered purchases. Click → every vendor. */}
      {group && (
        <p className="text-[11px] text-slate-500 mt-1 ml-6 flex items-start gap-1">
          <Receipt className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
          <ItemBoughtBefore history={group.priceHistory} itemName={item.name} unit={group.purchaseUnit} />
        </p>
      )}
      {/* Gap 9 (2026-10-09): Stock · Reserved · Free · Incoming · Min — click for details. */}
      {group?.stock && (
        <div className="mt-1 ml-6">
          <StockChip stock={group.stock} onClick={() => setStockOpen(true)} />
          <StockDetailDialog open={stockOpen} onOpenChange={setStockOpen} groupId={group._id} itemName={item.name} />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-1.5 ml-6">
        {held && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <Lock className="w-3 h-3" /> On {held}, waiting for Company Admin approval
          </span>
        )}
        {newCount > 0 && group && (
          <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">{newCount} new — not selected</span>
        )}
        {eligibleCount < minVendors && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" /> {eligibleCount} approved vendor{eligibleCount === 1 ? '' : 's'} — company minimum is {minVendors}
          </span>
        )}
      </div>

      {open && (
        <div className="mt-2.5 ml-6 space-y-2">
          {selectedPRs.length > 0 ? (
            <div className="border rounded-md divide-y">
              {selectedPRs.map(pr => <PRBreakdownRow key={pr._id} pr={pr} />)}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No requests selected.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={!!held} onClick={() => setModalOpen(true)}>
              <ListChecks className="w-3.5 h-3.5 mr-1.5" /> Select requests ({selectedPRs.length} of {prs.length})
            </Button>
            {group && !isFab && (
              <span className="flex items-center gap-1.5">
                <Input ref={qtyRef} value={qtyDraft} onChange={e => setQtyDraft(e.target.value)} onBlur={saveQty} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} disabled={!!held} type="number" className="h-8 w-28 text-sm" placeholder="Quantity" />
                <span className="text-xs text-slate-400">{group.purchaseUnit || ''}{savingQty ? ' · saving...' : ''}</span>
              </span>
            )}
            {/* Fabrication: pieces of this size; the kg follows (never typed). */}
            {group && isFab && (
              <span className="flex flex-wrap items-center gap-1.5">
                <Input ref={qtyRef} value={qtyDraft} onChange={e => setQtyDraft(e.target.value)} onBlur={saveQty} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} disabled={!!held} type="number" min={group.requestedPieces || 1} step="1" className="h-8 w-24 text-sm" placeholder="Pieces" />
                <span className="text-xs text-slate-500">pieces → ≈ {group.quantity} {group.purchaseUnit || ''} <span className="text-slate-400">(calculated{savingQty ? ' · saving…' : ''})</span></span>
                {group.requestedPieces != null && <span className="text-[11px] text-slate-400 basis-full">Requests ask for {group.requestedPieces} — you can order more, not fewer.</span>}
              </span>
            )}
          </div>
          {group && <QuoteComparison quotes={quotes} unit={group.purchaseUnit || ''} />}
        </div>
      )}

      <SelectPRsModal open={modalOpen} onOpenChange={setModalOpen} item={item} prs={prs} group={group} onConfirm={confirmSelection} />
    </div>
  );
}

export default function RfqItemList({
  onCollapse,
  cards, selectedKeys, onToggle, onSelectAll, onClear,
  filters, setFilters, sourceOptions, categoryOptions, isMatch, anyFilter,
  minVendors, eligibleCountOf, groupHasQuotes, quotesOf = () => [], onGroupUpdated,
  focus = null,
}) {
  const set = (patch) => setFilters(f => ({ ...f, ...patch }));
  const selectable = cards.filter(c => c.item);
  const allSelected = selectable.length > 0 && selectable.every(c => selectedKeys.has(c.key));

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-lg border p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Items to buy</p>
          {onCollapse && (
            <button type="button" onClick={onCollapse} title="Hide the item list — give vendors the full width" className="text-slate-400 hover:text-blue-700 p-1 rounded hover:bg-slate-100">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9 h-9" placeholder="Find item, code or PR id" title="Matching items move to the top — nothing is hidden" value={filters.search} onChange={e => set({ search: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={filters.source} onChange={e => set({ source: e.target.value, category: '' })} className="border rounded-md px-2 py-1 text-xs bg-white">
            <option value="">All sources</option>
            {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {categoryOptions.length > 0 && (
            <select value={filters.category} onChange={e => set({ category: e.target.value })} className="border rounded-md px-2 py-1 text-xs bg-white">
              <option value="">All categories</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={filters.priority} onChange={e => set({ priority: e.target.value })} className="border rounded-md px-2 py-1 text-xs bg-white">
            <option value="">Any priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.raisedBy} onChange={e => set({ raisedBy: e.target.value })} className="border rounded-md px-2 py-1 text-xs bg-white">
            <option value="">Any origin</option>
            {Object.entries(RAISED_BY_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
          {anyFilter && (
            <button type="button" onClick={() => setFilters({ search: '', source: '', category: '', priority: '', raisedBy: '' })} className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-0.5">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={onSelectAll} disabled={allSelected} className="inline-flex items-center gap-1 text-blue-700 hover:underline disabled:text-slate-300 disabled:no-underline">
            <CheckSquare className="w-3.5 h-3.5" /> Select all
          </button>
          <button type="button" onClick={onClear} disabled={selectedKeys.size === 0} className="inline-flex items-center gap-1 text-slate-600 hover:underline disabled:text-slate-300 disabled:no-underline">
            <Square className="w-3.5 h-3.5" /> Clear
          </button>
          <span className="ml-auto text-slate-400">{selectedKeys.size ? `${selectedKeys.size} of ${selectable.length} selected` : `${selectable.length} items`}</span>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="text-slate-400 py-10 text-center text-sm">No purchase requests waiting.</p>
      ) : cards.map(card => (
        <ItemCard
          key={card.key}
          card={card}
          checked={selectedKeys.has(card.key)}
          onToggle={() => onToggle(card.key)}
          highlight={anyFilter && isMatch(card)}
          minVendors={minVendors}
          eligibleCount={card.item ? eligibleCountOf(card.item._id) : 0}
          hasQuotes={card.group ? groupHasQuotes(card.group._id) : false}
          quotes={card.group ? quotesOf(card.group._id) : []}
          onGroupUpdated={onGroupUpdated}
          focusSignal={focus?.key === card.key ? focus.n : null}
        />
      ))}
    </div>
  );
}
