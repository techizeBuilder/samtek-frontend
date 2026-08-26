// Shared between BOM Management (R&D) and Production Order Management —
// keeps how a BOM material's BOM_FIELD_CATALOG fields are read/displayed in
// sync across both, instead of two copies drifting apart.
// Mirrors server/models/RDBOMFieldConfig.js's BOM_FIELD_CATALOG and
// server/models/RDBOM.js's MaterialSchema, both field-for-field with
// Inventory's real form (SimpleInventoryForm.jsx).

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
  return (mat.unitWeightValue !== null && mat.unitWeightValue !== undefined && mat.unitWeightValue !== '')
    ? `${mat.unitWeightValue} ${mat.unitWeightUnit || ''}`.trim()
    : '—';
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
