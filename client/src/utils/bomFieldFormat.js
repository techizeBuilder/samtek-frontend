// Shared between BOM Management (R&D) and Production Order Management —
// keeps how a BOM material's BOM_FIELD_CATALOG fields are read/displayed in
// sync across both, instead of two copies drifting apart.
// Mirrors server/models/RDBOMFieldConfig.js's BOM_FIELD_CATALOG and
// server/models/RDBOM.js's MaterialSchema, both field-for-field with
// Inventory's real form (SimpleInventoryForm.jsx).

// Canonical-unit conversion for a non-fabrication material's Total Weight —
// mirrors server/utils/unitConversion.js exactly (same unit name strings,
// same multipliers) so client and server always agree. Needed here (not just
// server-side) because Total Machine Weight (BOMCreationTab.jsx) is computed
// client-side from bom.materials, same pattern materialsCost already uses.
const LENGTH_UNIT_TO_MM = { Millimeter: 1, Centimeter: 10, Meter: 1000, Kilometer: 1e6, Inch: 25.4, Foot: 304.8 };
const AREA_UNIT_TO_MM2 = { 'Millimeter Square': 1, 'Centimeter Square': 100, 'Meter Square': 1e6, 'Inch Square': 645.16, 'Foot Square': 92903.04 };
const VOLUME_UNIT_TO_ML = { 'Centimeter Cube': 1, 'Meter Cube': 1e6, Liter: 1000, 'Inch Cube': 16.387064, 'Foot Cube': 28316.846592 };
const UNIT_CATEGORY_TABLES = [LENGTH_UNIT_TO_MM, AREA_UNIT_TO_MM2, VOLUME_UNIT_TO_ML];
const convertBetweenUnits = (value, fromUnit, toUnit) => {
  if (!(Number(value) >= 0) || !fromUnit || !toUnit) return null;
  if (fromUnit === toUnit) return Number(value);
  for (const table of UNIT_CATEGORY_TABLES) {
    if (table[fromUnit] && table[toUnit]) return (Number(value) * table[fromUnit]) / table[toUnit];
  }
  return null;
};

// One material line's Total Weight in kg, or null when it can't be computed
// (no rate set at all, or — for a Length/Area/Volume Used Unit material — no
// reference unit recorded yet, see non-fabrication-unit-weight-ambiguity.md).
// Mirrors server/controllers/rdController.js's bomMaterialTotalWeight exactly
// — kept in sync by hand since PDF generation (server) and Total Machine
// Weight (client, this file) each need their own copy of the same math.
export const bomMaterialTotalWeightKg = (mat) => {
  if (mat.fabricationCategory) {
    return mat.computedWeightPerPieceKg != null ? mat.computedWeightPerPieceKg * (mat.quantity || 0) : null;
  }
  if (mat.amountValue != null) {
    if (mat.unitWeightValue == null || mat.unitWeightValue === '' || !mat.unitWeightUnit || !mat.amountUnit) return null;
    const convertedQty = convertBetweenUnits(mat.quantity || 0, mat.amountUnit, mat.unitWeightUnit);
    return convertedQty == null ? null : mat.unitWeightValue * convertedQty;
  }
  return (mat.unitWeightValue != null && mat.unitWeightValue !== '') ? mat.unitWeightValue * (mat.quantity || 0) : null;
};

// Display string for one material row's own Total Weight column (BOM
// Management's materials table) — "—" when bomMaterialTotalWeightKg can't
// compute it (no rate set, or a Length/Area/Volume material with no
// reference unit recorded yet), same fallback every other weight display
// here uses rather than showing a guessed number.
export const formatTotalWeight = (mat) => {
  const kg = bomMaterialTotalWeightKg(mat);
  return kg != null ? `${kg.toLocaleString(undefined, { maximumFractionDigits: 3 })} kg` : '—';
};

export const CATALOG_KEY_TO_MATERIAL_FIELD = {
  itemType: 'inventoryItemType', name: 'item', code: 'code', modelNumber: 'modelNumber',
  brand: 'brand', itemCategories: 'itemCategories', sourceType: 'sourceType', itemSourceType: 'itemSourceType',
  metrology: 'metrology', materialGrade: 'materialGrade',
  unit: 'unit', dimensions: 'dimensions', description: 'description',
};

const DIMENSION_LABELS = { length: 'L', height: 'H', width: 'W', diaOD: 'ODia', diaID: 'IDia', thickness: 'Thk' };

export const formatDimensions = (dims) => {
  if (!dims || typeof dims !== 'object') return '—';
  const parts = Object.entries(DIMENSION_LABELS)
    .map(([key, label]) => {
      const d = dims[key];
      return d?.value !== undefined && d?.value !== null && d?.value !== '' ? `${label}: ${d.value}${d.unit || ''}` : null;
    })
    .filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

// Fabrication Master materials (mat.fabricationCategory set) — this line's
// own consumed amount (mat.amountValue/amountUnit — a length, or an area for
// sheets), not the generic Inventory dimensions snapshot every other
// material uses. Falls back to the raw dimension set (mat.bomDimensions)
// for older BOM lines saved before the amount+quantity redesign. Includes
// the resolved weight when known, same style used elsewhere for this data
// (RDProductionQueue.jsx, OrderManagement.jsx's Material Demand table).
//
// Non-fabrication materials with an amountValue (Length/Area/Volume Used
// Unit — see UnitAmountField.jsx) show the same per-piece amount, PLUS the
// piece count — unlike fabrication, mat.quantity here is already the
// resolved TOTAL (pieces x amountValue), not a piece count, so the piece
// count itself only exists as this derived display (quantity / amountValue);
// nowhere else shows it, since Qty columns elsewhere correctly show the
// total in the item's own stocking unit.
export const formatBomDimensions = (mat) => {
  const dims = formatBomAmountOnly(mat);
  const weight = mat.fabricationCategory && mat.computedWeightPerPieceKg != null ? `${mat.computedWeightPerPieceKg.toFixed(2)} kg/pc` : null;
  return [dims === '—' ? null : dims, weight].filter(Boolean).join(' · ') || '—';
};

// Just the consumed amount, no weight — Unit Weight is a BOM material's own
// dedicated column now (formatUnitWeight below), not something the
// Dimensions column doubles up on. formatBomDimensions above still combines
// them for the compact one-line summaries elsewhere (RDProductionQueue.jsx's
// approval review, OrderManagement.jsx's Material Demand subtitle) where
// there's no separate Unit Weight column to defer to.
export const formatBomAmountOnly = (mat) => {
  if (mat.amountValue != null && mat.amountUnit) {
    return mat.fabricationCategory
      ? `${mat.amountValue} ${mat.amountUnit}`
      : `${mat.amountValue} ${mat.amountUnit} × ${Math.round((mat.quantity / mat.amountValue) * 1000) / 1000} pcs`;
  }
  const dims = Object.entries(mat.bomDimensions || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}mm`)
    .join(', ');
  return dims || '—';
};

// Unit Weight is a BOM material's own field, not a BOM_FIELD_CATALOG /
// "BOM Format & Modification" toggle — always shown as its own column
// (BOMCreationTab.jsx), never combined into the Dimensions column. A
// Fabrication Master material's weight is computed per BOM line
// (computedWeightPerPieceKg, from its chosen dimension size x density);
// every other material's is the generic Inventory-snapshot unitWeightValue/
// unitWeightUnit already captured on this line when the code was matched.
export const formatUnitWeight = (mat) => {
  if (mat.fabricationCategory) {
    return mat.computedWeightPerPieceKg != null ? `${mat.computedWeightPerPieceKg.toFixed(2)} kg/pc` : '—';
  }
  if (mat.unitWeightValue === null || mat.unitWeightValue === undefined || mat.unitWeightValue === '') return '—';
  // Length/Area/Volume Used Unit (amountValue set): unitWeightUnit is the
  // reference unit this kg rate is defined per (e.g. "1 kg / Meter"),
  // independent of the item's own Used Unit — see rdController.js's
  // bomMaterialTotalWeight. Otherwise (Mass/Count) unitWeightUnit is still
  // the weight's own unit, always "Kilogram".
  return mat.amountValue != null
    ? `${mat.unitWeightValue} kg / ${mat.unitWeightUnit || '?'}`
    : `${mat.unitWeightValue} ${mat.unitWeightUnit || ''}`.trim();
};

// Formats one BOM_FIELD_CATALOG field's value for a given material row.
export const formatCatalogFieldValue = (catalogKey, mat) => {
  const fieldKey = CATALOG_KEY_TO_MATERIAL_FIELD[catalogKey];
  const raw = mat[fieldKey];
  if (catalogKey === 'itemCategories') {
    return Array.isArray(raw) && raw.length ? raw.join(', ') : '—';
  }
  if (catalogKey === 'dimensions') {
    // "Dimensions" stays a shared column used by every material — for a
    // Fabrication Master material, or any non-fabrication material entered
    // as Amount x Pieces (mat.amountValue set), it shows that line's own
    // consumed amount (not the weight — see formatUnitWeight's own column)
    // instead of the generic Inventory dimensions snapshot.
    return (mat.fabricationCategory || mat.amountValue != null) ? formatBomAmountOnly(mat) : formatDimensions(raw);
  }
  return (raw !== null && raw !== undefined && raw !== '') ? String(raw) : '—';
};
