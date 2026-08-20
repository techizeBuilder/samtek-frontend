// Unit types and their allowed units (per ISA reference tables — blue-ticked units only).
// To change which units appear under a type, edit the arrays below.
export const UNIT_TYPE_OPTIONS = {
  'Length Unit': ['Millimeter', 'Centimeter', 'Meter', 'Kilometer', 'Inch', 'Foot'],
  'Area Unit': ['Millimeter Square', 'Centimeter Square', 'Meter Square', 'Inch Square', 'Foot Square'],
  'Volume Unit': ['Centimeter Cube', 'Meter Cube', 'Liter', 'Inch Cube', 'Foot Cube'],
  'Mass Unit': ['Gram', 'Kilogram', 'Tonne'],
  'Count Unit': ['NOS','Pieces'],
};

export const UNIT_TYPES = Object.keys(UNIT_TYPE_OPTIONS);

// Reverse lookup so existing records can preselect their unit type from a saved unit.
export const getUnitTypeForUnit = (unit) =>
  UNIT_TYPES.find((type) => UNIT_TYPE_OPTIONS[type].includes(unit)) || '';

// Units for a type; keeps a legacy saved unit visible even if it's not in the list.
export const getUnitsForType = (unitType, currentUnit) => {
  const units = UNIT_TYPE_OPTIONS[unitType] || [];
  return currentUnit && !units.includes(currentUnit) ? [currentUnit, ...units] : units;
};
