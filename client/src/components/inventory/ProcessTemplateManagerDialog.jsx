import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Pencil, Trash2, Check } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

// Master-data screen for the Category -> Internal Process catalog (see
// ProcessDefinitionEditor.jsx and server/docs/process-inhouse-outsource-
// redesign-discussion-2026-09.md). Separate from BOM creation on purpose —
// confirmed with the user 2026-09-22: a template is built here first, BOM
// creation only ever picks from what's already defined. Reached via a
// "Process Templates" button on each of the three BOM Management tabs.
const BOM_LEVEL_LABEL = { SubChildPart: 'Sub Child Part', ChildPart: 'Child Part', Machine: 'Machine' };

function InlineAdd({ placeholder, onAdd, pending, buttonLabel }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const save = () => {
    const v = text.trim();
    if (v) onAdd(v, () => { setAdding(false); setText(''); });
  };
  if (!adding) {
    return (
      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAdding(true)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {buttonLabel}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Input autoFocus className="h-8 text-xs" placeholder={placeholder}
        value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()} />
      <Button size="sm" className="h-8 text-xs" disabled={!text.trim() || pending} onClick={save}>Add</Button>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setAdding(false); setText(''); }}>Cancel</Button>
    </div>
  );
}

function StepChip({ name, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  if (renaming) {
    return (
      <span className="inline-flex items-center gap-1">
        <Input autoFocus className="h-7 w-32 text-xs" value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (onRename(draft), setRenaming(false))} />
        <button type="button" onClick={() => { onRename(draft); setRenaming(false); }} className="text-emerald-600 hover:text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => { setRenaming(false); setDraft(name); }} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-600">
      <button type="button" onClick={() => setRenaming(true)} className="hover:text-blue-600">{name}</button>
      <button type="button" onClick={onDelete} className="text-slate-400 hover:text-red-500"><X className="h-3 w-3" /></button>
    </span>
  );
}

function CategoryBlock({ option, onRenameCategory, onDeleteCategory, onAddProcess, onRenameProcess, onDeleteProcess, addProcessPending }) {
  const [renaming, setRenaming] = useState(false);
  const [labelDraft, setLabelDraft] = useState(option.label);

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
      <div className="flex items-center justify-between gap-2">
        {renaming ? (
          <div className="flex items-center gap-1.5 flex-1">
            <Input autoFocus className="h-8 text-sm" value={labelDraft} onChange={e => setLabelDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (onRenameCategory(labelDraft), setRenaming(false))} />
            <Button size="sm" className="h-8" onClick={() => { onRenameCategory(labelDraft); setRenaming(false); }}>Save</Button>
            <Button size="sm" variant="outline" className="h-8" onClick={() => { setRenaming(false); setLabelDraft(option.label); }}>Cancel</Button>
          </div>
        ) : (
          <>
            <button type="button" className="text-sm font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1.5" onClick={() => setRenaming(true)}>
              {option.label} <Pencil className="h-3 w-3 opacity-40" />
            </button>
            <button type="button" onClick={onDeleteCategory} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {option.internalProcesses.length === 0 && <span className="text-xs text-slate-400 italic">No steps yet.</span>}
        {option.internalProcesses.map(name => (
          <StepChip key={name} name={name}
            onRename={(newName) => onRenameProcess(name, newName)}
            onDelete={() => onDeleteProcess(name)} />
        ))}
        <InlineAdd placeholder="e.g. Powder Coating" buttonLabel="Add Step" pending={addProcessPending} onAdd={onAddProcess} />
      </div>
    </div>
  );
}

export default function ProcessTemplateManagerDialog({ bomLevel, open, onClose }) {
  const qc = useQueryClient();
  const queryKey = ['process-category-options', bomLevel];
  const { data } = useQuery({
    queryKey,
    queryFn: () => apiRequest('GET', `/api/rd/process-category-options?bomLevel=${bomLevel}`),
    enabled: open && !!bomLevel,
  });
  const categories = data?.data || [];
  const invalidate = () => qc.invalidateQueries({ queryKey });

  const addCategory = useMutation({
    mutationFn: (label) => apiRequest('POST', '/api/rd/process-category-options', { bomLevel, label }),
    onSuccess: invalidate,
    onError: (e) => showSmartToast(e, 'Failed to add category'),
  });
  const renameCategory = useMutation({
    mutationFn: ({ id, label }) => apiRequest('PUT', `/api/rd/process-category-options/${id}`, { label }),
    onSuccess: invalidate,
    onError: (e) => showSmartToast(e, 'Failed to rename category'),
  });
  const deleteCategory = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/rd/process-category-options/${id}`),
    onSuccess: () => { invalidate(); showSuccessToast('Deleted', 'Category removed.'); },
    onError: (e) => showSmartToast(e, 'Failed to delete category'),
  });
  const addProcess = useMutation({
    mutationFn: ({ id, name }) => apiRequest('POST', `/api/rd/process-category-options/${id}/internal-processes`, { name }),
    onSuccess: invalidate,
    onError: (e) => showSmartToast(e, 'Failed to add step'),
  });
  const renameProcess = useMutation({
    mutationFn: ({ id, oldName, newName }) => apiRequest('PUT', `/api/rd/process-category-options/${id}/internal-processes/rename`, { oldName, newName }),
    onSuccess: invalidate,
    onError: (e) => showSmartToast(e, 'Failed to rename step'),
  });
  const deleteProcess = useMutation({
    mutationFn: ({ id, name }) => apiRequest('DELETE', `/api/rd/process-category-options/${id}/internal-processes/${encodeURIComponent(name)}`),
    onSuccess: () => { invalidate(); showSuccessToast('Deleted', 'Step removed.'); },
    onError: (e) => showSmartToast(e, 'Failed to delete step'),
  });

  const levelLabel = BOM_LEVEL_LABEL[bomLevel] || bomLevel;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Process Templates — {levelLabel}</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-400 -mt-2">
          Categories and steps you define here become pickable when building a {levelLabel}'s Process Definition. Deleting one that's already in use on a BOM is blocked until it's removed from there first.
        </p>
        <div className="space-y-3 py-2">
          {categories.length === 0 && <p className="text-xs text-slate-400 italic">No categories yet — add one below.</p>}
          {categories.map(opt => (
            <CategoryBlock
              key={opt._id}
              option={opt}
              onRenameCategory={(label) => label.trim() && label.trim() !== opt.label && renameCategory.mutate({ id: opt._id, label: label.trim() })}
              onDeleteCategory={() => deleteCategory.mutate(opt._id)}
              onAddProcess={(name, done) => addProcess.mutate({ id: opt._id, name }, { onSuccess: () => { invalidate(); done(); } })}
              onRenameProcess={(oldName, newName) => newName.trim() && newName.trim() !== oldName && renameProcess.mutate({ id: opt._id, oldName, newName: newName.trim() })}
              onDeleteProcess={(name) => deleteProcess.mutate({ id: opt._id, name })}
              addProcessPending={addProcess.isPending}
            />
          ))}
          <InlineAdd placeholder="e.g. Fabrication" buttonLabel="Add Category" pending={addCategory.isPending}
            onAdd={(label, done) => addCategory.mutate(label, { onSuccess: () => { invalidate(); done(); } })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
