import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Fabrication Master materials only (row.fabricationRef set) — the
// dimension inputs for one specific consuming line (a BOM material line, or
// a Production material demand line), independent of the source Item's own
// stock dimensions (dimensionVariants) — this is "how much of this material
// this line actually uses," not "what size is in stock." 400ms-debounced
// live weight+price preview via the same POST
// /api/fabrication-master/calculate-weight FabricationMaster.jsx's own
// Add-Item form already uses. Only writes `unitPrice` back via onUpdate —
// the server recomputes it authoritatively again on save either way.
// Shared between BOMCreationTab.jsx (BOM material lines) and
// OrderManagement.jsx (out-of-BOM material demands) — same fields/math both
// places, see rdController.js's resolveFabricationWeight for the
// server-side mirror.
//
// `row` needs: fabricationCategory, fabricationDensity ({value, unit}),
// weightUnitPrice, bomDimensions, unitPrice.
export default function FabricationDimensionFields({ row, categories, onUpdate }) {
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [previewWeightKg, setPreviewWeightKg] = useState(null);

  const activeCategory = categories.find(c => c.key === row.fabricationCategory) || null;
  const dimsReady = !!activeCategory && activeCategory.fields.every(f => {
    const v = row.bomDimensions?.[f.key];
    return v !== undefined && v !== '' && !isNaN(Number(v));
  });

  useEffect(() => {
    if (!dimsReady || !row.fabricationDensity?.value) { setPreviewWeightKg(null); return; }
    setCalculating(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest('POST', '/api/fabrication-master/calculate-weight', {
          category: row.fabricationCategory,
          values: row.bomDimensions,
          densityValue: row.fabricationDensity.value,
          densityUnit: row.fabricationDensity.unit,
        });
        setPreviewWeightKg(res.data.weightPerPieceKg);
        onUpdate({ unitPrice: Math.round(res.data.weightPerPieceKg * (row.weightUnitPrice || 0) * 100) / 100 });
        setCalcError('');
      } catch (e) {
        setPreviewWeightKg(null);
        onUpdate({ unitPrice: 0 });
        setCalcError(e?.response?.data?.message || 'Could not calculate weight');
      } finally {
        setCalculating(false);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimsReady, JSON.stringify(row.bomDimensions), row.fabricationCategory, row.fabricationDensity?.value, row.fabricationDensity?.unit, row.weightUnitPrice]);

  if (!activeCategory) {
    return <p className="text-xs text-slate-400 italic">Loading dimension fields…</p>;
  }

  return (
    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/40 space-y-2">
      <label className="text-xs font-semibold text-blue-700 block">Unit Dimensions ({activeCategory.label}) * <span className="text-[10px] text-slate-400 font-normal">— how much of this material this line actually uses</span></label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {activeCategory.fields.map(f => (
          <div key={f.key}>
            <label className="text-[10px] text-slate-500 uppercase">{f.label} ({f.unit})</label>
            <Input
              type="number" min="0" className="mt-1 bg-white h-9" placeholder="0"
              value={row.bomDimensions?.[f.key] ?? ''}
              onChange={e => onUpdate({ bomDimensions: { ...row.bomDimensions, [f.key]: e.target.value } })}
            />
          </div>
        ))}
      </div>
      {calcError && <p className="text-xs text-red-500">{calcError}</p>}
      {calculating ? (
        <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Calculating weight…</p>
      ) : previewWeightKg != null ? (
        <p className="text-xs font-semibold text-slate-700">
          Weight: {previewWeightKg.toFixed(2)} kg/piece
          {row.weightUnitPrice > 0
            ? <span className="text-slate-500 font-normal"> · ₹{row.weightUnitPrice}/kg → ₹{row.unitPrice}/piece</span>
            : <span className="text-amber-600 font-normal"> · no price per kg set for this item yet (Accounts &gt; Purchase Inventory)</span>}
        </p>
      ) : null}
    </div>
  );
}
