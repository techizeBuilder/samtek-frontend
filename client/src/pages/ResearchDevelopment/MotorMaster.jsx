import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Cog, Plus, Search, Eye, Edit2, Ban, RefreshCw, XCircle, Loader2, ImageIcon } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { UNIT_TYPES, getUnitsForType } from '@/utils/unitTypes';
import { config } from '@/config/environment';

const resolveMediaUrl = (url) => (!url ? '' : (url.startsWith('http') || url.startsWith('data:')) ? url : `${config.baseURL}${url}`);

const emptyForm = {
  code: '', name: '', description: '', motorType: '', brand: '',
  serialNumber: '', image: '',
  motorDetails: { modelNumber: '', version: '', hp: '', kwh: '', rpm: '', pole: '', phase: '' },
  specifications: [],
  purchase: true, internalManufacturing: false,
  unitType: '', unit: '', purchaseUnitType: '', purchaseUnit: '',
  stdCost: '', purchaseCost: '', salePrice: '', mrp: '', gst: '', qty: '', minStock: '',
};

// 1 HP = 0.746 kW — client's requested auto-calculation. Still editable afterward.
const hpToKwh = (hp) => {
  const n = Number(hp);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 0.746 * 100) / 100 : '';
};

export default function MotorMaster() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [imageUploading, setImageUploading] = useState(false);
  const [newOptionModal, setNewOptionModal] = useState({ open: false, field: '', value: '', parentValue: '' });

  // ── Motor Type — Motor Master's own scoped classification (RDMasterOption
  // field 'MotorType'), deliberately separate from Product Master's and
  // Inventory's classification lists. ──
  const { data: optionsResponse } = useQuery({
    queryKey: ['rd-master-options'],
    queryFn: () => apiRequest('GET', '/api/rd/master-options'),
  });
  const masterOptions = optionsResponse?.data || {};
  const motorTypeOptions = masterOptions.MotorType || [];

  const addOptionMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/rd/master-options', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rd-master-options'] }),
  });

  const handleAddOption = async () => {
    if (!newOptionModal.value) return;
    try {
      await addOptionMutation.mutateAsync({ field: newOptionModal.field, value: newOptionModal.value, parentValue: newOptionModal.parentValue || null });
      const setState = editOpen ? setEditForm : setForm;
      setState(f => ({ ...f, motorType: newOptionModal.value }));
      setNewOptionModal({ open: false, field: '', value: '', parentValue: '' });
      showSuccessToast('Option Added', 'New option added successfully');
    } catch (e) {
      showSmartToast(e, 'Failed to add option');
    }
  };

  // ── Dynamic unit types (same source used everywhere else) ──
  const { data: unitTypesData } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
    queryFn: () => apiRequest('GET', '/api/inventory/unit-types'),
  });
  const unitTypesList = React.useMemo(() => {
    if (unitTypesData?.unitTypes) return unitTypesData.unitTypes.map(ut => ut.name);
    return UNIT_TYPES;
  }, [unitTypesData]);
  const getUnitsForTypeDynamic = (unitTypeName, currentUnit) => {
    if (!unitTypeName) return [];
    if (unitTypesData?.unitTypes) {
      const found = unitTypesData.unitTypes.find(ut => ut.name === unitTypeName);
      if (found) {
        const units = found.units || [];
        return currentUnit && !units.includes(currentUnit) ? [currentUnit, ...units] : units;
      }
    }
    return getUnitsForType(unitTypeName, currentUnit);
  };

  // ── Motor list — Item collection, scoped to type:Product + productKind:Motor.
  // This filter is sent as a query param only, never exposed as a UI control. ──
  const { data: motorsResponse, isLoading } = useQuery({
    queryKey: ['motor-master', 'list', { search, showDiscontinued }],
    queryFn: () => {
      const params = new URLSearchParams({ type: 'Product', productKind: 'Motor', limit: '100' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/items?${params.toString()}`);
    },
  });
  const allMotors = motorsResponse?.items || motorsResponse?.data || [];
  const motors = allMotors.filter(m => showDiscontinued ? m.isDiscontinued : !m.isDiscontinued);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['motor-master'] });

  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('POST', '/api/items', data),
    onSuccess: () => { invalidate(); showSuccessToast('Motor Added', 'New motor created successfully'); setForm(emptyForm); setAddOpen(false); },
    onError: (e) => showSmartToast(e, 'Failed to add motor'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/items/${id}`, data),
    onSuccess: () => { invalidate(); showSuccessToast('Motor Updated', 'Motor updated successfully'); setEditOpen(false); },
    onError: (e) => showSmartToast(e, 'Failed to update motor'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, isDiscontinued }) => apiRequest('PUT', `/api/items/${id}`, { isDiscontinued }),
    onSuccess: () => { invalidate(); },
    onError: (e) => showSmartToast(e, 'Failed to update status'),
  });

  const buildPayload = (f) => {
    // Item schema only has motorDetails.motorType — the form tracks Motor
    // Type as a top-level field for simplicity, so it has to be folded in
    // here explicitly, or it silently gets dropped by Mongoose's strict mode.
    const motorDetails = {
      ...f.motorDetails,
      motorType: f.motorType,
      hp: f.motorDetails.hp !== '' ? Number(f.motorDetails.hp) : null,
      kwh: f.motorDetails.kwh !== '' ? Number(f.motorDetails.kwh) : null,
      rpm: f.motorDetails.rpm !== '' ? Number(f.motorDetails.rpm) : null,
    };

    // Mirror the Motor Specifications fields into the generic `specifications`
    // list too. Motor Master has no UI of its own for that generic builder
    // (only Product Master does, so `f.specifications` here is always []),
    // but Quotation's Price List builds its table columns from
    // specifications[].key — without this, a motor's specs would never show
    // up there even though they're right there in motorDetails.
    const specifications = [
      ['Version', motorDetails.version],
      ['HP', motorDetails.hp],
      ['KWH', motorDetails.kwh],
      ['RPM', motorDetails.rpm],
      ['Pole', motorDetails.pole],
      ['Phase', motorDetails.phase],
    ]
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => ({ key, value: String(value) }));

    return {
      ...f,
      type: 'Product',
      productKind: 'Motor',
      // Item.category and Item.importance are required schema fields, but Motor
      // Master doesn't ask the user for either — fixed values, never shown.
      // subCategory is also fixed to 'Motor' so Sales' Category/SubCategory
      // filters can narrow down to motors specifically.
      category: 'Motor',
      subCategory: 'Motor',
      importance: 'Normal',
      motorDetails,
      stdCost: Number(f.stdCost) || 0,
      purchaseCost: Number(f.purchaseCost) || 0,
      salePrice: Number(f.salePrice) || 0,
      mrp: Number(f.mrp) || 0,
      gst: Number(f.gst) || 0,
      qty: Number(f.qty) || 0,
      minStock: Number(f.minStock) || 0,
      purchaseUnitType: f.purchase ? f.purchaseUnitType : '',
      purchaseUnit: f.purchase ? f.purchaseUnit : '',
      specifications,
    };
  };

  const handleAdd = () => {
    if (!form.code || !form.name || !form.unit) return;
    createMutation.mutate(buildPayload(form));
  };
  const handleEditSave = () => {
    if (!editForm.code || !editForm.name || !editForm.unit) return;
    updateMutation.mutate({ id: selected._id, data: buildPayload(editForm) });
  };

  const toFormState = (m) => ({
    code: m.code || '', name: m.name || '', description: m.description || '',
    motorType: m.motorDetails?.motorType || m.motorType || '',
    brand: m.brand || '', serialNumber: m.serialNumber || '', image: m.image || '',
    motorDetails: {
      modelNumber: m.motorDetails?.modelNumber || '',
      version: m.motorDetails?.version || '',
      hp: m.motorDetails?.hp ?? '',
      kwh: m.motorDetails?.kwh ?? '',
      rpm: m.motorDetails?.rpm ?? '',
      pole: m.motorDetails?.pole || '',
      phase: m.motorDetails?.phase || '',
    },
    specifications: Array.isArray(m.specifications) ? m.specifications : [],
    purchase: m.purchase !== false, internalManufacturing: !!m.internalManufacturing,
    unitType: m.unitType || '', unit: m.unit || '',
    purchaseUnitType: m.purchaseUnitType || '', purchaseUnit: m.purchaseUnit || '',
    stdCost: m.stdCost ?? '', purchaseCost: m.purchaseCost ?? '', salePrice: m.salePrice ?? '',
    mrp: m.mrp ?? '', gst: m.gst ?? '', qty: m.qty ?? '', minStock: m.minStock ?? '',
  });

  const openEdit = (m) => { setSelected(m); setEditForm(toFormState(m)); setEditOpen(true); };
  const openView = (m) => { setSelected(m); setViewOpen(true); };

  const handleImageUpload = async (event, setState) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showSmartToast(new Error('Please select an image under 5MB'), 'File too large');
      return;
    }
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiRequest('POST', '/api/items/upload-image', fd);
      if (res.success && res.url) setState(f => ({ ...f, image: res.url }));
    } catch (e) {
      showSmartToast(e, 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

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

  const renderMotorForm = (state, setState) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Motor Code *</Label>
          <Input value={state.code} onChange={e => setState(f => ({ ...f, code: e.target.value }))} placeholder="e.g. MTR-001" className="font-mono" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Motor Name *</Label>
          <Input value={state.name} onChange={e => setState(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 5HP Induction Motor" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {renderCascadeSelect('Motor Type', 'MotorType', 'motorType', motorTypeOptions, state, setState)}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Brand Name</Label>
          <Input value={state.brand} onChange={e => setState(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Crompton" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Model Number</Label>
          <Input value={state.motorDetails.modelNumber} onChange={e => setState(f => ({ ...f, motorDetails: { ...f.motorDetails, modelNumber: e.target.value } }))} placeholder="e.g. 8100" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Serial Number</Label>
          <Input value={state.serialNumber} onChange={e => setState(f => ({ ...f, serialNumber: e.target.value }))} />
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
        <p className="text-xs font-bold text-slate-700 mb-2">Motor Specifications</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Version</Label>
            <Input className="bg-white" value={state.motorDetails.version} onChange={e => setState(f => ({ ...f, motorDetails: { ...f.motorDetails, version: e.target.value } }))} />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">HP</Label>
            <Input className="bg-white" type="number" min="0" value={state.motorDetails.hp}
              onChange={e => {
                const hp = e.target.value;
                setState(f => ({ ...f, motorDetails: { ...f.motorDetails, hp, kwh: hpToKwh(hp) } }));
              }} />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">KWH <span className="text-[10px] text-slate-400 font-normal">(auto from HP, editable)</span></Label>
            <Input className="bg-white" type="number" min="0" value={state.motorDetails.kwh} onChange={e => setState(f => ({ ...f, motorDetails: { ...f.motorDetails, kwh: e.target.value } }))} />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">RPM</Label>
            <Input className="bg-white" type="number" min="0" value={state.motorDetails.rpm} onChange={e => setState(f => ({ ...f, motorDetails: { ...f.motorDetails, rpm: e.target.value } }))} />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Pole</Label>
            <Input className="bg-white" value={state.motorDetails.pole} onChange={e => setState(f => ({ ...f, motorDetails: { ...f.motorDetails, pole: e.target.value } }))} placeholder="e.g. 4 Pole" />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Phase</Label>
            <Input className="bg-white" value={state.motorDetails.phase} onChange={e => setState(f => ({ ...f, motorDetails: { ...f.motorDetails, phase: e.target.value } }))} placeholder="e.g. 3-Phase" />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Image</Label>
        <div className="flex items-center gap-3">
          {state.image ? (
            <img src={resolveMediaUrl(state.image)} alt="Motor" className="h-16 w-16 object-cover rounded-lg border" />
          ) : (
            <div className="h-16 w-16 rounded-lg border border-dashed flex items-center justify-center text-slate-300"><ImageIcon className="h-6 w-6" /></div>
          )}
          <input type="file" accept="image/*" disabled={imageUploading} onChange={e => handleImageUpload(e, setState)} className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700" />
          {imageUploading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1 block">Description</Label>
        <Textarea rows={2} value={state.description} onChange={e => setState(f => ({ ...f, description: e.target.value }))} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold text-slate-600">Specifications</Label>
          <button type="button" onClick={() => setState(f => ({ ...f, specifications: [...f.specifications, { key: '', value: '' }] }))}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-md hover:bg-blue-50">
            <Plus className="h-3 w-3" /> Add Row
          </button>
        </div>
        {state.specifications.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-lg">No specifications yet.</p>
        ) : (
          <div className="space-y-2">
            {state.specifications.map((spec, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input className="flex-1" placeholder="Key" value={spec.key} onChange={e => setState(f => ({ ...f, specifications: f.specifications.map((s, i) => i === idx ? { ...s, key: e.target.value } : s) }))} />
                <Input className="flex-1" placeholder="Value" value={spec.value} onChange={e => setState(f => ({ ...f, specifications: f.specifications.map((s, i) => i === idx ? { ...s, value: e.target.value } : s) }))} />
                <button type="button" onClick={() => setState(f => ({ ...f, specifications: f.specifications.filter((_, i) => i !== idx) }))} className="text-slate-400 hover:text-red-500 p-1"><XCircle className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <RadioGroup
        value={state.purchase ? 'purchase' : state.internalManufacturing ? 'internalManufacturing' : ''}
        onValueChange={(v) => setState(f => ({ ...f, purchase: v === 'purchase', internalManufacturing: v === 'internalManufacturing' }))}
        className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-md"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="purchase" id={`purchase-${state === form ? 'add' : 'edit'}`} />
          <Label htmlFor={`purchase-${state === form ? 'add' : 'edit'}`} className="text-sm font-medium text-slate-700">Purchasable (Vendor)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="internalManufacturing" id={`mfg-${state === form ? 'add' : 'edit'}`} />
          <Label htmlFor={`mfg-${state === form ? 'add' : 'edit'}`} className="text-sm font-medium text-slate-700">Internal Manufacturing</Label>
        </div>
      </RadioGroup>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Base Unit Type *</Label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={state.unitType} onChange={e => setState(f => ({ ...f, unitType: e.target.value, unit: '' }))}>
            <option value="">Select</option>
            {unitTypesList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Base Unit *</Label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-50" value={state.unit} disabled={!state.unitType} onChange={e => setState(f => ({ ...f, unit: e.target.value }))}>
            <option value="">{state.unitType ? 'Select' : 'Select Unit Type first'}</option>
            {getUnitsForTypeDynamic(state.unitType, state.unit).map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {state.purchase && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/30 border border-blue-100 rounded-md">
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Purchase Unit Type *</Label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" value={state.purchaseUnitType} onChange={e => setState(f => ({ ...f, purchaseUnitType: e.target.value, purchaseUnit: '' }))}>
              <option value="">Select</option>
              {unitTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-600 mb-1 block">Purchase Unit *</Label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-50" value={state.purchaseUnit} disabled={!state.purchaseUnitType} onChange={e => setState(f => ({ ...f, purchaseUnit: e.target.value }))}>
              <option value="">{state.purchaseUnitType ? 'Select' : 'Select Unit Type first'}</option>
              {getUnitsForTypeDynamic(state.purchaseUnitType, state.purchaseUnit).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-lg p-3">
        <p className="text-xs font-bold text-slate-700 mb-2">Pricing &amp; Stock</p>
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-xs text-slate-500 mb-1 block">Std Cost</Label><Input type="number" value={state.stdCost} onChange={e => setState(f => ({ ...f, stdCost: e.target.value }))} /></div>
          <div><Label className="text-xs text-slate-500 mb-1 block">Purchase Cost</Label><Input type="number" value={state.purchaseCost} onChange={e => setState(f => ({ ...f, purchaseCost: e.target.value }))} /></div>
          <div><Label className="text-xs text-slate-500 mb-1 block">Sale Price</Label><Input type="number" value={state.salePrice} onChange={e => setState(f => ({ ...f, salePrice: e.target.value }))} /></div>
          <div><Label className="text-xs text-slate-500 mb-1 block">MRP</Label><Input type="number" value={state.mrp} onChange={e => setState(f => ({ ...f, mrp: e.target.value }))} /></div>
          <div><Label className="text-xs text-slate-500 mb-1 block">GST %</Label><Input type="number" value={state.gst} onChange={e => setState(f => ({ ...f, gst: e.target.value }))} /></div>
          <div><Label className="text-xs text-slate-500 mb-1 block">Available Stock</Label><Input type="number" value={state.qty} onChange={e => setState(f => ({ ...f, qty: e.target.value }))} /></div>
          <div><Label className="text-xs text-slate-500 mb-1 block">Min Stock</Label><Input type="number" value={state.minStock} onChange={e => setState(f => ({ ...f, minStock: e.target.value }))} /></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Cog className="h-6 w-6 text-blue-600" /> Motor Master
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Central register of motors — purchased or internally manufactured</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setAddOpen(true); }} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
          <Plus className="h-4 w-4 mr-2" /> Add Motor
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name, code..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Motor Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">HP / KWH</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading...</td></tr>
                ) : motors.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No motors found.</td></tr>
                ) : motors.map(m => (
                  <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700">{m.code}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{m.name}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{m.motorDetails?.motorType || m.motorType || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{m.motorDetails?.hp ? `${m.motorDetails.hp} HP` : '—'}{m.motorDetails?.kwh ? ` / ${m.motorDetails.kwh} KW` : ''}</td>
                    <td className="px-5 py-3.5 text-xs">{m.purchase ? 'Purchase' : m.internalManufacturing ? 'In House' : '—'}</td>
                    <td className="px-5 py-3.5">
                      {m.isDiscontinued
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => openView(m)}><Eye className="h-3.5 w-3.5" /></Button>
                        {m.isDiscontinued ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" onClick={() => statusMutation.mutate({ id: m._id, isDiscontinued: false })}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => openEdit(m)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" onClick={() => statusMutation.mutate({ id: m._id, isDiscontinued: true })}><Ban className="h-3.5 w-3.5" /></Button>
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

      {/* Add Motor */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Motor</DialogTitle></DialogHeader>
          {renderMotorForm(form, setForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.code || !form.name || !form.unit || createMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {createMutation.isPending ? 'Adding...' : 'Add Motor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Motor */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Motor</DialogTitle></DialogHeader>
          {renderMotorForm(editForm, setEditForm)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={!editForm.code || !editForm.name || !editForm.unit || updateMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Motor */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{selected?.code}</span>
              <span>{selected?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              {selected.image && (
                <img src={resolveMediaUrl(selected.image)} alt={selected.name} className="h-32 w-32 object-cover rounded-lg border mx-auto" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Motor Type</p><p className="text-sm font-medium text-slate-800">{selected.motorDetails?.motorType || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Brand</p><p className="text-sm font-medium text-slate-800">{selected.brand || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Model No.</p><p className="text-sm font-medium text-slate-800">{selected.motorDetails?.modelNumber || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Serial No.</p><p className="text-sm font-medium text-slate-800">{selected.serialNumber || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Version</p><p className="text-sm font-medium text-slate-800">{selected.motorDetails?.version || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">HP / KWH</p><p className="text-sm font-medium text-slate-800">{selected.motorDetails?.hp || '—'} HP / {selected.motorDetails?.kwh || '—'} KW</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">RPM</p><p className="text-sm font-medium text-slate-800">{selected.motorDetails?.rpm || 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Pole / Phase</p><p className="text-sm font-medium text-slate-800">{selected.motorDetails?.pole || '—'} / {selected.motorDetails?.phase || '—'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Source</p><p className="text-sm font-medium text-slate-800">{selected.purchase ? 'Purchase' : selected.internalManufacturing ? 'In House' : 'N/A'}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Stock</p><p className="text-sm font-medium text-slate-800">{selected.qty ?? 0} {selected.unit}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Sale Price</p><p className="text-sm font-medium text-slate-800">₹{Number(selected.salePrice || 0).toLocaleString()}</p></div>
              </div>
              {selected.description && (
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700">{selected.description}</p></div>
              )}
              {Array.isArray(selected.specifications) && selected.specifications.filter(s => s.key).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Specifications</p>
                  <div className="divide-y divide-slate-100">
                    {selected.specifications.filter(s => s.key).map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-semibold text-slate-500">{s.key}</span>
                        <span className="text-sm text-slate-800 font-medium">{s.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Motor Type option */}
      <Dialog open={newOptionModal.open} onOpenChange={(open) => !open && setNewOptionModal({ open: false, field: '', value: '', parentValue: '' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Motor Type</DialogTitle></DialogHeader>
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
