// "Price provisional" (make or buy, 2026-10-28 —
// server/docs/make-or-buy-parts-2026-10.md §3): a machine bought with no
// purchase price yet, or whose BOM price still leans on a part with no
// purchase price yet (Accounts hasn't entered an estimate). Sales is warned,
// never blocked. Works on any item carrying pricePending / priceProvisional
// (an Item, a Product Master response, or the order form's BOM-cost lookup).
export function provisionalNote(item) {
  if (!item) return null;
  const parts = item.priceProvisional?.parts || item.provisional?.parts || item.priceProvisionalParts || [];
  const pending = item.pricePending || item.provisional?.pending;
  if (pending) return 'Price provisional — its purchase price isn\'t set yet (Accounts to enter an estimate).';
  if (parts.length) return `Price provisional — ${parts.join(', ')} purchase price isn't set yet.`;
  return null;
}
