import React, { useState } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, XCircle, Clock, Plus, Eye, ChevronDown } from 'lucide-react';

const CHANGE_TYPES = ['Design', 'Material', 'Tool'];
const DEPARTMENTS = ['Production', 'Quality', 'Service', 'Complaint'];

const statusConfig = {
  Pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  Approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  Rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

const typeColor = {
  Design: 'bg-purple-100 text-purple-700',
  Material: 'bg-blue-100 text-blue-700',
  Tool: 'bg-orange-100 text-orange-700',
};

const deptColor = {
  Production: 'bg-slate-100 text-slate-700',
  Quality: 'bg-teal-100 text-teal-700',
  Service: 'bg-indigo-100 text-indigo-700',
  Complaint: 'bg-rose-100 text-rose-700',
};

const emptyForm = { machineId: '', raisedBy: '', department: 'Production', changeType: 'Design', description: '' };

export default function ChangeManagement() {
  const { machines, changeRequests, addChangeRequest, resolveChangeRequest } = useRD();
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [resolveAction, setResolveAction] = useState('approve');
  const [rdNotes, setRdNotes] = useState('');

  const activeMachines = machines.filter(m => !m.isDiscontinued);

  const counts = {
    Pending: changeRequests.filter(cr => cr.status === 'Pending').length,
    Approved: changeRequests.filter(cr => cr.status === 'Approved').length,
    Rejected: changeRequests.filter(cr => cr.status === 'Rejected').length,
    All: changeRequests.length,
  };

  const filtered = changeRequests.filter(cr => {
    if (activeTab !== 'All' && cr.status !== activeTab) return false;
    const q = search.toLowerCase();
    return !q || cr.machineName.toLowerCase().includes(q) || cr.machineCode.toLowerCase().includes(q) || cr.description.toLowerCase().includes(q);
  }).sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));

  const handleAdd = () => {
    if (!form.machineId || !form.raisedBy || !form.description) return;
    const machine = activeMachines.find(m => String(m._id) === form.machineId);
    addChangeRequest({ ...form, machineName: machine?.name || '', machineCode: machine?.code || '' });
    setForm(emptyForm);
    setAddOpen(false);
  };

  const handleResolve = () => {
    resolveChangeRequest(selected._id, resolveAction === 'approve', rdNotes);
    setRdNotes('');
    setResolveOpen(false);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-blue-600" /> Change Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">No direct design, material, or tool change is allowed without R&D review and approval</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
          <Plus className="h-4 w-4 mr-2" /> Raise Change Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: counts.All, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending Review', value: counts.Pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Approved', value: counts.Approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Rejected', value: counts.Rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.bg} p-2.5 rounded-lg`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div><p className="text-xs text-slate-500 font-medium">{s.label}</p><p className="text-xl font-bold text-slate-900">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-2">
          {['Pending', 'Approved', 'Rejected', 'All'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${activeTab === tab ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
              {tab} <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{counts[tab]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm ml-auto">
          <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search requests..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Change Requests List */}
      {filtered.length === 0 ? (
        <Card className="border-none shadow-sm"><CardContent className="py-12 text-center text-slate-400">No change requests in this category.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(cr => {
            const cfg = statusConfig[cr.status];
            const StatusIcon = cfg.icon;
            return (
              <Card key={cr._id} className="border-none shadow-sm hover:shadow-md transition-all bg-white">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-xs text-blue-600 font-semibold">{cr.machineCode}</span>
                        <span className="font-semibold text-slate-900">{cr.machineName}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${typeColor[cr.changeType]}`}>{cr.changeType} Change</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${deptColor[cr.department]}`}>{cr.department}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{cr.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{cr.description}</p>
                      {cr.rdNotes && (
                        <div className={`rounded-lg p-2.5 text-xs mt-2 ${cr.status === 'Approved' ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-red-50 border border-red-100 text-red-800'}`}>
                          <strong>R&D Note:</strong> {cr.rdNotes}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span>Raised by <strong className="text-slate-600">{cr.raisedBy}</strong></span>
                        <span>·</span>
                        <span>{cr.raisedAt}</span>
                        {cr.resolvedAt && <><span>·</span><span>Resolved: {cr.resolvedAt}</span></>}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setSelected(cr); setViewOpen(true); }}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      {cr.status === 'Pending' && (
                        <Button size="sm" className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => { setSelected(cr); setResolveAction('approve'); setRdNotes(''); setResolveOpen(true); }}>
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Change Request Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Raise Change Request</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              Change requests are reviewed by R&D. No production, material, or design changes are permitted without R&D approval.
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine *</label>
              <div className="relative">
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8" value={form.machineId} onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))}>
                  <option value="">-- Select machine --</option>
                  {activeMachines.map(m => <option key={m._id} value={m._id}>{m.code} — {m.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Raised By *</label>
                <Input placeholder="Your name" value={form.raisedBy} onChange={e => setForm(f => ({ ...f, raisedBy: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Department</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Change Type</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.changeType} onChange={e => setForm(f => ({ ...f, changeType: e.target.value }))}>
                  {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Issue Description *</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} placeholder="Describe the issue in detail — what is happening, when it occurs, impact on production..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.machineId || !form.raisedBy || !form.description} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review/Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Change Request</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                <div className="flex gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${typeColor[selected.changeType]}`}>{selected.changeType}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${deptColor[selected.department]}`}>{selected.department}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{selected.machineName}</p>
                <p className="text-sm text-slate-700">{selected.description}</p>
                <p className="text-xs text-slate-400">Raised by {selected.raisedBy} on {selected.raisedAt}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-2 block">R&D Decision</label>
                <div className="flex gap-3">
                  <button onClick={() => setResolveAction('approve')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${resolveAction === 'approve' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}>
                    Approve Change
                  </button>
                  <button onClick={() => setResolveAction('reject')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${resolveAction === 'reject' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-50'}`}>
                    Reject Change
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">R&D Notes / Reason *</label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} placeholder="Provide detailed reasoning for approval or rejection, and any actions taken..." value={rdNotes} onChange={e => setRdNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={!rdNotes.trim()} className={resolveAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>
              {resolveAction === 'approve' ? 'Approve' : 'Reject'} Change Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Change Request Detail</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Machine</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{selected.machineCode} — {selected.machineName}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border mt-1 ${statusConfig[selected.status].color}`}>
                    {selected.status}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Change Type</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${typeColor[selected.changeType]}`}>{selected.changeType}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Raised By</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{selected.raisedBy} ({selected.department})</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Issue Description</p>
                <p className="text-sm text-slate-700">{selected.description}</p>
              </div>
              {selected.rdNotes && (
                <div className={`rounded-lg p-3 text-sm ${selected.status === 'Approved' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                  <p className="text-xs font-semibold mb-1">R&D Notes</p>
                  <p>{selected.rdNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
