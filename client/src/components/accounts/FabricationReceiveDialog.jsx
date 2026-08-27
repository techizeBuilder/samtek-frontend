import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, PackageCheck, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dimensionSignature, formatDims } from '@/lib/fabricationDims';
import FabricationDimensionFields from '@/components/inventory/FabricationDimensionFields';

// Store's receive flow for a fabrication purchase — pre-fills the ordered
// breakdown (PurchaseRequest.fabricationDimensionLines) with editable
// quantities, and lets Store record a size the vendor actually shipped even
// when it isn't one of the item's existing catalog sizes (still
// weight-computable — see server's receiveFabricationPurchase, which
// resolves it with requireCatalogMatch:false; a genuinely new dimension
// becomes stock flagged isLeftover once QC passes, never offered back as a
// reorderable catalog size). No Serial Number/Warranty/conversion-factor
// fields at all — those don't apply to raw fabrication stock.
export default function FabricationReceiveDialog({ pr, onClose, onReceived }) {
  const { toast } = useToast();
  const [lines, setLines] = useState([]); // [{ values, quantity }]
  const [addingVariantId, setAddingVariantId] = useState('');
  const [showNewDimForm, setShowNewDimForm] = useState(false);
  const [newDimDraft, setNewDimDraft] = useState({ bomDimensions: {} });

  const sourceItemCode = pr?.materialCode || pr?.itemId;
  const { data: itemRes } = useQuery({
    queryKey: ['item-by-code-for-fab-receive', sourceItemCode],
    queryFn: () => apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(sourceItemCode)}`),
    enabled: !!pr,
  });
  const { data: categoriesRes, isError: categoriesErrored } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const fabricationCategories = categoriesRes?.data || [];

  const item = itemRes?.data;
  // Fall back to the item snapshot already attached to `pr` (getPurchaseRequests'
  // enrichment) if the live /api/items/by-code fetch hasn't resolved yet —
  // same fallback FabricationRFQDialog.jsx already relies on.
  const itemDimensionVariants = item?.dimensionVariants?.length > 0 ? item.dimensionVariants : (pr?.item?.dimensionVariants || []);
  const catalogVariants = itemDimensionVariants.filter(v => !v.isLeftover);
  const itemCategory = itemDimensionVariants?.[0]?.category || '';
  const itemDensity = { value: itemDimensionVariants?.[0]?.densityValue ?? null, unit: itemDimensionVariants?.[0]?.densityUnit || 'kg/m3' };

  useEffect(() => {
    if (pr?.fabricationDimensionLines?.length) {
      setLines(pr.fabricationDimensionLines.map(l => ({ values: l.values, quantity: String(l.quantity) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr?._id]);

  const availableToAdd = catalogVariants.filter(v => !lines.some(l => dimensionSignature(l.values) === dimensionSignature(v.values)));

  const addCatalogLine = () => {
    const variant = catalogVariants.find(v => v._id === addingVariantId);
    if (!variant) return;
    setLines(prev => [...prev, { values: variant.values, quantity: '1' }]);
    setAddingVariantId('');
  };
  const activeNewDimCategory = fabricationCategories.find(c => c.key === itemCategory) || null;
  const newDimComplete = !!activeNewDimCategory?.fields?.every(f => {
    const v = newDimDraft.bomDimensions?.[f.key];
    return v !== undefined && v !== '' && !isNaN(Number(v));
  });

  const addNewDimLine = () => {
    if (!newDimComplete) return;
    setLines(prev => [...prev, { values: newDimDraft.bomDimensions, quantity: '1' }]);
    setNewDimDraft({ bomDimensions: {} });
    setShowNewDimForm(false);
  };
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLineQty = (idx, qty) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: qty } : l));

  const linesPayload = lines.map(l => ({ values: l.values, quantity: Number(l.quantity) }));
  const allQtyValid = linesPayload.length > 0 && linesPayload.every(l => l.quantity > 0);

  const { data: previewRes, isFetching: isPreviewing } = useQuery({
    queryKey: ['preview-fabrication-total-receive', sourceItemCode, JSON.stringify(linesPayload)],
    queryFn: () => apiRequest('POST', '/api/purchase-requests/preview-fabrication-total', {
      materialCode: sourceItemCode,
      lines: linesPayload,
      allowNonCatalogDimensions: true,
    }),
    enabled: allQtyValid,
  });
  const preview = previewRes?.data;

  const receiveMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/purchase-requests/${pr._id}/receive-fabrication`, {
      lines: linesPayload,
    }),
    onSuccess: () => {
      toast({ title: 'Purchase Received', description: 'Recorded — a QC job has been created; stock updates once QC passes it.' });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests'] });
      // PurchaseRequest.jsx keeps its own list in plain useState (not
      // react-query) — the invalidation above is a no-op there, so the row's
      // stale "Ordered" status/button would otherwise stick around and let
      // Store reopen this same dialog and hit the now-stale "Ordered" gate
      // a second time. onReceived is PurchaseRequest.jsx's own
      // fetchPurchaseRequests, passed in so the list actually refreshes.
      onReceived?.();
      onClose();
    },
    onError: (error) => toast({ title: 'Receive Failed', description: error.message || 'Something went wrong.', variant: 'destructive' }),
  });

  if (!pr) return null;
  const canSubmit = allQtyValid && !receiveMutation.isPending;

  return (
    <Dialog open={!!pr} onOpenChange={(open) => !open && onClose()}>
      {/* Capped + flex-column so this never grows past the viewport as more
          lines/a new-dimension form are added — only the middle section (the
          part that actually grows with the data) scrolls; header/footer stay put. */}
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-emerald-600" /> Receive Fabrication Purchase</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-slate-800">{pr.productName}</span> — enter how many pieces of each size actually arrived. Stock updates once QC passes this receipt.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1">
          <div className="space-y-1.5">
            {lines.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-md border border-slate-200 text-xs">
                <span className="font-mono flex-1 min-w-0 break-words">{formatDims(l.values)}</span>
                <Input type="number" min="1" className="w-20 h-7 text-xs shrink-0" value={l.quantity} onChange={(e) => updateLineQty(idx, e.target.value)} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 shrink-0" onClick={() => removeLine(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {lines.length === 0 && <p className="text-xs text-slate-400 italic">No lines yet — add what was received below.</p>}
          </div>

          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                className="flex-1 min-w-0 border border-slate-200 rounded-md text-xs h-8 px-2 bg-white"
                value={addingVariantId}
                onChange={(e) => setAddingVariantId(e.target.value)}
              >
                <option value="">+ Add a catalog size…</option>
                {availableToAdd.map(v => <option key={v._id} value={v._id}>{formatDims(v.values)}</option>)}
              </select>
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 whitespace-nowrap" disabled={!addingVariantId} onClick={addCatalogLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          )}

          {!showNewDimForm ? (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs border-dashed" onClick={() => setShowNewDimForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Received a different size (not in catalog)
            </Button>
          ) : (
            <div className="space-y-2">
              {fabricationCategories.length > 0 && itemCategory ? (
                <FabricationDimensionFields
                  row={{
                    fabricationCategory: itemCategory,
                    fabricationDensity: itemDensity,
                    weightUnitPrice: item?.weightUnitPrice || 0,
                    bomDimensions: newDimDraft.bomDimensions,
                    unitPrice: 0,
                  }}
                  categories={fabricationCategories}
                  onUpdate={(patch) => setNewDimDraft(prev => ({ ...prev, ...patch }))}
                />
              ) : categoriesErrored ? (
                <p className="text-xs text-red-500">Could not load dimension fields — try closing and reopening this dialog.</p>
              ) : (
                <p className="text-xs text-slate-400 italic">Loading dimension fields…</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white"
                  onClick={addNewDimLine}
                  disabled={!newDimComplete}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add This Size
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowNewDimForm(false); setNewDimDraft({ bomDimensions: {} }); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {allQtyValid && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              {isPreviewing ? (
                <p className="text-slate-400 italic">Calculating…</p>
              ) : preview ? (
                <>
                  {preview.lines.map((l, i) => (
                    <div key={i} className="flex justify-between gap-2 text-slate-600">
                      <span className="font-mono min-w-0 break-words">{formatDims(l.values)} × {l.quantity}</span>
                      <span className="shrink-0">{l.lineWeightKg != null ? `${l.lineWeightKg} kg` : '—'}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1">
                    <span>Total Received Weight</span>
                    <span>{preview.totalWeightKg} kg</span>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
        <DialogFooter className="shrink-0 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => receiveMutation.mutate()}
            disabled={!canSubmit}
          >
            {receiveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />}
            Confirm Received
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
