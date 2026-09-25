import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, ChevronLeft } from 'lucide-react';

// A fabrication item's variant label — mirrors SimpleInventoryForm.jsx's Size
// / Dimension list and inventoryController.js's auditStock exactly, so the
// same size reads the same way everywhere.
const variantLabel = (dv) => dv.designation || Object.entries(dv.values || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Unnamed size';

// Store Head's stock-audit action — count physical stock, compare against
// the system quantity, and (with a required reason) apply the correction.
// Shared across Inventory / Product Master / Motor Master — each caller
// adapts its own item shape into
// `item = { id, code, name, qty, unit, dimensionVariants? }`
// (a Product Master machine's unit lives at `outputUnit`, not `unit` — see
// rdController.js's toMachineResponse). `dimensionVariants` is only present
// for a fabrication Inventory item — its real stock lives per-size there
// (subStock), not in the item's own qty, so this modal asks which size is
// being audited first instead of showing a single System Qty.
export default function StockAuditModal({ item, open, onOpenChange, onSuccess }) {
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [countedQty, setCountedQty] = useState('');
  const [reason, setReason] = useState('');

  const hasVariants = Array.isArray(item?.dimensionVariants) && item.dimensionVariants.length > 0;

  useEffect(() => {
    if (open && item) {
      setSelectedVariant(null);
      setReason('');
      // Non-fabrication items have nothing to pick, so pre-fill Counted Qty
      // from System Qty right away; fabrication items fill it in once a size
      // is picked (see the onClick below).
      setCountedQty(hasVariants ? '' : String(item.qty ?? 0));
    }
  }, [open, item]);

  const systemQty = hasVariants ? Number(selectedVariant?.subStock ?? 0) : Number(item?.qty ?? 0);
  const displayUnit = hasVariants ? (item?.unit || 'Pieces') : (item?.unit || '');
  const variance = countedQty === '' ? 0 : Number(countedQty) - systemQty;

  const pickVariant = (dv) => {
    setSelectedVariant(dv);
    setCountedQty(String(dv.subStock ?? 0));
  };

  const auditMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/items/${item.id}/stock-audit`, {
      countedQty: Number(countedQty),
      reason: reason.trim(),
      ...(hasVariants ? { variantId: selectedVariant._id } : {}),
    }),
    onSuccess: () => {
      const label = hasVariants ? `${item.name} (${variantLabel(selectedVariant)})` : item.name;
      toast({ title: 'Stock audit recorded', description: `${label} updated to ${countedQty} ${displayUnit}`.trim() });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error?.message || 'Failed to record stock audit', variant: 'destructive' });
    }
  });

  const handleSubmit = () => {
    if (hasVariants && !selectedVariant) {
      toast({ title: 'Required', description: 'Pick which size you are auditing.', variant: 'destructive' });
      return;
    }
    if (countedQty === '' || isNaN(Number(countedQty)) || Number(countedQty) < 0) {
      toast({ title: 'Required', description: 'Enter a valid counted quantity.', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Required', description: 'Please enter a reason for this adjustment.', variant: 'destructive' });
      return;
    }
    auditMutation.mutate();
  };

  const showVariantPicker = hasVariants && !selectedVariant;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            Verify Stock
          </DialogTitle>
          <DialogDescription>
            {item?.name} {item?.code ? `(${item.code})` : ''}
            {hasVariants
              ? ' — pick which size to audit, then compare its leftover stock against your physical count.'
              : ' — compare the physical count against system stock.'}
          </DialogDescription>
        </DialogHeader>

        {showVariantPicker ? (
          <div className="space-y-1.5 max-h-80 overflow-y-auto py-2">
            {item.dimensionVariants.map((dv) => (
              <button
                key={dv._id}
                type="button"
                onClick={() => pickVariant(dv)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-800 truncate">{variantLabel(dv)}</span>
                <span className="text-xs text-gray-500 shrink-0">Leftover Stock: <span className="font-semibold text-gray-800">{dv.subStock ?? 0}</span></span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {hasVariants && (
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {variantLabel(selectedVariant)} — change size
                </button>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">{hasVariants ? 'Leftover Stock (system)' : 'System Qty'}</Label>
                  <Input disabled className="bg-gray-100" value={`${systemQty} ${displayUnit}`.trim()} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Counted Qty *</Label>
                  <Input type="number" min="0" value={countedQty} onChange={(e) => setCountedQty(e.target.value)} />
                </div>
              </div>

              <div className={`rounded-lg p-3 text-sm font-medium ${
                variance === 0 ? 'bg-slate-50 text-slate-600'
                  : variance > 0 ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                Variance: {variance > 0 ? '+' : ''}{variance} {displayUnit}
                {countedQty !== '' && variance === 0 && ' — matches system stock'}
                {variance > 0 && ' — surplus found'}
                {variance < 0 && ' — shortage found'}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Reason *</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Physical count during monthly stock verification"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={auditMutation.isPending}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={auditMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {auditMutation.isPending ? 'Saving...' : 'Confirm & Adjust'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
