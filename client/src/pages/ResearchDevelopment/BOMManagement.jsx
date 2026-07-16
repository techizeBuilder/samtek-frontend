import React, { useState } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardList, Lock, Plus, Trash2, Edit2, Eye, AlertTriangle, ChevronDown, Package, Ban, RefreshCw } from 'lucide-react';
import { UNIT_TYPES, getUnitTypeForUnit, getUnitsForType } from '@/utils/unitTypes';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const MATERIAL_TYPE_SUGGESTIONS = ['Raw Material', 'Fabricated Part', 'Purchased Part', 'Assembly', 'Consumable', 'Packaging Material', 'Tool'];
const emptyMaterial = {
  code: '', childPart: '', subChildPart: '', item: '', itemType: '', quantity: '', unitType: '', unit: '',
  // Product Master snapshot fields, silently captured on code match
  category: '', pSourceType: '', brand: '', description: '', metrology: '', specifications: [], customFields: []
};

const groupByLabel = (customFields) =>
  (customFields || []).reduce((acc, cf) => {
    (acc[cf.groupLabel] = acc[cf.groupLabel] || []).push(cf);
    return acc;
  }, {});

export default function BOMManagement() {
  const { machines, boms, getBOMForMachine, addBOM, addMaterial, updateMaterial, deleteMaterial, lockBOM, discontinueMaterial, reactivateMaterial, masterOptions, addMasterOption } = useRD();
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [newBOMOpen, setNewBOMOpen] = useState(false);
  const [deleteMat, setDeleteMat] = useState(null);
  const [viewMat, setViewMat] = useState(null);
  const [form, setForm] = useState(emptyMaterial);
  const [editForm, setEditForm] = useState(emptyMaterial);
  const [editingMat, setEditingMat] = useState(null);
  const [bomVariant, setBomVariant] = useState('Standard');
  const [newTypeModal, setNewTypeModal] = useState({ open: false, value: '' });

  // Query dynamic unit types
  const { data: unitTypesData } = useQuery({
    queryKey: ['/api/inventory/unit-types'],
    queryFn: () => apiRequest('GET', '/api/inventory/unit-types'),
  });

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

  // Material Type is its own dynamic master list (RDMasterOption field "MaterialType"),
  // deliberately separate from Product Master's P-Type so the two taxonomies can diverge.
  const materialTypeOptions = masterOptions.MaterialType || [];

  const handleAddMaterialType = async () => {
    if (!newTypeModal.value) return;
    try {
      await addMasterOption({ field: 'MaterialType', value: newTypeModal.value });
      if (editOpen) {
        setEditForm(f => ({ ...f, itemType: newTypeModal.value }));
      } else {
        setForm(f => ({ ...f, itemType: newTypeModal.value }));
      }
      setNewTypeModal({ open: false, value: '' });
      showSuccessToast('Material Type Added', 'New material type added successfully');
    } catch (e) {
      showSmartToast(e, 'Failed to add material type');
    }
  };

  // Look up a Product Master entry by its code (all products, not just In House/Out Source machines —
  // BOM materials reference raw materials, tools, fabricated parts etc. too). Material Type is its own
  // independent list (not derived from Product Master's P-Type), but everything else Product Master
  // knows about the item — category, source type, brand, description, metrology, specs, custom fields —
  // is captured into the material record as a point-in-time snapshot, even though most of it has no
  // dedicated input on this form. It's viewable later via the row's "eye" button.
  const findProductByCode = (code) => {
    const c = (code || '').trim().toLowerCase();
    if (!c) return null;
    return machines.find(m => (m.code || '').trim().toLowerCase() === c) || null;
  };

  const handleCodeBlur = (setState) => (e) => {
    const match = findProductByCode(e.target.value);
    if (!match) return;
    setState(f => ({
      ...f,
      item: match.name || f.item,
      category: match.category || '',
      pSourceType: match.pSourceType || '',
      brand: match.brand || '',
      description: match.description || '',
      metrology: match.metrology || '',
      specifications: Array.isArray(match.specifications) ? match.specifications : [],
      customFields: Array.isArray(match.customFields) ? match.customFields : [],
    }));
  };

  const renderCodeMatchHint = (code) => {
    if (!code) return null;
    const match = findProductByCode(code);
    if (!match) return <p className="text-[11px] text-amber-600 mt-1">No matching Product Master code found — enter details manually.</p>;
    const extras = [];
    if (match.category) extras.push('Category');
    if (match.pSourceType) extras.push('P-Source Type');
    if (match.brand) extras.push('Brand');
    if (match.metrology) extras.push('Metrology');
    if (Array.isArray(match.specifications) && match.specifications.length) extras.push(`${match.specifications.length} spec${match.specifications.length > 1 ? 's' : ''}`);
    if (Array.isArray(match.customFields) && match.customFields.length) extras.push(`${match.customFields.length} custom field${match.customFields.length > 1 ? 's' : ''}`);
    return (
      <p className="text-[11px] text-emerald-600 mt-1">
        ✓ Matched Product Master: {match.name}
        {extras.length > 0 && <span className="text-slate-500"> — also captured: {extras.join(', ')}</span>}
      </p>
    );
  };

  const renderMaterialTypeSelect = (state, setState) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Type *</label>
      <div className="flex gap-2">
        <select
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={state.itemType}
          onChange={e => setState(f => ({ ...f, itemType: e.target.value }))}
        >
          <option value="" disabled>Select...</option>
          {materialTypeOptions.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
        </select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setNewTypeModal({ open: true, value: '' })}
          className="flex-shrink-0 h-9 w-9 bg-white hover:bg-slate-50 text-slate-600"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const activeMachines = machines.filter(m => !m.isDiscontinued && ['In House Manufacturing', 'Out Source Manufactured'].includes(m.pSourceType));
  const selectedMachine = activeMachines.find(m => String(m._id) === selectedMachineId);
  const bom = selectedMachineId ? getBOMForMachine(selectedMachineId) : null;

  const handleAddMaterial = () => {
    if (!form.code || !form.item || !form.itemType || !form.quantity || !form.unitType || !form.unit) return;
    addMaterial(bom._id, { ...form, quantity: Number(form.quantity) });
    setForm(emptyMaterial);
    setAddOpen(false);
  };

  const handleEditMaterial = () => {
    if (!editForm.code || !editForm.item || !editForm.itemType || !editForm.quantity || !editForm.unit) return;
    updateMaterial(bom._id, editingMat._id, { ...editForm, quantity: Number(editForm.quantity) });
    setEditOpen(false);
  };

  const openEdit = (mat) => {
    setEditingMat(mat);
    setEditForm({
      code: mat.code || '',
      childPart: mat.childPart || '',
      subChildPart: mat.subChildPart || '',
      item: mat.item || '',
      itemType: mat.itemType || '',
      quantity: String(mat.quantity),
      unitType: mat.unitType || getUnitTypeForUnit(mat.unit),
      unit: mat.unit || '',
      category: mat.category || '',
      pSourceType: mat.pSourceType || '',
      brand: mat.brand || '',
      description: mat.description || '',
      metrology: mat.metrology || '',
      specifications: Array.isArray(mat.specifications) ? mat.specifications : [],
      customFields: Array.isArray(mat.customFields) ? mat.customFields : [],
    });
    setEditOpen(true);
  };

  const openView = (mat) => setViewMat(mat);

  const handleCreateBOM = () => {
    addBOM(selectedMachineId, bomVariant);
    setNewBOMOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-blue-600" /> BOM Management
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">R&D defines Bill of Materials — locked BOMs cannot be modified by Production</p>
      </div>

      {/* Machine Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Machine</label>
          <div className="relative max-w-sm">
            <select
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8"
              value={selectedMachineId}
              onChange={e => setSelectedMachineId(e.target.value)}
            >
              <option value="">-- Select a machine to view BOM --</option>
              {activeMachines.map(m => (
                <option key={m._id} value={m._id}>{m.code} — {m.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedMachineId && (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select a machine above to view or manage its Bill of Materials</p>
          </CardContent>
        </Card>
      )}

      {selectedMachineId && !bom && (
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

      {selectedMachineId && bom && (
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
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material Type</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.materials.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-10 text-slate-400">No materials added. Click "Add Material" to start building the BOM.</td></tr>
                    ) : bom.materials.map((mat, i) => (
                      <tr key={mat._id} className={`border-b border-slate-50 transition-colors ${mat.isDiscontinued ? 'bg-red-50/40 opacity-70' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">{i + 1}</td>
                        <td className="px-5 py-3.5"><span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{mat.code || '—'}</span></td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {[mat.childPart, mat.subChildPart].filter(Boolean).join(' > ') || '—'}
                        </td>
                        <td className={`px-5 py-3.5 font-medium ${mat.isDiscontinued ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{mat.item}</td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{mat.itemType}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">{mat.quantity}</td>
                        <td className="px-5 py-3.5 text-slate-600">{mat.unit}</td>
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

      {/* Add Material Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Material Item</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Code *</label>
              <Input placeholder="e.g. STL-009" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} onBlur={handleCodeBlur(setForm)} />
              {renderCodeMatchHint(form.code)}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Child Part</label>
                <Input placeholder="e.g. Main Body" value={form.childPart} onChange={e => setForm(f => ({ ...f, childPart: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Sub-Child Part</label>
                <Input placeholder="e.g. Side Panel" value={form.subChildPart} onChange={e => setForm(f => ({ ...f, subChildPart: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Name *</label>
                <Input placeholder="e.g. Sheet Metal 5mm" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} />
              </div>
              {renderMaterialTypeSelect(form, setForm)}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
              <Input type="number" placeholder="0" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit Type *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.unitType} onChange={e => setForm(f => ({ ...f, unitType: e.target.value, unit: '' }))}>
                  <option value="">Select</option>
                  {unitTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400" value={form.unit} disabled={!form.unitType} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  <option value="">{form.unitType ? 'Select' : 'Select Unit Type first'}</option>
                  {getUnitsForTypeDynamic(form.unitType, form.unit).map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial} disabled={!form.code || !form.item || !form.itemType || !form.quantity || !form.unitType || !form.unit} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add to BOM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Material</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Code *</label>
              <Input placeholder="e.g. STL-009" value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} onBlur={handleCodeBlur(setEditForm)} />
              {renderCodeMatchHint(editForm.code)}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Child Part</label>
                <Input value={editForm.childPart} onChange={e => setEditForm(f => ({ ...f, childPart: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Sub-Child Part</label>
                <Input value={editForm.subChildPart} onChange={e => setEditForm(f => ({ ...f, subChildPart: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Name *</label>
                <Input value={editForm.item} onChange={e => setEditForm(f => ({ ...f, item: e.target.value }))} />
              </div>
              {renderMaterialTypeSelect(editForm, setEditForm)}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
              <Input type="number" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
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
            <Button onClick={handleEditMaterial} disabled={!editForm.code || !editForm.item || !editForm.itemType || !editForm.quantity || !editForm.unit} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Changes</Button>
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
          <div className="py-2 space-y-4">
            <p className="text-sm text-slate-600">Create a Bill of Materials for <strong>{selectedMachine?.name}</strong>.</p>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">BOM Variant *</label>
              <Input 
                placeholder="e.g. Standard, Export, v2" 
                value={bomVariant} 
                onChange={e => setBomVariant(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewBOMOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBOM} disabled={!bomVariant} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create BOM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Material Type Dialog */}
      <Dialog open={newTypeModal.open} onOpenChange={(open) => !open && setNewTypeModal({ open: false, value: '' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Material Type</DialogTitle></DialogHeader>
          <div className="py-4">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Value to Save *</label>
            <input
              type="text"
              list="material-type-suggestions"
              autoFocus
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="Type to search or add new..."
              value={newTypeModal.value}
              onChange={e => setNewTypeModal(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddMaterialType()}
            />
            <datalist id="material-type-suggestions">
              {MATERIAL_TYPE_SUGGESTIONS.map(opt => <option key={opt} value={opt} />)}
            </datalist>
            <p className="text-xs text-slate-500 mt-2">
              This list is specific to BOM Management and is independent of Product Master's P-Type.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTypeModal({ open: false, value: '' })}>Cancel</Button>
            <Button onClick={handleAddMaterialType} disabled={!newTypeModal.value} className="bg-blue-600 hover:bg-blue-700 text-white">Save Type</Button>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Material Type</p>
                  <p className="text-sm font-medium text-slate-800">{viewMat.itemType || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Quantity</p>
                  <p className="text-sm font-medium text-slate-800">{viewMat.quantity} {viewMat.unit}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Hierarchy</p>
                  <p className="text-sm font-medium text-slate-800">{[viewMat.childPart, viewMat.subChildPart].filter(Boolean).join(' > ') || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${viewMat.isDiscontinued ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                    {viewMat.isDiscontinued ? 'Discontinued' : 'Active'}
                  </span>
                </div>
              </div>

              {(viewMat.category || viewMat.pSourceType || viewMat.brand || viewMat.metrology || viewMat.description) && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Product Master Snapshot</p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewMat.category && <div><p className="text-[11px] text-slate-400">Category</p><p className="text-sm text-slate-800">{viewMat.category}</p></div>}
                    {viewMat.pSourceType && <div><p className="text-[11px] text-slate-400">P-Source Type</p><p className="text-sm text-slate-800">{viewMat.pSourceType}</p></div>}
                    {viewMat.brand && <div><p className="text-[11px] text-slate-400">Brand</p><p className="text-sm text-slate-800">{viewMat.brand}</p></div>}
                    {viewMat.metrology && <div><p className="text-[11px] text-slate-400">Metrology</p><p className="text-sm text-slate-800">{viewMat.metrology}</p></div>}
                  </div>
                  {viewMat.description && (
                    <div className="mt-2">
                      <p className="text-[11px] text-slate-400">Description</p>
                      <p className="text-sm text-slate-700">{viewMat.description}</p>
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(viewMat.specifications) && viewMat.specifications.filter(s => s.key).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Specifications</p>
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

              {Array.isArray(viewMat.customFields) && viewMat.customFields.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Custom Fields</p>
                  <div className="space-y-3">
                    {Object.entries(groupByLabel(viewMat.customFields)).map(([groupLabel, fields]) => (
                      <div key={groupLabel}>
                        <p className="text-xs font-bold text-slate-600 mb-1">{groupLabel}</p>
                        <div className="divide-y divide-slate-100">
                          {fields.map((cf, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5">
                              <span className="text-xs font-semibold text-slate-500 w-2/5">{cf.fieldName}</span>
                              <span className="text-sm text-slate-800 font-medium">{cf.value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!viewMat.category && !viewMat.pSourceType && !viewMat.brand && !viewMat.metrology && !viewMat.description &&
                (!viewMat.specifications || viewMat.specifications.length === 0) && (!viewMat.customFields || viewMat.customFields.length === 0) && (
                <p className="text-xs text-slate-400 italic text-center py-2">No additional Product Master data was captured for this material.</p>
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
