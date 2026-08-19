import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Layers, Plus, Search, Eye, Edit2, Ban, RefreshCw, XCircle, ArrowLeft } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import CategoryPickerModal from '@/components/fabrication/CategoryPickerModal';
import DimensionCalculatorModal from '@/components/fabrication/DimensionCalculatorModal';
import { ShapeTileIcon } from '@/components/fabrication/FabricationShapeIcons';

const emptyForm = {
  itemName: '', itemCode: '', category: '', density: { value: '', unit: 'kg/m3' }, isDiscontinued: false, dimensions: [],
  purchaseUnitType: '', purchaseUnit: '', usedUnitType: '', usedUnit: '', receiveUnitType: '', receiveUnit: '',
};

// Human-readable summary of one dimension row's values, e.g. "T5 x W1000 x L2000"
// or, for a lookup category, its designation ("IPE 200").
const summarizeDimension = (categoryFields, dim) => {
  if (dim.designation) return dim.designation;
  return categoryFields.map(f => `${f.label.split(' ')[0]}${dim.values?.[f.key] ?? '—'}`).join(' x ');
};

// Cascading Type -> Unit select pair, reused for Purchase Unit / Used Unit /
// Receive Unit — same UnitType-backed pattern SimpleInventoryForm.jsx uses
// for Inventory's Add Item Purchase/Used Unit fields (unitTypes prop is the
// same `/api/inventory/unit-types` data).
const UnitFieldGroup = ({ title, unitTypes, typeValue, unitValue, onTypeChange, onUnitChange }) => {
  const units = unitTypes.find(ut => ut.name === typeValue)?.units || [];
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <Label className="text-xs font-semibold text-slate-600 mb-2 block">{title}</Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] text-slate-500 uppercase">Unit Type</Label>
          <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            value={typeValue} onChange={e => { onTypeChange(e.target.value); onUnitChange(''); }}>
            <option value="">Select...</option>
            {unitTypes.map(ut => <option key={ut._id} value={ut.name}>{ut.name}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[10px] text-slate-500 uppercase">Unit</Label>
          <select className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-100"
            value={unitValue} onChange={e => onUnitChange(e.target.value)} disabled={!typeValue}>
            <option value="">Select...</option>
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default function FabricationMaster() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [codeTouched, setCodeTouched] = useState(false);

  // Category picker (Modal 1) -> Dimension calculator (Modal 2) flow state.
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorGroup, setCalculatorGroup] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: categoriesResponse } = useQuery({
    queryKey: ['fabrication-categories'],
    queryFn: () => apiRequest('GET', '/api/fabrication-master/categories'),
  });
  const categories = categoriesResponse?.data || [];
  const groups = categoriesResponse?.groups || [];
  const materials = categoriesResponse?.materials || [];
  const defaultDensity = categoriesResponse?.defaultDensityKgM3 || 7850;
  const activeCategory = useMemo(() => categories.find(c => c.key === form.category) || null, [categories, form.category]);

  const { data: unitTypesResponse } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
    queryFn: () => apiRequest('GET', '/api/inventory/unit-types'),
  });
  const unitTypes = unitTypesResponse?.unitTypes || [];

  const { data: itemsResponse, isLoading } = useQuery({
    queryKey: ['fabrication-items', { search: debouncedSearch, showDiscontinued }],
    queryFn: () => {
      const params = new URLSearchParams({ discontinued: showDiscontinued ? 'true' : 'false' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiRequest('GET', `/api/fabrication-master/items?${params.toString()}`);
    },
  });
  const items = itemsResponse?.data || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['fabrication-items'] });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/fabrication-master/items', data),
    onSuccess: () => { invalidate(); showSuccessToast('Fabrication Item Added', 'New fabrication item created successfully'); setAddOpen(false); },
    onError: (e) => showSmartToast(e, 'Failed to add fabrication item'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/fabrication-master/items/${id}`, data),
    onSuccess: () => { invalidate(); showSuccessToast('Fabrication Item Updated', 'Fabrication item updated successfully'); setEditOpen(false); },
    onError: (e) => showSmartToast(e, 'Failed to update fabrication item'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, isDiscontinued }) => apiRequest('PUT', `/api/fabrication-master/items/${id}/status`, { isDiscontinued }),
    onSuccess: () => invalidate(),
    onError: (e) => showSmartToast(e, 'Failed to update status'),
  });

  const resetDialogState = () => { setForm(emptyForm); setCodeTouched(false); setCategoryPickerOpen(false); setCalculatorOpen(false); setCalculatorGroup(null); };

  const openAdd = () => { resetDialogState(); setAddOpen(true); };
  const openEdit = (item) => {
    setForm({
      itemName: item.itemName || '', itemCode: item.itemCode || '', category: item.category || '',
      density: { value: item.density?.value ?? '', unit: item.density?.unit || 'kg/m3' },
      isDiscontinued: !!item.isDiscontinued,
      dimensions: (item.dimensions || []).map(d => ({ ...d, values: d.values || {} })),
      purchaseUnitType: item.purchaseUnitType || '', purchaseUnit: item.purchaseUnit || '',
      usedUnitType: item.usedUnitType || '', usedUnit: item.usedUnit || '',
      receiveUnitType: item.receiveUnitType || '', receiveUnit: item.receiveUnit || '',
    });
    setCodeTouched(true);
    setSelected(item);
    setEditOpen(true);
  };
  const openView = (item) => { setSelected(item); setViewOpen(true); };

  // Item Name -> Item Code suggestion (on blur, only if not manually edited yet).
  const suggestCode = async () => {
    if (codeTouched || !form.itemName.trim()) return;
    try {
      const res = await apiRequest('GET', `/api/fabrication-master/next-code?name=${encodeURIComponent(form.itemName.trim())}`);
      if (res?.data?.code) setForm(f => ({ ...f, itemCode: res.data.code }));
    } catch { /* best-effort suggestion only */ }
  };

  // "Select Category" -> opens the 11-tile grid (Modal 1).
  const openCategoryPicker = () => setCategoryPickerOpen(true);
  // "Change" (category already chosen) — dimensions are category-specific, so
  // switching category clears whatever was already added.
  const changeCategory = () => {
    setForm(f => ({ ...f, category: '', density: { value: '', unit: f.density.unit || 'kg/m3' }, dimensions: [] }));
    setCategoryPickerOpen(true);
  };
  // Tile picked in Modal 1 -> open Modal 2 (fresh draft, category not locked yet).
  const handleTileSelect = (group) => {
    setCategoryPickerOpen(false);
    setCalculatorGroup(group);
    setCalculatorOpen(true);
  };
  // "Add Another Dimension" — category already locked, reopen Modal 2 directly.
  const openAddDimension = () => {
    if (!activeCategory) return;
    const group = groups.find(g => g.key === activeCategory.group);
    setCalculatorGroup(group || null);
    setCalculatorOpen(true);
  };
  // Modal 2 Save — locks in the resolved category + item-level density, appends the row.
  const handleCalculatorSave = ({ categoryKey, dimensionRow, density }) => {
    setForm(f => ({ ...f, category: categoryKey, density, dimensions: [...f.dimensions, dimensionRow] }));
    setCalculatorOpen(false);
  };
  const removeDimension = (idx) => setForm(f => ({ ...f, dimensions: f.dimensions.filter((_, i) => i !== idx) }));

  const canSave = form.itemName.trim() && form.category && form.density.value && form.dimensions.length > 0;

  const handleAdd = () => { if (canSave) createMutation.mutate(form); };
  const handleEditSave = () => { if (canSave) updateMutation.mutate({ id: selected._id, data: form }); };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Item Name *</Label>
          <Input value={form.itemName} onBlur={suggestCode} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} placeholder="e.g. Metal Sheet, Angle" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Item Code</Label>
          <div className="flex gap-2">
            <Input className="font-mono" value={form.itemCode} placeholder="Auto-suggested, e.g. MET-001"
              onChange={e => { setCodeTouched(true); setForm(f => ({ ...f, itemCode: e.target.value })); }} />
            <Button type="button" variant="outline" size="sm" onClick={() => { setCodeTouched(false); suggestCode(); }}>Generate</Button>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block">Category *</Label>
        {form.category ? (
          <div className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <span className="flex items-center gap-2">
              <ShapeTileIcon group={activeCategory?.group} className="h-8 w-8" />
              <span className="text-sm font-medium text-slate-800">{activeCategory?.label || form.category}</span>
            </span>
            <Button type="button" variant="outline" size="sm" onClick={changeCategory}>Change</Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={openCategoryPicker} className="w-full justify-start text-slate-500">
            <Layers className="h-4 w-4 mr-2" /> Select Category...
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Density</Label>
          <Input type="number" min="0" value={form.density.value} onChange={e => setForm(f => ({ ...f, density: { ...f.density, value: e.target.value } }))} placeholder="7850" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</Label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.density.unit}
            onChange={e => setForm(f => ({ ...f, density: { ...f.density, unit: e.target.value } }))}>
            <option value="kg/m3">kg/m³</option>
            <option value="g/cm3">g/cm³</option>
          </select>
        </div>
      </div>

      <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-slate-600 block">Dimensions * (add one or more)</Label>
          <Button type="button" size="sm" onClick={form.category ? openAddDimension : openCategoryPicker} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Dimension
          </Button>
        </div>
        {!form.category && <p className="text-xs text-slate-400 italic">Select a Category above first.</p>}

        {form.dimensions.length > 0 && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
            {form.dimensions.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-slate-700">{summarizeDimension(activeCategory?.fields || [], d)}{d.pieces > 1 ? ` × ${d.pieces} pcs` : ''}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{d.weightPerPieceKg.toFixed(2)} kg</span>
                  <button type="button" onClick={() => removeDimension(i)} className="text-slate-400 hover:text-red-500"><XCircle className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UnitFieldGroup title="Purchase Unit" unitTypes={unitTypes} typeValue={form.purchaseUnitType} unitValue={form.purchaseUnit}
        onTypeChange={v => setForm(f => ({ ...f, purchaseUnitType: v }))} onUnitChange={v => setForm(f => ({ ...f, purchaseUnit: v }))} />
      <UnitFieldGroup title="Used Unit" unitTypes={unitTypes} typeValue={form.usedUnitType} unitValue={form.usedUnit}
        onTypeChange={v => setForm(f => ({ ...f, usedUnitType: v }))} onUnitChange={v => setForm(f => ({ ...f, usedUnit: v }))} />
      <UnitFieldGroup title="Receive Unit" unitTypes={unitTypes} typeValue={form.receiveUnitType} unitValue={form.receiveUnit}
        onTypeChange={v => setForm(f => ({ ...f, receiveUnitType: v }))} onUnitChange={v => setForm(f => ({ ...f, receiveUnit: v }))} />

      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block">Status</Label>
        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          value={form.isDiscontinued ? 'Discontinue' : 'Continue'} onChange={e => setForm(f => ({ ...f, isDiscontinued: e.target.value === 'Discontinue' }))}>
          <option value="Continue">Continue</option>
          <option value="Discontinue">Discontinue</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button
            onClick={() => setLocation('/r&d/inventory')}
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-800 -ml-2 mb-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Inventory
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" /> Fabrication Master
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Register raw fabrication shapes (sheets, pipes, angles, beams...) with auto-calculated piece weights</p>
        </div>
        <Button onClick={openAdd} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
          <Plus className="h-4 w-4 mr-2" /> Add Fabrication Item
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by item name or code..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Density</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dimensions</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No fabrication items found.</td></tr>
                ) : items.map(it => (
                  <tr key={it._id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{it.itemName}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700">{it.itemCode}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{categories.find(c => c.key === it.category)?.label || it.category}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{it.density?.value} {it.density?.unit === 'g/cm3' ? 'g/cm³' : 'kg/m³'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{(it.dimensions || []).length}</td>
                    <td className="px-5 py-3.5">
                      {it.isDiscontinued
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => openView(it)}><Eye className="h-3.5 w-3.5" /></Button>
                        {it.isDiscontinued ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" onClick={() => statusMutation.mutate({ id: it._id, isDiscontinued: false })}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => openEdit(it)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" onClick={() => statusMutation.mutate({ id: it._id, isDiscontinued: true })}><Ban className="h-3.5 w-3.5" /></Button>
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

      {/* Add Fabrication Item */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Fabrication Item</DialogTitle></DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!canSave || createMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {createMutation.isPending ? 'Adding...' : 'Add Fabrication Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Fabrication Item */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Fabrication Item</DialogTitle></DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={!canSave || updateMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Fabrication Item */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.itemName}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Item Code</p><p className="text-sm font-mono font-medium text-slate-800">{selected.itemCode}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Category</p><p className="text-sm font-medium text-slate-800">{categories.find(c => c.key === selected.category)?.label || selected.category}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Density</p><p className="text-sm font-medium text-slate-800">{selected.density?.value} {selected.density?.unit === 'g/cm3' ? 'g/cm³' : 'kg/m³'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${selected.isDiscontinued ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{selected.isDiscontinued ? 'Discontinue' : 'Continue'}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Purchase Unit</p><p className="text-sm font-medium text-slate-800">{selected.purchaseUnit || '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Used Unit</p><p className="text-sm font-medium text-slate-800">{selected.usedUnit || '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Receive Unit</p><p className="text-sm font-medium text-slate-800">{selected.receiveUnit || '—'}</p></div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-2 font-semibold">Dimensions ({(selected.dimensions || []).length})</p>
                <div className="divide-y divide-slate-100">
                  {(selected.dimensions || []).map((d, i) => {
                    const cat = categories.find(c => c.key === selected.category);
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-slate-700">{summarizeDimension(cat?.fields || [], d)}</span>
                        <span className="text-xs font-semibold text-slate-600">{d.weightPerPieceKg?.toFixed(2)} kg</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryPickerModal
        open={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        groups={groups}
        onSelect={handleTileSelect}
      />
      <DimensionCalculatorModal
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        group={calculatorGroup}
        categories={categories}
        materials={materials}
        defaultDensityKgM3={defaultDensity}
        lockedCategoryKey={form.category || null}
        initialDensity={form.density.value ? form.density : null}
        onSave={handleCalculatorSave}
      />
    </div>
  );
}
