import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Factory, Plus, Search, Eye, Edit2, Ban, RefreshCw, XCircle, Trash2, Settings2, Zap } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { usePermissions } from '@/hooks/usePermissions';

const emptyForm = {
  category: '', subCategory: '', name: '', productionRate: '', isDiscontinued: false,
  machines: [], // [{ item: <Item _id>, quantity }]
  motors: [],   // [{ item: <Item _id>, quantity }]
};
const emptyHierarchyForm = { category: '', subCategory: '', plantName: '', plantProduction: '' };

// Plant's own chain: Category -> Sub Category -> Plant Name -> Production
// (RDMasterOption fields PlantCategory/PlantSubCategory/PlantName/
// PlantProduction) — pre-entered ahead of actual plant creation, same
// "manage outside the form" pattern as Product Master, but no custom-fields
// feature (confirmed 2026-09-02).
const subCategoryOptionsFor = (categoryVal, masterOptions) =>
  (masterOptions.PlantSubCategory || []).filter(o => o.parentValue === categoryVal);
const plantNameOptionsFor = (subCategoryVal, masterOptions) =>
  (masterOptions.PlantName || []).filter(o => o.parentValue === subCategoryVal);
const plantProductionOptionsFor = (plantNameVal, masterOptions) =>
  (masterOptions.PlantProduction || []).filter(o => o.parentValue === plantNameVal);

// Product Master's own P-Type/Category cascade (unrelated to Plant's own
// classification above) — used only to narrow the machine picker.
const machineCategoryOptionsFor = (pTypeVal, masterOptions) =>
  (masterOptions.Category || []).filter(o => o.parentValue === pTypeVal);

const FIELD_KEY_MAP = { PlantCategory: 'category', PlantSubCategory: 'subCategory', PlantName: 'plantName', PlantProduction: 'plantProduction' };
const fieldLabel = (field) => ({ PlantCategory: 'Category', PlantSubCategory: 'Sub Category', PlantName: 'Plant Name', PlantProduction: 'Production' }[field] || field);

export default function PlantMaster() {
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', 'plantMaster', 'add');
  const canEdit = hasFeatureAccess('rnd', 'plantMaster', 'edit');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [addMachineOpen, setAddMachineOpen] = useState(false);
  const [addMotorOpen, setAddMotorOpen] = useState(false);

  // ── Classification manager (Category -> Sub Category -> Plant Name ->
  // Production) — the only place these values get created, matching Product
  // Master's own "Manage Classifications" dialog, minus the custom-fields
  // feature Plant Master doesn't need. ──
  const [classifyManagerOpen, setClassifyManagerOpen] = useState(false);
  const [hierarchyForm, setHierarchyForm] = useState(emptyHierarchyForm);
  const [hierarchyInputs, setHierarchyInputs] = useState(emptyHierarchyForm);
  const [editOptionModal, setEditOptionModal] = useState({ open: false, option: null, value: '' });
  const [deleteOptionConfirm, setDeleteOptionConfirm] = useState(null);

  const { data: optionsResponse } = useQuery({
    queryKey: ['rd-master-options'],
    queryFn: () => apiRequest('GET', '/api/rd/master-options'),
  });
  const masterOptions = optionsResponse?.data || {};
  const categoryOptions = masterOptions.PlantCategory || [];

  const addOptionMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/rd/master-options', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rd-master-options'] }),
  });
  const updateOptionMutation = useMutation({
    mutationFn: ({ id, value }) => apiRequest('PUT', `/api/rd/master-options/${id}`, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rd-master-options'] }),
  });
  const deleteOptionMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/rd/master-options/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rd-master-options'] }),
  });

  const selectHierarchyValue = (fieldKey, value) => {
    setHierarchyForm(f => {
      const next = { ...f, [fieldKey]: value };
      if (fieldKey === 'category') { next.subCategory = ''; next.plantName = ''; next.plantProduction = ''; }
      if (fieldKey === 'subCategory') { next.plantName = ''; next.plantProduction = ''; }
      if (fieldKey === 'plantName') { next.plantProduction = ''; }
      return next;
    });
  };
  const handleAddHierarchyValue = async (field, fieldKey, parentValue) => {
    const value = hierarchyInputs[fieldKey]?.trim();
    if (!value) return;
    try {
      await addOptionMutation.mutateAsync({ field, value, parentValue: parentValue || null });
      setHierarchyInputs(v => ({ ...v, [fieldKey]: '' }));
      selectHierarchyValue(fieldKey, value);
      showSuccessToast(`${fieldLabel(field)} Added`, `"${value}" added successfully`);
    } catch (e) {
      showSmartToast(e, `Failed to add ${fieldLabel(field)}`);
    }
  };
  const handleRenameOption = async () => {
    if (!editOptionModal.option || !editOptionModal.value.trim()) return;
    const { option } = editOptionModal;
    const newValue = editOptionModal.value.trim();
    const oldValue = option.value;
    try {
      await updateOptionMutation.mutateAsync({ id: option._id, value: newValue });
      const fieldKey = FIELD_KEY_MAP[option.field];
      if (fieldKey && hierarchyForm[fieldKey] === oldValue) setHierarchyForm(f => ({ ...f, [fieldKey]: newValue }));
      showSuccessToast('Option Renamed', `"${oldValue}" renamed to "${newValue}"`);
      setEditOptionModal({ open: false, option: null, value: '' });
    } catch (e) {
      showSmartToast(e, 'Failed to rename option');
    }
  };
  const handleDeleteOption = async () => {
    if (!deleteOptionConfirm) return;
    const option = deleteOptionConfirm;
    try {
      await deleteOptionMutation.mutateAsync(option._id);
      const fieldKey = FIELD_KEY_MAP[option.field];
      if (fieldKey && hierarchyForm[fieldKey] === option.value) {
        setHierarchyForm(f => {
          if (fieldKey === 'category') return { ...f, category: '', subCategory: '', plantName: '', plantProduction: '' };
          if (fieldKey === 'subCategory') return { ...f, subCategory: '', plantName: '', plantProduction: '' };
          if (fieldKey === 'plantName') return { ...f, plantName: '', plantProduction: '' };
          return { ...f, [fieldKey]: '' };
        });
      }
      showSuccessToast('Option Deleted', `"${option.value}" removed`);
      setDeleteOptionConfirm(null);
    } catch (e) {
      showSmartToast(e, 'Failed to delete option');
      setDeleteOptionConfirm(null);
    }
  };

  const renderHierarchyColumn = ({ label, field, fieldKey, options, disabled, disabledHint, parentValue }) => (
    <div className={`rounded-lg border p-3 ${disabled ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
      <p className="text-xs font-bold text-slate-700 mb-2">{label}</p>
      {disabled ? (
        <p className="text-xs text-slate-400 italic text-center py-6">{disabledHint}</p>
      ) : (
        <>
          <div className="flex gap-1.5 mb-2">
            <input
              type="text"
              className="flex-1 h-8 text-xs rounded-md border border-slate-200 bg-white px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`New ${label}...`}
              value={hierarchyInputs[fieldKey]}
              onChange={e => setHierarchyInputs(v => ({ ...v, [fieldKey]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddHierarchyValue(field, fieldKey, parentValue)}
            />
            <Button type="button" size="icon" variant="outline" className="h-8 w-8 flex-shrink-0 bg-white" onClick={() => handleAddHierarchyValue(field, fieldKey, parentValue)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">None yet</p>
            ) : options.map(o => {
              const isSelected = hierarchyForm[fieldKey] === o.value;
              return (
                <div key={o.value} className="flex items-center gap-1 group">
                  <button
                    type="button"
                    onClick={() => selectHierarchyValue(fieldKey, o.value)}
                    className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors truncate ${isSelected ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {o.value}
                  </button>
                  <button
                    type="button" title={`Rename ${fieldLabel(field)}`}
                    onClick={() => setEditOptionModal({ open: true, option: { ...o, field }, value: o.value })}
                    className={`flex-shrink-0 p-1 rounded transition-colors ${isSelected ? 'text-blue-100 hover:text-white' : 'text-slate-300 hover:text-blue-600'}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button" title={`Delete ${fieldLabel(field)}`}
                    onClick={() => setDeleteOptionConfirm({ ...o, field })}
                    className={`flex-shrink-0 p-1 rounded transition-colors ${isSelected ? 'text-blue-100 hover:text-white' : 'text-slate-300 hover:text-red-600'}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // ── Product Master machine list (full, unpaginated) for the machine picker ──
  const { data: machinesResponse } = useQuery({
    queryKey: ['rd-machines'],
    queryFn: () => apiRequest('GET', '/api/rd/machines'),
  });
  const machines = machinesResponse?.data || [];

  // ── Motor Master motor list — same Item collection, filtered to productKind:Motor ──
  const { data: motorsResponse } = useQuery({
    queryKey: ['plant-master-motors'],
    queryFn: () => apiRequest('GET', '/api/items?type=Product&productKind=Motor&limit=500'),
  });
  const motors = motorsResponse?.items || motorsResponse?.data || [];

  // Debounce search so it doesn't refetch on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever search/filter/page-size changes.
  useEffect(() => { setPage(1); }, [debouncedSearch, showDiscontinued, limit]);

  // ── Plants list — page/limit sent explicitly to opt into getPlants'
  // server-side pagination (opt-in, since other consumers like Quotation's
  // Plant filter and Leads' plant picker rely on the unpaginated full list). ──
  const { data: plantsResponse, isLoading } = useQuery({
    queryKey: ['rd-plants', 'list', { page, limit, search: debouncedSearch, showDiscontinued }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit),
        discontinued: showDiscontinued ? 'true' : 'false',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiRequest('GET', `/api/rd/plants?${params.toString()}`);
    },
    keepPreviousData: true,
  });
  const plants = plantsResponse?.data || [];
  const pagination = plantsResponse?.pagination || { page: 1, pages: 1, total: plants.length, limit };

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

  // Defensive normalize, mirroring the per-row onBlur — quantity can still
  // be an empty/partial string here if the user clicks straight to "Add
  // Plant"/"Save Changes" without ever blurring the quantity field.
  const withNormalizedQuantities = (f) => ({
    ...f,
    machines: f.machines.map(e => ({ ...e, quantity: Math.max(1, Math.floor(Number(e.quantity)) || 1) })),
    motors: f.motors.map(e => ({ ...e, quantity: Math.max(1, Math.floor(Number(e.quantity)) || 1) })),
  });
  const handleAdd = () => {
    if (!form.category || !form.subCategory || !form.name) return;
    createMutation.mutate(withNormalizedQuantities(form));
  };
  const handleEditSave = () => {
    if (!editForm.category || !editForm.subCategory || !editForm.name) return;
    updateMutation.mutate({ id: selected._id, data: withNormalizedQuantities(editForm) });
  };

  const openEdit = (p) => {
    setSelected(p);
    setEditForm({
      category: p.category || '', subCategory: p.subCategory || '', name: p.name || '', productionRate: p.productionRate || '',
      isDiscontinued: !!p.isDiscontinued,
      machines: (p.machines || []).filter(e => e.item).map(e => ({ item: e.item._id || e.item, quantity: e.quantity || 1 })),
      motors: (p.motors || []).filter(e => e.item).map(e => ({ item: e.item._id || e.item, quantity: e.quantity || 1 })),
    });
    setEditOpen(true);
  };
  const openView = (p) => { setSelected(p); setViewOpen(true); };

  // Product Master select fields on the Add/Edit Plant form — pure selection
  // now, no inline add/rename/delete (that all lives in the Manager dialog
  // above, matching Product Master's own form). Radix Select not needed here
  // any more since there's no per-option delete icon to embed.
  const renderPlantSelect = (label, options, fieldKey, state, setState, opts = {}) => {
    const { disabled = false, disabledHint = 'Select...', resetKeys = [], required = true } = opts;
    return (
      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block">{label}{required && ' *'}</Label>
        <select
          className="w-full h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
          value={state[fieldKey]}
          disabled={disabled}
          onChange={e => {
            const val = e.target.value;
            setState(f => { const next = { ...f, [fieldKey]: val }; resetKeys.forEach(k => { next[k] = ''; }); return next; });
          }}
        >
          <option value="" disabled>{disabled ? disabledHint : 'Select...'}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
        </select>
      </div>
    );
  };

  const machineById = (id) => machines.find(m => m._id === id);
  const motorById = (id) => motors.find(m => m._id === id);

  const setQty = (listKey, state, setState, id, qty) => setState(f => ({ ...f, [listKey]: f[listKey].map(e => e.item === id ? { ...e, quantity: qty } : e) }));
  const normalizeQty = (listKey, state, setState, id) => setState(f => ({ ...f, [listKey]: f[listKey].map(e => e.item === id ? { ...e, quantity: Math.max(1, Math.floor(Number(e.quantity)) || 1) } : e) }));
  const removeEntry = (listKey, setState, id) => setState(f => ({ ...f, [listKey]: f[listKey].filter(e => e.item !== id) }));

  const powerLine = (m) => {
    if (!m || (!m.powerSource && !m.powerRequiredHP && !m.powerRequiredKWH && !m.powerRequiredRPM)) return null;
    const parts = [];
    if (m.powerSource) parts.push(m.powerSource);
    if (m.powerRequiredHP) parts.push(`${m.powerRequiredHP} HP`);
    if (m.powerRequiredKWH) parts.push(`${m.powerRequiredKWH} KWH`);
    if (m.powerRequiredRPM) parts.push(`${m.powerRequiredRPM} RPM`);
    return parts.join(' · ');
  };

  const renderMachineList = (state, setState) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs font-semibold text-slate-600">Machines ({state.machines.length})</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddMachineOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Machine
        </Button>
      </div>
      {state.machines.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-lg">No machines added yet.</p>
      ) : (
        <div className="space-y-1.5">
          {state.machines.map(entry => {
            const it = machineById(entry.item);
            const power = powerLine(it);
            return (
              <div key={entry.item} className="bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-700 truncate">
                    <span className="font-mono font-semibold text-blue-700">{it?.code || '—'}</span> {it?.name || '(item no longer available)'}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input type="number" min="1" className="w-16 h-7 text-xs bg-white" value={entry.quantity} onChange={e => setQty('machines', state, setState, entry.item, e.target.value)} onBlur={() => normalizeQty('machines', state, setState, entry.item)} />
                    <button type="button" onClick={() => removeEntry('machines', setState, entry.item)} className="text-slate-400 hover:text-red-500"><XCircle className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {power && (
                  <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1"><Zap className="h-3 w-3" /> {power}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderMotorList = (state, setState) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs font-semibold text-slate-600">Motors ({state.motors.length})</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddMotorOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Motor
        </Button>
      </div>
      {state.motors.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-lg">No motors added yet.</p>
      ) : (
        <div className="space-y-1.5">
          {state.motors.map(entry => {
            const it = motorById(entry.item);
            return (
              <div key={entry.item} className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5">
                <span className="text-xs text-slate-700 truncate">
                  <span className="font-mono font-semibold text-blue-700">{it?.code || '—'}</span> {it?.name || '(item no longer available)'}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Input type="number" min="1" className="w-16 h-7 text-xs bg-white" value={entry.quantity} onChange={e => setQty('motors', state, setState, entry.item, e.target.value)} onBlur={() => normalizeQty('motors', state, setState, entry.item)} />
                  <button type="button" onClick={() => removeEntry('motors', setState, entry.item)} className="text-slate-400 hover:text-red-500"><XCircle className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderPlantForm = (state, setState) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {renderPlantSelect('Category', categoryOptions, 'category', state, setState, { resetKeys: ['subCategory', 'name', 'productionRate'] })}
        {renderPlantSelect('Sub Category', subCategoryOptionsFor(state.category, masterOptions), 'subCategory', state, setState, {
          disabled: !state.category, disabledHint: 'Select Category first', resetKeys: ['name', 'productionRate'],
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {renderPlantSelect('Plant Name', plantNameOptionsFor(state.subCategory, masterOptions), 'name', state, setState, {
          disabled: !state.subCategory, disabledHint: 'Select Sub Category first', resetKeys: ['productionRate'],
        })}
        {renderPlantSelect('Production', plantProductionOptionsFor(state.name, masterOptions), 'productionRate', state, setState, {
          disabled: !state.name, disabledHint: 'Select Plant Name first', required: false,
        })}
      </div>
      <p className="text-xs text-slate-400 -mt-2">
        Don't see the Category / Sub Category / Plant Name / Production you need? Add it via <strong>Manage Classifications</strong> above.
      </p>

      <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
        {renderMachineList(state, setState)}
      </div>
      <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
        {renderMotorList(state, setState)}
      </div>

      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block">Plant Status</Label>
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          value={state.isDiscontinued ? 'Discontinue' : 'Continue'}
          onChange={e => setState(f => ({ ...f, isDiscontinued: e.target.value === 'Discontinue' }))}
        >
          <option value="Continue">Continue</option>
          <option value="Discontinue">Discontinue</option>
        </select>
      </div>
    </div>
  );

  const activeState = addOpen ? [form, setForm] : [editForm, setEditForm];
  const [activeFormState, setActiveFormState] = activeState;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" /> Plant Master
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Group machines and motors into a plant — used to build sales quotations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setHierarchyForm(emptyHierarchyForm); setClassifyManagerOpen(true); }} className="bg-white">
            <Settings2 className="h-4 w-4 mr-2" /> Manage Classifications
          </Button>
          {canAdd && (
            <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
              <Plus className="h-4 w-4 mr-2" /> Add Plant
            </Button>
          )}
        </div>
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
            <select
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
            >
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={150}>150 per page</option>
            </select>
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
                        {canEdit && (p.isDiscontinued ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" onClick={() => statusMutation.mutate({ id: p._id, isDiscontinued: false })}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => openEdit(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" onClick={() => statusMutation.mutate({ id: p._id, isDiscontinued: true })}><Ban className="h-3.5 w-3.5" /></Button>
                          </>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} plants)</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Plant */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Plant</DialogTitle></DialogHeader>
          {renderPlantForm(form, setForm)}
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
          {renderPlantForm(editForm, setEditForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={!editForm.category || !editForm.subCategory || !editForm.name || updateMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Machine popup — Category/Sub Category from Product Master narrow
          the list; stays open-again-able via the "Add Machine" button so
          several machines (different categories included) can be added one
          at a time. */}
      {addMachineOpen && (
        <AddMachineDialog
          machines={machines}
          masterOptions={masterOptions}
          existingIds={new Set(activeFormState.machines.map(e => e.item))}
          powerLine={powerLine}
          onAdd={(itemId, qty) => {
            setActiveFormState(f => ({ ...f, machines: [...f.machines, { item: itemId, quantity: qty }] }));
            setAddMachineOpen(false);
          }}
          onClose={() => setAddMachineOpen(false)}
        />
      )}

      {/* Add Motor popup — no category narrowing, just the plain search list. */}
      {addMotorOpen && (
        <AddMotorDialog
          motors={motors}
          existingIds={new Set(activeFormState.motors.map(e => e.item))}
          onAdd={(itemId, qty) => {
            setActiveFormState(f => ({ ...f, motors: [...f.motors, { item: itemId, quantity: qty }] }));
            setAddMotorOpen(false);
          }}
          onClose={() => setAddMotorOpen(false)}
        />
      )}

      {/* View Plant */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Category</p><p className="text-sm font-medium text-slate-800">{[selected.category, selected.subCategory].filter(Boolean).join(' / ') || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Production</p><p className="text-sm font-medium text-slate-800">{selected.productionRate || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Plant Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${selected.isDiscontinued ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{selected.isDiscontinued ? 'Discontinue' : 'Continue'}</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Machines ({(selected.machines || []).length})</p>
                {(selected.machines || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No machines mapped.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selected.machines.map((e, i) => {
                      // The Plant record's own populated e.item only carries
                      // code/name/category/mrp (PLANT_POPULATE) — no power
                      // fields. Look the machine back up in the already-
                      // fetched full machine list (same one the Add Machine
                      // popup uses) to get its real power data instead.
                      const power = powerLine(machineById(e.item?._id || e.item));
                      return (
                        <div key={i} className="py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs"><span className="font-mono font-semibold text-blue-700">{e.item?.code || '—'}</span> {e.item?.name || '(removed)'}</span>
                            <span className="text-xs font-semibold text-slate-600">x{e.quantity}</span>
                          </div>
                          {power && <p className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1"><Zap className="h-3 w-3" /> {power}</p>}
                        </div>
                      );
                    })}
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

      {/* Manage Classifications — Category -> Sub Category -> Plant Name ->
          Production. No Field Groups/custom-fields section (Plant Master
          doesn't need one) — just the hierarchy, matching Product Master's
          own Manager dialog pattern. */}
      <Dialog open={classifyManagerOpen} onOpenChange={setClassifyManagerOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Classifications</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500">
              This is the only place Category, Sub Category, Plant Name and Production values are created. Click a Category to select it, which
              unlocks its Sub Categories; click a Sub Category to unlock its Plant Names; click a Plant Name to unlock its Production values. Use the
              input under each column to add a new value scoped to whatever is selected in the column to its left.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderHierarchyColumn({
                label: 'Category', field: 'PlantCategory', fieldKey: 'category',
                options: categoryOptions, disabled: false, parentValue: null
              })}
              {renderHierarchyColumn({
                label: 'Sub Category', field: 'PlantSubCategory', fieldKey: 'subCategory',
                options: subCategoryOptionsFor(hierarchyForm.category, masterOptions),
                disabled: !hierarchyForm.category, disabledHint: 'Select a Category first', parentValue: hierarchyForm.category
              })}
              {renderHierarchyColumn({
                label: 'Plant Name', field: 'PlantName', fieldKey: 'plantName',
                options: plantNameOptionsFor(hierarchyForm.subCategory, masterOptions),
                disabled: !hierarchyForm.subCategory, disabledHint: 'Select a Sub Category first', parentValue: hierarchyForm.subCategory
              })}
              {renderHierarchyColumn({
                label: 'Production', field: 'PlantProduction', fieldKey: 'plantProduction',
                options: plantProductionOptionsFor(hierarchyForm.plantName, masterOptions),
                disabled: !hierarchyForm.plantName, disabledHint: 'Select a Plant Name first', parentValue: hierarchyForm.plantName
              })}
            </div>
            {(hierarchyForm.category || hierarchyForm.subCategory || hierarchyForm.plantName || hierarchyForm.plantProduction) && (
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                Selected: <strong>{hierarchyForm.category || '—'}</strong> / <strong>{hierarchyForm.subCategory || '—'}</strong> / <strong>{hierarchyForm.plantName || '—'}</strong> / <strong>{hierarchyForm.plantProduction || '—'}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassifyManagerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename classification option */}
      <Dialog open={editOptionModal.open} onOpenChange={(open) => !open && setEditOptionModal({ open: false, option: null, value: '' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename {editOptionModal.option && fieldLabel(editOptionModal.option.field)}</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Value *</Label>
            <Input autoFocus value={editOptionModal.value} onChange={e => setEditOptionModal(prev => ({ ...prev, value: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleRenameOption()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOptionModal({ open: false, option: null, value: '' })}>Cancel</Button>
            <Button onClick={handleRenameOption} disabled={!editOptionModal.value.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete classification option confirm */}
      <Dialog open={!!deleteOptionConfirm} onOpenChange={(open) => !open && setDeleteOptionConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete {deleteOptionConfirm && fieldLabel(deleteOptionConfirm.field)}?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Remove <strong>{deleteOptionConfirm?.value}</strong> from the list? This is blocked if any plant or linked sub-classification still uses it.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOptionConfirm(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteOption}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── "Add Machine" popup: Category/Sub Category (Product Master's own
// classification) narrow the list to just that combination; picking one
// shows its Power section (Power Source/HP/KWH/RPM) live, so whoever's
// building the plant can size a matching Motor next. Stays reusable — the
// parent keeps its own "Add Machine" button visible after this closes, so
// several machines (even from different categories) get added one at a
// time (confirmed 2026-09-02).
function AddMachineDialog({ machines, masterOptions, existingIds, powerLine, onAdd, onClose }) {
  const [pType, setPType] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState('1');

  const categoryOptions = machineCategoryOptionsFor(pType, masterOptions);
  const q = search.trim().toLowerCase();
  const filtered = machines.filter(m =>
    !m.isDiscontinued && !existingIds.has(m._id) &&
    (!pType || m.pType === pType) && (!category || m.category === category) &&
    (!q || m.code?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q))
  );
  const selected = machines.find(m => m._id === selectedId);
  const power = powerLine(selected);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Machine</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Category</Label>
              <select
                className="w-full h-9 text-sm rounded-lg border border-slate-200 bg-white px-3"
                value={pType}
                onChange={e => { setPType(e.target.value); setCategory(''); setSelectedId(''); }}
              >
                <option value="">All Categories</option>
                {(masterOptions.PType || []).map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600 mb-1 block">Sub Category</Label>
              <select
                className="w-full h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 disabled:bg-slate-100 disabled:text-slate-400"
                value={category} disabled={!pType}
                onChange={e => { setCategory(e.target.value); setSelectedId(''); }}
              >
                <option value="">{pType ? 'All Sub Categories' : 'Select Category first'}</option>
                {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8 h-9 text-sm bg-white" placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No machines found.</p>
            ) : filtered.map(m => (
              <label key={m._id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                <input type="radio" name="machine-pick" checked={selectedId === m._id} onChange={() => setSelectedId(m._id)} />
                <span className="font-mono text-xs font-semibold text-blue-700">{m.code}</span>
                <span className="text-slate-700 truncate">{m.name}</span>
              </label>
            ))}
          </div>

          {selected && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Power Required</p>
              <p className="text-xs text-amber-700 mt-1">{power || 'Not specified for this machine.'}</p>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity</Label>
            <Input type="number" min="1" className="w-24 h-9 text-sm bg-white" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            disabled={!selectedId}
            onClick={() => onAdd(selectedId, Math.max(1, Math.floor(Number(qty)) || 1))}
          >
            Add Machine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── "Add Motor" popup — no category narrowing (motors aren't classified for
// this flow, confirmed 2026-09-02), just the same plain search list Plant
// Master already used for motors, now living in its own popup instead of
// being inline. ──
function AddMotorDialog({ motors, existingIds, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState('1');

  const q = search.trim().toLowerCase();
  const filtered = motors.filter(m =>
    !m.isDiscontinued && !existingIds.has(m._id) &&
    (!q || m.code?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q))
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Motor</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8 h-9 text-sm bg-white" placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No motors found.</p>
            ) : filtered.map(m => (
              <label key={m._id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                <input type="radio" name="motor-pick" checked={selectedId === m._id} onChange={() => setSelectedId(m._id)} />
                <span className="font-mono text-xs font-semibold text-blue-700">{m.code}</span>
                <span className="text-slate-700 truncate">{m.name}</span>
              </label>
            ))}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity</Label>
            <Input type="number" min="1" className="w-24 h-9 text-sm bg-white" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            disabled={!selectedId}
            onClick={() => onAdd(selectedId, Math.max(1, Math.floor(Number(qty)) || 1))}
          >
            Add Motor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
