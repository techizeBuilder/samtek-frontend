// Shared between BOM Management (R&D) and Production Order Management —
// keeps how a BOM material's BOM_FIELD_CATALOG fields are read/displayed in
// sync across both, instead of two copies drifting apart.
// Mirrors server/models/RDBOMFieldConfig.js's BOM_FIELD_CATALOG and
// server/models/RDBOM.js's MaterialSchema, both field-for-field with
// Inventory's real form (SimpleInventoryForm.jsx).

export const CATALOG_KEY_TO_MATERIAL_FIELD = {
  name: 'item', code: 'code', description: 'description', brand: 'brand',
  modelNumber: 'modelNumber', size: 'size', metrology: 'metrology', materialGrade: 'materialGrade',
  unitWeightValue: 'unitWeightValue', dimensions: 'dimensions',
  category: 'category', subCategory: 'subCategory', sourceType: 'sourceType', itemSourceType: 'itemSourceType',
  unit: 'unit', itemCategories: 'itemCategories', specifications: 'specifications', applications: 'applications',
  stdCost: 'stdCost', purchaseCost: 'unitPrice', salePrice: 'salePrice', mrp: 'mrp', gst: 'gst', hsn: 'hsn',
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
  if (catalogKey === 'specifications') {
    return Array.isArray(raw) && raw.length ? raw.filter(s => s.key).map(s => `${s.key}: ${s.value}`).join(', ') : '—';
  }
  if (catalogKey === 'itemCategories' || catalogKey === 'applications') {
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
