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
export default function FabricationItemPicker({ open, onClose, onSelect }) {
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['fabrication-items-picker', search],
    queryFn: () => {
      const params = new URLSearchParams({ discontinued: 'false' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/fabrication-master/items?${params.toString()}`);
    },
    enabled: open,
  });
  const items = data?.data || [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Select Fabrication Item</DialogTitle></DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input autoFocus className="pl-8" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto divide-y divide-slate-100">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-6">No fabrication items found. Create one in Fabrication Master first.</p>
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
