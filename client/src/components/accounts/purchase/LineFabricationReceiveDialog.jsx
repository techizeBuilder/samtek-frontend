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
import VendorInvoiceFields, { emptyVendorInvoice, appendVendorInvoice, vendorInvoiceError } from './VendorInvoiceFields';

// Union of every bundled PR's own fabricationDimensionLines, summing
// quantities where two PRs request the identical dimensions (same
// dimensionSignature) and listing them separately otherwise — the combined
// pre-fill for one physical shipment covering several PRs on the same PO
// line (2026-10 line-level receive redesign).
function mergeUnionLines(prs) {
  const map = new Map();
  for (const pr of prs) {
    for (const l of pr.fabricationDimensionLines || []) {
      const sig = dimensionSignature(l.values);
      if (map.has(sig)) {
        map.get(sig).quantity += l.quantity;
      } else {
        map.set(sig, { values: l.values, quantity: l.quantity });
      }
    }
  }
  return [...map.values()];
}

// Fabrication sibling of LineReceiveDialog — one receive per PO line, not
// per PurchaseRequest. Pre-fills the combined dimension-line form with the
// union of every bundled PR's own ordered breakdown; Store can still add
// anything unanticipated via "+ Received a different size", exactly as the
// original single-PR FabricationReceiveDialog already allowed. No Serial
// Number/Warranty fields at all — those don't apply to raw fabrication
// stock, same as the per-PR version.
export default function LineFabricationReceiveDialog({ purchaseId, line, prs, onClose, onReceived }) {
  const { toast } = useToast();
  const [lines, setLines] = useState([]); // [{ values, quantity }]
  const [addingVariantId, setAddingVariantId] = useState('');
  const [showNewDimForm, setShowNewDimForm] = useState(false);
  const [newDimDraft, setNewDimDraft] = useState({ bomDimensions: {} });
  const [vendorInvoice, setVendorInvoice] = useState(emptyVendorInvoice);

  const samplePr = prs?.[0];
  const sourceItemCode = samplePr?.materialCode || samplePr?.itemId;
  const { data: itemRes } = useQuery({
    queryKey: ['item-by-code-for-line-fab-receive', sourceItemCode],
    queryFn: () => apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(sourceItemCode)}`),
    enabled: !!samplePr,
  });
  const { data: categoriesRes, isError: categoriesErrored } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const fabricationCategories = categoriesRes?.data || [];

  const item = itemRes?.data;
  const itemDimensionVariants = item?.dimensionVariants || [];
  const catalogVariants = itemDimensionVariants.filter(v => !v.isLeftover);
  const itemCategory = itemDimensionVariants?.[0]?.category || '';
  const itemDensity = { value: itemDimensionVariants?.[0]?.densityValue ?? null, unit: itemDimensionVariants?.[0]?.densityUnit || 'kg/m3' };

  useEffect(() => {
    // Since 2026-10-09 a fabrication PO line records the size × pieces actually
    // ORDERED (which can be more than the requests asked for) — pre-fill from
    // that; older lines fall back to the requests' own breakdown.
    if (line?.fabricationDimensionLines?.length) {
      setLines(line.fabricationDimensionLines.map(l => ({ values: l.values, quantity: String(l.quantity) })));
    } else if (prs?.length) {
      setLines(mergeUnionLines(prs).map(l => ({ values: l.values, quantity: String(l.quantity) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?._id]);

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
    queryKey: ['preview-fabrication-total-line-receive', sourceItemCode, JSON.stringify(linesPayload)],
    queryFn: () => apiRequest('POST', '/api/purchase-requests/preview-fabrication-total', {
      materialCode: sourceItemCode,
      lines: linesPayload,
      allowNonCatalogDimensions: true,
    }),
    enabled: allQtyValid,
  });
  const preview = previewRes?.data;

  const receiveMutation = useMutation({
    // With the vendor's invoice (2026-10-12) it goes as multipart, lines as JSON text.
    mutationFn: () => {
      const invErr = vendorInvoiceError(vendorInvoice);
      if (invErr) return Promise.reject(new Error(invErr));
      const url = `/api/purchase-requests/orders/${purchaseId}/lines/${line._id}/receive-fabrication`;
      if (!vendorInvoice.number.trim()) return apiRequest('PATCH', url, { lines: linesPayload });
      const fd = new FormData();
      fd.append('lines', JSON.stringify(linesPayload));
      appendVendorInvoice(fd, vendorInvoice);
      return apiRequest('PATCH', url, fd);
    },
    onSuccess: () => {
      toast({ title: 'Line Received', description: `Recorded for ${prs.length} request${prs.length > 1 ? 's' : ''} — QC jobs created; stock updates once QC passes.` });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-requests/orders'] });
      onReceived?.();
      onClose();
    },
    onError: (error) => toast({ title: 'Receive Failed', description: error.message || 'Something went wrong.', variant: 'destructive' }),
  });

  if (!line || !prs?.length) return null;
  const canSubmit = allQtyValid && !receiveMutation.isPending;

  return (
    <Dialog open={!!line} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-emerald-600" /> Receive Fabrication Purchase</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-slate-800">{line.itemName}</span> — covers {prs.length} request{prs.length > 1 ? 's' : ''} on this line. Enter how many pieces of each size actually arrived in this one shipment. Stock updates once QC passes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1">
          {prs.length > 1 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-xs text-indigo-800">
              Marks all {prs.length} requests on this line Received at once: {prs.map(p => p.requestId).join(', ')}.
            </div>
          )}
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
          <VendorInvoiceFields value={vendorInvoice} onChange={setVendorInvoice} />
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
