// Shared between BOM Management (R&D) and Production Order Management —
// keeps how a BOM material's BOM_FIELD_CATALOG fields are read/displayed in
// sync across both, instead of two copies drifting apart.
// Mirrors server/models/RDBOMFieldConfig.js's BOM_FIELD_CATALOG and
// server/models/RDBOM.js's MaterialSchema, both field-for-field with
// Inventory's real form (SimpleInventoryForm.jsx).

export const CATALOG_KEY_TO_MATERIAL_FIELD = {
  itemType: 'inventoryItemType', name: 'item', code: 'code', modelNumber: 'modelNumber',
  brand: 'brand', itemCategories: 'itemCategories', sourceType: 'sourceType', itemSourceType: 'itemSourceType',
  metrology: 'metrology', materialGrade: 'materialGrade', unitWeightValue: 'unitWeightValue',
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

// Formats one BOM_FIELD_CATALOG field's value for a given material row.
export const formatCatalogFieldValue = (catalogKey, mat) => {
  const fieldKey = CATALOG_KEY_TO_MATERIAL_FIELD[catalogKey];
  const raw = mat[fieldKey];
  if (catalogKey === 'itemCategories') {
    return Array.isArray(raw) && raw.length ? raw.join(', ') : '—';
  }
  if (catalogKey === 'dimensions') {
    return formatDimensions(raw);
  }
  if (catalogKey === 'unitWeightValue') {
    return raw !== null && raw !== undefined && raw !== '' ? `${raw} ${mat.unitWeightUnit || ''}`.trim() : '—';
  }
  return (raw !== null && raw !== undefined && raw !== '') ? String(raw) : '—';
};
