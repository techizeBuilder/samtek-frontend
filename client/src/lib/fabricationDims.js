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
