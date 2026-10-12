import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PackageCheck, Upload, AlertCircle, Check, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// One receive per PO line (2026-10), not per PurchaseRequest — a vendor
// shipment arrives as one physical chunk, so Serial Number/Warranty are
// collected ONCE here for the whole line and the Received Quantity is one
// combined number, not typed separately per bundled request. Submitting
// loops every PR on this line server-side (see receiveLineItems) and marks
// each Received with its own proportionally attributed share — this dialog
// only ever sends the shared/combined values.
export default function LineReceiveDialog({ purchaseId, line, prs, onClose, onReceived }) {
  const { toast } = useToast();
  const samplePr = prs?.[0];
  const quotedWarranty = Number(samplePr?.warrantyMonths) || 0;
  const totalOrdered = useMemo(
    () => (prs || []).reduce((sum, pr) => sum + (Number(pr.purchaseQuantity) || Number(pr.quantity) || 0), 0),
    [prs]
  );
  // Compares this line's own item (Purchase.items[].item, populated by
  // getPurchases) against the line's purchaseUnit — same comparison the
  // backend makes authoritatively; this is only for deciding whether to
  // show the conversion fields at all, not relied on for correctness.
  const baseUnit = (line?.item?.unit || '').trim().toLowerCase();
  const sameUnitAsStock = !!(samplePr?.purchaseUnit && baseUnit && samplePr.purchaseUnit.trim().toLowerCase() === baseUnit);
  const needsConversion = !!(samplePr?.purchaseUnit && totalOrdered > 0 && !sameUnitAsStock);

  const [serialNumber, setSerialNumber] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState(quotedWarranty > 0 ? String(quotedWarranty) : '');
  const [warrantyCard, setWarrantyCard] = useState(null);
  const [qtyReceived, setQtyReceived] = useState(totalOrdered > 0 ? String(totalOrdered) : '');
  const [factor, setFactor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      toast({ title: 'Required', description: 'Please enter the Serial Number.', variant: 'destructive' });
      return;
    }
    if (quotedWarranty > 0) {
      if (warrantyMonths === '' || Number(warrantyMonths) < 0) {
        toast({ title: 'Required', description: 'Please enter the Warranty Period in months (0 if no warranty).', variant: 'destructive' });
        return;
      }
      if (Number(warrantyMonths) > 0 && !warrantyCard) {
        toast({ title: 'Required', description: 'Please upload the Warranty Card (image or PDF).', variant: 'destructive' });
        return;
      }
    }
    if (needsConversion) {
      if (!(Number(qtyReceived) > 0)) {
        toast({ title: 'Required', description: `Please enter the received quantity in ${samplePr.purchaseUnit}.`, variant: 'destructive' });
        return;
      }
      if (!(Number(factor) > 0)) {
        toast({ title: 'Required', description: `Please enter how many ${samplePr.purchaseUnit} equal 1 storage unit.`, variant: 'destructive' });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('serialNumber', serialNumber.trim());
      formData.append('warrantyPeriod', quotedWarranty > 0 ? warrantyMonths : '0');
      if (warrantyCard) formData.append('warrantyCard', warrantyCard);
      if (needsConversion) {
        formData.append('receivedQuantity', qtyReceived);
        formData.append('conversionFactor', factor);
      }

      await apiRequest('PATCH', `/api/purchase-requests/orders/${purchaseId}/lines/${line._id}/receive`, formData);

      toast({ title: 'Line Received', description: `Recorded for ${prs.length} request${prs.length > 1 ? 's' : ''} — serial number, warranty and card saved.` });
      onReceived?.();
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to mark line as received', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!line || !prs?.length) return null;

  return (
    <Dialog open={!!line} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] rounded-xl border shadow-lg p-0 overflow-hidden max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <PackageCheck className="w-5 h-5 text-emerald-600" />
              Receive Line
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              One physical shipment, entered once. These details apply to every request bundled on this line.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 bg-white flex-1 overflow-y-auto">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Serial Number is mandatory. Warranty is only asked for when the vendor actually quoted one — Warranty Card is required only then, and only when the warranty is more than 0 months.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Item</p>
              <p className="font-semibold text-slate-800 text-sm">{line.itemName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Ordered: {totalOrdered} {samplePr?.purchaseUnit || ''}
              </p>
            </div>

            {prs.length > 1 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-xs font-bold text-indigo-800 mb-1.5">
                  Marks all {prs.length} requests on this line Received at once
                </p>
                <div className="space-y-1">
                  {prs.map((pr, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-indigo-700">
                      <span className="truncate">{pr.productName || line.itemName} ({pr.requestId})</span>
                      <span className="shrink-0 ml-2">{Number(pr.purchaseQuantity) || Number(pr.quantity) || 0} {pr.purchaseUnit || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {needsConversion && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-bold text-violet-800 uppercase">Unit Conversion</p>
                <p className="text-xs text-violet-700">
                  Purchased in <strong>{samplePr.purchaseUnit}</strong>, but this item is stored in <strong>{baseUnit || 'its own stock unit'}</strong>. Convert the received quantity — the converted quantity goes to QC and, after approval, into inventory.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="line-recv-qty" className="text-xs font-semibold text-slate-700 uppercase">
                      Received Qty ({samplePr.purchaseUnit}) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="line-recv-qty"
                      type="number"
                      min="0"
                      step="any"
                      placeholder={`e.g. ${totalOrdered}`}
                      value={qtyReceived}
                      onChange={(e) => setQtyReceived(e.target.value)}
                      className="border-slate-300 font-medium bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="line-recv-factor" className="text-xs font-semibold text-slate-700 uppercase">
                      1 base unit = ? {samplePr.purchaseUnit} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="line-recv-factor"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 1"
                      value={factor}
                      onChange={(e) => setFactor(e.target.value)}
                      className="border-slate-300 font-medium bg-white"
                    />
                  </div>
                </div>
                {Number(qtyReceived) > 0 && Number(factor) > 0 && (
                  <div className="flex items-center gap-2 bg-white border border-violet-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
                    <p className="text-sm font-bold text-violet-800">
                      {qtyReceived} {samplePr.purchaseUnit} = {Math.round((Number(qtyReceived) / Number(factor)) * 1000) / 1000} {baseUnit} → will be sent to QC
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="line-recv-serial" className="text-xs font-semibold text-slate-700 uppercase">
                Serial Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="line-recv-serial"
                placeholder="e.g. SN-2024-XXXXXX"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="border-slate-300 font-medium"
              />
            </div>

            {quotedWarranty > 0 ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="line-recv-warranty" className="text-xs font-semibold text-slate-700 uppercase">
                    Warranty Period (Months) <span className="text-rose-500">*</span>
                    <span className="ml-1 font-normal text-slate-400 normal-case">(quoted: {quotedWarranty} months)</span>
                  </Label>
                  <Input
                    id="line-recv-warranty"
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className="border-slate-300 font-medium"
                  />
                </div>

                {warrantyMonths !== '' && Number(warrantyMonths) === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    No warranty (0 months) — Warranty Card is not required.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase">
                      Warranty Card <span className="text-rose-500">*</span>
                      <span className="ml-1 font-normal text-slate-400 normal-case">(JPG, PNG or PDF, max 10 MB)</span>
                    </Label>
                    <div
                      className={`flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                        warrantyCard ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'
                      }`}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className={`w-5 h-5 shrink-0 ${warrantyCard ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {warrantyCard ? warrantyCard.name : 'Click to upload warranty card'}
                      </span>
                      {warrantyCard && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-auto" />}
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => setWarrantyCard(e.target.files?.[0] || null)}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                No warranty was quoted for this item — nothing to enter here.
              </p>
            )}
          </div>

          <div className="px-6 pt-4 pb-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="font-semibold rounded-md">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-sm">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><PackageCheck className="w-4 h-4 mr-2" /> Confirm Receipt</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
