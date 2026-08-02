import React, { useState, useEffect } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, X, Plus, CalendarClock, AlertTriangle, Loader2, Info } from 'lucide-react';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Sales-facing delivery date estimator. Deliberately lazy: the item list is
// only fetched once this dialog is actually opened (`enabled: open`), never
// on the Leads page itself, so it costs nothing until someone uses it.
export default function DeliveryEstimatorModal({ open, onOpenChange }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]); // [{ code, name, quantity, unit }]
  const [qtyDraft, setQtyDraft] = useState({}); // code -> draft quantity string, per row
  const [result, setResult] = useState(null);

  // Debounced so typing doesn't fire a request per keystroke. The search
  // term is sent to the SERVER (not filtered client-side) — search always
  // covers the full catalog, not just whichever pages have been loaded so
  // far via "Load More" below.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // 50 items per page, appended (not replaced) as Sales clicks "Load More",
  // until the backend reports no more pages. Changing the search term
  // starts a fresh page-1 query (react-query keys on [.., debouncedSearch]).
  const {
    data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['delivery-estimate-items', debouncedSearch],
    queryFn: ({ pageParam }) => apiRequest('GET', `/api/delivery-estimate/items?search=${encodeURIComponent(debouncedSearch)}&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage?.hasMore ? allPages.length + 1 : undefined),
    enabled: open,
    staleTime: 30 * 1000,
  });

  const filtered = (data?.pages || []).flatMap(p => p.data || []);

  const predictMutation = useMutation({
    mutationFn: (payload) => apiRequest('POST', '/api/delivery-estimate/predict', payload),
    onSuccess: (res) => setResult(res.data),
    onError: (err) => toast({ title: 'Could not calculate', description: err.message, variant: 'destructive' }),
  });

  const addItem = (item) => {
    if (selected.some(s => s.code === item.code)) return;
    const qty = Math.max(1, Number(qtyDraft[item.code]) || 1);
    setSelected(s => [...s, { code: item.code, name: item.name, unit: item.unit, quantity: qty }]);
    setResult(null);
  };

  const removeItem = (code) => {
    setSelected(s => s.filter(it => it.code !== code));
    setResult(null);
  };

  const updateQty = (code, qty) => {
    setSelected(s => s.map(it => it.code === code ? { ...it, quantity: Math.max(1, Number(qty) || 1) } : it));
    setResult(null);
  };

  const calculate = () => {
    if (selected.length === 0) return;
    predictMutation.mutate({ items: selected.map(s => ({ itemCode: s.code, quantity: s.quantity })) });
  };

  const handleClose = (isOpen) => {
    if (!isOpen) {
      setSearch('');
      setSelected([]);
      setResult(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Estimate Delivery Date
          </DialogTitle>
          <DialogDescription>
            Pick the item(s) the customer wants and get an estimated delivery date based on current stock, queues, and historical averages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search item name or code..."
              className="pl-9 pr-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {isFetching && !isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 animate-spin" />
            )}
          </div>

          {/* Item list */}
          <div className="border rounded-lg max-h-56 overflow-y-auto divide-y">
            {isLoading ? (
              <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading items...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No items found.</div>
            ) : (
              filtered.map(item => {
                const isSelected = selected.some(s => s.code === item.code);
                return (
                  <div key={item.code} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {item.code} · Stock: {item.qty} {item.unit} ·{' '}
                        <span className={item.path === 'Production' ? 'text-purple-600' : 'text-blue-600'}>{item.path}</span>
                        {item.avgLeadDays != null && <> · avg {item.avgLeadDays}d</>}
                      </p>
                    </div>
                    {!isSelected && (
                      <>
                        <Input
                          type="number"
                          min="1"
                          className="w-16 h-8 text-sm"
                          placeholder="Qty"
                          value={qtyDraft[item.code] || ''}
                          onChange={e => setQtyDraft(d => ({ ...d, [item.code]: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" className="h-8" onClick={() => addItem(item)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </>
                    )}
                    {isSelected && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Selected</Badge>}
                  </div>
                );
              })
            )}
            {!isLoading && hasNextPage && (
              <div className="p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-500"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Loading more...</>
                  ) : (
                    'Load more items'
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Selected items */}
          {selected.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Items for this order</p>
              {selected.map(it => (
                <div key={it.code} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm font-medium text-slate-700">{it.name}</span>
                  <Input
                    type="number"
                    min="1"
                    className="w-16 h-8 text-sm bg-white"
                    value={it.quantity}
                    onChange={e => updateQty(it.code, e.target.value)}
                  />
                  <button onClick={() => removeItem(it.code)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button className="w-full" onClick={calculate} disabled={predictMutation.isPending}>
                {predictMutation.isPending ? 'Calculating...' : 'Calculate Delivery Date'}
              </Button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-4">
              <div className="text-center">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Estimated Delivery Date</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {result.combinedDate ? fmtDate(result.combinedDate) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ~{result.combinedTotalDays} day{result.combinedTotalDays === 1 ? '' : 's'} from today
                </p>
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{result.disclaimer}</p>
              </div>

              {/* Per-item breakdown */}
              <div className="space-y-3">
                {result.items.map((r, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3">
                    {r.error ? (
                      <p className="text-sm text-red-600">{r.itemCode}: {r.error}</p>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{r.itemName}</p>
                            <p className="text-xs text-slate-400">
                              Qty {r.quantityRequested} · Stock {r.availableStock}
                              {r.shortfall > 0 && <> · Short by {r.shortfall}</>}
                              {' · '}
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-1">{r.path}</Badge>
                              {!r.hasHistory && (
                                <span className="text-amber-600 ml-1">(no history yet — using default estimate)</span>
                              )}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-slate-700">{fmtDate(r.predictedDate)}</span>
                        </div>
                        <div className="space-y-1 border-t border-slate-100 pt-2">
                          {r.breakdown.map((b, i) => (
                            <div key={i} className="flex justify-between text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Info className="h-3 w-3" />{b.label}</span>
                              <span className="font-medium text-slate-700">+{Math.round(b.days * 10) / 10}d</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs font-semibold text-slate-800 pt-1 border-t border-slate-100">
                            <span>Total</span>
                            <span>{r.totalDays}d</span>
                          </div>
                        </div>
                        {r.shortMaterials?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Materials short</p>
                            {r.shortMaterials.map((m, i) => (
                              <p key={i} className="text-xs text-slate-500">
                                {m.name} ({m.code}) — need {m.needed}, have {m.available}, ~{m.avgPurchaseDays}d to procure
                              </p>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
