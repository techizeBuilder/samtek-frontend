import React, { useState } from 'react';
import { useRD } from '@/contexts/RDContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Cog, Wrench, ListOrdered, Plus, Trash2, ChevronDown, Package, Ban, RefreshCw } from 'lucide-react';

const PROCESS_TYPES = ['Cutting', 'Bending', 'Welding', 'Assembly'];
const UNITS = ['pcs', 'set', 'nos'];

const processTypeColor = {
  Cutting: 'bg-orange-100 text-orange-700 border-orange-200',
  Bending: 'bg-blue-100 text-blue-700 border-blue-200',
  Welding: 'bg-red-100 text-red-700 border-red-200',
  Assembly: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const emptyTool = { code: '', name: '', specification: '', quantity: '1', unit: 'pcs' };
const emptyProcess = { step: '', type: 'Cutting', description: '', duration: '', tool: '' };

export default function ToolProcess() {
  const { machines, getToolsProcess, addTool, removeTool, discontinueTool, reactivateTool, addProcess, removeProcess } = useRD();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', 'toolProcess', 'add');
  const canEdit = hasFeatureAccess('rnd', 'toolProcess', 'edit');
  const canDelete = hasFeatureAccess('rnd', 'toolProcess', 'delete');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [activeTab, setActiveTab] = useState('tools');
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [addProcessOpen, setAddProcessOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toolForm, setToolForm] = useState(emptyTool);
  const [processForm, setProcessForm] = useState(emptyProcess);

  const activeMachines = machines.filter(m => !m.isDiscontinued);
  const selectedMachine = activeMachines.find(m => String(m._id) === selectedMachineId);
  const tp = selectedMachineId ? getToolsProcess(selectedMachineId) : null;

  const tools = tp?.tools || [];
  const processes = tp?.processes.slice().sort((a, b) => Number(a.step) - Number(b.step)) || [];

  const handleAddTool = () => {
    if (!toolForm.code || !toolForm.name) return;
    addTool(selectedMachineId, { ...toolForm, quantity: Number(toolForm.quantity) });
    setToolForm(emptyTool);
    setAddToolOpen(false);
  };

  const handleAddProcess = () => {
    if (!processForm.step || !processForm.description) return;
    addProcess(selectedMachineId, { ...processForm, step: Number(processForm.step) });
    setProcessForm(emptyProcess);
    setAddProcessOpen(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === 'tool') removeTool(selectedMachineId, confirmDelete.id);
    else removeProcess(selectedMachineId, confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Cog className="h-6 w-6 text-blue-600" /> Tool & Process Definition
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">R&D defines tools required and manufacturing process steps for each machine</p>
      </div>

      {/* Machine Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Machine</label>
          <div className="relative max-w-sm">
            <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8" value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
              <option value="">-- Select a machine --</option>
              {activeMachines.map(m => <option key={m._id} value={m._id}>{m.code} — {m.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </CardContent>
      </Card>

      {!selectedMachineId ? (
        <Card className="border-none shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Select a machine to view or manage its tools and manufacturing process</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Machine Info Bar */}
          <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <span className="font-mono text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">{selectedMachine?.code}</span>
            <span className="font-semibold text-slate-800">{selectedMachine?.name}</span>
            <span className="text-xs text-slate-400">{selectedMachine?.category}</span>
            <span className="ml-auto flex gap-4 text-xs text-slate-500">
              <span><strong className="text-slate-700">{tools.length}</strong> tools defined</span>
              <span><strong className="text-slate-700">{processes.length}</strong> process steps</span>
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('tools')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${activeTab === 'tools' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              <Wrench className="h-4 w-4" /> Tools ({tools.length})
            </button>
            <button onClick={() => setActiveTab('process')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${activeTab === 'process' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              <ListOrdered className="h-4 w-4" /> Process Steps ({processes.length})
            </button>
          </div>

          {/* Tools Tab */}
          {activeTab === 'tools' && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">Tools Required</CardTitle>
                {canAdd && (
                  <Button size="sm" onClick={() => setAddToolOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <Plus className="h-4 w-4 mr-1" /> Add Tool
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tool Code</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tool Name</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Specification</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-10 text-slate-400">No tools defined. Click "Add Tool" to get started.</td></tr>
                      ) : tools.map(t => (
                        <tr key={t._id} className={`border-b border-slate-50 transition-colors ${t.isDiscontinued ? 'bg-red-50/40 opacity-70' : 'hover:bg-slate-50'}`}>
                          <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-700">{t.code}</td>
                          <td className={`px-5 py-3.5 font-medium ${t.isDiscontinued ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.name}</td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs max-w-[220px] truncate" title={t.specification}>{t.specification || '—'}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">{t.quantity}</td>
                          <td className="px-5 py-3.5 text-slate-600">{t.unit}</td>
                          <td className="px-5 py-3.5">
                            {t.isDiscontinued
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">Discontinued</span>
                              : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Active</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-1">
                              {t.isDiscontinued ? (
                                canEdit && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600" title="Reactivate" onClick={() => reactivateTool(selectedMachineId, t._id)}>
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                )
                              ) : (
                                <>
                                  {canEdit && (
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-orange-600" title="Discontinue" onClick={() => discontinueTool(selectedMachineId, t._id)}>
                                      <Ban className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => setConfirmDelete({ id: t._id, name: t.name, kind: 'tool' })}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
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
          )}

          {/* Process Steps Tab */}
          {activeTab === 'process' && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">Manufacturing Process Steps</CardTitle>
                {canAdd && (
                  <Button size="sm" onClick={() => setAddProcessOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <Plus className="h-4 w-4 mr-1" /> Add Step
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-5">
                {processes.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No process steps defined. Click "Add Step" to define the manufacturing process.</div>
                ) : (
                  <div className="space-y-4">
                    {processes.map(p => (
                      <div key={p._id} className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{p.step}</div>
                        <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${processTypeColor[p.type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>{p.type}</span>
                              {p.duration && <span className="text-xs text-slate-400">{p.duration}</span>}
                              {p.tool && <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">Tool: {p.tool}</span>}
                            </div>
                            {canDelete && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => setConfirmDelete({ id: p._id, name: `Step ${p.step}: ${p.type}`, kind: 'process' })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-slate-700">{p.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add Tool Dialog */}
      <Dialog open={addToolOpen} onOpenChange={setAddToolOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Tool</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tool Code *</label>
                <Input placeholder="e.g. TL-012" value={toolForm.code} onChange={e => setToolForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Qty</label>
                  <Input type="number" min="1" value={toolForm.quantity} onChange={e => setToolForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <select className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={toolForm.unit} onChange={e => setToolForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Tool Name *</label>
              <Input placeholder="e.g. Angle Grinder 9-inch" value={toolForm.name} onChange={e => setToolForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Specification</label>
              <Input placeholder="Power, capacity, model details..." value={toolForm.specification} onChange={e => setToolForm(f => ({ ...f, specification: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToolOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTool} disabled={!toolForm.code || !toolForm.name} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add Tool</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Process Step Dialog */}
      <Dialog open={addProcessOpen} onOpenChange={setAddProcessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Process Step</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Step Number *</label>
                <Input type="number" min="1" placeholder="e.g. 5" value={processForm.step} onChange={e => setProcessForm(f => ({ ...f, step: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Process Type *</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={processForm.type} onChange={e => setProcessForm(f => ({ ...f, type: e.target.value }))}>
                  {PROCESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Description *</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Describe the process step in detail..." value={processForm.description} onChange={e => setProcessForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Duration</label>
                <Input placeholder="e.g. 4 hrs" value={processForm.duration} onChange={e => setProcessForm(f => ({ ...f, duration: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Tool Used</label>
                <Input placeholder="Tool name" value={processForm.tool} onChange={e => setProcessForm(f => ({ ...f, tool: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProcessOpen(false)}>Cancel</Button>
            <Button onClick={handleAddProcess} disabled={!processForm.step || !processForm.description} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Remove Entry</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">Remove <strong>{confirmDelete?.name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
