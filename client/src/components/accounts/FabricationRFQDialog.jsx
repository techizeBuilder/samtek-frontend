import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Send, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dimensionSignature, formatDims } from '@/lib/fabricationDims';

// The "same editable form" Purchase uses to both finalize which catalog
// dimensions/quantities make up a fabrication Purchase Request AND send it
// as an RFQ. Persists the lines/total via PATCH
// /api/purchase-requests/:id/fabrication-lines (server/controllers/
// purchaseRequestController.js's editFabricationLines — same
// resolveFabricationLines math the Store dialog's preview and
// createPurchaseRequest already use), then hands control back to
// RFQManagement.jsx's existing sendRFQ() to actually create the RFQ —
// vendor matching/selection is untouched, only the quantity/dimensions step
// changes for fabrication requests.
export default function FabricationRFQDialog({ pr, onClose, onFinalized }) {
  const { toast } = useToast();
  // lines: [{ values, quantity }]
  const [lines, setLines] = useState([]);
  const [manualQty, setManualQty] = useState('');
  const [addingVariantId, setAddingVariantId] = useState('');

  // itemId is preferred: an order-form-raised fabrication request stores a
  // "{code}#{dimensionVariantId}" composite in materialCode instead of a real
  // catalog code (see materialAvailabilityService.js's
  // raiseFabricationPurchaseRequest — needed for its per-dimension dedup
  // index), which neither /api/items/by-code nor the preview endpoint can
  // resolve. itemId already carries the real code for those requests; for a
  // Material-Flow (cron) request itemId is simply unset, so this still falls
  // back to materialCode (which IS a plain code there) exactly as before.
  const sourceItemCode = pr?.itemId || pr?.materialCode;
  const { data: itemRes } = useQuery({
    queryKey: ['item-by-code-for-rfq-edit', sourceItemCode],
    queryFn: () => apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(sourceItemCode)}`),
    enabled: !!pr,
  });
  const catalogVariants = (itemRes?.data?.dimensionVariants || pr?.item?.dimensionVariants || []).filter(v => !v.isLeftover);
  const purchaseUnitType = itemRes?.data?.purchaseUnitType || pr?.item?.purchaseUnitType;
  const purchaseUnit = itemRes?.data?.purchaseUnit || pr?.item?.purchaseUnit;
  const isMassUnit = purchaseUnitType === 'Mass Unit';

  // Seed lines from the PR's currently-saved fabricationDimensionLines
  useEffect(() => {
    if (pr?.fabricationDimensionLines?.length) {
      setLines(pr.fabricationDimensionLines.map(l => ({ values: l.values, quantity: String(l.quantity) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pr?._id]);

  const availableToAdd = catalogVariants.filter(v => !lines.some(l => dimensionSignature(l.values) === dimensionSignature(v.values)));

  const addLine = () => {
    const variant = catalogVariants.find(v => v._id === addingVariantId);
    if (!variant) return;
    setLines(prev => [...prev, { values: variant.values, quantity: '1' }]);
    setAddingVariantId('');
  };
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLineQty = (idx, qty) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: qty } : l));

  const linesPayload = lines.map(l => ({ values: l.values, quantity: Number(l.quantity) }));
  const allQtyValid = linesPayload.length > 0 && linesPayload.every(l => l.quantity > 0);

  const { data: previewRes, isFetching: isPreviewing } = useQuery({
    queryKey: ['preview-fabrication-total-edit', sourceItemCode, JSON.stringify(linesPayload)],
    queryFn: () => apiRequest('POST', '/api/purchase-requests/preview-fabrication-total', {
      materialCode: sourceItemCode,
      productName: pr?.productName,
      lines: linesPayload,
    }),
    enabled: allQtyValid,
  });
  const preview = previewRes?.data;

  const finalQuantity = manualQty ? Number(manualQty) : (isMassUnit ? preview?.resolvedQuantity : null);
  const finalUnit = (isMassUnit ? preview?.resolvedUnit : null) || purchaseUnit;

  const saveMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/api/purchase-requests/${pr._id}/fabrication-lines`, {
      lines: linesPayload,
      quantity: finalQuantity,
      unit: finalUnit,
    }),
    onSuccess: () => {
      onFinalized(finalQuantity);
    },
    onError: (error) => toast({ title: 'Could Not Finalize Request', description: error.message || 'Something went wrong.', variant: 'destructive' }),
  });

  if (!pr) return null;
  const canSend = allQtyValid && finalQuantity > 0 && !saveMutation.isPending;

  return (
    <Dialog open={!!pr} onOpenChange={(open) => !open && onClose()}>
      {/* Capped + flex-column so this never grows past the viewport as more
          dimension lines are added — only the middle section (the part that
          actually grows with the data) scrolls; header/footer stay put. */}
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-blue-600" /> Finalize & Send RFQ</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-slate-800">{pr.productName}</span> — review the dimension breakdown, adjust as needed, then send. The vendor only ever sees the combined total below, not these individual lines.
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
            {lines.length === 0 && <p className="text-xs text-slate-400 italic">No dimension lines yet — add one below.</p>}
          </div>

          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                className="flex-1 min-w-0 border border-slate-200 rounded-md text-xs h-8 px-2 bg-white"
                value={addingVariantId}
                onChange={(e) => setAddingVariantId(e.target.value)}
              >
                <option value="">+ Add another catalog size…</option>
                {availableToAdd.map(v => <option key={v._id} value={v._id}>{formatDims(v.values)}</option>)}
              </select>
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0 whitespace-nowrap" disabled={!addingVariantId} onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
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
                    <span>Predicted Total</span>
                    <span>{preview.totalWeightKg} kg{preview.isMassUnit ? ` → ${preview.resolvedQuantity} ${preview.resolvedUnit}` : ''}</span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Order Quantity {purchaseUnit ? `(${purchaseUnit})` : ''}
              {isMassUnit && <span className="text-[10px] text-slate-400 font-normal ml-1">— pre-filled from the breakdown above, override if needed</span>}
            </label>
            <Input
              type="number" min="0.001" step="0.001"
              placeholder={isMassUnit ? (preview?.resolvedQuantity != null ? String(preview.resolvedQuantity) : '') : `Enter amount in ${purchaseUnit || 'the purchase unit'}`}
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
              // Scoped override — the shared Input's default focus ring uses
              // the app's global --ring var (near-black), which reads as a
              // harsh box on a full-width field next to this dialog's much
              // lighter, compact styling. Kept local to this one input.
              className="focus-visible:ring-blue-400 focus-visible:ring-offset-1"
            />
            {!isMassUnit && (
              <p className="text-[10px] text-amber-600 mt-1">This item's Purchase Unit isn't weight-based — enter the final order amount yourself.</p>
            )}
          </div>
        </div>
        <DialogFooter className="shrink-0 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={!canSend}
          >
            {saveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Save & Send RFQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
