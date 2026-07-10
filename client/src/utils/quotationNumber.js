// Shared quotation-number formatting logic — used both by Admin Settings
// (to show a live "Example" preview) and by the Quotation page (to build the
// actual "Quotation No" shown in preview/download/print/email).

// India financial year runs Apr–Mar, e.g. "25-26" for Apr 2025 – Mar 2026.
export function currentFinancialYearShort(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  const startY = m >= 4 ? y : y - 1;
  const endY = startY + 1;
  return `${String(startY).slice(-2)}-${String(endY).slice(-2)}`;
}

// `setting` = { prefix, suffix, bifurcateWith, financialYearPosition } (one row
// from AdminSettings.quotationNumberSettings). `leadCode` supplies the unique
// running number (digits of e.g. "LD-0022" -> "0022"); falls back to a
// placeholder when absent so the setting can be previewed before any lead exists.
export function buildQuotationNumber(setting, leadCode, fyStr = currentFinancialYearShort()) {
  const s = setting || {};
  const prefix = (s.prefix || 'SM').trim();
  const suffix = (s.suffix || '').trim();
  const sep = s.bifurcateWith && s.bifurcateWith !== 'None' ? s.bifurcateWith : '';
  const digits = (leadCode || '').replace(/\D/g, '') || '0001';

  let core = `${prefix}${sep}${digits}`;
  if (suffix) core += `${sep}${suffix}`;

  if (s.financialYearPosition === 'before_prefix') return `${fyStr}${sep}${core}`;
  if (s.financialYearPosition === 'after_prefix') return `${core}${sep}${fyStr}`;
  return core;
}
