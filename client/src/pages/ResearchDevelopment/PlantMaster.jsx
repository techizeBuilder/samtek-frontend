import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Factory, Plus, Search, Eye, Edit2, Ban, RefreshCw, XCircle } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const emptyForm = {
  category: '', subCategory: '', name: '', productionRate: '',
  machines: [], // [{ item: <Item _id>, quantity }]
  motors: [],   // [{ item: <Item _id>, quantity }]
};

export default function PlantMaster() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [machineSearch, setMachineSearch] = useState('');
  const [motorSearch, setMotorSearch] = useState('');
  const [newOptionModal, setNewOptionModal] = useState({ open: false, field: '', value: '', parentValue: '' });

  // ── Plant's own scoped Category -> Sub Category cascade (RDMasterOption
  // fields PlantCategory/PlantSubCategory) — deliberately separate from
  // Product Master's and Motor Master's own classification lists. ──
  const { data: optionsResponse } = useQuery({
    queryKey: ['rd-master-options'],
    queryFn: () => apiRequest('GET', '/api/rd/master-options'),
  });
  const masterOptions = optionsResponse?.data || {};
  const categoryOptions = masterOptions.PlantCategory || [];
  const subCategoryOptionsFor = (categoryVal) => (masterOptions.PlantSubCategory || []).filter(o => o.parentValue === categoryVal);

  const addOptionMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/rd/master-options', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rd-master-options'] }),
  });

  const handleAddOption = async () => {
    if (!newOptionModal.value) return;
    try {
      await addOptionMutation.mutateAsync({ field: newOptionModal.field, value: newOptionModal.value, parentValue: newOptionModal.parentValue || null });
      const fieldKey = newOptionModal.field === 'PlantCategory' ? 'category' : 'subCategory';
      const setState = editOpen ? setEditForm : setForm;
      setState(f => ({ ...f, [fieldKey]: newOptionModal.value }));
      setNewOptionModal({ open: false, field: '', value: '', parentValue: '' });
      showSuccessToast('Option Added', 'New option added successfully');
    } catch (e) {
      showSmartToast(e, 'Failed to add option');
    }
  };

  // ── Product Master machine list (full, unpaginated) for the machine selector ──
  const { data: machinesResponse } = useQuery({
    queryKey: ['rd-machines'],
    queryFn: () => apiRequest('GET', '/api/rd/machines'),
  });
  const machines = machinesResponse?.data || [];

  // ── Motor Master motor list for the motor selector — same Item collection,
  // filtered to productKind:Motor, same as Motor Master's own list query. ──
  const { data: motorsResponse } = useQuery({
    queryKey: ['plant-master-motors'],
    queryFn: () => apiRequest('GET', '/api/items?type=Product&productKind=Motor&limit=500'),
  });
  const motors = motorsResponse?.items || motorsResponse?.data || [];

  // ── Plants list ──
  const { data: plantsResponse, isLoading } = useQuery({
    queryKey: ['rd-plants', 'list', { search, showDiscontinued }],
    queryFn: () => {
      const params = new URLSearchParams({ discontinued: showDiscontinued ? 'true' : 'false' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/rd/plants?${params.toString()}`);
    },
  });
  const plants = plantsResponse?.data || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['rd-plants'] });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/rd/plants', data),
    onSuccess: () => { invalidate(); showSuccessToast('Plant Added', 'New plant created successfully'); setForm(emptyForm); setAddOpen(false); },
    onError: (e) => showSmartToast(e, 'Failed to add plant'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/rd/plants/${id}`, data),
    onSuccess: () => { invalidate(); showSuccessToast('Plant Updated', 'Plant updated successfully'); setEditOpen(false); },
    onError: (e) => showSmartToast(e, 'Failed to update plant'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, isDiscontinued }) => apiRequest('PUT', `/api/rd/plants/${id}/status`, { isDiscontinued }),
    onSuccess: () => invalidate(),
    onError: (e) => showSmartToast(e, 'Failed to update status'),
  });

  const handleAdd = () => {
    if (!form.category || !form.subCategory || !form.name) return;
    createMutation.mutate(form);
  };
  const handleEditSave = () => {
    if (!editForm.category || !editForm.subCategory || !editForm.name) return;
    updateMutation.mutate({ id: selected._id, data: editForm });
  };

  const openEdit = (p) => {
    setSelected(p);
    setEditForm({
      category: p.category || '', subCategory: p.subCategory || '', name: p.name || '', productionRate: p.productionRate || '',
      machines: (p.machines || []).filter(e => e.item).map(e => ({ item: e.item._id || e.item, quantity: e.quantity || 1 })),
      motors: (p.motors || []).filter(e => e.item).map(e => ({ item: e.item._id || e.item, quantity: e.quantity || 1 })),
    });
    setEditOpen(true);
  };
  const openView = (p) => { setSelected(p); setViewOpen(true); };

  const renderCascadeSelect = (label, field, fieldKey, options, state, setState, opts = {}) => {
    const { disabled = false, disabledHint = 'Select', parentValueForAdd = '', resetKeys = [] } = opts;
    return (
      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</Label>
        <div className="flex gap-2">
          <select
            className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
            value={state[fieldKey]} disabled={disabled}
            onChange={e => {
              const val = e.target.value;
              setState(f => { const next = { ...f, [fieldKey]: val }; resetKeys.forEach(k => { next[k] = ''; }); return next; });
            }}
          >
            <option value="">{disabled ? disabledHint : 'Select...'}</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
          </select>
          <Button type="button" size="icon" variant="outline" disabled={disabled}
            onClick={() => setNewOptionModal({ open: true, field, value: '', parentValue: parentValueForAdd })}
            className="flex-shrink-0 h-9 w-9 bg-white">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Machine/Motor multi-selector: search + checklist to pick items, each
  // selected entry gets its own editable quantity + a remove button. ──
  const renderItemSelector = (label, allItems, search, setSearch, state, setState, listKey) => {
    const selectedIds = new Set(state[listKey].map(e => e.item));
    const q = search.trim().toLowerCase();
    const filtered = allItems.filter(it => !it.isDiscontinued && (!q || it.code?.toLowerCase().includes(q) || it.name?.toLowerCase().includes(q)));

    const toggle = (id) => setState(f => {
      const exists = f[listKey].some(e => e.item === id);
      return { ...f, [listKey]: exists ? f[listKey].filter(e => e.item !== id) : [...f[listKey], { item: id, quantity: 1 }] };
    });
    const setQty = (id, qty) => setState(f => ({ ...f, [listKey]: f[listKey].map(e => e.item === id ? { ...e, quantity: Math.max(1, Number(qty) || 1) } : e) }));
    const remove = (id) => setState(f => ({ ...f, [listKey]: f[listKey].filter(e => e.item !== id) }));

    return (
      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block">{label} ({state[listKey].length} selected)</Label>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input className="pl-8 h-9 text-sm bg-white" placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white">
          {filtered.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">No items found.</p>
          ) : filtered.map(it => (
            <label key={it._id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
              <input type="checkbox" checked={selectedIds.has(it._id)} onChange={() => toggle(it._id)} />
              <span className="font-mono text-xs font-semibold text-blue-700">{it.code}</span>
              <span className="text-slate-700 truncate">{it.name}</span>
            </label>
          ))}
        </div>
        {state[listKey].length > 0 && (
          <div className="mt-2 space-y-1.5">
            {state[listKey].map(entry => {
              const it = allItems.find(x => x._id === entry.item);
              return (
                <div key={entry.item} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5">
                  <span className="text-xs text-slate-700 truncate">
                    <span className="font-mono font-semibold text-blue-700">{it?.code || '—'}</span> {it?.name || '(item no longer available)'}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input type="number" min="1" className="w-16 h-7 text-xs bg-white" value={entry.quantity} onChange={e => setQty(entry.item, e.target.value)} />
                    <button type="button" onClick={() => remove(entry.item)} className="text-slate-400 hover:text-red-500"><XCircle className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPlantForm = (state, setState, machineQ, setMachineQ, motorQ, setMotorQ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {renderCascadeSelect('Category', 'PlantCategory', 'category', categoryOptions, state, setState, { resetKeys: ['subCategory'] })}
        {renderCascadeSelect('Sub Category', 'PlantSubCategory', 'subCategory', subCategoryOptionsFor(state.category), state, setState, {
          disabled: !state.category, disabledHint: 'Select Category first', parentValueForAdd: state.category,
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Plant Name *</Label>
          <Input value={state.name} onChange={e => setState(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Flour Mill Plant 500 KG/HR" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Production</Label>
          <Input value={state.productionRate} onChange={e => setState(f => ({ ...f, productionRate: e.target.value }))} placeholder="e.g. 500 kg/hr" />
        </div>
      </div>

      <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
        {renderItemSelector('Machines (from Product Master)', machines, machineQ, setMachineQ, state, setState, 'machines')}
      </div>
      <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
        {renderItemSelector('Motors (from Motor Master)', motors, motorQ, setMotorQ, state, setState, 'motors')}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" /> Plant Master
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Group machines and motors into a plant — used to build sales quotations</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setMachineSearch(''); setMotorSearch(''); setAddOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
          <Plus className="h-4 w-4 mr-2" /> Add Plant
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name or category..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setShowDiscontinued(v => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showDiscontinued ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}>
              {showDiscontinued ? 'Show Active' : 'Show Discontinued'}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plant Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Production</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machines</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Motors</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>
                ) : plants.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No plants found.</td></tr>
                ) : plants.map(p => (
                  <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{[p.category, p.subCategory].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{p.productionRate || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{(p.machines || []).length}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{(p.motors || []).length}</td>
                    <td className="px-5 py-3.5">
                      {p.isDiscontinued
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => openView(p)}><Eye className="h-3.5 w-3.5" /></Button>
                        {p.isDiscontinued ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" onClick={() => statusMutation.mutate({ id: p._id, isDiscontinued: false })}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => { setMachineSearch(''); setMotorSearch(''); openEdit(p); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" onClick={() => statusMutation.mutate({ id: p._id, isDiscontinued: true })}><Ban className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Plant */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Plant</DialogTitle></DialogHeader>
          {renderPlantForm(form, setForm, machineSearch, setMachineSearch, motorSearch, setMotorSearch)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.category || !form.subCategory || !form.name || createMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {createMutation.isPending ? 'Adding...' : 'Add Plant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plant */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Plant</DialogTitle></DialogHeader>
          {renderPlantForm(editForm, setEditForm, machineSearch, setMachineSearch, motorSearch, setMotorSearch)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={!editForm.category || !editForm.subCategory || !editForm.name || updateMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Plant */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Category</p><p className="text-sm font-medium text-slate-800">{[selected.category, selected.subCategory].filter(Boolean).join(' / ') || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Production</p><p className="text-sm font-medium text-slate-800">{selected.productionRate || 'N/A'}</p></div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Machines ({(selected.machines || []).length})</p>
                {(selected.machines || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No machines mapped.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selected.machines.map((e, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs"><span className="font-mono font-semibold text-blue-700">{e.item?.code || '—'}</span> {e.item?.name || '(removed)'}</span>
                        <span className="text-xs font-semibold text-slate-600">x{e.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Motors ({(selected.motors || []).length})</p>
                {(selected.motors || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No motors mapped.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selected.motors.map((e, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs"><span className="font-mono font-semibold text-blue-700">{e.item?.code || '—'}</span> {e.item?.name || '(removed)'}</span>
                        <span className="text-xs font-semibold text-slate-600">x{e.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add classification option */}
      <Dialog open={newOptionModal.open} onOpenChange={(open) => !open && setNewOptionModal({ open: false, field: '', value: '', parentValue: '' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New {newOptionModal.field === 'PlantCategory' ? 'Category' : 'Sub Category'}</DialogTitle></DialogHeader>
          <div className="py-4">
            {newOptionModal.parentValue && (
              <p className="text-xs text-slate-500 mb-3">Linked under: <span className="font-semibold text-slate-700">{newOptionModal.parentValue}</span></p>
            )}
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Value *</Label>
            <Input autoFocus value={newOptionModal.value} onChange={e => setNewOptionModal(prev => ({ ...prev, value: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAddOption()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOptionModal({ open: false, field: '', value: '', parentValue: '' })}>Cancel</Button>
            <Button onClick={handleAddOption} disabled={!newOptionModal.value} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
