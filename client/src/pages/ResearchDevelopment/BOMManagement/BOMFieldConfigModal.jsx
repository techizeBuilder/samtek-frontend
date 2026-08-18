import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

// BOM Format & Modification: which Inventory-item fields show as columns in
// every BOM's material table. The field list is always bounded to
// BOM_FIELD_CATALOG (server-side) — nothing outside Inventory's own form.
// Saved once, applies to every BOM going forward, editable any time.
export default function BOMFieldConfigModal({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState([]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['rd-bom-field-config'],
    queryFn: () => apiRequest('GET', '/api/rd/bom-field-config'),
    enabled: open,
  });
  const catalog = response?.data?.catalog || [];

  useEffect(() => {
    // A previously-saved selection can reference a field that's since been
    // removed from BOM_FIELD_CATALOG (e.g. it was dropped from Inventory's
    // own form) — the checkbox list below only ever renders `catalog`, so a
    // stale key never shows as checked, but it silently rode along in
    // `selected` and got resubmitted on every Save, which the server now
    // rejects outright. Drop anything not in the current catalog on load.
    if (response?.data?.enabledFields) {
      const validKeys = new Set((response.data.catalog || []).map(f => f.key));
      setSelected(response.data.enabledFields.filter(k => validKeys.has(k)));
    }
  }, [response]);

  const saveMutation = useMutation({
    mutationFn: (enabledFields) => apiRequest('PUT', '/api/rd/bom-field-config', { enabledFields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rd-bom-field-config'] });
      showSuccessToast('Saved', 'BOM format updated — applies to every BOM');
      onOpenChange(false);
    },
    onError: (e) => showSmartToast(e, 'Failed to save BOM format'),
  });

  const toggle = (key) => setSelected(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-blue-600" /> BOM Format & Modification</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500 -mt-2">
          Choose which Inventory item fields appear as columns in the BOM material table. This applies to every BOM, not just the one you're currently editing.
        </p>
        {isLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 py-2 max-h-80 overflow-y-auto">
            {catalog.map(f => (
              <label key={f.key} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" className="h-4 w-4" checked={selected.includes(f.key)} onChange={() => toggle(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(selected)} disabled={saveMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            Save Format
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
