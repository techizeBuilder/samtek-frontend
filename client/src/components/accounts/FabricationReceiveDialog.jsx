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
export default function FabricationReceiveDialog({ pr, onClose }) {
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
  const { data: categoriesRes } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const fabricationCategories = categoriesRes?.data || [];

  const item = itemRes?.data;
  const catalogVariants = (item?.dimensionVariants || []).filter(v => !v.isLeftover);
  const itemCategory = item?.dimensionVariants?.[0]?.category || '';
  const itemDensity = { value: item?.dimensionVariants?.[0]?.densityValue ?? null, unit: item?.dimensionVariants?.[0]?.densityUnit || 'kg/m3' };

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
  const addNewDimLine = () => {
    if (!newDimDraft.bomDimensions || Object.keys(newDimDraft.bomDimensions).length === 0) return;
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
      onClose();
    },
    onError: (error) => toast({ title: 'Receive Failed', description: error.message || 'Something went wrong.', variant: 'destructive' }),
  });

  if (!pr) return null;
  const canSubmit = allQtyValid && !receiveMutation.isPending;

  return (
    <Dialog open={!!pr} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-emerald-600" /> Receive Fabrication Purchase</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-slate-800">{pr.productName}</span> — enter how many pieces of each size actually arrived. Stock updates once QC passes this receipt.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="space-y-1.5">
            {lines.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-md border border-slate-200 text-xs">
                <span className="font-mono flex-1">{formatDims(l.values)}</span>
                <Input type="number" min="1" className="w-20 h-7 text-xs" value={l.quantity} onChange={(e) => updateLineQty(idx, e.target.value)} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => removeLine(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {lines.length === 0 && <p className="text-xs text-slate-400 italic">No lines yet — add what was received below.</p>}
          </div>

          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                className="flex-1 border border-slate-200 rounded-md text-xs h-8 px-2 bg-white"
                value={addingVariantId}
                onChange={(e) => setAddingVariantId(e.target.value)}
              >
                <option value="">+ Add a catalog size…</option>
                {availableToAdd.map(v => <option key={v._id} value={v._id}>{formatDims(v.values)}</option>)}
              </select>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!addingVariantId} onClick={addCatalogLine}>
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
              {fabricationCategories.length > 0 && itemCategory && (
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
              )}
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white" onClick={addNewDimLine}>
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
                    <div key={i} className="flex justify-between text-slate-600">
                      <span className="font-mono">{formatDims(l.values)} × {l.quantity}</span>
                      <span>{l.lineWeightKg != null ? `${l.lineWeightKg} kg` : '—'}</span>
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
        <DialogFooter>
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
