// Label carriers (2026-11-05): the fill buttons and the Save list, kept apart
// from the screen. rows: { [pieceId]: { no, nothing, picks: { [partName]: [id, …] } } }.
// pieces and pools come from GET /api/part-labels/waiting/:itemId.

// A row for a new piece: a repaired or returned one starts with what it holds.
export function startRow(piece, pool) {
  const picks = {};
  for (const id of piece.picked || []) {
    const opt = pool?.options.find(o => String(o.id) === String(id));
    if (opt) (picks[opt.itemName] = picks[opt.itemName] || []).push(String(opt.id));
  }
  return { no: '', nothing: false, picks };
}

// Ids already chosen on any row of this pool, other than `exceptPiece`'s.
export function usedInPool(pieces, rows, poolKey, exceptPiece = null) {
  const used = new Set();
  for (const p of pieces) {
    if (p.pool !== poolKey || p._id === exceptPiece) continue;
    const row = rows[p._id];
    if (!row || row.nothing) continue;
    for (const list of Object.values(row.picks || {})) for (const id of list) if (id) used.add(String(id));
  }
  return used;
}

// Gives the numbers to rows with none yet, top to bottom. Typed ones stay.
export function fillStickers(pieces, rows, numbers) {
  const next = { ...rows };
  const queue = [...numbers];
  for (const p of pieces) {
    if (!queue.length) break;
    const row = next[p._id];
    if (!row || row.nothing || String(row.no || '').trim()) continue;
    next[p._id] = { ...row, no: queue.shift() };
  }
  return next;
}

// How many rows fillStickers would fill.
export function emptyStickerRows(pieces, rows) {
  return pieces.filter(p => { const r = rows[p._id]; return r && !r.nothing && !String(r.no || '').trim(); }).length;
}

// The suggestion Store checks: each row's empty slots, in list order, up to each
// part's usual count. What's already chosen stays where it is.
export function fillInside(pieces, pools, rows) {
  const next = { ...rows };
  for (const p of pieces) {
    const row = next[p._id];
    const pool = pools[p.pool];
    if (!row || row.nothing || !pool) continue;
    const picks = { ...row.picks };
    for (const type of pool.types) {
      const used = usedInPool(pieces, next, p.pool, p._id);
      const mine = (picks[type.itemName] || []).filter(Boolean).map(String);
      for (const o of pool.options) {
        if (mine.length >= type.perPiece) break;
        if (o.itemName !== type.itemName || used.has(String(o.id)) || mine.includes(String(o.id))) continue;
        mine.push(String(o.id));
      }
      picks[type.itemName] = mine;
    }
    next[p._id] = { ...row, picks };
  }
  return next;
}

// Rows to save: a sticker number or Nothing inside. The rest keep waiting.
export function saveList(pieces, pools, rows) {
  const out = [];
  for (const p of pieces) {
    const row = rows[p._id];
    if (!row) continue;
    if (row.nothing) { out.push({ labelId: p._id, nothingInside: true }); continue; }
    const no = String(row.no || '').trim();
    if (!no) continue;
    const chosen = new Set(Object.values(row.picks || {}).flat().filter(Boolean).map(String));
    const options = pools[p.pool]?.options || [];
    out.push({
      labelId: p._id, labelNo: no,
      unitIds: options.filter(o => o.kind === 'unit' && chosen.has(String(o.id))).map(o => o.id),
      labelIds: options.filter(o => o.kind === 'label' && chosen.has(String(o.id))).map(o => o.id),
    });
  }
  return out;
}
