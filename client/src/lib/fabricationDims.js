// Mirrors server/services/fabricationDemandService.js's dimensionSignature —
// used to compare a picked/entered dimension set against catalog
// dimensionVariants client-side (an "Exact Match"/dedupe hint), never
// trusted as the actual validation — the server recomputes this itself.
export const dimensionSignature = (dims) => Object.entries(dims || {})
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}:${v}`)
  .join(',');

export const formatDims = (dims) => Object.entries(dims || {})
  .filter(([, v]) => v !== undefined && v !== null && v !== '')
  .map(([k, v]) => `${k}: ${v}mm`)
  .join(', ') || '—';

// A fabrication PurchaseRequest's own `quantity`/`receivedQuantity` fields
// hold the vendor-facing weight (kg) the lines convert to, not a piece
// count — so anywhere a request-level "Qty" is displayed for a fabrication
// item, sum the per-dimension line quantities instead (real piece count).
export const fabricationPieceCount = (lines) =>
  (lines || []).reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

// A fabrication Item's flat `qty` field is intentionally left at 0 (see
// qcController.js) — its real stock lives per-dimension in
// dimensionVariants[].subStock. Anywhere an Item's overall stock count is
// displayed, sum those instead for fabrication items so it doesn't read 0.
export const itemDisplayQty = (item) =>
  item?.fabricationRef && item.dimensionVariants?.length > 0
    ? item.dimensionVariants.reduce((sum, dv) => sum + (Number(dv.subStock) || 0), 0)
    : (item?.qty ?? 0);

// Pairs with itemDisplayQty above — a fabrication item's stock figure is
// always a piece count (dimensionVariants[].subStock, same unit Store
// actually received/counted in — Receive Unit), never `item.unit` (the Used
// Unit, a Length/Area unit meant for BOM consumption, e.g. "Centimeter").
// Labeling a piece count with the Used Unit reads as nonsense ("18
// Centimeter" when it's really 18 pieces) — this is the correct pairing
// wherever itemDisplayQty is shown. Non-fabrication items read receiveUnit
// too (enforced equal to unit server-side — see sanitizeItemData — since
// there's no conversion between two arbitrary unit types without
// fabrication's geometry × density bridge); `item.unit` is only a fallback
// for data saved before that enforcement existed.
export const itemDisplayUnit = (item) =>
  item?.fabricationRef ? (item.receiveUnit || 'Pieces') : (item?.receiveUnit || item?.unit);

// Mirrors server/utils/unitConversion.js exactly — the only units the
// server can actually convert (Length Unit/Area Unit are seeded defaults
// with a fixed conversion table, not arbitrary company-added units).
export const LENGTH_UNITS = ['Millimeter', 'Centimeter', 'Meter', 'Kilometer', 'Inch', 'Foot'];
export const LENGTH_UNIT_TO_MM = { Millimeter: 1, Centimeter: 10, Meter: 1000, Kilometer: 1e6, Inch: 25.4, Foot: 304.8 };
export const AREA_UNITS = ['Millimeter Square', 'Centimeter Square', 'Meter Square', 'Inch Square', 'Foot Square'];
export const AREA_UNIT_TO_MM2 = { 'Millimeter Square': 1, 'Centimeter Square': 100, 'Meter Square': 1e6, 'Inch Square': 645.16, 'Foot Square': 92903.04 };
export const toMm = (value, unit) => (LENGTH_UNIT_TO_MM[unit] && Number(value) > 0) ? Number(value) * LENGTH_UNIT_TO_MM[unit] : null;
export const toMm2 = (value, unit) => (AREA_UNIT_TO_MM2[unit] && Number(value) > 0) ? Number(value) * AREA_UNIT_TO_MM2[unit] : null;

// Auto-scales an mm² figure to whichever of mm²/m² reads naturally — a small
// sheet-metal cut (e.g. 110mm x 110mm = 12,100mm²) shown as "0.012 m²" reads
// like a rounding error even though the math is correct; showing it in mm²
// instead (the app's own base unit throughout fabrication) is both accurate
// and legible. 1,000,000mm² = 1m² is the crossover.
export const formatAreaMm2 = (areaMm2) => {
  if (areaMm2 == null || isNaN(areaMm2)) return '—';
  return areaMm2 >= 1e6
    ? `${(areaMm2 / 1e6).toFixed(3)} m²`
    : `${Math.round(areaMm2).toLocaleString()} mm²`;
};
