import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, FileText } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { config } from '@/config/environment';
import { LENGTH_UNITS, formatAreaMm2 } from '@/lib/fabricationDims';
import FilePreviewModal from './FilePreviewModal';

// R&D's real-world sheet-nesting decision for one {item, catalog dimension}
// group used across a whole BOM — see server/models/SheetMetalPlan.js and
// the sheet-metal-bom-planning.md doc for the full reasoning. R&D enters the
// actual Length x Width of their laser-cutting layout (each its own unit,
// mm base — same convention as every other fabrication dimension in this
// app, e.g. Fabrication Master's sheet_plate category) — the AREA is always
// DERIVED from these two, server-side, never entered directly. Deliberately
// never shows the raw required-area number before the user has entered
// their own dimensions: the required area is only the theoretical
// part-area sum (kerf/margins/non-tiling shapes always push the real
// cutting area higher), so showing it first would anchor R&D into typing it
// back as if it were the real target instead of forming their own layout
// judgement.
export default function SheetMetalPlanModal({ open, onClose, bomId, group }) {
  const qc = useQueryClient();
  const [selectedKey, setSelectedKey] = useState('');
  const [plannedLengthValue, setPlannedLengthValue] = useState('');
  const [plannedLengthUnit, setPlannedLengthUnit] = useState('Millimeter');
  const [plannedWidthValue, setPlannedWidthValue] = useState('');
  const [plannedWidthUnit, setPlannedWidthUnit] = useState('Millimeter');
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
    setPlannedLengthValue(plan ? String(plan.plannedLengthValue) : '');
    setPlannedLengthUnit(plan?.plannedLengthUnit || 'Millimeter');
    setPlannedWidthValue(plan ? String(plan.plannedWidthValue) : '');
    setPlannedWidthUnit(plan?.plannedWidthUnit || 'Millimeter');
    setLaserFileUrl(plan?.laserFileUrl || '');
    setLaserFileName(plan?.laserFileName || '');
  };

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
  const dimsValid = Number(plannedLengthValue) > 0 && Number(plannedWidthValue) > 0;

  const handleSave = async () => {
    if (!selected || !dimsValid) return;
    setSaving(true);
    setError('');
    try {
      const res = await apiRequest('POST', `/api/rd/boms/${bomId}/sheet-metal-plans`, {
        itemCode: selected.itemCode,
        dimensionVariantId: selected.dimensionVariantId,
        plannedLengthValue: Number(plannedLengthValue),
        plannedLengthUnit,
        plannedWidthValue: Number(plannedWidthValue),
        plannedWidthUnit,
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
                  Planned Dimensions (your real laser-cutting layout for ONE unit of the machine) *
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-slate-500 uppercase block mb-1">Length</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number" min="0" placeholder="0" className="flex-1"
                        value={plannedLengthValue}
                        onChange={e => { setPlannedLengthValue(e.target.value); setSaveResult(null); }}
                      />
                      <select
                        className="w-28 border border-slate-200 rounded-lg px-2 text-sm"
                        value={plannedLengthUnit}
                        onChange={e => setPlannedLengthUnit(e.target.value)}
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
                        value={plannedWidthValue}
                        onChange={e => { setPlannedWidthValue(e.target.value); setSaveResult(null); }}
                      />
                      <select
                        className="w-28 border border-slate-200 rounded-lg px-2 text-sm"
                        value={plannedWidthUnit}
                        onChange={e => setPlannedWidthUnit(e.target.value)}
                      >
                        {LENGTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the actual sheet size you'll lay out and cut — not the raw part-area total. It's normal
                  for the resulting area to be somewhat more than the parts strictly need (kerf, margins, nesting).
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Laser File</Label>
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
                    Cutting area: <strong>{formatAreaMm2(saveResult.plannedAreaMm2)}</strong> →{' '}
                    <strong>{saveResult.sheetsNeededPerUnit}</strong> sheet(s) needed per unit.
                  </p>
                  {saveResult.warningBelowRequired ? (
                    <p className="text-amber-700 font-medium">
                      ⚠ This is less than what the child parts using this size actually need
                      ({formatAreaMm2(saveResult.requiredAreaMm2)}). Saved anyway — this is advisory,
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
            disabled={!selected || !dimsValid || saving}
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
