import React, { useState, useRef, useEffect } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ClipboardList, Lock, Plus, Trash2, Edit2, Eye, AlertTriangle, Ban, RefreshCw, Search, Settings2 } from 'lucide-react';
import { UNIT_TYPES, getUnitTypeForUnit, getUnitsForType } from '@/utils/unitTypes';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import BOMFieldConfigModal from './BOMFieldConfigModal';
import { formatCatalogFieldValue } from '@/utils/bomFieldFormat';

const emptyMaterial = {
  code: '', childPart: '', subChildPart: '', childPartCode: '', subChildPartCode: '',
  item: '', itemType: '', quantity: '', unitType: '', unit: '',
  unitPrice: 0, // display-only, always recomputed server-side on save
  // Product Master snapshot fields, silently captured on code match
  category: '', pType: '', pSourceType: '', brand: '', description: '', metrology: '', specifications: [], customFields: [],
  size: '', unitWeightValue: '', unitWeightUnitType: '', unitWeightUnit: ''
};

// A Sub Child Part is normally built from several raw materials, not just
// one — so the Add dialog collects Child Part/Sub Child Part once, then any
// number of these rows (one per Inventory item) submitted together as
// separate material lines sharing that same Child Part/Sub Child Part.
const emptyMaterialRow = {
  code: '', item: '', itemType: '', quantity: '', unitType: '', unit: '', unitPrice: 0,
  category: '', brand: '', description: '', specifications: [],
};
const emptyAddForm = {
  childPartCode: '', childPart: '', subChildPartCode: '', subChildPart: '',
  rows: [{ ...emptyMaterialRow }],
};


// BOM materials must reference an existing Inventory item (raw material) —
// no free-typed codes. This picker replaces the old free-text code input
// with a searchable, selection-only list.
function MaterialCodePicker({ value, displayName, items, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const candidates = (items || []).filter(m => !m.isDiscontinued);
  const q = query.trim().toLowerCase();
  const matches = (q
    ? candidates.filter(m => (m.code || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q))
    : candidates
  ).slice(0, 50);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          className="w-full h-10 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search Inventory code or name..."
          value={open ? query : (value ? `${value}${displayName ? ` — ${displayName}` : ''}` : '')}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
          {matches.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-3">No matching Inventory items</p>
          ) : matches.map(m => (
            <button
              type="button"
              key={m._id}
              onClick={() => { onSelect(m); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-50 last:border-0"
            >
              <span className="font-mono font-semibold text-blue-700">{m.code}</span>
              <span className="text-slate-600"> — {m.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BOMCreationTab({ product }) {
  const { boms, getBOMForMachine, addBOM, addMaterials, updateMaterial, deleteMaterial, lockBOM, discontinueMaterial, reactivateMaterial } = useRD();
  const selectedMachineId = product?._id || '';
  const selectedMachine = product;

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [newBOMOpen, setNewBOMOpen] = useState(false);
  const [bomFormatOpen, setBomFormatOpen] = useState(false);
  const [deleteMat, setDeleteMat] = useState(null);
  const [viewMat, setViewMat] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(emptyAddForm);
  const [editForm, setEditForm] = useState(emptyMaterial);
  const [editingMat, setEditingMat] = useState(null);

  // Query dynamic unit types
  const { data: unitTypesData } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
    queryFn: () => apiRequest('GET', '/api/inventory/unit-types'),
  });

  // Raw materials for BOM line items — Product Master now holds finished-goods
  // machines only, not materials, so materials come from plain Inventory.
  const { data: inventoryResponse } = useQuery({
    queryKey: ['bom-inventory-items'],
    queryFn: () => apiRequest('GET', '/api/items?productKind=none&limit=1000'),
  });
  const inventoryItems = inventoryResponse?.items || [];

  // Child Parts created (via the Child Part Creation tab) for this product —
  // Child Part / Sub Child Part are picked from here, not typed.
  const { data: childPartsResponse } = useQuery({
    queryKey: ['rd-child-parts', selectedMachineId],
    queryFn: () => apiRequest('GET', `/api/rd/child-parts?productId=${selectedMachineId}`),
    enabled: !!selectedMachineId,
  });
  const childPartsForMachine = childPartsResponse?.data?.filter(cp => !cp.isDiscontinued) || [];

  // BOM Format & Modification — which Inventory fields show as extra columns
  // in the materials table, same set applied across every BOM.
  const { data: bomFieldConfigResponse } = useQuery({
    queryKey: ['rd-bom-field-config'],
    queryFn: () => apiRequest('GET', '/api/rd/bom-field-config'),
  });
  const enabledBOMFields = bomFieldConfigResponse?.data?.enabledFields || [];
  const bomFieldCatalog = bomFieldConfigResponse?.data?.catalog || [];
  const enabledCatalogEntries = bomFieldCatalog.filter(f => enabledBOMFields.includes(f.key));
  // Code/Name/Unit/purchaseCost already have their own dedicated columns
  // (Material Code, Material Name, Unit, Price) — don't duplicate them.
  const extraColumns = enabledCatalogEntries.filter(f => !['code', 'name', 'unit', 'purchaseCost'].includes(f.key));

  const unitTypesList = React.useMemo(() => {
    if (unitTypesData?.unitTypes) {
      return unitTypesData.unitTypes.map(ut => ut.name);
    }
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

  // Look up an Inventory item by its code — BOM materials reference raw
  // materials, tools, fabricated parts etc., all of which live in Inventory.
  const findProductByCode = (code) => {
    const c = (code || '').trim().toLowerCase();
    if (!c) return null;
    return inventoryItems.find(m => (m.code || '').trim().toLowerCase() === c) || null;
  };

  // BOM materials can only be Inventory entries — picking one via MaterialCodePicker
  // snapshots everything Inventory knows about it (category, brand, description,
  // specs) into the material record as a point-in-time copy, even though most of
  // it has no dedicated input on this form. Viewable via the "eye" button.
  const applyProductMatch = (setState, match) => {
    setState(f => ({
      ...f,
      code: match.code || '',
      item: match.name || f.item,
      category: match.category || '',
      brand: match.brand || '',
      description: match.description || '',
      specifications: Array.isArray(match.specifications) ? match.specifications : [],
      // Base unit auto-filled from the Inventory item's own stocking unit —
      // still just a starting point, editable afterward if this BOM line
      // genuinely needs a different unit.
      unitType: match.unitType || getUnitTypeForUnit(match.unit) || f.unitType,
      unit: match.unit || f.unit,
      // Display-only preview — the server always recomputes this
      // authoritatively from the Inventory item on save.
      unitPrice: match.purchaseCost || 0,
    }));
  };

  // Same as applyProductMatch above, but scoped to one row of the Add
  // dialog's material list instead of the whole form.
  const applyMatchToRow = (rowIndex, match) => {
    setForm(f => {
      const rows = [...f.rows];
      const row = rows[rowIndex];
      rows[rowIndex] = {
        ...row,
        code: match.code || '',
        item: match.name || row.item,
        category: match.category || '',
        brand: match.brand || '',
        description: match.description || '',
        specifications: Array.isArray(match.specifications) ? match.specifications : [],
        unitType: match.unitType || getUnitTypeForUnit(match.unit) || row.unitType,
        unit: match.unit || row.unit,
        unitPrice: match.purchaseCost || 0,
      };
      return { ...f, rows };
    });
  };
  const updateRow = (rowIndex, patch) => {
    setForm(f => {
      const rows = [...f.rows];
      rows[rowIndex] = { ...rows[rowIndex], ...patch };
      return { ...f, rows };
    });
  };
  const addRow = () => setForm(f => ({ ...f, rows: [...f.rows, { ...emptyMaterialRow }] }));
  const removeRow = (rowIndex) => setForm(f => ({ ...f, rows: f.rows.filter((_, i) => i !== rowIndex) }));

  // Sub Child Part options are scoped to whichever Child Part is currently
  // selected on the form (matched by childPartCode).
  const getSubChildPartOptions = (childPartCode) => {
    const cp = childPartsForMachine.find(c => c.code === childPartCode);
    return (cp?.subChildParts || []).filter(s => !s.isDiscontinued);
  };

  const renderCodeMatchHint = (code) => {
    if (!code) return null;
    const match = findProductByCode(code);
    if (!match) return null;
    const extras = [];
    if (match.category) extras.push('Category');
    if (match.brand) extras.push('Brand');
    if (Array.isArray(match.specifications) && match.specifications.length) extras.push(`${match.specifications.length} spec${match.specifications.length > 1 ? 's' : ''}`);
    return (
      <p className="text-[11px] text-emerald-600 mt-1">
        ✓ Matched Inventory item: {match.name}
        {extras.length > 0 && <span className="text-slate-500"> — also captured: {extras.join(', ')}</span>}
      </p>
    );
  };

  const bom = selectedMachineId ? getBOMForMachine(selectedMachineId) : null;

  const rowsValid = form.rows.length > 0 && form.rows.every(r => r.code && r.item && r.quantity && r.unitType && r.unit);
  const addFormValid = !!form.childPartCode && !!form.subChildPartCode && rowsValid;
  const addFormTotal = form.rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (r.unitPrice || 0), 0);

  const handleAddMaterial = async () => {
    if (!addFormValid) return;
    setIsAdding(true);
    try {
      await addMaterials(bom._id, form.rows.map(row => ({
        ...row,
        quantity: Number(row.quantity),
        childPart: form.childPart,
        subChildPart: form.subChildPart,
        childPartCode: form.childPartCode,
        subChildPartCode: form.subChildPartCode,
      })));
      setForm(emptyAddForm);
      setAddOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditMaterial = () => {
    if (!editForm.childPartCode || !editForm.subChildPartCode || !editForm.code || !editForm.item || !editForm.quantity || !editForm.unit) return;
    updateMaterial(bom._id, editingMat._id, { ...editForm, quantity: Number(editForm.quantity) });
    setEditOpen(false);
  };

  const openEdit = (mat) => {
    setEditingMat(mat);
    setEditForm({
      code: mat.code || '',
      childPart: mat.childPart || '',
      subChildPart: mat.subChildPart || '',
      childPartCode: mat.childPartCode || '',
      subChildPartCode: mat.subChildPartCode || '',
      item: mat.item || '',
      itemType: mat.itemType || '',
      quantity: String(mat.quantity),
      unitType: mat.unitType || getUnitTypeForUnit(mat.unit),
      unit: mat.unit || '',
      unitPrice: mat.unitPrice || 0,
      category: mat.category || '',
      pType: mat.pType || '',
      pSourceType: mat.pSourceType || '',
      brand: mat.brand || '',
      description: mat.description || '',
      metrology: mat.metrology || '',
      specifications: Array.isArray(mat.specifications) ? mat.specifications : [],
      customFields: Array.isArray(mat.customFields) ? mat.customFields : [],
      size: mat.size || '',
      unitWeightValue: mat.unitWeightValue !== null && mat.unitWeightValue !== undefined ? mat.unitWeightValue : '',
      unitWeightUnitType: mat.unitWeightUnitType || '',
      unitWeightUnit: mat.unitWeightUnit || '',
      inputUnitType: mat.inputUnitType || '',
      inputUnit: mat.inputUnit || '',
      outputUnitType: mat.outputUnitType || '',
      outputUnit: mat.outputUnit || '',
    });
    setEditOpen(true);
  };

  const openView = (mat) => setViewMat(mat);

  const handleCreateBOM = () => {
    addBOM(selectedMachineId);
    setNewBOMOpen(false);
  };

  if (!selectedMachineId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => setBomFormatOpen(true)}>
          <Settings2 className="h-4 w-4 mr-1.5" /> BOM Format & Modification
        </Button>
      </div>

      <BOMFieldConfigModal open={bomFormatOpen} onOpenChange={setBomFormatOpen} />

      {!bom && (
        <Card className="border-none shadow-sm">
          <CardContent className="py-12 text-center space-y-3">
            <ClipboardList className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-slate-500 font-medium">No BOM found for {selectedMachine?.name}</p>
            <p className="text-slate-400 text-sm">Create the first BOM for this machine to define raw materials and quantities.</p>
            <Button onClick={() => setNewBOMOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Create BOM
            </Button>
          </CardContent>
        </Card>
      )}

      {bom && (
        <>
          {/* BOM Header */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-slate-900">{selectedMachine?.name}</h2>
                      <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedMachine?.code}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">Variant: <strong>{bom.variant}</strong></span>
                      <span className="text-xs text-slate-500">Version: <strong>{bom.version}</strong></span>
                      <span className="text-xs text-slate-500">{bom.materials.length} materials</span>
                      {bom.isLocked && <span className="text-xs text-slate-500">Locked: {bom.lockedAt}</span>}
                    </div>
                  </div>
                  {bom.isLocked ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                      <Lock className="h-3.5 w-3.5" /> BOM Locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                      Editable
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!bom.isLocked && (
                    <>
                      <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => setAddOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Material
                      </Button>
                      <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setLockOpen(true)}>
                        <Lock className="h-4 w-4 mr-1" /> Lock BOM
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {bom.isLocked && (
                <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>This BOM is locked. Production cannot modify it. Contact R&D to request changes via the Change Management system.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Materials Table */}
          <Card className="border-none shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Raw Materials</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material Code</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hierarchy (Child &gt; Sub-Child)</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                      {extraColumns.map(f => (
                        <th key={f.key} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{f.label}</th>
                      ))}
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.materials.length === 0 ? (
                      <tr><td colSpan={9 + extraColumns.length} className="text-center py-10 text-slate-400">No materials added. Click "Add Material" to start building the BOM.</td></tr>
                    ) : bom.materials.map((mat, i) => (
                      <tr key={mat._id} className={`border-b border-slate-50 transition-colors ${mat.isDiscontinued ? 'bg-red-50/40 opacity-70' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">{i + 1}</td>
                        <td className="px-5 py-3.5"><span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{mat.code || '—'}</span></td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {[mat.childPart, mat.subChildPart].filter(Boolean).join(' > ') || '—'}
                        </td>
                        <td className={`px-5 py-3.5 font-medium ${mat.isDiscontinued ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{mat.item}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">{mat.quantity}</td>
                        <td className="px-5 py-3.5 text-slate-600">{mat.unit}</td>
                        <td className="px-5 py-3.5 text-slate-700">₹{(mat.totalPrice || 0).toLocaleString()} <span className="text-[10px] text-slate-400">(₹{mat.unitPrice || 0}/unit)</span></td>
                        {extraColumns.map(f => {
                          const display = formatCatalogFieldValue(f.key, mat);
                          return (
                            <td key={f.key} className="px-5 py-3.5 text-xs text-slate-600 max-w-[160px]">
                              {display === '—' ? '—' : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate cursor-default">{display}</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs whitespace-pre-wrap break-words">{display}</TooltipContent>
                                </Tooltip>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-5 py-3.5">
                          {mat.isDiscontinued
                            ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                            : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" title="View details" onClick={() => openView(mat)}><Eye className="h-3.5 w-3.5" /></Button>
                            {!bom.isLocked && (
                              mat.isDiscontinued ? (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" title="Reactivate" onClick={() => reactivateMaterial(bom._id, mat._id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-purple-600" onClick={() => openEdit(mat)}><Edit2 className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => setDeleteMat(mat)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" title="Discontinue" onClick={() => discontinueMaterial(bom._id, mat._id)}><Ban className="h-3.5 w-3.5" /></Button>
                                </>
                              )
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
        </>
      )}

      {/* Add Material Dialog — Child Part/Sub Child Part picked once, then any
          number of raw materials (rows) added together under that same pair,
          since a sub-part is normally built from several materials, not one. */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Materials</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {childPartsForMachine.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No Child Parts exist yet for {selectedMachine?.name}. Create them first in the Child Part Creation tab.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Child Part *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.childPartCode}
                  onChange={e => {
                    const cp = childPartsForMachine.find(c => c.code === e.target.value);
                    setForm(f => ({ ...f, childPartCode: e.target.value, childPart: cp?.name || '', subChildPartCode: '', subChildPart: '' }));
                  }}>
                  <option value="">Select Child Part</option>
                  {childPartsForMachine.map(cp => <option key={cp._id} value={cp.code}>{cp.code} — {cp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Sub Child Part *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  value={form.subChildPartCode}
                  disabled={!form.childPartCode}
                  onChange={e => {
                    const sub = getSubChildPartOptions(form.childPartCode).find(s => s.code === e.target.value);
                    setForm(f => ({ ...f, subChildPartCode: e.target.value, subChildPart: sub?.name || '' }));
                  }}>
                  <option value="">{form.childPartCode ? 'Select Sub Child Part' : 'Select Child Part first'}</option>
                  {getSubChildPartOptions(form.childPartCode).map(sub => <option key={sub._id} value={sub.code}>{sub.code} — {sub.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Raw Materials</label>
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Plus className="h-3 w-3 mr-1" /> Add Another Material
                </Button>
              </div>

              {form.rows.map((row, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase pt-2">Material {idx + 1}</span>
                    {form.rows.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0" onClick={() => removeRow(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Inventory Item * <span className="text-[10px] text-slate-400 font-normal">(Raw Material / Tool / Readymade Material)</span></label>
                    <MaterialCodePicker value={row.code} displayName={row.item} items={inventoryItems} onSelect={(m) => applyMatchToRow(idx, m)} />
                    {renderCodeMatchHint(row.code)}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Name *</label>
                    <Input placeholder="e.g. Sheet Metal 5mm" value={row.item} onChange={e => updateRow(idx, { item: e.target.value })} className="bg-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
                      <Input type="number" placeholder="0" min="0" value={row.quantity} onChange={e => updateRow(idx, { quantity: e.target.value })} className="bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Price <span className="text-[10px] text-slate-400 font-normal">(auto)</span></label>
                      <div className="h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
                        ₹{((Number(row.quantity) || 0) * (row.unitPrice || 0)).toLocaleString()}
                        <span className="text-[10px] text-slate-400 ml-1.5">(₹{row.unitPrice || 0}/unit)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit Type *</label>
                      <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={row.unitType} onChange={e => updateRow(idx, { unitType: e.target.value, unit: '' })}>
                        <option value="">Select</option>
                        {unitTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit *</label>
                      <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 bg-white" value={row.unit} disabled={!row.unitType} onChange={e => updateRow(idx, { unit: e.target.value })}>
                        <option value="">{row.unitType ? 'Select' : 'Select Unit Type first'}</option>
                        {getUnitsForTypeDynamic(row.unitType, row.unit).map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {form.rows.length > 1 && (
                <div className="flex justify-between items-center px-1 text-sm">
                  <span className="text-slate-500">Total ({form.rows.length} materials)</span>
                  <span className="font-semibold text-slate-800">₹{addFormTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial} disabled={!addFormValid || isAdding} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              {isAdding ? 'Adding...' : `Add ${form.rows.length > 1 ? `${form.rows.length} Materials` : 'to BOM'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Material</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Child Part *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.childPartCode}
                  onChange={e => {
                    const cp = childPartsForMachine.find(c => c.code === e.target.value);
                    setEditForm(f => ({ ...f, childPartCode: e.target.value, childPart: cp?.name || '', subChildPartCode: '', subChildPart: '' }));
                  }}>
                  <option value="">Select Child Part</option>
                  {childPartsForMachine.map(cp => <option key={cp._id} value={cp.code}>{cp.code} — {cp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Sub Child Part *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  value={editForm.subChildPartCode}
                  disabled={!editForm.childPartCode}
                  onChange={e => {
                    const sub = getSubChildPartOptions(editForm.childPartCode).find(s => s.code === e.target.value);
                    setEditForm(f => ({ ...f, subChildPartCode: e.target.value, subChildPart: sub?.name || '' }));
                  }}>
                  <option value="">{editForm.childPartCode ? 'Select Sub Child Part' : 'Select Child Part first'}</option>
                  {getSubChildPartOptions(editForm.childPartCode).map(sub => <option key={sub._id} value={sub.code}>{sub.code} — {sub.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Inventory Item * <span className="text-[10px] text-slate-400 font-normal">(Raw Material / Tool / Readymade Material)</span></label>
              <MaterialCodePicker value={editForm.code} displayName={editForm.item} items={inventoryItems} onSelect={(m) => applyProductMatch(setEditForm, m)} />
              {renderCodeMatchHint(editForm.code)}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Name *</label>
              <Input value={editForm.item} onChange={e => setEditForm(f => ({ ...f, item: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
                <Input type="number" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Price <span className="text-[10px] text-slate-400 font-normal">(auto, from Purchase Cost)</span></label>
                <div className="h-10 flex items-center px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">
                  ₹{((Number(editForm.quantity) || 0) * (editForm.unitPrice || 0)).toLocaleString()}
                  <span className="text-[10px] text-slate-400 ml-1.5">(₹{editForm.unitPrice || 0}/unit)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit Type *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.unitType} onChange={e => setEditForm(f => ({ ...f, unitType: e.target.value, unit: '' }))}>
                  <option value="">Select</option>
                  {unitTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" value={editForm.unit} disabled={!editForm.unitType && !editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}>
                  <option value="">{editForm.unitType ? 'Select' : 'Select Unit Type first'}</option>
                  {getUnitsForTypeDynamic(editForm.unitType, editForm.unit).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditMaterial} disabled={!editForm.childPartCode || !editForm.subChildPartCode || !editForm.code || !editForm.item || !editForm.quantity || !editForm.unit} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock BOM Dialog */}
      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-amber-700 flex items-center gap-2"><Lock className="h-5 w-5" /> Lock BOM</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Locking the BOM for <strong>{selectedMachine?.name}</strong> will prevent any further modifications. Production will use this exact material list.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>This cannot be undone directly.</strong> If changes are needed after locking, Production must raise a Change Request.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLockOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { lockBOM(bom._id); setLockOpen(false); }}>
              <Lock className="h-4 w-4 mr-2" /> Lock BOM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Material Confirm */}
      <Dialog open={!!deleteMat} onOpenChange={() => setDeleteMat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Remove Material</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">Remove <strong>{deleteMat?.name}</strong> from the BOM?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMat(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { deleteMaterial(bom._id, deleteMat._id); setDeleteMat(null); }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create BOM Dialog */}
      <Dialog open={newBOMOpen} onOpenChange={setNewBOMOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create New BOM</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600">Create a Bill of Materials for <strong>{selectedMachine?.name}</strong>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBOMOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBOM} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create BOM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Material Dialog */}
      <Dialog open={!!viewMat} onOpenChange={() => setViewMat(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{viewMat?.code}</span>
              <span>{viewMat?.item}</span>
            </DialogTitle>
          </DialogHeader>
          {viewMat && (
            <div className="space-y-4 py-2">
              {/* Core — data captured directly on the Add Material form itself,
                  always shown regardless of BOM Format & Modification. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Quantity</p>
                  <p className="text-sm font-medium text-slate-800">{viewMat.quantity} {viewMat.unit}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Hierarchy</p>
                  <p className="text-sm font-medium text-slate-800">{[viewMat.childPart, viewMat.subChildPart].filter(Boolean).join(' > ') || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Price</p>
                  <p className="text-sm font-medium text-slate-800">₹{(viewMat.totalPrice || 0).toLocaleString()} <span className="text-xs text-slate-400">(₹{viewMat.unitPrice || 0}/unit)</span></p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${viewMat.isDiscontinued ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                    {viewMat.isDiscontinued ? 'Discontinued' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Everything below is exactly whatever BOM Format & Modification
                  has enabled — the same fields shown as columns in the table. */}
              {extraColumns.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Additional Details <span className="text-[10px] text-slate-400 font-normal">(from BOM Format & Modification)</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    {extraColumns.map(f => {
                      if (f.key === 'specifications' || f.key === 'itemCategories' || f.key === 'applications') return null;
                      const value = formatCatalogFieldValue(f.key, viewMat);
                      if (value === '—') return null;
                      return <div key={f.key}><p className="text-[11px] text-slate-400">{f.label}</p><p className="text-sm text-slate-800 break-words">{value}</p></div>;
                    })}
                  </div>

                  {enabledBOMFields.includes('itemCategories') && Array.isArray(viewMat.itemCategories) && viewMat.itemCategories.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-slate-400 mb-1">Item Category</p>
                      <div className="flex flex-wrap gap-1.5">
                        {viewMat.itemCategories.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {enabledBOMFields.includes('applications') && Array.isArray(viewMat.applications) && viewMat.applications.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-slate-400 mb-1">Applications</p>
                      <div className="flex flex-wrap gap-1.5">
                        {viewMat.applications.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {enabledBOMFields.includes('specifications') && Array.isArray(viewMat.specifications) && viewMat.specifications.filter(s => s.key).length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-slate-400 mb-1">Specifications</p>
                      <div className="divide-y divide-slate-100">
                        {viewMat.specifications.filter(s => s.key).map((s, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <span className="text-xs font-semibold text-slate-500 w-2/5">{s.key}</span>
                            <span className="text-sm text-slate-800 font-medium">{s.value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMat(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
