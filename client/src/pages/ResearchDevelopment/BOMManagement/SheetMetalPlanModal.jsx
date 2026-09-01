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

// R&D's real-world sheet-nesting decision for one {item, catalog dimension}
// group used across a whole BOM — see server/models/SheetMetalPlan.js and
// the sheet-metal-bom-planning.md doc for the full reasoning. One entry per
// physical catalog sheet actually purchased — each with its own Length x
// Width for how much of THAT sheet gets used (each independently unit-
// picked, mm base — same convention as every other fabrication dimension in
// this app). AREA is always DERIVED from these, server-side, never entered
// directly. sheetsNeededPerUnit is simply the number of entries, not a
// division-derived guess — R&D explicitly says how many sheets and how much
// of each, rather than the system assuming everything tiles evenly across
// identical sheets.
export default function SheetMetalPlanModal({ open, onClose, bomId, group }) {
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState('');
  const [sheets, setSheets] = useState([blankSheet()]);
  const [laserFileUrl, setLaserFileUrl] = useState('');
  const [laserFileName, setLaserFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveResult, setSaveResult] = useState(null); // { warningBelowRequired, requiredAreaMm2, plannedAreaMm2, sheetsNeededPerUnit }
  const [previewFile, setPreviewFile] = useState(null); // { url, name } | null

  const { data: groupsResponse } = useQuery({
    queryKey: ['sheet-metal-groups', bomId],
    queryFn: () => apiRequest('GET', `/api/rd/boms/${bomId}/sheet-metal-groups`),
    enabled: open && !!bomId,
  });
  const groups = groupsResponse?.data || [];

  const prefillFromPlan = (plan) => {
    setSheets(plan?.sheets?.length ? plan.sheets.map(s => ({ ...s })) : [blankSheet()]);
    setLaserFileUrl(plan?.laserFileUrl || '');
    setLaserFileName(plan?.laserFileName || '');
  };

  const updateSheet = (index, patch) => {
    setSheets(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
    setSaveResult(null);
  };
  const addSheet = () => setSheets(prev => [...prev, blankSheet()]);
  const removeSheet = (index) => setSheets(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSaveResult(null);
    if (group) {
      setSelectedKey(`${group.itemCode}#${group.dimensionVariantId}`);
      prefillFromPlan(group.existingPlan);
    } else {
      setSelectedKey('');
      prefillFromPlan(null);
    }
  }, [open, group]);

  // When picking a group from the open-ended picker (no group prop), prefill
  // from its own existing plan if one's already there — same as the
  // preselected-group path above.
  const handlePickGroup = (key) => {
    setSelectedKey(key);
    const g = groups.find(x => `${x.itemCode}#${x.dimensionVariantId}` === key);
    prefillFromPlan(g?.existingPlan);
    setSaveResult(null);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('Please select a file under 20MB');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiRequest('POST', '/api/rd/child-parts/upload-file', fd);
      if (res.success && res.url) {
        setLaserFileUrl(res.url);
        setLaserFileName(file.name);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const selected = groups.find(g => `${g.itemCode}#${g.dimensionVariantId}` === selectedKey);
  const catalogLengthMm = selected?.catalogLengthMm;
  const catalogWidthMm = selected?.catalogWidthMm;

  // Same fit check the server runs authoritatively — shown live per row so
  // R&D doesn't have to hit Save to find out a sheet doesn't fit. Returns
  // null while a row's own inputs aren't complete yet (nothing to flag) or
  // the catalog size hasn't loaded, never blocking on an incomplete state.
  const sheetErrorMessage = (s) => {
    const lengthMm = toMm(s.lengthValue, s.lengthUnit);
    const widthMm = toMm(s.widthValue, s.widthUnit);
    if (lengthMm == null || widthMm == null || !catalogLengthMm || !catalogWidthMm) return null;
    const fits = (lengthMm <= catalogLengthMm && widthMm <= catalogWidthMm) || (lengthMm <= catalogWidthMm && widthMm <= catalogLengthMm);
    return fits ? null : `Doesn't fit within this item's catalog sheet size (${Math.round(catalogLengthMm)}mm × ${Math.round(catalogWidthMm)}mm).`;
  };
  const sheetIsValid = (s) => toMm(s.lengthValue, s.lengthUnit) != null && toMm(s.widthValue, s.widthUnit) != null && !sheetErrorMessage(s);
  const dimsValid = sheets.length > 0 && sheets.every(sheetIsValid);

  const handleSave = async () => {
    if (!selected || !dimsValid || !laserFileUrl) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest('POST', `/api/rd/boms/${bomId}/sheet-metal-plans`, {
        itemCode: selected.itemCode,
        dimensionVariantId: selected.dimensionVariantId,
        sheets: sheets.map(s => ({
          lengthValue: Number(s.lengthValue), lengthUnit: s.lengthUnit,
          widthValue: Number(s.widthValue), widthUnit: s.widthUnit,
        })),
        laserFileUrl,
        laserFileName,
      });
      await qc.invalidateQueries({ queryKey: ['sheet-metal-groups', bomId] });
      await qc.invalidateQueries({ queryKey: ['sheet-metal-plans', bomId] });
      setSaveResult({
        warningBelowRequired: res.data.warningBelowRequired,
        requiredAreaMm2: res.data.requiredAreaMm2,
        plannedAreaMm2: res.data.plannedAreaMm2,
        sheetsNeededPerUnit: res.data.sheetsNeededPerUnit,
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Sheet Metal Plan</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {!group && (
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Item + Dimension *</Label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={selectedKey}
                onChange={e => handlePickGroup(e.target.value)}
              >
                <option value="">Select...</option>
                {groups.map(g => (
                  <option key={`${g.itemCode}#${g.dimensionVariantId}`} value={`${g.itemCode}#${g.dimensionVariantId}`}>
                    {g.itemName} ({g.itemCode}){g.existingPlan ? ' — already planned' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selected && (
            <>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{selected.itemName}</span> <span className="text-xs font-mono text-slate-400">{selected.itemCode}</span>
              </p>

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
                              <Input
                                type="number" min="0" placeholder="0" className="flex-1"
                                value={s.lengthValue}
                                onChange={e => updateSheet(i, { lengthValue: e.target.value })}
                              />
                              <select
                                className="w-28 border border-slate-200 rounded-lg px-2 text-sm"
                                value={s.lengthUnit}
                                onChange={e => updateSheet(i, { lengthUnit: e.target.value })}
                              >
                                {LENGTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500 uppercase block mb-1">Width</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number" min="0" placeholder="0" className="flex-1"
                                value={s.widthValue}
                                onChange={e => updateSheet(i, { widthValue: e.target.value })}
                              />
                              <select
                                className="w-28 border border-slate-200 rounded-lg px-2 text-sm"
                                value={s.widthUnit}
                                onChange={e => updateSheet(i, { widthUnit: e.target.value })}
                              >
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
                  normal for the total to be somewhat more than the parts strictly need (kerf, margins, nesting).
                  Add another sheet if one isn't enough to fit everything.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Laser File <span className="text-red-500">*</span></Label>
                {laserFileUrl ? (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFile({ url: `${config.baseURL}${laserFileUrl}`, name: laserFileName })}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1.5"
                    >
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
                    Cutting area: <strong>{formatAreaInUnit(saveResult.plannedAreaMm2, selected?.unit)}</strong> →{' '}
                    <strong>{saveResult.sheetsNeededPerUnit}</strong> sheet(s) needed per unit.
                  </p>
                  {saveResult.warningBelowRequired ? (
                    <p className="text-amber-700 font-medium">
                      ⚠ This is less than what the child parts using this size actually need
                      ({formatAreaInUnit(saveResult.requiredAreaMm2, selected?.unit)}). Saved anyway — this is advisory,
                      review and increase it if needed.
                    </p>
                  ) : (
                    <p className="text-emerald-700 font-medium">✓ Plan saved.</p>
                  )}
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={handleSave}
            disabled={!selected || !dimsValid || !laserFileUrl || saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            {saving ? 'Saving...' : 'Save Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <FilePreviewModal url={previewFile?.url} name={previewFile?.name} onClose={() => setPreviewFile(null)} />
    </>
  );
}
