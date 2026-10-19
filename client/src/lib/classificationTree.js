// Classification values (RD master options) are linked to their parent OPTION
// by parentId (2026-10-19, client bug): two same-named parents — a Sub
// Category "Chakki" under two Categories — each have their own children.
// Pages hold the chosen values as TEXT (products store text), so these
// helpers walk the chosen path down the tree to find the right option at each
// level. Values not linked yet (before the migration,
// server/scripts/linkClassificationParents.js) fall back to the old match on
// the parent's text.
//
// `masterOptions` is the grouped response of GET /api/rd/master-options
// ({ PType: [...], Category: [...], ... }); `path` is [[key, value], ...] from
// the top, e.g. [['PType', 'Atta Chakki'], ['Category', 'Chakki']].

const idOf = (x) => (x == null ? null : String(x));

// Is `option` a child of `parent` (the option one level up, or null at the top)?
function isChildOf(option, parent, parentValue) {
  if (!parent) return !option.parentId && (parentValue == null || option.parentValue === parentValue);
  if (option.parentId) return idOf(option.parentId) === idOf(parent._id);
  return option.parentValue === parent.value; // not linked yet (legacy)
}

// The options of `childKey` under the option at the end of `path`.
export function childOptions(masterOptions, childKey, path = []) {
  const list = masterOptions?.[childKey] || [];
  if (!path.length) return list;
  const parent = resolvePath(masterOptions, path);
  if (!parent) return [];
  return list.filter(o => isChildOf(o, parent));
}

// The option at the end of `path`, or null when a level isn't chosen / found.
export function resolvePath(masterOptions, path = []) {
  let parent = null;
  for (const [key, value] of path) {
    if (value == null || value === '') return null;
    const candidates = (masterOptions?.[key] || []).filter(o => o.value === value);
    const match = parent
      ? candidates.find(o => isChildOf(o, parent))
      : candidates.find(o => !o.parentId) || candidates[0];
    if (!match) return null;
    parent = match;
  }
  return parent;
}
