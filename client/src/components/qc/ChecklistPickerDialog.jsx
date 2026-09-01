import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

// Self-fetching dialog for "select which rows off this {module, stage}
// master checklist apply to THIS target" — the one mechanic reused
// everywhere in the QC feature: an Inventory/Motor Master item, a Product
// Master product's Final checklist, or one specific Sub Child Part's
// Initial/Process checklist (see qcChecklistController.js's resolveTarget —
// targetPath is exactly the URL segment after `/api/rd/qc-checklist/
// {module}/{stage}/`, e.g. `item/ITEMID` or `item/ITEMID/part/CPID/SCPID`).
export default function ChecklistPickerDialog({ open, onOpenChange, module, stage, targetPath, title, emptyMasterHint, onManageMaster, onSaved }) {
  const API = `/api/rd/qc-checklist/${module}/${stage}`;
  const qc = useQueryClient();
  const [selection, setSelection] = useState({}); // masterItemId -> { checked, value }

  const { data: targetResponse, isFetching } = useQuery({
    queryKey: ['qc-target-checklist', module, stage, targetPath],
    queryFn: () => apiRequest('GET', `${API}/${targetPath}`),
    enabled: open && !!targetPath,
  });
  const master = targetResponse?.data?.master || [];
  const selected = targetResponse?.data?.selected || [];

  // Re-seed the draft selection whenever the dialog opens on a (possibly
  // new) target, once its data has actually arrived.
  useEffect(() => {
    if (!open || isFetching) return;
    const selMap = new Map(selected.map(s => [String(s.masterItemId), s]));
    const seed = {};
    for (const row of master) {
      const sel = selMap.get(String(row._id));
      if (row.isDiscontinued && !sel) continue; // hidden going forward, kept if already selected
      seed[row._id] = { checked: !!sel, value: sel?.expectedValue || '' };
    }
    setSelection(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isFetching, targetPath]);

  const saveMutation = useMutation({
    mutationFn: (selectedItems) => apiRequest('POST', `${API}/${targetPath}`, { selectedItems }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qc-target-checklist', module, stage, targetPath] });
      qc.invalidateQueries({ queryKey: ['qc-master', module, stage] }); // usage counts changed
      showSuccessToast('Checklist Saved', 'Checklist updated');
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e) => showSmartToast(e, 'Failed to save checklist'),
  });

  const toggleRow = (rowId) => setSelection(s => ({ ...s, [rowId]: { ...s[rowId], checked: !s[rowId]?.checked } }));
  const setRowValue = (rowId, value) => setSelection(s => ({ ...s, [rowId]: { ...s[rowId], value } }));

  const visibleRows = master.filter(row => selection[row._id] !== undefined);
  const hasInvalidValueRow = visibleRows.some(row => {
    const sel = selection[row._id];
    return sel?.checked && row.type === 'value' && !String(sel.value || '').trim();
  });
  const selectedCount = visibleRows.filter(row => selection[row._id]?.checked).length;
  const allSelected = visibleRows.length > 0 && selectedCount === visibleRows.length;

  const setAllChecked = (checked) => setSelection(s => {
    const next = { ...s };
    visibleRows.forEach(row => { next[row._id] = { ...next[row._id], checked }; });
    return next;
  });

  const handleSave = () => {
    const selectedItems = Object.entries(selection)
      .filter(([, v]) => v.checked)
      .map(([masterItemId, v]) => ({ masterItemId, expectedValue: v.value || '' }));
    saveMutation.mutate(selectedItems);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {master.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <p>{emptyMasterHint || 'No check items defined yet.'}</p>
            {onManageMaster && <Button variant="link" onClick={() => { onOpenChange(false); onManageMaster(); }}>Go to Manage Master Checklist</Button>}
          </div>
        ) : (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs text-slate-500">{selectedCount} of {visibleRows.length} selected</span>
              <div className="flex items-center gap-3">
                <button type="button" className="text-xs font-medium text-blue-600 hover:underline disabled:text-slate-300 disabled:no-underline" onClick={() => setAllChecked(true)} disabled={allSelected}>Select All</button>
                <button type="button" className="text-xs font-medium text-slate-500 hover:underline disabled:text-slate-300 disabled:no-underline" onClick={() => setAllChecked(false)} disabled={selectedCount === 0}>Clear All</button>
              </div>
            </div>
            {visibleRows.map(row => {
              const sel = selection[row._id];
              return (
                <div key={row._id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                  <Checkbox checked={!!sel?.checked} onCheckedChange={() => toggleRow(row._id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {row.label}
                      {row.isDiscontinued && <Badge variant="outline" className="ml-2 text-xs align-middle">Discontinued</Badge>}
                    </p>
                    {row.reference && <p className="text-xs text-slate-400">{row.reference}</p>}
                  </div>
                  {row.type === 'value'
                    ? (sel?.checked && (
                      <Input
                        className="w-44 flex-shrink-0"
                        placeholder="Expected value / tolerance"
                        value={sel?.value || ''}
                        onChange={e => setRowValue(row._id, e.target.value)}
                      />
                    ))
                    : <Badge variant="outline" className="text-xs flex-shrink-0">Checkbox</Badge>}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={master.length === 0 || hasInvalidValueRow || saveMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            Save Checklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
