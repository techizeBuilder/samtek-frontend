import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Layers } from 'lucide-react';

// Dialog-over-Dialog picker opened from SimpleInventoryForm when "Item
// Process Type" = Fabrication Item — lists Fabrication Master catalog
// entries; selecting one autofills the Add Item form (see
// SimpleInventoryForm.jsx's handleFabricationSelect).
//
// Two modes, keyed off whether the Item being added/edited already has a
// fabricationRef (SimpleInventoryForm's "Select" vs "Change" button):
//  - Add ("Select", onlyId null): lists only catalog entries no OTHER Item
//    has already been created from — an entry maps to exactly one Item, so
//    R&D can't accidentally link two Items to the same one.
//  - Change (onlyId set to the Item's current fabricationRef): shows ONLY
//    that one entry — re-selecting it is purely a re-sync (e.g. after R&D
//    edits that entry in Fabrication Master and this Item needs the
//    refreshed dimensions/weight), never a way to switch to a different
//    entry.
export default function FabricationItemPicker({ open, onClose, onSelect, onlyId }) {
  const [search, setSearch] = useState('');
  const isChangeMode = !!onlyId;

  const { data } = useQuery({
    queryKey: ['fabrication-items-picker', isChangeMode ? onlyId : search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (isChangeMode) {
        params.set('onlyId', onlyId);
      } else {
        params.set('discontinued', 'false');
        params.set('unusedOnly', 'true');
        if (search) params.set('search', search);
      }
      return apiRequest('GET', `/api/fabrication-master/items?${params.toString()}`);
    },
    enabled: open,
  });
  const items = data?.data || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isChangeMode ? 'Re-sync Fabrication Item' : 'Select Fabrication Item'}</DialogTitle>
        </DialogHeader>
        {isChangeMode ? (
          <p className="text-xs text-slate-500 -mt-1 mb-1">
            Confirm below to pull this entry's latest dimensions/weight from Fabrication Master. To link a
            different entry entirely, create a new Item instead.
          </p>
        ) : (
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input autoFocus className="pl-8" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}
        <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto divide-y divide-slate-100">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">
              {isChangeMode ? 'Could not find this item\'s linked Fabrication Master entry.' : 'No fresh fabrication items found — every catalog entry is already linked to an Item, or none exist yet.'}
            </p>
          ) : items.map((it) => (
            <button
              key={it._id}
              type="button"
              onClick={() => onSelect(it)}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Layers className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                <span className="truncate">
                  <span className="font-mono text-xs font-semibold text-blue-700">{it.itemCode}</span>{' '}
                  <span className="text-sm text-slate-700">{it.itemName}</span>
                </span>
              </span>
              <span className="text-[10px] text-slate-400 flex-shrink-0">{(it.dimensions || []).length} dim.</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
