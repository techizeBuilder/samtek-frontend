import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, X } from 'lucide-react';

// The vendor's own tax invoice that came with the delivery (2026-10-12,
// client Q4) — optional, on Store's receive step. Their invoice number + date
// (+ a scan) let the accountant match the vendor's GST filing to our PO. No
// amounts: what we owe comes from the PO.
export const emptyVendorInvoice = () => ({ number: '', date: '', file: null });

// Adds the fields to a FormData (only what was filled in).
export function appendVendorInvoice(formData, inv) {
  if (inv.number.trim()) formData.append('vendorInvoiceNo', inv.number.trim());
  if (inv.date) formData.append('vendorInvoiceDate', inv.date);
  if (inv.file) formData.append('vendorInvoiceFile', inv.file);
}
export const vendorInvoiceError = (inv) => ((inv.date || inv.file) && !inv.number.trim() ? 'Enter the vendor\'s invoice number, or clear the invoice date / scan.' : null);

export default function VendorInvoiceFields({ value, onChange }) {
  const fileRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2.5">
      <p className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" /> Vendor's invoice <span className="font-normal normal-case text-slate-400">(optional — the bill that came with the goods)</span>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-600">Invoice number</Label>
          <Input className="h-9 text-sm" value={value.number} onChange={e => set({ number: e.target.value })} placeholder="e.g. SS/26-27/0457" maxLength={60} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-600">Invoice date</Label>
          <Input className="h-9 text-sm" type="date" max={today} value={value.date} onChange={e => set({ date: e.target.value })} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()}
          className={`flex-1 flex items-center gap-2 border border-dashed rounded-md px-3 py-2 text-xs text-left ${value.file ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-500 hover:border-blue-400'}`}>
          <Upload className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{value.file ? value.file.name : 'Attach a scan / photo (JPG, PNG or PDF, max 10 MB)'}</span>
        </button>
        {value.file && (
          <button type="button" onClick={() => set({ file: null })} className="text-slate-400 hover:text-red-600" title="Remove"><X className="w-4 h-4" /></button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
          onChange={e => { set({ file: e.target.files?.[0] || null }); e.target.value = ''; }} />
      </div>
    </div>
  );
}
