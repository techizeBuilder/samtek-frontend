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
