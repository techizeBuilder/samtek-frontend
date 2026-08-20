import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { ShapeDiagram } from './FabricationShapeIcons';

const LENGTH_UNIT_FACTORS = { mm: 1, inch: 25.4, foot: 304.8 };
const LENGTH_UNITS = Object.keys(LENGTH_UNIT_FACTORS);

// Categories whose `wallThickness` field can alternatively be derived from
// an outer + inner measurement (t = (outer - inner) / 2) instead of typed
// directly — an optional toggle, off by default (default behavior is
// unchanged: a plain Wall Thickness input).
const THICKNESS_DERIVATION = {
  pipe_circular: { outerKey: 'od', innerLabel: 'Inside Diameter (ID)', toggleLabel: 'Calculate thickness from OD & ID', formula: 't = (OD − ID) / 2' },
  hss_rectangular: { outerKey: 'width', innerLabel: 'Inner Width (A₁)', toggleLabel: 'Calculate thickness from outer & inner width', formula: 't = (A − A₁) / 2' },
};

// GOST channel designations are bare numbers ('5', '6.5'...) with no family
// prefix (unlike UPN/IPN/IPE/HEA/HEB, which already embed one) — prefixed
// here purely for a readable label when merged into one Designation list.
const displayDesignation = (categoryKey, designation) => (categoryKey === 'channel_gost' ? `GOST ${designation}` : designation);

const emptyDraft = () => ({ values: {}, fieldUnits: {}, designation: '' });

// Modal 2 of the Add Fabrication Item flow — opened after a shape tile is
// picked in CategoryPickerModal (or directly, for "Add Another Dimension",
// once the item's category is already locked in). Shows the shape diagram,
// Material/Density, the shape's dimension fields (each with its own length
// unit), Pieces, and a live weight preview, "By Length" only (no By Weight
// toggle). No manual price field — Accounts sets the real price
// (Item.weightUnitPrice) elsewhere; this form never collects one. No
// shape ever shows a separate "type" picker — formula-based shapes always
// use their more general field set (see FABRICATION_CATEGORY_GROUPS's
// comment for why that's lossless; this now includes Beam/Channel, computed
// from Side A/Side B/Thickness T/Thickness S/Length instead of a
// standardized-designation lookup). `isLookupGroup`/the Designation dropdown
// branch below still exist purely so a pre-existing item saved under one of
// the old per-standard lookup keys (`beam_ipn` etc., see
// fabricationCategories.js) can still be viewed/edited. Saving appends one
// dimension row and hands the resolved category key + density back up to
// the caller.
export default function DimensionCalculatorModal({
  open, onClose, group, categories = [], defaultDensityKgM3 = 7850,
  lockedCategoryKey = null, initialDensity = null, onSave,
}) {
  const qc = useQueryClient();
  // If the item's category is already locked (adding another size to an
  // existing item), only that one family/key is selectable — a catalog
  // item's category is a single value, so a second Beam dimension can't
  // switch from IPE to HEA.
  const effectiveKeys = lockedCategoryKey ? [lockedCategoryKey] : (group?.keys || []);

  const [subKey, setSubKey] = useState(effectiveKeys[0] || '');
  const [material, setMaterial] = useState('');
  const [densityKgM3, setDensityKgM3] = useState(defaultDensityKgM3);
  const [densityUnit, setDensityUnit] = useState('kg/m3');
  const [draft, setDraft] = useState(emptyDraft());
  const [deriveThickness, setDeriveThickness] = useState(false);
  const [innerValue, setInnerValue] = useState('');
  const [pieces, setPieces] = useState(1);
  const [weight, setWeight] = useState(null);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);

  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatDensity, setNewMatDensity] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('kg/m3');
  const [addMatError, setAddMatError] = useState('');
  const [addingMat, setAddingMat] = useState(false);

  const { data: materialsResponse } = useQuery({
    queryKey: ['fabrication-materials'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/materials'),
    enabled: open,
  });
  const materials = materialsResponse?.data || [];

  const applyDensityDefaults = (materialsList) => {
    if (initialDensity?.value) {
      const canonical = initialDensity.unit === 'g/cm3' ? Number(initialDensity.value) * 1000 : Number(initialDensity.value);
      setDensityUnit(initialDensity.unit || 'kg/m3');
      setDensityKgM3(canonical);
      const found = materialsList.find((m) => Math.abs(m.densityKgM3 - canonical) < 0.5);
      setMaterial(found?.key || '');
    } else {
      const ms = materialsList.find((m) => m.key === 'MS');
      setMaterial(ms?.key || '');
      setDensityKgM3(ms?.densityKgM3 || defaultDensityKgM3);
      setDensityUnit('kg/m3');
    }
  };

  const resetAll = () => {
    setSubKey(effectiveKeys[0] || '');
    applyDensityDefaults(materials);
    setDraft(emptyDraft());
    setDeriveThickness(false);
    setInnerValue('');
    setPieces(1);
    setWeight(null);
    setError('');
    setAddMaterialOpen(false);
    setAddMatError('');
  };

  // Re-seed every time the modal is opened for a (possibly different) group.
  useEffect(() => { if (open) resetAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, group?.key]);
  // Self-heal the Material/Density default once the materials list finishes
  // its first load (it's [] for an instant on open) — only while nothing's
  // been picked yet, so it never clobbers an in-progress edit.
  useEffect(() => {
    if (open && !material && materials.length > 0) applyDensityDefaults(materials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials.length, open]);

  const activeCategory = useMemo(() => categories.find((c) => c.key === subKey) || null, [categories, subKey]);
  const isLookupGroup = activeCategory?.calcType === 'lookup';

  const { data: combinedSectionsResponse } = useQuery({
    queryKey: ['fabrication-sections-combined', effectiveKeys.join(',')],
    queryFn: async () => {
      const perFamily = await Promise.all(effectiveKeys.map(async (key) => {
        const cat = categories.find((c) => c.key === key);
        if (!cat?.lookupFamily) return [];
        const res = await apiRequest('GET', `/api/fabrication-master/sections/${cat.lookupFamily}`);
        return (res.data || []).map((o) => ({ ...o, categoryKey: key }));
      }));
      return perFamily.flat();
    },
    enabled: open && isLookupGroup && effectiveKeys.length > 0,
  });
  const combinedSections = combinedSectionsResponse || [];

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
  };

  const handleAddMaterial = async () => {
    if (!newMatName.trim() || newMatDensity === '') return;
    setAddingMat(true);
    setAddMatError('');
    try {
      const densityKgM3Val = newMatUnit === 'g/cm3' ? Number(newMatDensity) * 1000 : Number(newMatDensity);
      const res = await apiRequest('POST', '/api/fabrication-master/materials', { name: newMatName.trim(), densityKgM3: densityKgM3Val });
      await qc.invalidateQueries({ queryKey: ['fabrication-materials'] });
      setMaterial(res.data.key);
      setDensityKgM3(res.data.densityKgM3);
      setDensityUnit('kg/m3');
      setAddMaterialOpen(false);
      setNewMatName(''); setNewMatDensity(''); setNewMatUnit('kg/m3');
    } catch (e) {
      setAddMatError(e?.response?.data?.message || 'Could not add material');
    } finally {
      setAddingMat(false);
    }
  };

  const setFieldValue = (key, value) => setDraft((d) => ({ ...d, values: { ...d.values, [key]: value } }));
  const setFieldUnit = (key, unit) => setDraft((d) => ({ ...d, fieldUnits: { ...d.fieldUnits, [key]: unit } }));
  const fieldUnit = (key) => draft.fieldUnits[key] || 'mm';

  // Auto-compute Wall Thickness from outer/inner measurement while deriving.
  const derivCfg = THICKNESS_DERIVATION[subKey];
  useEffect(() => {
    if (!deriveThickness || !derivCfg) return;
    const outer = Number(draft.values[derivCfg.outerKey]);
    const inner = Number(innerValue);
    if (!outer || !inner || inner >= outer) { setFieldValue('wallThickness', ''); return; }
    setFieldUnit('wallThickness', fieldUnit(derivCfg.outerKey));
    setFieldValue('wallThickness', String(+(((outer - inner) / 2).toFixed(3))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deriveThickness, subKey, derivCfg, draft.values[derivCfg?.outerKey], innerValue, draft.fieldUnits[derivCfg?.outerKey]]);

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
        // Accounts sets the real price (Item.weightUnitPrice) elsewhere —
        // this form never collects one. Kept as null, not omitted, so it
        // still overwrites a pre-existing value on the (unlikely) edit of an
        // older row that had one manually entered before this field existed.
        pricePerKg: null,
      },
      density: { value: displayedDensity, unit: densityUnit },
    });
  };

  const renderNumberField = (f) => (
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
  );

  const renderThicknessField = (f) => (
    <div key={f.key} className="col-span-2 space-y-1.5 border-t border-slate-200 pt-2 mt-0.5">
      <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
        <input type="checkbox" checked={deriveThickness} onChange={(e) => { setDeriveThickness(e.target.checked); setInnerValue(''); }} />
        {derivCfg.toggleLabel} — <span className="font-mono">{derivCfg.formula}</span>
      </label>
      {deriveThickness ? (
        <div className="max-w-[calc(50%-0.375rem)]">
          <Label className="text-[10px] text-slate-500 uppercase">{derivCfg.innerLabel}</Label>
          <Input type="number" min="0" className="mt-1 bg-white" placeholder="0" value={innerValue} onChange={(e) => setInnerValue(e.target.value)} />
          {draft.values.wallThickness && <p className="text-[10px] text-slate-500 mt-1">Thickness = {draft.values.wallThickness} {fieldUnit('wallThickness')}</p>}
        </div>
      ) : (
        <div className="max-w-[calc(50%-0.375rem)]">{renderNumberField(f)}</div>
      )}
    </div>
  );

  const renderFields = () => {
    if (!activeCategory) return null;
    if (activeCategory.calcType === 'lookup') {
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] text-slate-500 uppercase">Designation</Label>
            <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={draft.designation ? `${subKey}::${draft.designation}` : ''}
              onChange={(e) => {
                const [key, designation] = e.target.value.split('::');
                setSubKey(key);
                setDraft((d) => ({ ...d, designation }));
              }}>
              <option value="">Select size...</option>
              {combinedSections.map((o) => (
                <option key={`${o.categoryKey}::${o.designation}`} value={`${o.categoryKey}::${o.designation}`}>
                  {displayDesignation(o.categoryKey, o.designation)} ({o.weightPerMeterKg} kg/m)
                </option>
              ))}
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
        {activeCategory.fields.map((f) => (f.key === 'wallThickness' && derivCfg ? renderThicknessField(f) : renderNumberField(f)))}
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
              <div className="flex gap-2">
                <select className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={material} onChange={(e) => handleMaterialChange(e.target.value)}>
                  <option value="">Select...</option>
                  {materials.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <Button type="button" size="icon" variant="outline" onClick={() => setAddMaterialOpen((v) => !v)} title="Add material">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {addMaterialOpen && (
                <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-2.5 space-y-2 mt-1.5">
                  <Input placeholder="Material name (e.g. SS 316L)" className="bg-white" value={newMatName} onChange={(e) => setNewMatName(e.target.value)} />
                  <div className="flex gap-1.5">
                    <Input type="number" min="0" placeholder="Density" className="bg-white" value={newMatDensity} onChange={(e) => setNewMatDensity(e.target.value)} />
                    <select className="w-24 border border-slate-200 rounded-lg text-sm bg-white" value={newMatUnit} onChange={(e) => setNewMatUnit(e.target.value)}>
                      <option value="kg/m3">kg/m³</option>
                      <option value="g/cm3">g/cm³</option>
                    </select>
                  </div>
                  {addMatError && <p className="text-[10px] text-red-500">{addMatError}</p>}
                  <div className="flex justify-end gap-1.5">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setAddMaterialOpen(false); setAddMatError(''); }}>Cancel</Button>
                    <Button type="button" size="sm" onClick={handleAddMaterial} disabled={addingMat || !newMatName.trim() || newMatDensity === ''}>
                      {addingMat ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </div>
              )}
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

          {renderFields()}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <Label className="text-[10px] text-slate-500 uppercase">Pieces</Label>
              <Input type="number" min="1" className="mt-1 bg-white" value={pieces} onChange={(e) => setPieces(e.target.value)} />
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
