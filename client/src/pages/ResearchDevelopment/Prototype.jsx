import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Beaker, Plus, CheckCircle2, XCircle, Clock, Eye, Edit2, ChevronDown, ArrowRight } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const TEST_STATES = ['Pass', 'Fail', 'In Progress', 'Pending'];

const testBadge = (val) => {
  if (val === 'Pass') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (val === 'Fail') return 'bg-red-100 text-red-700 border-red-200';
  if (val === 'In Progress') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
};

const statusConfig = {
  Passed: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  Failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  'In Progress': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
};

const deriveStatus = (perf, out, dur) => {
  if (perf === 'Fail' || out === 'Fail' || dur === 'Fail') return 'Failed';
  if (perf === 'Pass' && out === 'Pass' && dur === 'Pass') return 'Passed';
  return 'In Progress';
};

const emptyForm = { machineName: '', machineCode: '', machineId: '', prototypeName: '', performanceTest: 'Pending', outputTest: 'Pending', durabilityTest: 'Pending', testNotes: '' };

export default function Prototype() {
  const { machines, addPrototype, updatePrototype, updateReleaseStatus } = useRD();
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({});

  // Reset to page 1 whenever the status filter changes so the user doesn't
  // land on a now-out-of-range page.
  useEffect(() => { setPage(1); }, [filterStatus]);

  const { data: prototypesResponse, isLoading: prototypesLoading } = useQuery({
    queryKey: ['rd-prototypes', 'list', { page, filterStatus }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', status: filterStatus, withStatusCounts: 'true' });
      return apiRequest('GET', `/api/rd/prototypes?${params.toString()}`);
    },
    keepPreviousData: true,
  });
  const filtered = prototypesResponse?.data || [];
  const pagination = prototypesResponse?.pagination || { page: 1, pages: 1, total: 0, limit: 20 };
  const counts = prototypesResponse?.statusCounts || { All: 0, Passed: 0, 'In Progress': 0, Failed: 0 };
  const approvedMachines = machines.filter(m => m.designStatus === 'Approved' && !m.isDiscontinued && m.forwardToNextPhase);

  const handleAdd = () => {
    if (!form.machineId || !form.prototypeName) return;
    const machine = machines.find(m => String(m._id) === form.machineId);
    const status = deriveStatus(form.performanceTest, form.outputTest, form.durabilityTest);
    addPrototype({
      ...form,
      machineName: machine?.name || '',
      machineCode: machine?.code || '',
      status,
      passedDate: status === 'Passed' ? new Date().toISOString().split('T')[0] : null,
    });
    setForm(emptyForm);
    setAddOpen(false);
  };

  const handleEdit = () => {
    const status = deriveStatus(editForm.performanceTest, editForm.outputTest, editForm.durabilityTest);
    updatePrototype(selected._id, {
      ...editForm,
      status,
      passedDate: status === 'Passed' ? (selected.passedDate || new Date().toISOString().split('T')[0]) : null,
    });
    setEditOpen(false);
  };

  const openEdit = (p) => {
    setSelected(p);
    setEditForm({ performanceTest: p.performanceTest, outputTest: p.outputTest, durabilityTest: p.durabilityTest, testNotes: p.testNotes });
    setEditOpen(true);
  };

  const handleRelease = async () => {
    const machineId = selected.machine?._id || selected.machine || selected.machineId;
    try {
      await updateReleaseStatus(String(machineId), 'Released');
      showSuccessToast('Released for Production', `${selected.machineName || 'Machine'} is now released and can proceed to BOM approval.`);
      setReleaseOpen(false);
    } catch (e) {
      showSmartToast(e, 'Failed to release for production');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Beaker className="h-6 w-6 text-blue-600" /> Prototype Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Every new machine must pass prototype testing before production release</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
          <Plus className="h-4 w-4 mr-2" /> New Prototype
        </Button>
      </div>

      {/* Workflow Banner */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {['Prototype Creation', 'Testing', 'Pass / Fail', 'Production Release'].map((step, i, arr) => (
            <React.Fragment key={step}>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                i === 0 ? 'bg-slate-50 border-slate-200 text-slate-700' :
                i === 1 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                i === 2 ? 'bg-blue-50 border-blue-200 text-blue-700' :
                'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>{step}</div>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Prototypes', value: counts.All ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In Progress', value: counts['In Progress'] ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Passed', value: counts.Passed ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed', value: counts.Failed ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`${s.bg} p-2.5 rounded-lg`}><Beaker className={`h-5 w-5 ${s.color}`} /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['All', 'In Progress', 'Passed', 'Failed'].map(tab => (
          <button key={tab} onClick={() => setFilterStatus(tab)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${filterStatus === tab ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
            {tab} <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filterStatus === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{counts[tab] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Prototype Cards */}
      {prototypesLoading ? (
        <Card className="border-none shadow-sm"><CardContent className="py-12 text-center text-slate-400">Loading...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-none shadow-sm"><CardContent className="py-12 text-center text-slate-400">No prototypes in this category.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => {
            const cfg = statusConfig[p.status] || statusConfig['In Progress'];
            const StatusIcon = cfg.icon;
            return (
              <Card key={p._id} className="border-none shadow-sm hover:shadow-md transition-all bg-white">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-blue-600 font-semibold">{p.machineCode}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-900">{p.machineName}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3" />{p.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{p.prototypeName}</p>

                      {/* Test Results */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Performance Test', val: p.performanceTest },
                          { label: 'Output Test', val: p.outputTest },
                          { label: 'Durability Test', val: p.durabilityTest },
                        ].map(t => (
                          <div key={t.label} className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">{t.label}:</span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${testBadge(t.val)}`}>{t.val}</span>
                          </div>
                        ))}
                      </div>

                      {p.testNotes && <p className="text-xs text-slate-500 mt-2 italic line-clamp-1">{p.testNotes}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">{p.createdAt}</span>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setSelected(p); setViewOpen(true); }}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      {p.status !== 'Passed' && (
                        <Button size="sm" variant="outline" className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => openEdit(p)}>
                          <Edit2 className="h-3 w-3 mr-1" /> Update
                        </Button>
                      )}
                      {p.status === 'Passed' && (
                        <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setSelected(p); setReleaseOpen(true); }}>
                          Release for Production
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

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} prototypes)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
        </div>
      )}

      {/* Add Prototype Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Prototype</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine (Approved designs only) *</label>
              <div className="relative">
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8" value={form.machineId} onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))}>
                  <option value="">-- Select machine --</option>
                  {approvedMachines.map(m => <option key={m._id} value={m._id}>{m.code} — {m.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Prototype Name *</label>
              <Input placeholder="e.g. CM-001 Proto v2" value={form.prototypeName} onChange={e => setForm(f => ({ ...f, prototypeName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Initial Test Results</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Performance', key: 'performanceTest' },
                  { label: 'Output', key: 'outputTest' },
                  { label: 'Durability', key: 'durabilityTest' },
                ].map(t => (
                  <div key={t.key}>
                    <p className="text-[11px] text-slate-500 mb-1">{t.label}</p>
                    <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[t.key]} onChange={e => setForm(f => ({ ...f, [t.key]: e.target.value }))}>
                      {TEST_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Test Notes</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Observations and findings..." value={form.testNotes} onChange={e => setForm(f => ({ ...f, testNotes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.machineId || !form.prototypeName} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create Prototype</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Update Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update Test Results — {selected?.prototypeName}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Test Results</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Performance Test', key: 'performanceTest' },
                  { label: 'Output Test', key: 'outputTest' },
                  { label: 'Durability Test', key: 'durabilityTest' },
                ].map(t => (
                  <div key={t.key}>
                    <p className="text-[11px] text-slate-500 mb-1">{t.label}</p>
                    <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" value={editForm[t.key]} onChange={e => setEditForm(f => ({ ...f, [t.key]: e.target.value }))}>
                      {TEST_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Test Notes</label>
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={4} value={editForm.testNotes} onChange={e => setEditForm(f => ({ ...f, testNotes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Update Results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected?.prototypeName}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Machine</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{selected.machineCode} — {selected.machineName}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border mt-1 ${(statusConfig[selected.status] || statusConfig['In Progress']).color}`}>{selected.status}</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Test Results</p>
                {[
                  { label: 'Performance Test', val: selected.performanceTest },
                  { label: 'Output Test', val: selected.outputTest },
                  { label: 'Durability Test', val: selected.durabilityTest },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{t.label}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${testBadge(t.val)}`}>{t.val}</span>
                  </div>
                ))}
              </div>
              {selected.testNotes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Test Notes</p>
                  <p className="text-sm text-slate-700">{selected.testNotes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                <span>Created: {selected.createdAt}</span>
                {selected.passedDate && <span>Passed: {selected.passedDate}</span>}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Dialog */}
      <Dialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-emerald-700">Release for Production</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Prototype <strong>{selected?.prototypeName}</strong> has passed all tests. Release <strong>{selected?.machineName}</strong> for production?</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
              Machine release status will be set to <strong>Released</strong>. Production can now raise orders for this machine.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleRelease}>Release for Production</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
