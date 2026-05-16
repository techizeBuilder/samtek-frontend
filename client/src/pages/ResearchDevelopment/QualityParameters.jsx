import React, { useState } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldAlert, Plus, Trash2, CheckSquare, ChevronDown, Package, Target, ClipboardList } from 'lucide-react';

export default function QualityParameters() {
  const { machines, getQualityParams, addQualityParam, deleteQualityParam, addQCItem, deleteQCItem } = useRD();
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [activeTab, setActiveTab] = useState('parameters');
  const [addParamOpen, setAddParamOpen] = useState(false);
  const [addQCOpen, setAddQCOpen] = useState(false);
  const [deleteParam, setDeleteParam] = useState(null);
  const [deleteQC, setDeleteQC] = useState(null);
  const [paramForm, setParamForm] = useState({ parameter: '', tolerance: '', performanceStandard: '' });
  const [qcForm, setQcForm] = useState({ item: '' });

  const activeMachines = machines.filter(m => !m.isDiscontinued);
  const selectedMachine = activeMachines.find(m => String(m._id) === selectedMachineId);
  const qp = selectedMachineId ? getQualityParams(selectedMachineId) : null;

  const params = qp?.parameters || [];
  const checklist = qp?.qcChecklist || [];

  const handleAddParam = () => {
    if (!paramForm.parameter || !paramForm.tolerance) return;
    addQualityParam(selectedMachineId, selectedMachine?.name || '', paramForm);
    setParamForm({ parameter: '', tolerance: '', performanceStandard: '' });
    setAddParamOpen(false);
  };

  const handleAddQC = () => {
    if (!qcForm.item) return;
    addQCItem(selectedMachineId, selectedMachine?.name || '', qcForm);
    setQcForm({ item: '' });
    setAddQCOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-blue-600" /> Quality Parameters
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">R&D defines quality standards — the Quality department follows these parameters for inspection</p>
      </div>

      {/* Machine Selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Select Machine</label>
          <div className="relative max-w-sm">
            <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8" value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
              <option value="">-- Select a machine to view quality parameters --</option>
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
            <p>Select a machine to view or define quality parameters and QC checklist</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Machine Info + Tabs */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">{selectedMachine?.code}</span>
              <span className="font-semibold text-slate-800">{selectedMachine?.name}</span>
              <span className="text-xs text-slate-400">{selectedMachine?.category}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('parameters')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${activeTab === 'parameters' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                <Target className="h-4 w-4" /> Parameters ({params.length})
              </button>
              <button onClick={() => setActiveTab('checklist')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${activeTab === 'checklist' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                <ClipboardList className="h-4 w-4" /> QC Checklist ({checklist.length})
              </button>
            </div>
          </div>

          {/* Quality Parameters Tab */}
          {activeTab === 'parameters' && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">Quality Parameters</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">Tolerance and performance standards followed by the Quality team</p>
                </div>
                <Button size="sm" onClick={() => setAddParamOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Add Parameter
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parameter</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tolerance</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Performance Standard</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {params.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-slate-400">No parameters defined. Click "Add Parameter" to begin.</td></tr>
                      ) : params.map((p, i) => (
                        <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 text-slate-400 text-xs font-semibold">{i + 1}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-900">{p.parameter}</td>
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.tolerance}</span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 text-xs">{p.performanceStandard}</td>
                          <td className="px-5 py-3.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={() => setDeleteParam(p)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QC Checklist Tab */}
          {activeTab === 'checklist' && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-800">QC Inspection Checklist</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">Inspection checklist used by Quality team during product inspection</p>
                </div>
                <Button size="sm" onClick={() => setAddQCOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="p-5">
                {checklist.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No checklist items. Click "Add Item" to start building the QC checklist.</div>
                ) : (
                  <div className="space-y-2">
                    {checklist.map((item, i) => (
                      <div key={item._id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100 group hover:border-blue-100 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <CheckSquare className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <p className="text-sm text-slate-700 flex-1">{item.item}</p>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setDeleteQC(item)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <strong>Note for Quality Dept:</strong> The parameters and checklist defined here are the R&D-approved quality standards. All inspections must be performed against these specifications. Any deviation must be raised as a Change Request.
          </div>
        </>
      )}

      {/* Add Parameter Dialog */}
      <Dialog open={addParamOpen} onOpenChange={setAddParamOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Quality Parameter</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Parameter Name *</label>
              <Input placeholder="e.g. Frame Levelness, Motor Temperature, Weld Strength" value={paramForm.parameter} onChange={e => setParamForm(f => ({ ...f, parameter: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Tolerance / Limit *</label>
              <Input placeholder="e.g. ±2mm, ≤75°C, Per IS 816" value={paramForm.tolerance} onChange={e => setParamForm(f => ({ ...f, tolerance: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Performance Standard</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Detailed description of the acceptance criteria..." value={paramForm.performanceStandard} onChange={e => setParamForm(f => ({ ...f, performanceStandard: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParamOpen(false)}>Cancel</Button>
            <Button onClick={handleAddParam} disabled={!paramForm.parameter || !paramForm.tolerance} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add Parameter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add QC Item Dialog */}
      <Dialog open={addQCOpen} onOpenChange={setAddQCOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add QC Checklist Item</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Checklist Item *</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="e.g. All welds inspected by VT and PT — no defects found" value={qcForm.item} onChange={e => setQcForm(f => ({ ...f, item: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddQCOpen(false)}>Cancel</Button>
            <Button onClick={handleAddQC} disabled={!qcForm.item} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add to Checklist</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Parameter Confirm */}
      <Dialog open={!!deleteParam} onOpenChange={() => setDeleteParam(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Remove Parameter</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">Remove parameter <strong>{deleteParam?.parameter}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteParam(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { deleteQualityParam(selectedMachineId, deleteParam._id); setDeleteParam(null); }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete QC Item Confirm */}
      <Dialog open={!!deleteQC} onOpenChange={() => setDeleteQC(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Remove Checklist Item</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">Remove this checklist item?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteQC(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { deleteQCItem(selectedMachineId, deleteQC._id); setDeleteQC(null); }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
