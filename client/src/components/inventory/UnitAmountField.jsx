import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';

export const AMOUNT_UNIT_TYPES = ['Length Unit', 'Area Unit', 'Volume Unit'];
const AMOUNT_LABEL = { 'Length Unit': 'Length', 'Area Unit': 'Area', 'Volume Unit': 'Volume' };

// Shared condition for "does this row need the Amount field" — a
// non-fabrication row whose (matched) Used Unit is Length/Area/Volume.
// `getUnitTypeForUnit` is the caller's own reverse-lookup (unit -> its
// UnitType category) used as a fallback when row.unitType wasn't set
// directly, mirroring how the rest of each form already resolves it.
export const rowNeedsAmount = (row, getUnitTypeForUnit) =>
  !row.fabricationRef && AMOUNT_UNIT_TYPES.includes(row.unitType || getUnitTypeForUnit(row.unit));

// Non-fabrication counterpart of FabricationVariantAmountFields — for a BOM/
// demand material whose matched Item's Used Unit is Length/Area/Volume (not
// Count/Mass, where a flat Quantity already means "5 kg"/"3 pieces" with
// nothing to split), a bare Quantity can't say "2 pieces of 1m length each".
// Same pattern as the fabrication field: the amount is always entered in the
// row's own locked Used Unit (row.unit) — no separate unit picker, kept in
// sync automatically — and this only ever sets amountValue/amountUnit plus a
// recomputed unitPrice; the row's existing Quantity input and Price preview
// (unitPrice x quantity) elsewhere on the form are untouched.
//
// `row` needs: unit, unitType, purchaseCostPerUnit (₹ per Used Unit,
// snapshotted from the matched Item's purchaseCost), amountValue, amountUnit.
export default function UnitAmountField({ row, onUpdate }) {
  useEffect(() => {
    if (row.unit && row.amountUnit !== row.unit) {
      onUpdate({ amountUnit: row.unit });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.unit]);

  useEffect(() => {
    const unitPrice = row.amountValue
      ? Math.round((row.purchaseCostPerUnit || 0) * Number(row.amountValue) * 100) / 100
      : 0;
    onUpdate({ unitPrice });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.amountValue, row.purchaseCostPerUnit]);

  const label = AMOUNT_LABEL[row.unitType] || 'Amount';

  return (
    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/40">
      <label className="text-[10px] text-slate-500 uppercase">
        {label} Used{row.unit ? ` (${row.unit})` : ''} *
      </label>
      <Input
        type="number" min="0" className="mt-1 bg-white h-9" placeholder="0"
        value={row.amountValue ?? ''}
        onChange={e => onUpdate({ amountValue: e.target.value })}
      />
      {row.amountValue && row.purchaseCostPerUnit > 0 && (
        <p className="text-[10px] text-slate-500 mt-1.5">
          ₹{row.purchaseCostPerUnit}/{row.unit} × {row.amountValue} = ₹{row.unitPrice || 0}/piece
        </p>
      )}
    </div>
  );
}
