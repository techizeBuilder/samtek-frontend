import React, { useState } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Package, Plus, Search, Filter, Eye, Edit2, Ban, RefreshCw,
  CheckCircle2, Clock, XCircle, FileText, Layers
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const MACHINE_TYPES = ['Standard', 'Custom', 'Special Purpose Machine (SPM)'];

// Predefined fallback options for the smart suggestions in the + modal
const DEFAULT_OPTIONS = {
  'Category': ['Mixing Equipment', 'Miling Equipment', 'Crushing Equipment', 'Packing Equipment', 'Pumping Equipment', 'Welding Equipment', 'Construction Equipment', 'Agricultural Equipment', 'Special Purpose Machine'],
  'P-Type': ['Row Material', 'Assembly Material', 'Tool', 'Fabricated Child Part', 'Machining Material', 'Machine'],
  'P-SourceType': ['In House Manufacturing', 'Purchase Machine', 'Job Work Seat Metal', 'Job Work Machining', 'Out Source Manufactured']
};

const machineTypeBadge = (type) => {
  if (type === 'Custom') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (type === 'Special Purpose Machine (SPM)') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const designStatusBadge = (status) => {
  const map = {
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Testing: 'bg-amber-100 text-amber-700 border-amber-200',
    Draft: 'bg-slate-100 text-slate-600 border-slate-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
};

const releaseStatusBadge = (status) => status === 'Released'
  ? 'bg-blue-100 text-blue-700 border-blue-200'
  : 'bg-slate-100 text-slate-500 border-slate-200';

const emptyForm = { code: '', name: '', description: '', category: '', pType: '', pSourceType: '', specifications: [], brand: '', machineType: 'Standard' };

export default function ProductMaster() {
  const { machines, stats, addMachine, updateMachine, discontinueMachine, reactivateMachine, masterOptions, addMasterOption } = useRD();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRelease, setFilterRelease] = useState('All');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [confirmDiscontinue, setConfirmDiscontinue] = useState(null);
  const [newOptionModal, setNewOptionModal] = useState({ open: false, field: '', value: '' });

  const handleAddOption = async () => {
    if (!newOptionModal.value) return;
    try {
      await addMasterOption({ field: newOptionModal.field, value: newOptionModal.value });
      const fieldKey = newOptionModal.field === 'Category' ? 'category' : newOptionModal.field === 'P-Type' ? 'pType' : 'pSourceType';
      if (editOpen) {
        setEditForm(f => ({ ...f, [fieldKey]: newOptionModal.value }));
      } else {
        setForm(f => ({ ...f, [fieldKey]: newOptionModal.value }));
      }
      setNewOptionModal({ open: false, field: '', value: '' });
      showSuccessToast('Option Added', 'New option added successfully');
    } catch (e) {
      showSmartToast(e, 'Failed to add option');
    }
  };

  const filtered = machines.filter(m => {
    if (!showDiscontinued && m.isDiscontinued) return false;
    if (showDiscontinued && !m.isDiscontinued) return false;
    if (filterStatus !== 'All' && m.designStatus !== filterStatus) return false;
    if (filterRelease !== 'All' && m.releaseStatus !== filterRelease) return false;
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const handleAdd = () => {
    if (!form.code || !form.name || !form.category || !form.pType || !form.pSourceType) return;
    addMachine(form);
    setForm(emptyForm);
    setAddOpen(false);
  };

  const handleEdit = () => {
    if (!editForm.code || !editForm.name || !editForm.category || !editForm.pType || !editForm.pSourceType) return;
    updateMachine(selected._id, editForm);
    setEditOpen(false);
  };

  const openEdit = (m) => {
    setSelected(m);
    setEditForm({
      code: m.code || '', name: m.name || '', description: m.description || '',
      category: m.category || '', pType: m.pType || '', pSourceType: m.pSourceType || '',
      specifications: Array.isArray(m.specifications) ? m.specifications : [],
      brand: m.brand || '',
      machineType: m.machineType || 'Standard'
    });
    setEditOpen(true);
  };

  // ── Specification key-value helpers ──────────────────────────────────────────
  const addSpecRow = (setState) => setState(f => ({ ...f, specifications: [...f.specifications, { key: '', value: '' }] }));
  const removeSpecRow = (setState, idx) => setState(f => ({ ...f, specifications: f.specifications.filter((_, i) => i !== idx) }));
  const updateSpecRow = (setState, idx, field, val) =>
    setState(f => ({
      ...f,
      specifications: f.specifications.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }));

  const renderSpecBuilder = (state, setState) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-600">P-Specifications</label>
        <button
          type="button"
          onClick={() => addSpecRow(setState)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Row
        </button>
      </div>
      {state.specifications.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2 text-center border border-dashed border-slate-200 rounded-lg">
          No specifications yet — click "Add Row" to add key-value pairs.
        </p>
      ) : (
        <div className="space-y-2">
          {state.specifications.map((spec, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                className="bg-white flex-1"
                placeholder="Key (e.g. Power)"
                value={spec.key}
                onChange={e => updateSpecRow(setState, idx, 'key', e.target.value)}
              />
              <Input
                className="bg-white flex-1"
                placeholder="Value (e.g. 5 kW)"
                value={spec.value}
                onChange={e => updateSpecRow(setState, idx, 'value', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeSpecRow(setState, idx)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDropdownWithAdd = (label, field, fieldKey, options, state, setState) => (
    <div>
      <label className="text-xs font-semibold text-slate-600 mb-1 block">{label} *</label>
      <div className="flex gap-2">
        <select
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={state[fieldKey]}
          onChange={e => setState(f => ({ ...f, [fieldKey]: e.target.value }))}
        >
          <option value="" disabled>Select...</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setNewOptionModal({ open: true, field: field, value: '' })}
          className="flex-shrink-0 h-9 w-9 bg-white hover:bg-slate-50 text-slate-600"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" /> Product Master
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Central register of all machines — no machine exists in ERP without R&D entry</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
          <Plus className="h-4 w-4 mr-2" /> Add Machine
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Active', value: stats.totalMachines, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approved Designs', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Released for Production', value: stats.released, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Discontinued', value: stats.discontinued, icon: Ban, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.bg} p-2.5 rounded-lg`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name, code or category..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['All', 'Draft', 'Testing', 'Approved', 'Rejected'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{s}</button>
              ))}
            </div>
            <div className="flex gap-2">
              {['All', 'Released', 'Not Released'].map(s => (
                <button key={s} onClick={() => setFilterRelease(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterRelease === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>{s}</button>
              ))}
            </div>
            <button onClick={() => setShowDiscontinued(v => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showDiscontinued ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}`}>
              {showDiscontinued ? 'Show Active' : 'Show Discontinued'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">P-Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Design Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Release</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">No machines found matching the filters.</td></tr>
                ) : filtered.map(m => (
                  <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/30">{m.code}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{m.name}</div>
                      {m.isDiscontinued && <span className="text-[10px] text-red-500 font-semibold">DISCONTINUED</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{m.category}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${machineTypeBadge(m.machineType || 'Standard')}`}>{m.machineType || 'Standard'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${designStatusBadge(m.designStatus)}`}>{m.designStatus}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${releaseStatusBadge(m.releaseStatus)}`}>{m.releaseStatus}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{m.updatedAt}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600" onClick={() => { setSelected(m); setViewOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-purple-600" onClick={() => openEdit(m)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        {!m.isDiscontinued ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-red-600" onClick={() => setConfirmDiscontinue(m)}><Ban className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600" onClick={() => reactivateMachine(m._id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
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

      {/* Add Machine Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="text-xl">Add New</DialogTitle></DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Product Code *</label>
                <Input className="bg-white" placeholder="e.g. CM-009" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Name *</label>
                <Input className="bg-white" placeholder="Enter product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              {renderDropdownWithAdd('Category', 'Category', 'category', masterOptions.Category, form, setForm)}
              {renderDropdownWithAdd('P-Type', 'P-Type', 'pType', masterOptions.PType, form, setForm)}
              {renderDropdownWithAdd('P-Source Type', 'P-SourceType', 'pSourceType', masterOptions.PSourceType, form, setForm)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Brand</label>
                <Input className="bg-white" placeholder="Enter brand" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={form.machineType} onChange={e => setForm(f => ({ ...f, machineType: e.target.value }))}>
                  {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {renderSpecBuilder(form, setForm)}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Description</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" rows={2} placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 leading-relaxed">
              New machine will be created with <strong>Draft</strong> design status and <strong>Not Released</strong>. It must go through design approval and prototype testing before production release.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.code || !form.name || !form.category || !form.pType || !form.pSourceType} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create Machine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="text-xl">Edit Machine — {selected?.code}</DialogTitle></DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Product Code *</label>
                <Input className="bg-white" value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Name *</label>
                <Input className="bg-white" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              {renderDropdownWithAdd('Category', 'Category', 'category', masterOptions.Category, editForm, setEditForm)}
              {renderDropdownWithAdd('P-Type', 'P-Type', 'pType', masterOptions.PType, editForm, setEditForm)}
              {renderDropdownWithAdd('P-Source Type', 'P-SourceType', 'pSourceType', masterOptions.PSourceType, editForm, setEditForm)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Brand</label>
                <Input className="bg-white" value={editForm.brand} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={editForm.machineType} onChange={e => setEditForm(f => ({ ...f, machineType: e.target.value }))}>
                  {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {renderSpecBuilder(editForm, setEditForm)}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">P-Description</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editForm.code || !editForm.name || !editForm.category || !editForm.pType || !editForm.pSourceType} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{selected?.code}</span>
              <span>{selected?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Statuses & Types */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Design Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${designStatusBadge(selected.designStatus)}`}>{selected.designStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Release Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${releaseStatusBadge(selected.releaseStatus)}`}>{selected.releaseStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Machine Type</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${machineTypeBadge(selected.machineType || 'Standard')}`}>{selected.machineType || 'Standard'}</span>
                </div>

                {/* Dynamic Classifications */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-slate-800">{selected.category}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">P-Type</p>
                  <p className="text-sm font-medium text-slate-800">{selected.pType || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">P-Source Type</p>
                  <p className="text-sm font-medium text-slate-800">{selected.pSourceType || 'N/A'}</p>
                </div>

                {/* Specifications & Dates */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Brand</p>
                  <p className="text-sm font-medium text-slate-800">{selected.brand || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-slate-800">{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              {selected.description && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">P-Description</p>
                  <p className="text-sm text-slate-700">{selected.description}</p>
                </div>
              )}

              {Array.isArray(selected.specifications) && selected.specifications.filter(s => s.key).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">P-Specifications</p>
                  <div className="divide-y divide-slate-100">
                    {selected.specifications.filter(s => s.key).map((spec, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-semibold text-slate-500 w-2/5">{spec.key}</span>
                        <span className="text-sm text-slate-800 font-medium">{spec.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.rejectionNote && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-500 font-semibold mb-1">Rejection Note</p>
                  <p className="text-sm text-red-800">{selected.rejectionNote}</p>
                </div>
              )}
              {selected.isDiscontinued && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-semibold">This machine has been discontinued and marked inactive in ERP.</div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Discontinue Dialog */}
      <Dialog open={!!confirmDiscontinue} onOpenChange={() => setConfirmDiscontinue(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Discontinue Machine</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Are you sure you want to discontinue <strong>{confirmDiscontinue?.name}</strong>? The machine will be marked <strong>Inactive</strong> in ERP and unavailable for new production orders.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscontinue(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { discontinueMachine(confirmDiscontinue._id); setConfirmDiscontinue(null); }}>Discontinue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Master Option Dialog (With Smart Suggestions via Datalist) */}
      <Dialog open={newOptionModal.open} onOpenChange={(open) => !open && setNewOptionModal({ open: false, field: '', value: '' })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New {newOptionModal.field}</DialogTitle></DialogHeader>
          <div className="py-4">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Value to Save *</label>

            {/* Input linked to the datalist below */}
            <input
              type="text"
              list="modal-suggestions"
              autoFocus
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder={`Type to search or add new...`}
              value={newOptionModal.value}
              onChange={e => setNewOptionModal(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAddOption()}
            />

            {/* The Smart Suggestions Dropdown */}
            <datalist id="modal-suggestions">
              {DEFAULT_OPTIONS[newOptionModal.field]?.map(opt => (
                <option key={opt} value={opt} />
              ))}
            </datalist>

            <p className="text-xs text-slate-500 mt-2">
              Pick a suggested requirement or type a custom one to save it to the master list.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOptionModal({ open: false, field: '', value: '' })}>Cancel</Button>
            <Button onClick={handleAddOption} disabled={!newOptionModal.value} className="bg-blue-600 hover:bg-blue-700 text-white">Save Option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}