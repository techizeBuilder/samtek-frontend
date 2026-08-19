import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShapeTileIcon } from './FabricationShapeIcons';

// "Select Category" grid — Modal 1 of the Add Fabrication Item flow. Shows
// the 11 shape tiles from FABRICATION_CATEGORY_GROUPS (fabricationCategories.js);
// picking one opens DimensionCalculatorModal for that group.
export default function CategoryPickerModal({ open, onClose, groups = [], onSelect }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Select Category</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onSelect(g)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-blue-50/60 hover:bg-blue-100 hover:border-blue-400 transition-colors py-5 px-3"
            >
              <ShapeTileIcon group={g.key} className="h-14 w-14" />
              <span className="text-sm font-semibold text-slate-700">{g.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
