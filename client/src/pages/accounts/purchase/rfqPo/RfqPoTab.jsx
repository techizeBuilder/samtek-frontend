import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { RotateCw, PanelLeftOpen } from 'lucide-react';
import RfqItemList from './RfqItemList';
import RfqVendorList from './RfqVendorList';
import { dimensionSignature } from '@/lib/fabricationDims';

// RFQ/PO — the merged By Item + By Vendor page (procurement-v2, 2026-10-08,
// client design change D3). LEFT = what needs buying (one card per item,
// every pending request selected by default); RIGHT = approved vendors that
// supply it, ranked by coverage ("k/N"), where quotations are taken
// ("Vendor Quotation", design change D4) and POs are made — one PO per
// vendor, from that vendor's ticked quotations (batching, as before).
//
// Data: pending PRs (+ their resolved item) and the group/quote "board"
// (itemQuoteGroupController getRfqBoard); auto-select creates a group with
// everything selected for any item that doesn't have one yet; eligible
// vendors (approved + active), the item catalog (source / categories for the
// filters), vendor ratings, and the company purchase settings (min vendors,
// PO approval threshold, charge / term templates).
const pad = (s) => String(s || '').toLowerCase();

// One card per fabrication SIZE (2026-10-09): a fabrication request carries
// one size; its card key is item + size (same dimensionSignature the server
// uses). Every other item keeps one card (sizeKey '').
const sizeKeyOf = (pr) => (pr.fabricationDimensionLines?.length ? dimensionSignature(pr.fabricationDimensionLines[0].values) : '');
const cardKeyOf = (itemId, sizeKey) => `item:${itemId}|${sizeKey || ''}`;

// Each column scrolls on its own on wide screens: as tall as the window
// (less a small margin), pinned while the page scrolls, scrollbar hidden.
// pb-2 keeps the last card's shadow from being clipped.
const COLUMN_SCROLL = 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto no-scrollbar pb-2';

export default function RfqPoTab({ focusItemId = null, onPOCreated }) {
  const [loading, setLoading] = useState(true);
  const [prs, setPrs] = useState([]);
  const [board, setBoard] = useState({ groups: [], quotes: [] });
  const [vendors, setVendors] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [ratings, setRatings] = useState(new Map());
  const [settings, setSettings] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [filters, setFilters] = useState({ search: '', source: '', category: '', priority: '', raisedBy: '' });
  const [sortBy, setSortBy] = useState('price');
  // Collapsed item list (a thin rail) — remembered per browser; a per-viewer
  // convenience only, so storage failures are ignored.
  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    try { return localStorage.getItem('rfqPo.leftCollapsed') === '1'; } catch { return false; }
  });
  const setCollapsed = (v) => {
    setLeftCollapsed(v);
    try { localStorage.setItem('rfqPo.leftCollapsed', v ? '1' : '0'); } catch { /* ignore */ }
  };
  // Clicking an item's quantity on a vendor row (2026-10-09): open the item
  // list if collapsed, then that card scrolls into view, highlights and
  // focuses its quantity / pieces box. `n` makes a repeat click fire again.
  const [focus, setFocus] = useState(null); // { key, n }
  const focusCard = (key) => {
    if (leftCollapsed) setCollapsed(false);
    setFocus({ key, n: Date.now() });
  };

  // PRs + board; creates default (everything-selected) groups for items that
  // have none yet, then re-reads the board.
  const loadBoard = async () => {
    const [prRes, boardRes] = await Promise.all([
      apiRequest('GET', '/api/purchase-requests?limit=500'),
      apiRequest('GET', '/api/item-quote-groups/board'),
    ]);
    // Requests still to buy: not on a PO and not refused (a Store-rejected or
    // 'no longer needed' request never comes back here).
    const pending = (prRes?.data || []).filter(pr => !pr.purchaseOrder && ['Pending', 'Approved'].includes(pr.status));
    let b = boardRes?.data || { groups: [], quotes: [] };
    // Per item + size: a card without an Open group yet gets one with all its requests.
    const grouped = new Set(b.groups.map(g => cardKeyOf(g.item?._id, g.sizeKey)));
    const byItem = new Map();
    for (const pr of pending) {
      const id = pr.item?._id ? String(pr.item._id) : null;
      if (!id) continue;
      const key = cardKeyOf(id, sizeKeyOf(pr));
      if (grouped.has(key)) continue;
      if (!byItem.has(key)) byItem.set(key, []);
      byItem.get(key).push(pr._id);
    }
    if (byItem.size) {
      try {
        await apiRequest('POST', '/api/item-quote-groups/auto-select', { items: [...byItem.values()].map(ids => ({ purchaseRequests: ids })) });
        const again = await apiRequest('GET', '/api/item-quote-groups/board');
        b = again?.data || b;
      } catch {
        /* the cards still show; Purchase can select requests by hand */
      }
    }
    setPrs(pending);
    setBoard(b);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [, vRes, cRes, rRes, sRes] = await Promise.all([
        loadBoard(),
        apiRequest('GET', '/api/suppliers?limit=500&eligible=true'),
        apiRequest('GET', '/api/suppliers/catalog'),
        apiRequest('GET', '/api/suppliers/vendor-ratings').catch(() => null),
        apiRequest('GET', '/api/purchase-settings').catch(() => null),
      ]);
      setVendors(vRes?.suppliers || []);
      setCatalog(cRes?.items || []);
      // Point 10 (2026-10-10): the whole vendor context, not just the stars.
      setRatings(new Map((rRes?.data || []).map(r => [String(r._id), r])));
      setSettings(sRes?.settings || null);
    } finally {
      setLoading(false);
    }
  };
  const refreshBoard = async () => { try { await loadBoard(); } catch { /* keep what's shown */ } };

  useEffect(() => { loadAll(); }, []);

  // ── Left: one card per item ────────────────────────────────────────────
  const catalogById = useMemo(() => new Map(catalog.map(it => [String(it._id), it])), [catalog]);
  const cards = useMemo(() => {
    const map = new Map();
    for (const pr of prs) {
      const sizeKey = sizeKeyOf(pr);
      const key = pr.item?._id ? cardKeyOf(pr.item._id, sizeKey) : `unresolved:${pr._id}`;
      if (!map.has(key)) {
        map.set(key, {
          key, item: pr.item || null, prs: [],
          sizeKey, sizeValues: sizeKey ? pr.fabricationDimensionLines[0].values : null,
        });
      }
      map.get(key).prs.push(pr);
    }
    for (const g of board.groups) {
      const key = g.item?._id ? cardKeyOf(g.item._id, g.sizeKey) : null;
      if (key && map.has(key)) map.get(key).group = g;
    }
    for (const c of map.values()) c.meta = c.item ? catalogById.get(String(c.item._id)) || null : null;
    return [...map.values()];
  }, [prs, board.groups, catalogById]);

  // Filters / search never hide a card — matches move to the top.
  const subFieldFor = { Inventory: 'itemCategories', 'Product Master': 'category' };
  const categoriesOf = (meta) => {
    const field = subFieldFor[meta?.source];
    if (!field) return [];
    const raw = field === 'itemCategories' ? (meta[field] || []) : [meta[field]];
    return raw.map(v => String(v || '').trim()).filter(Boolean);
  };
  const sourceOptions = useMemo(() => ['Inventory', 'Product Master', 'Motor Master'].filter(s => cards.some(c => c.meta?.source === s)), [cards]);
  const categoryOptions = useMemo(() => {
    if (!subFieldFor[filters.source]) return [];
    const set = new Set();
    cards.filter(c => c.meta?.source === filters.source).forEach(c => categoriesOf(c.meta).forEach(v => set.add(v)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cards, filters.source]); // eslint-disable-line react-hooks/exhaustive-deps

  // The search box updates as you type, but the cards re-sort only after a
  // short pause in typing (2026-10-10) — no re-sorting / re-drawing of every
  // item card on each keystroke when there are many open requests.
  const searchText = useDebouncedValue(filters.search, 250);
  const anyFilter = Object.entries(filters).some(([k, v]) => (k === 'search' ? searchText : v));
  const isMatch = (card) => {
    if (filters.source && card.meta?.source !== filters.source) return false;
    if (filters.category && !categoriesOf(card.meta).some(v => pad(v) === pad(filters.category))) return false;
    if (filters.priority && !card.prs.some(pr => pr.priority === filters.priority)) return false;
    if (filters.raisedBy && !card.prs.some(pr => pr.raisedBy === filters.raisedBy)) return false;
    if (searchText) {
      const q = pad(searchText);
      const hit = pad(card.item?.name).includes(q) || pad(card.item?.code).includes(q)
        || card.prs.some(pr => pad(pr.requestId).includes(q) || pad(pr.productName).includes(q) || pad(pr.materialCode).includes(q));
      if (!hit) return false;
    }
    return true;
  };
  const orderedCards = useMemo(() => {
    if (!anyFilter) return cards;
    const hits = cards.filter(isMatch);
    const rest = cards.filter(c => !isMatch(c));
    return [...hits, ...rest];
  }, [cards, filters.source, filters.category, filters.priority, filters.raisedBy, searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Vendor Quotation" from the PRs tab — tick that item and bring it up.
  useEffect(() => {
    if (!focusItemId || !cards.length) return;
    // Every size card of that item.
    const keys = cards.filter(c => c.item && String(c.item._id) === String(focusItemId)).map(c => c.key);
    if (keys.length) {
      setSelectedKeys(new Set(keys));
      setFilters(f => ({ ...f, search: cards.find(c => c.key === keys[0])?.item?.name || f.search }));
    }
  }, [focusItemId, cards.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleKey = (key) => setSelectedKeys(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectAll = () => setSelectedKeys(new Set(cards.filter(c => c.item).map(c => c.key)));
  const clearSel = () => setSelectedKeys(new Set());

  // ── Right: vendors ranked against the considered items ────────────────
  const minVendors = settings?.minVendorsPerItem || 3;
  const eligibleCountOf = (itemId) => vendors.filter(v => (v.suppliedItems || []).some(id => String(id) === String(itemId))).length;
  const quoteByGroupVendor = useMemo(() => {
    const m = new Map();
    for (const q of board.quotes) m.set(`${q.group}|${q.vendor}`, q);
    return m;
  }, [board.quotes]);
  const groupHasQuotes = (groupId) => board.quotes.some(q => String(q.group) === String(groupId));
  // Point 11 (2026-10-10): every vendor's current quote for one item card.
  const quotesOf = (groupId) => board.quotes.filter(q => String(q.group) === String(groupId));

  const resolvedCards = cards.filter(c => c.item);
  const consideredCards = selectedKeys.size ? resolvedCards.filter(c => selectedKeys.has(c.key)) : resolvedCards;
  const consideredIsAll = selectedKeys.size === 0;

  const ranked = useMemo(() => {
    // Cheapest / fastest submitted quotation per item group, for row badges.
    const bestByGroup = new Map();
    for (const c of consideredCards) {
      if (!c.group) continue;
      const subs = board.quotes.filter(q => String(q.group) === String(c.group._id) && q.status === 'Submitted' && !q.isStale && !q.isExpired);
      if (!subs.length) continue;
      bestByGroup.set(String(c.group._id), {
        cheapest: subs.reduce((a, b) => (a.unitPrice <= b.unitPrice ? a : b))._id,
        fastest: subs.reduce((a, b) => (a.deliveryDays <= b.deliveryDays ? a : b))._id,
      });
    }

    const entries = [];
    for (const v of vendors) {
      const supplied = new Set((v.suppliedItems || []).map(String));
      const rows = consideredCards
        .filter(c => supplied.has(String(c.item._id)))
        .map(c => {
          const q = c.group ? quoteByGroupVendor.get(`${c.group._id}|${v._id}`) || null : null;
          const best = c.group ? bestByGroup.get(String(c.group._id)) : null;
          return {
            card: c,
            quote: q,
            isCheapest: !!(q && best && String(best.cheapest) === String(q._id)),
            isFastest: !!(q && best && String(best.fastest) === String(q._id)),
            // An expired quote (past the company's quote validity) can't go on a PO.
            canBatch: !!(q && c.group && q.status === 'Submitted' && !q.isStale && !q.isExpired && !c.group.heldByPO),
          };
        });
      if (!rows.length) continue;
      const quoted = rows.filter(r => r.quote && r.quote.status === 'Submitted' && !r.quote.isExpired);
      entries.push({
        vendor: v,
        rows,
        coverage: rows.length,
        rating: ratings.get(String(v._id))?.score ?? null,   // vendor score /100 (2026-10-13)
        context: ratings.get(String(v._id)) || null,
        priceTotal: quoted.length ? quoted.reduce((s, r) => s + r.quote.unitPrice * r.quote.quantity, 0) : Infinity,
        slowest: quoted.length ? Math.max(...quoted.map(r => Number(r.quote.deliveryDays) || 0)) : Infinity,
      });
    }
    const tie = {
      price: (a, b) => a.priceTotal - b.priceTotal,
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
      delivery: (a, b) => a.slowest - b.slowest,
      name: () => 0,
    }[sortBy] || (() => 0);
    return entries.sort((a, b) => (b.coverage - a.coverage) || tie(a, b) || a.vendor.supplierName.localeCompare(b.vendor.supplierName));
  }, [vendors, consideredCards, board.quotes, quoteByGroupVendor, ratings, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="text-slate-400 py-16 text-center">Loading...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Left: what needs buying — tick items to focus the vendor list. Right: approved vendors for them — tick items on a vendor and <b>email one quotation request</b>, or enter a <b>manual quotation</b> with the vendor's proof (WhatsApp, PDF, email), then make one PO per vendor.
        </p>
        <Button size="sm" variant="outline" onClick={loadAll}><RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>
      {/* On wide screens each side scrolls on its own (2026-10-09), pinned in
          view, with no visible scrollbar (.no-scrollbar in index.css); on
          narrow screens they stack and the page scrolls. The item list can
          be collapsed to a thin rail so the vendor side gets the full width. */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {leftCollapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Show the item list"
            className="w-full lg:w-11 shrink-0 bg-white border border-slate-200 rounded-lg py-3 px-2 flex lg:flex-col items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 hover:text-blue-700 lg:sticky lg:top-4"
          >
            <PanelLeftOpen className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap lg:[writing-mode:vertical-rl] lg:rotate-180">
              Items ({resolvedCards.length}){selectedKeys.size ? ` · ${selectedKeys.size} selected` : ''}
            </span>
          </button>
        ) : (
        <div className={`w-full lg:w-[40%] xl:w-[36%] shrink-0 ${COLUMN_SCROLL}`}>
          <RfqItemList
            onCollapse={() => setCollapsed(true)}
            cards={orderedCards}
            selectedKeys={selectedKeys}
            onToggle={toggleKey}
            onSelectAll={selectAll}
            onClear={clearSel}
            filters={filters}
            setFilters={setFilters}
            sourceOptions={sourceOptions}
            categoryOptions={categoryOptions}
            isMatch={isMatch}
            anyFilter={anyFilter}
            minVendors={minVendors}
            eligibleCountOf={eligibleCountOf}
            groupHasQuotes={groupHasQuotes}
            quotesOf={quotesOf}
            onGroupUpdated={refreshBoard}
            focus={focus}
          />
        </div>
        )}
        <div className={`flex-1 min-w-0 w-full ${COLUMN_SCROLL}`}>
          <RfqVendorList
            ranked={ranked}
            considered={consideredCards.length}
            consideredIsAll={consideredIsAll}
            sortBy={sortBy}
            setSortBy={setSortBy}
            settings={settings}
            company={board.company || null}
            quoteRules={board.quoteRules || { quoteValidityDays: settings?.quoteValidityDays || 30, priceJumpWarnPercent: settings?.priceJumpWarnPercent ?? 10 }}
            onChanged={refreshBoard}
            onPOCreated={onPOCreated}
            onFocusItem={focusCard}
          />
        </div>
      </div>
    </div>
  );
}
