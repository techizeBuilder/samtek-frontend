import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { LENGTH_UNIT_TO_MM, AREA_UNIT_TO_MM2 } from '@/lib/fabricationDims';

const densityToKgM3 = (value, unit) => (unit === 'g/cm3' ? Number(value) * 1000 : Number(value));

// Fabrication Master materials only (row.fabricationRef set) — replaces the
// old FabricationDimensionFields raw-dimension-typing UI for a BOM/demand
// line: pick which catalog Item.dimensionVariants[] entry this line draws
// from, then enter one consumed amount (a length, for every shape except
// sheets; an area, for sheets) instead of re-typing the full cross-section.
// Weight preview is computed client-side straight from the chosen variant's
// own precomputed weightPerMeterKg (perMeter/lookup categories) or
// thickness+density (sheet_plate) — no extra API round-trip needed, since
// both are already sitting on the variant. The server (buildFabricationBomDimensions
// + resolveFabricationWeight, fabricationDemandService.js) recomputes this
// authoritatively on save either way.
//
// `row` needs: dimensionVariants (the source Item's own array), dimensionVariantId,
// fabricationCategory, weightUnitPrice, amountValue, amountUnit, unitPrice, unit
// (the row's own locked Used Unit — see below).
// `categories` is the /api/fabrication-master/categories catalog (for calcType).
export default function FabricationVariantAmountFields({ row, categories, onUpdate }) {
  const variants = (row.dimensionVariants || []).filter(v => !v.isLeftover);
  const category = categories.find(c => c.key === row.fabricationCategory) || null;
  const isSheet = category?.calcType === 'sheet';
  const chosenVariant = variants.find(v => v._id === row.dimensionVariantId) || null;

  // Auto-select the only variant so a single-size item never shows a picker.
  useEffect(() => {
    if (!row.dimensionVariantId && variants.length === 1) {
      onUpdate({ dimensionVariantId: variants[0]._id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.dimensionVariantId, variants.length]);

  // The amount is always entered in the row's own Used Unit — that's already
  // locked/read-only above this component (row.unit, auto-fetched from the
  // item), so there's no separate unit to pick here; a second, independent
  // unit choice next to an already-locked one was confusing and could drift
  // from it. Keeps amountUnit in sync automatically instead.
  useEffect(() => {
    if (row.unit && row.amountUnit !== row.unit) {
      onUpdate({ amountUnit: row.unit });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.unit]);

  useEffect(() => {
    if (!chosenVariant || !row.amountValue || !row.amountUnit) {
      onUpdate({ unitPrice: 0 });
      return;
    }
    let weightPerPieceKg = null;
    if (isSheet) {
      const areaMm2 = Number(row.amountValue) * (AREA_UNIT_TO_MM2[row.amountUnit] || 0);
      const densityKgM3 = densityToKgM3(chosenVariant.densityValue, chosenVariant.densityUnit);
      weightPerPieceKg = (Number(chosenVariant.values?.thickness) || 0) * areaMm2 / 1e9 * densityKgM3;
    } else if (chosenVariant.weightPerMeterKg != null) {
      const lengthMm = Number(row.amountValue) * (LENGTH_UNIT_TO_MM[row.amountUnit] || 0);
      weightPerPieceKg = chosenVariant.weightPerMeterKg * (lengthMm / 1000);
    }
    onUpdate({ unitPrice: weightPerPieceKg != null ? Math.round(weightPerPieceKg * (row.weightUnitPrice || 0) * 100) / 100 : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.dimensionVariantId, row.amountValue, row.amountUnit, row.weightUnitPrice]);

  if (variants.length === 0) {
    return <p className="text-xs text-amber-600 italic">This item has no catalog dimension sizes set up yet — add one in Fabrication Master first.</p>;
  }

  return (
    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/40 space-y-3">
      {variants.length > 1 && (
        <div>
          <label className="text-xs font-semibold text-blue-700 block mb-1">Dimension Size *</label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {variants.map(v => (
              <label key={v._id} className={`flex items-center gap-2 p-1.5 rounded-md border text-xs cursor-pointer bg-white ${row.dimensionVariantId === v._id ? 'border-blue-400' : 'border-slate-200'}`}>
                <input type="radio" checked={row.dimensionVariantId === v._id} onChange={() => onUpdate({ dimensionVariantId: v._id })} />
                <span className="font-mono">{Object.entries(v.values || {}).map(([k, val]) => `${k}: ${val}mm`).join(', ')}{v.designation ? ` (${v.designation})` : ''}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="text-[10px] text-slate-500 uppercase">
          {isSheet ? 'Area Used' : 'Length Used'}{row.unit ? ` (${row.unit})` : ''} *
        </label>
        <Input
          type="number" min="0" className="mt-1 bg-white h-9" placeholder="0"
          value={row.amountValue ?? ''}
          onChange={e => onUpdate({ amountValue: e.target.value })}
        />
      </div>
      {chosenVariant && row.amountValue && row.amountUnit && (
        <p className="text-xs font-semibold text-slate-700">
          {row.unitPrice > 0
            ? <>Weight: {(row.weightUnitPrice > 0 ? (row.unitPrice / row.weightUnitPrice) : 0).toFixed(3)} kg/piece · ₹{row.weightUnitPrice}/kg → ₹{row.unitPrice}/piece</>
            : <span className="text-amber-600">no price per kg set for this item yet (Accounts &gt; Purchase Inventory)</span>}
        </p>
      )}
    </div>
  );
}
