import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText, Plus, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';
import { LENGTH_UNITS, toMm, formatAreaInUnit } from '@/lib/fabricationDims';
import FilePreviewModal from './FilePreviewModal';

const blankSheet = () => ({ lengthValue: '', lengthUnit: 'Millimeter', widthValue: '', widthUnit: 'Millimeter' });

// Same real-world sheet-nesting decision SheetMetalPlanModal.jsx already has
// for a whole Machine BOM's {item, dimension} group — re-homed to one Sub
// Child Part directly (see server/docs/bom-hierarchy-redesign-2026-09.md
// §7). No group picker needed here — the Sub Child Part's own source
// material + dimension variant are already fixed, passed in as
// `sourceItem`. The one new field is **Order Qty** — how many Sub Child
// Part units this cutting run/laser file covers — since there's no BOM with
// multiple lines to derive a required area from the way the Machine version
// does; it's this Sub Child Part's own per-piece area × Order Qty instead.
export default function SubChildPartSheetPlanModal({ open, onClose, subChildPartId, subChildPartName, sourceItem, sourceDimensionVariantId }) {
  const qc = useQueryClient();
  const [orderQty, setOrderQty] = useState('');
  const [sheets, setSheets] = useState([blankSheet()]);
  const [laserFileUrl, setLaserFileUrl] = useState('');
  const [laserFileName, setLaserFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveResult, setSaveResult] = useState(null); // { warningBelowRequired, requiredAreaMm2, plannedAreaMm2, sheetsUsed, scrapCostPerPiece }
  const [previewFile, setPreviewFile] = useState(null);

  const { data: planResponse, isLoading } = useQuery({
    queryKey: ['sub-child-part-sheet-plan', subChildPartId],
    queryFn: () => apiRequest('GET', `/api/rd/sub-child-parts/${subChildPartId}/sheet-metal-plan`),
    enabled: open && !!subChildPartId,
  });
  const existingPlan = planResponse?.data?.plan || null;
  const existingCost = planResponse?.data?.cost || null;

  useEffect(() => {
    if (!open) return;
    setError('');
    setSaveResult(null);
    setOrderQty(existingPlan?.orderQty != null ? String(existingPlan.orderQty) : '');
    setSheets(existingPlan?.sheets?.length ? existingPlan.sheets.map(s => ({ ...s })) : [blankSheet()]);
    setLaserFileUrl(existingPlan?.laserFileUrl || '');
    setLaserFileName(existingPlan?.laserFileName || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingPlan?._id]);

  const updateSheet = (index, patch) => {
    setSheets(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
    setSaveResult(null);
  };
  const addSheet = () => setSheets(prev => [...prev, blankSheet()]);
  const removeSheet = (index) => setSheets(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError('Please select a file under 20MB'); return; }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Not actually Child-Part-specific server-side — reused by the Machine
      // BOM's own Sheet Metal Plan laser file upload too.
      const res = await apiRequest('POST', '/api/rd/child-parts/upload-file', fd);
      if (res.success && res.url) { setLaserFileUrl(res.url); setLaserFileName(file.name); }
    } catch (err) {
      setError(err?.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Same catalog-size resolution sheetAreaFromItem does server-side (find
  // the matching dimensionVariant, read its own width/length) — done here
  // client-side too so the fit-check can run live per row.
  const variant = (sourceItem?.dimensionVariants || []).find(v => String(v._id) === String(sourceDimensionVariantId));
  const catalogLengthMm = Number(variant?.values?.length) || 0;
  const catalogWidthMm = Number(variant?.values?.width) || 0;

  const sheetErrorMessage = (s) => {
    const lengthMm = toMm(s.lengthValue, s.lengthUnit);
    const widthMm = toMm(s.widthValue, s.widthUnit);
    if (lengthMm == null || widthMm == null || !catalogLengthMm || !catalogWidthMm) return null;
    const fits = (lengthMm <= catalogLengthMm && widthMm <= catalogWidthMm) || (lengthMm <= catalogWidthMm && widthMm <= catalogLengthMm);
    return fits ? null : `Doesn't fit within this item's catalog sheet size (${Math.round(catalogLengthMm)}mm × ${Math.round(catalogWidthMm)}mm).`;
  };
  const sheetIsValid = (s) => toMm(s.lengthValue, s.lengthUnit) != null && toMm(s.widthValue, s.widthUnit) != null && !sheetErrorMessage(s);
  const dimsValid = sheets.length > 0 && sheets.every(sheetIsValid);
  const canSave = Number(orderQty) > 0 && dimsValid && !!laserFileUrl;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest('POST', `/api/rd/sub-child-parts/${subChildPartId}/sheet-metal-plan`, {
        orderQty: Number(orderQty),
        sheets: sheets.map(s => ({
          lengthValue: Number(s.lengthValue), lengthUnit: s.lengthUnit,
          widthValue: Number(s.widthValue), widthUnit: s.widthUnit,
        })),
        laserFileUrl,
        laserFileName,
      });
      await qc.invalidateQueries({ queryKey: ['sub-child-part-sheet-plan', subChildPartId] });
      await qc.invalidateQueries({ queryKey: ['sub-child-part-master'] });
      await qc.invalidateQueries({ queryKey: ['sub-child-part-master-inventory'] });
      setSaveResult({
        warningBelowRequired: res.data.plan.warningBelowRequired,
        requiredAreaMm2: res.data.plan.requiredAreaMm2,
        plannedAreaMm2: res.data.plan.plannedAreaMm2,
        sheetsUsed: res.data.plan.sheetsUsed,
        scrapCostPerPiece: res.data.cost.scrapCostPerPiece,
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Sheet Metal Plan — {subChildPartName}</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
        ) : (
          <div className="space-y-4 py-2">
            {existingCost && (
              <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600">
                Current plan: {existingPlan.sheetsUsed} sheet(s) for {existingPlan.orderQty} units — avg scrap cost per piece: <strong>₹{existingCost.scrapCostPerPiece.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Order Qty <span className="text-red-500">*</span> <span className="text-[10px] text-slate-400 font-normal">(how many units this cutting run/laser file covers)</span></Label>
              <Input type="number" min="1" value={orderQty} onChange={e => { setOrderQty(e.target.value); setSaveResult(null); }} />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">
                Sheets (one entry per physical catalog sheet you're actually buying) *
              </Label>
              <div className="space-y-3">
                {sheets.map((s, i) => {
                  const rowError = sheetErrorMessage(s);
                  return (
                    <div key={i} className="border border-slate-200 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">Sheet {i + 1}</span>
                        {sheets.length > 1 && (
                          <button type="button" onClick={() => removeSheet(i)} className="text-slate-400 hover:text-red-500">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase block mb-1">Length</Label>
                          <div className="flex gap-2">
                            <Input type="number" min="0" placeholder="0" className="flex-1" value={s.lengthValue} onChange={e => updateSheet(i, { lengthValue: e.target.value })} />
                            <select className="w-28 border border-slate-200 rounded-lg px-2 text-sm" value={s.lengthUnit} onChange={e => updateSheet(i, { lengthUnit: e.target.value })}>
                              {LENGTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase block mb-1">Width</Label>
                          <div className="flex gap-2">
                            <Input type="number" min="0" placeholder="0" className="flex-1" value={s.widthValue} onChange={e => updateSheet(i, { widthValue: e.target.value })} />
                            <select className="w-28 border border-slate-200 rounded-lg px-2 text-sm" value={s.widthUnit} onChange={e => updateSheet(i, { widthUnit: e.target.value })}>
                              {LENGTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      {rowError && <p className="text-[11px] text-red-500 mt-1.5">{rowError}</p>}
                    </div>
                  );
                })}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addSheet}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Sheet
              </Button>
              <p className="text-[11px] text-slate-400 mt-2">
                Enter the actual size you'll lay out and cut on each sheet — not the raw part-area total. It's
                normal for the total to be somewhat more than what's strictly needed (kerf, margins, nesting).
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Laser File <span className="text-red-500">*</span></Label>
              {laserFileUrl ? (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <button type="button" onClick={() => setPreviewFile({ url: `${config.baseURL}${laserFileUrl}`, name: laserFileName })} className="text-sm text-blue-600 hover:underline flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> {laserFileName || 'View file'}
                  </button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setLaserFileUrl(''); setLaserFileName(''); }}>Remove</Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg px-3 py-4 text-sm text-slate-500 cursor-pointer hover:bg-slate-50">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading...' : 'Upload laser cutting file'}
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              )}
            </div>

            {saveResult && (
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-1">
                <p className="text-slate-700">
                  Cutting area: <strong>{formatAreaInUnit(saveResult.plannedAreaMm2, 'Millimeter Square')}</strong> →{' '}
                  <strong>{saveResult.sheetsUsed}</strong> sheet(s) used.
                </p>
                <p className="text-slate-700">
                  Avg scrap cost per piece: <strong>₹{saveResult.scrapCostPerPiece.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </p>
                {saveResult.warningBelowRequired ? (
                  <p className="text-amber-700 font-medium">
                    ⚠ This is less than what this order qty actually needs
                    ({formatAreaInUnit(saveResult.requiredAreaMm2, 'Millimeter Square')}). Saved anyway — advisory only.
                  </p>
                ) : (
                  <p className="text-emerald-700 font-medium">✓ Plan saved.</p>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            {saving ? 'Saving...' : 'Save Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <FilePreviewModal url={previewFile?.url} name={previewFile?.name} onClose={() => setPreviewFile(null)} />
    </>
  );
}
