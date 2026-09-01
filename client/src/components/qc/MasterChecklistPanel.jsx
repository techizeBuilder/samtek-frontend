import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const emptyAddForm = { label: '', type: 'checkbox', reference: '' };

// Content-only — manages ONE {module, stage} master checklist (row list +
// inline edit + add form). No Dialog wrapper of its own, so a caller can
// drop it straight into a single-checklist dialog (Inventory QC/Motor
// Master QC) or into one tab of a multi-stage dialog (Product Master QC's
// Initial/Process/Final) without this component needing to know which.
export default function MasterChecklistPanel({ module, stage, featureKey }) {
  const API = `/api/rd/qc-checklist/${module}/${stage}`;
  const qc = useQueryClient();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', featureKey, 'add');
  const canEdit = hasFeatureAccess('rnd', featureKey, 'edit');
  const canDelete = hasFeatureAccess('rnd', featureKey, 'delete');

  const [addForm, setAddForm] = useState(emptyAddForm);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editForm, setEditForm] = useState(emptyAddForm);
  const [deleteRowTarget, setDeleteRowTarget] = useState(null);

  const { data: masterResponse } = useQuery({
    queryKey: ['qc-master', module, stage],
    queryFn: () => apiRequest('GET', `${API}/master`),
  });
  const masterRows = masterResponse?.data || [];

  const invalidateMaster = () => qc.invalidateQueries({ queryKey: ['qc-master', module, stage] });

  const addRowMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', `${API}/master`, data),
    onSuccess: () => { invalidateMaster(); setAddForm(emptyAddForm); },
    onError: (e) => showSmartToast(e, 'Failed to add check item'),
  });
  const updateRowMutation = useMutation({
    mutationFn: ({ rowId, data }) => apiRequest('PUT', `${API}/master/${rowId}`, data),
    onSuccess: () => { invalidateMaster(); qc.invalidateQueries({ queryKey: ['qc-target-checklist', module, stage] }); },
    onError: (e) => showSmartToast(e, 'Failed to update check item'),
  });
  const deleteRowMutation = useMutation({
    mutationFn: (rowId) => apiRequest('DELETE', `${API}/master/${rowId}`),
    onSuccess: () => { invalidateMaster(); showSuccessToast('Check Item Deleted', 'Removed from the master checklist'); },
    onError: (e) => showSmartToast(e, 'Failed to delete check item'),
  });
  const reorderMutation = useMutation({
    mutationFn: (orderedIds) => apiRequest('PUT', `${API}/master/reorder`, { orderedIds }),
    onSuccess: invalidateMaster,
    onError: (e) => showSmartToast(e, 'Failed to reorder checklist'),
  });

  const moveRow = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= masterRows.length) return;
    const ids = masterRows.map(r => r._id);
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    reorderMutation.mutate(ids);
  };
  const startEdit = (row) => {
    setEditingRowId(row._id);
    setEditForm({ label: row.label, type: row.type, reference: row.reference || '' });
  };
  const saveEdit = (rowId) => {
    updateRowMutation.mutate({ rowId, data: editForm }, { onSuccess: () => setEditingRowId(null) });
  };

  return (
    <div>
      <div className="space-y-2 py-2">
        {masterRows.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">No check items yet. Add the first one below.</div>
        )}
        {masterRows.map((row, i) => (
          editingRowId === row._id ? (
            <div key={row._id} className="flex flex-wrap items-center gap-2 bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-200">
              <Input className="flex-1 min-w-[160px]" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
              <select className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white" value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                <option value="checkbox">Checkbox</option>
                <option value="value">Value Entry</option>
              </select>
              <Input className="w-44" placeholder="Reference (optional)" value={editForm.reference} onChange={e => setEditForm(f => ({ ...f, reference: e.target.value }))} />
              <Button size="sm" onClick={() => saveEdit(row._id)} disabled={!editForm.label.trim()}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingRowId(null)}>Cancel</Button>
            </div>
          ) : (
            <div key={row._id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${row.isDiscontinued ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100'}`}>
              <span className="text-xs text-slate-400 w-5 flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{row.label}</p>
                {row.reference && <p className="text-xs text-slate-400 truncate">{row.reference}</p>}
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0">{row.type === 'checkbox' ? 'Checkbox' : 'Value Entry'}</Badge>
              <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">{row.usageCount} item{row.usageCount === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveRow(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveRow(i, 1)} disabled={i === masterRows.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                {canEdit && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button>}
                {canEdit && (
                  <Switch
                    checked={!row.isDiscontinued}
                    onCheckedChange={(v) => updateRowMutation.mutate({ rowId: row._id, data: { isDiscontinued: !v } })}
                    title={row.isDiscontinued ? 'Discontinued — reactivate' : 'Active — click to discontinue'}
                  />
                )}
                {canDelete && (
                  <Button
                    size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                    disabled={row.usageCount > 0}
                    title={row.usageCount > 0 ? `Used by ${row.usageCount} item(s) — discontinue instead` : 'Delete'}
                    onClick={() => setDeleteRowTarget(row)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        ))}
      </div>

      {canAdd && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <Input
            className="flex-1 min-w-[200px]"
            placeholder='New check item, e.g. "Visual — no rust/damage"'
            value={addForm.label}
            onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))}
          />
          <select className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white" value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}>
            <option value="checkbox">Checkbox</option>
            <option value="value">Value Entry</option>
          </select>
          <Input className="w-44" placeholder="Reference (optional)" value={addForm.reference} onChange={e => setAddForm(f => ({ ...f, reference: e.target.value }))} />
          <Button onClick={() => addRowMutation.mutate(addForm)} disabled={!addForm.label.trim() || addRowMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleteRowTarget} onOpenChange={() => setDeleteRowTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Check Item</AlertDialogTitle>
            <AlertDialogDescription>Remove "{deleteRowTarget?.label}" from this master checklist? This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { deleteRowMutation.mutate(deleteRowTarget._id); setDeleteRowTarget(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
