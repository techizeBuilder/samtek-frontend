import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PackageCheck, Upload, AlertCircle, Check, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import VendorInvoiceFields, { emptyVendorInvoice, appendVendorInvoice, vendorInvoiceError } from './VendorInvoiceFields';
import SerialNumbersInput, { isCountableUnit, parseSerials, keyOf } from './SerialNumbersInput';

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
  const [vendorInvoice, setVendorInvoice] = useState(emptyVendorInvoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef(null);

  // Serial numbers (2026-10-13): one per piece when the vendor gave a
  // warranty and the item is counted in pieces; otherwise one serial / lot
  // number for the receipt. Warranty cards then: one for all the pieces, or
  // one for each (never some).
  const stockUnit = line?.item?.receiveUnit || line?.item?.unit || samplePr?.unit || '';
  const serialised = quotedWarranty > 0 && Number(warrantyMonths) > 0 && isCountableUnit(stockUnit);
  const [serialText, setSerialText] = useState('');
  const [cardMode, setCardMode] = useState('one'); // 'one' | 'each'
  const [unitCards, setUnitCards] = useState({});   // serial key → File
  const expectedPieces = useMemo(() => {
    let n;
    if (samplePr?.purchaseUnit && totalOrdered > 0) n = needsConversion ? Number(qtyReceived) / Number(factor) : totalOrdered;
    else n = (prs || []).reduce((s, pr) => s + (Number(pr.quantity) || 0), 0);
    return Number.isFinite(n) && n > 0 && Math.abs(n - Math.round(n)) < 1e-6 ? Math.round(n) : null;
  }, [samplePr, totalOrdered, needsConversion, qtyReceived, factor, prs]);
  const parsed = parseSerials(serialText);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quotedWarranty > 0 && (warrantyMonths === '' || Number(warrantyMonths) < 0)) {
      toast({ title: 'Required', description: 'Please enter the Warranty Period in months (0 if no warranty).', variant: 'destructive' });
      return;
    }
    if (serialised) {
      if (expectedPieces == null) {
        toast({ title: 'Check the quantity', description: `The received quantity isn't a whole number of ${stockUnit} — each piece gets its own serial number.`, variant: 'destructive' });
        return;
      }
      if (parsed.duplicates.length) {
        toast({ title: 'Repeated serial numbers', description: parsed.duplicates.slice(0, 5).join(', '), variant: 'destructive' });
        return;
      }
      if (parsed.spaced.length) {
        toast({ title: 'No spaces in a serial number', description: `Type it exactly as on the piece: ${parsed.spaced.slice(0, 5).map(s => `"${s}"`).join(', ')}`, variant: 'destructive' });
        return;
      }
      if (parsed.serials.length !== expectedPieces) {
        toast({ title: 'Serial numbers', description: `${expectedPieces} pieces arrived — enter ${expectedPieces} serial numbers (${parsed.serials.length} entered).`, variant: 'destructive' });
        return;
      }
      if (cardMode === 'one' && !warrantyCard) {
        toast({ title: 'Required', description: 'Please upload the Warranty Card (image or PDF).', variant: 'destructive' });
        return;
      }
      if (cardMode === 'each' && parsed.serials.some(s => !unitCards[keyOf(s)])) {
        toast({ title: 'Warranty cards', description: 'Upload a card for every serial number — or switch to one card for all.', variant: 'destructive' });
        return;
      }
    } else {
      if (!serialNumber.trim()) {
        toast({ title: 'Required', description: 'Please enter the Serial / Lot Number.', variant: 'destructive' });
        return;
      }
      if (quotedWarranty > 0 && Number(warrantyMonths) > 0 && !warrantyCard) {
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

    const invErr = vendorInvoiceError(vendorInvoice);
    if (invErr) { toast({ title: 'Vendor invoice', description: invErr, variant: 'destructive' }); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      appendVendorInvoice(formData, vendorInvoice);
      formData.append('warrantyPeriod', quotedWarranty > 0 ? warrantyMonths : '0');
      if (serialised) {
        formData.append('serialNumbers', JSON.stringify(parsed.serials));
        if (cardMode === 'each') {
          parsed.serials.forEach(s => formData.append('warrantyCard', unitCards[keyOf(s)]));
          formData.append('cardSerials', JSON.stringify(parsed.serials));
        } else if (warrantyCard) {
          formData.append('warrantyCard', warrantyCard);
        }
      } else {
        formData.append('serialNumber', serialNumber.trim());
        if (warrantyCard) formData.append('warrantyCard', warrantyCard);
      }
      if (needsConversion) {
        formData.append('receivedQuantity', qtyReceived);
        formData.append('conversionFactor', factor);
      }

      await apiRequest('PATCH', `/api/purchase-requests/orders/${purchaseId}/lines/${line._id}/receive`, formData);

      toast({ title: 'Line Received', description: serialised ? `${parsed.serials.length} serial numbers saved — they're under Serial Numbers.` : `Recorded for ${prs.length} request${prs.length > 1 ? 's' : ''} — serial / lot number, warranty and card saved.` });
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
                A serial / lot number is mandatory. Warranty is only asked for when the vendor quoted one. If the item is counted in pieces and has a warranty, every piece needs its own serial number.
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

            {quotedWarranty > 0 ? (
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
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                No warranty was quoted for this item — no warranty card needed.
              </p>
            )}

            {serialised ? (
              <SerialNumbersInput value={serialText} onChange={setSerialText} expected={expectedPieces} unitLabel={stockUnit} />
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="line-recv-serial" className="text-xs font-semibold text-slate-700 uppercase">
                  Serial / Lot Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="line-recv-serial"
                  placeholder="e.g. SN-2024-XXXXXX"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="border-slate-300 font-medium"
                />
                {quotedWarranty > 0 && Number(warrantyMonths) > 0 && !isCountableUnit(stockUnit) && (
                  <p className="text-[11px] text-slate-500">Counted in {stockUnit || 'a non-piece unit'} — one lot number for the whole receipt.</p>
                )}
              </div>
            )}

            {quotedWarranty > 0 && warrantyMonths !== '' && Number(warrantyMonths) === 0 && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                No warranty (0 months) — Warranty Card is not required.
              </p>
            )}

            {quotedWarranty > 0 && Number(warrantyMonths) > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 uppercase">
                  Warranty Card <span className="text-rose-500">*</span>
                  <span className="ml-1 font-normal text-slate-400 normal-case">(JPG, PNG or PDF, max 10 MB)</span>
                </Label>
                {serialised && (
                  <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                    {[['one', 'One card for all'], ['each', 'A card for each piece']].map(([v, label]) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setCardMode(v)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${cardMode === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {!serialised || cardMode === 'one' ? (
                  <>
                    <div
                      className={`flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${
                        warrantyCard ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'
                      }`}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className={`w-5 h-5 shrink-0 ${warrantyCard ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {warrantyCard ? warrantyCard.name : serialised ? 'Click to upload one card for all the pieces' : 'Click to upload warranty card'}
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
                  </>
                ) : parsed.serials.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Enter the serial numbers first — then attach a card to each.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y">
                    {parsed.serials.map((s, i) => {
                      const file = unitCards[keyOf(s)];
                      return (
                        <label key={`${keyOf(s)}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50">
                          <span className="font-mono font-semibold text-slate-700 w-32 truncate">{s}</span>
                          <span className={`flex-1 truncate ${file ? 'text-emerald-700' : 'text-slate-400'}`}>{file ? file.name : 'Choose card…'}</span>
                          {file ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; setUnitCards(c => ({ ...c, [keyOf(s)]: f || undefined })); }}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <VendorInvoiceFields value={vendorInvoice} onChange={setVendorInvoice} />
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
