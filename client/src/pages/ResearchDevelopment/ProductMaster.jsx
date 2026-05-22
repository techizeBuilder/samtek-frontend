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

const CATEGORIES = ['Mixing Equipment', 'Milling Equipment', 'Crushing Equipment', 'Packing Equipment', 'Pumping Equipment', 'Welding Equipment', 'Construction Equipment', 'Agricultural Equipment', 'Special Purpose Machine'];
const MACHINE_TYPES = ['Standard', 'Custom', 'Special Purpose Machine (SPM)'];

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

const emptyForm = { code: '', name: '', category: '', machineType: 'Standard', description: '' };

export default function ProductMaster() {
  const { machines, stats, addMachine, updateMachine, discontinueMachine, reactivateMachine } = useRD();
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

  const filtered = machines.filter(m => {
    if (!showDiscontinued && m.isDiscontinued) return false;
    if (showDiscontinued && !m.isDiscontinued) return false;
    if (filterStatus !== 'All' && m.designStatus !== filterStatus) return false;
    if (filterRelease !== 'All' && m.releaseStatus !== filterRelease) return false;
    const q = search.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const handleAdd = () => {
    if (!form.code || !form.name || !form.category) return;
    addMachine(form);
    setForm(emptyForm);
    setAddOpen(false);
  };

  const handleEdit = () => {
    if (!editForm.code || !editForm.name || !editForm.category) return;
    updateMachine(selected._id, editForm);
    setEditOpen(false);
  };

  const openEdit = (m) => {
    setSelected(m);
    setEditForm({ code: m.code, name: m.name, category: m.category, machineType: m.machineType || 'Standard', description: m.description });
    setEditOpen(true);
  };

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
              <Input placeholder="Search by name, code or category..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine Name</th>
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Machine</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Code *</label>
                <Input placeholder="e.g. CM-009" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Category *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Name *</label>
                <Input placeholder="Enter machine name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.machineType} onChange={e => setForm(f => ({ ...f, machineType: e.target.value }))}>
                  {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Brief description of the machine..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              New machine will be created with <strong>Draft</strong> design status and <strong>Not Released</strong>. It must go through design approval and prototype testing before production release.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.code || !form.name || !form.category} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create Machine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Machine — {selected?.code}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Code</label>
                <Input value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Category</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Name</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm.machineType} onChange={e => setEditForm(f => ({ ...f, machineType: e.target.value }))}>
                  {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{selected?.code}</span>
              <span>{selected?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Design Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${designStatusBadge(selected.designStatus)}`}>{selected.designStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Release Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${releaseStatusBadge(selected.releaseStatus)}`}>{selected.releaseStatus}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-slate-800">{selected.category}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Machine Type</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${machineTypeBadge(selected.machineType || 'Standard')}`}>{selected.machineType || 'Standard'}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-slate-800">{selected.createdAt}</p>
                </div>
              </div>
              {selected.description && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700">{selected.description}</p>
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
    </div>
  );
}
