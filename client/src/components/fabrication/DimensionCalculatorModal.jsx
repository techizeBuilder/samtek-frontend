import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ShapeDiagram } from './FabricationShapeIcons';

const LENGTH_UNIT_FACTORS = { mm: 1, cm: 10, inch: 25.4, m: 1000 };
const LENGTH_UNITS = Object.keys(LENGTH_UNIT_FACTORS);

// Short display labels for categories that share a tile group (e.g. Channel
// -> GOST/UPN) — used for the sub-type dropdown shown inside this modal.
const SUB_TYPE_GROUP_LABEL = { square_tubing: 'Tube Shape', beam: 'Beam Type', channel: 'Channel Type', angle: 'Angle Type' };
const SUB_TYPE_OPTION_LABEL = {
  hss_square: 'Square', hss_rectangular: 'Rectangular',
  beam_ipn: 'IPN', beam_ipe: 'IPE', beam_hea: 'HEA (IPBL)', beam_heb: 'HEB (IPB)',
  channel_gost: 'GOST', channel_upn: 'UPN',
  equal_angle: 'Equal', unequal_angle: 'Unequal',
};

const emptyDraft = () => ({ values: {}, fieldUnits: {}, designation: '' });

// Modal 2 of the Add Fabrication Item flow — opened after a shape tile is
// picked in CategoryPickerModal (or directly, for "Add Another Dimension",
// once the item's category is already locked in). Shows the shape diagram,
// Material/Density, the shape's dimension fields (each with its own length
// unit), Pieces, Price Per kg and a live weight preview, "By Length" only
// (no By Weight toggle, per requirement). Saving appends one dimension row
// and hands the resolved category key + density back up to the caller.
export default function DimensionCalculatorModal({
  open, onClose, group, categories = [], materials = [], defaultDensityKgM3 = 7850,
  lockedCategoryKey = null, initialDensity = null, onSave,
}) {
  const groupKeys = group?.keys || [];
  const [subKey, setSubKey] = useState(lockedCategoryKey || groupKeys[0] || '');
  const [material, setMaterial] = useState('MS');
  const [densityKgM3, setDensityKgM3] = useState(defaultDensityKgM3);
  const [densityUnit, setDensityUnit] = useState('kg/m3');
  const [draft, setDraft] = useState(emptyDraft());
  const [pieces, setPieces] = useState(1);
  const [pricePerKg, setPricePerKg] = useState('');
  const [weight, setWeight] = useState(null);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);

  const resetAll = () => {
    const initKey = lockedCategoryKey || groupKeys[0] || '';
    setSubKey(initKey);
    if (initialDensity?.value) {
      setDensityUnit(initialDensity.unit || 'kg/m3');
      setDensityKgM3(initialDensity.unit === 'g/cm3' ? Number(initialDensity.value) * 1000 : Number(initialDensity.value));
      const fromTable = materials.find((m) => Math.abs(m.densityKgM3 - (initialDensity.unit === 'g/cm3' ? Number(initialDensity.value) * 1000 : Number(initialDensity.value))) < 0.5);
      setMaterial(fromTable?.key || 'Custom');
    } else {
      setMaterial('MS');
      setDensityKgM3(defaultDensityKgM3);
      setDensityUnit('kg/m3');
    }
    setDraft(emptyDraft());
    setPieces(1);
    setPricePerKg('');
    setWeight(null);
    setError('');
  };

  // Re-seed every time the modal is opened for a (possibly different) group.
  useEffect(() => { if (open) resetAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, group?.key]);

  const activeCategory = useMemo(() => categories.find((c) => c.key === subKey) || null, [categories, subKey]);

  const { data: sectionResponse } = useQuery({
    queryKey: ['fabrication-sections', activeCategory?.lookupFamily],
    queryFn: () => apiRequest('GET', `/api/fabrication-master/sections/${activeCategory.lookupFamily}`),
    enabled: !!activeCategory?.lookupFamily && open,
  });
  const sectionOptions = sectionResponse?.data || [];

  const handleMaterialChange = (key) => {
    setMaterial(key);
    const found = materials.find((m) => m.key === key);
    if (found) setDensityKgM3(found.densityKgM3);
  };

  const displayedDensity = densityUnit === 'g/cm3' ? +(densityKgM3 / 1000).toFixed(4) : Math.round(densityKgM3 * 100) / 100;
  const handleDensityValueChange = (raw) => {
    const num = Number(raw);
    if (raw === '' || isNaN(num)) return;
    setDensityKgM3(densityUnit === 'g/cm3' ? num * 1000 : num);
    setMaterial('Custom');
  };

  const setFieldValue = (key, value) => setDraft((d) => ({ ...d, values: { ...d.values, [key]: value } }));
  const setFieldUnit = (key, unit) => setDraft((d) => ({ ...d, fieldUnits: { ...d.fieldUnits, [key]: unit } }));
  const fieldUnit = (key) => draft.fieldUnits[key] || 'mm';

  // Convert every entered field to millimetres (what the weight formulas expect).
  const valuesInMm = useMemo(() => {
    const out = {};
    for (const f of activeCategory?.fields || []) {
      const raw = draft.values[f.key];
      if (raw === undefined || raw === '') continue;
      out[f.key] = Number(raw) * (LENGTH_UNIT_FACTORS[fieldUnit(f.key)] || 1);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, draft]);

  const draftReady = activeCategory && (
    activeCategory.calcType === 'lookup'
      ? !!draft.designation && Number(valuesInMm.length) > 0
      : activeCategory.fields.every((f) => draft.values[f.key] !== undefined && draft.values[f.key] !== '' && !isNaN(Number(draft.values[f.key])))
  );

  const runCalculate = async () => {
    if (!draftReady) return;
    setCalculating(true);
    try {
      const res = await apiRequest('POST', '/api/fabrication-master/calculate-weight', {
        category: subKey, values: valuesInMm, densityValue: densityKgM3, densityUnit: 'kg/m3', designation: draft.designation,
      });
      setWeight(res.data);
      setError('');
    } catch (e) {
      setWeight(null);
      setError(e?.response?.data?.message || 'Could not calculate weight');
    } finally {
      setCalculating(false);
    }
  };

  // Live debounced preview, same pattern FabricationMaster.jsx already uses.
  useEffect(() => {
    if (!draftReady || !densityKgM3) { setWeight(null); return; }
    setCalculating(true);
    const timer = setTimeout(runCalculate, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, draft, subKey, densityKgM3]);

  const piecesNum = Number(pieces) || 1;
  const totalWeightKg = weight?.weightPerPieceKg != null ? weight.weightPerPieceKg * piecesNum : null;
  const totalPrice = totalWeightKg != null && pricePerKg !== '' ? totalWeightKg * Number(pricePerKg) : null;

  const handleSave = () => {
    if (!draftReady || !weight) return;
    onSave({
      categoryKey: subKey,
      dimensionRow: {
        values: valuesInMm,
        designation: draft.designation,
        weightPerMeterKg: weight.weightPerMeterKg,
        weightPerPieceKg: weight.weightPerPieceKg,
        pieces: piecesNum,
        pricePerKg: pricePerKg !== '' ? Number(pricePerKg) : null,
      },
      density: { value: displayedDensity, unit: densityUnit },
    });
  };

  const renderFields = () => {
    if (!activeCategory) return null;
    if (activeCategory.calcType === 'lookup') {
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-slate-500 uppercase">Designation</Label>
            <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={draft.designation} onChange={(e) => setDraft((d) => ({ ...d, designation: e.target.value }))}>
              <option value="">Select size...</option>
              {sectionOptions.map((o) => <option key={o.designation} value={o.designation}>{o.designation} ({o.weightPerMeterKg} kg/m)</option>)}
            </select>
          </div>
          <div>
            <Label className="text-[10px] text-slate-500 uppercase">Length</Label>
            <div className="flex gap-1.5 mt-1">
              <Input type="number" min="0" className="bg-white" placeholder="0"
                value={draft.values.length ?? ''} onChange={(e) => setFieldValue('length', e.target.value)} />
              <select className="w-20 border border-slate-200 rounded-lg text-sm bg-white" value={fieldUnit('length')} onChange={(e) => setFieldUnit('length', e.target.value)}>
                {LENGTH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3">
        {activeCategory.fields.map((f) => (
          <div key={f.key}>
            <Label className="text-[10px] text-slate-500 uppercase">{f.label}</Label>
            <div className="flex gap-1.5 mt-1">
              <Input type="number" min="0" className="bg-white" placeholder="0"
                value={draft.values[f.key] ?? ''} onChange={(e) => setFieldValue(f.key, e.target.value)} />
              <select className="w-20 border border-slate-200 rounded-lg text-sm bg-white" value={fieldUnit(f.key)} onChange={(e) => setFieldUnit(f.key, e.target.value)}>
                {LENGTH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{group.label} — Dimension Calculator</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-2 bg-white">
            <ShapeDiagram category={activeCategory} values={draft.values} />
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Material</Label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={material} onChange={(e) => handleMaterialChange(e.target.value)}>
                {materials.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Density</Label>
                <Input type="number" min="0" value={displayedDensity} onChange={(e) => handleDensityValueChange(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</Label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={densityUnit} onChange={(e) => setDensityUnit(e.target.value)}>
                  <option value="kg/m3">kg/m³</option>
                  <option value="g/cm3">g/cm³</option>
                </select>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
              <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> By Length
            </span>
          </div>
        </div>

        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
          <Label className="text-xs font-semibold text-slate-600 block">Dimension</Label>

          {groupKeys.length > 1 && (
            <div>
              <Label className="text-[10px] text-slate-500 uppercase">{SUB_TYPE_GROUP_LABEL[group.key] || 'Type'}</Label>
              <select
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-400"
                value={subKey}
                disabled={!!lockedCategoryKey}
                onChange={(e) => { setSubKey(e.target.value); setDraft(emptyDraft()); setWeight(null); }}
              >
                {groupKeys.map((k) => <option key={k} value={k}>{SUB_TYPE_OPTION_LABEL[k] || k}</option>)}
              </select>
            </div>
          )}

          {renderFields()}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <Label className="text-[10px] text-slate-500 uppercase">Pieces</Label>
              <Input type="number" min="1" className="mt-1 bg-white" value={pieces} onChange={(e) => setPieces(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500 uppercase">Price Per kg</Label>
              <Input type="number" min="0" className="mt-1 bg-white" placeholder="₹" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="text-xs text-slate-600">
            {calculating ? (
              <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Calculating...</span>
            ) : weight ? (
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-800">
                  Weight: {weight.weightPerPieceKg.toFixed(2)} kg / piece{weight.weightPerMeterKg != null ? ` (${weight.weightPerMeterKg.toFixed(3)} kg/m)` : ''}
                </p>
                {piecesNum > 1 && <p>Total Weight ({piecesNum} pcs): <span className="font-semibold text-slate-800">{totalWeightKg.toFixed(2)} kg</span></p>}
                {totalPrice != null && <p>Total Price: <span className="font-semibold text-slate-800">₹{totalPrice.toFixed(2)}</span></p>}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={resetAll}>Clear</Button>
          <Button type="button" variant="outline" onClick={runCalculate} disabled={!draftReady}>Calculate</Button>
          <Button type="button" onClick={handleSave} disabled={!draftReady || !weight} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
