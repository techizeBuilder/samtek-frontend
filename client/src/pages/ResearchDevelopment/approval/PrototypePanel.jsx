import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Beaker, Plus, Edit2 } from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';
import { StageChip, prototypeTone } from './approvalShared';

// Prototype management for ONE machine — folded in from the old standalone
// /r&d/prototype page. Passing a prototype is what makes the Release step
// available (the "Release" button itself lives in the Manage dialog).
const TEST_STATES = ['Pass', 'Fail', 'In Progress', 'Pending'];
const TESTS = [
  { label: 'Performance', key: 'performanceTest' },
  { label: 'Output', key: 'outputTest' },
  { label: 'Durability', key: 'durabilityTest' },
];

const deriveStatus = (perf, out, dur) => {
  if (perf === 'Fail' || out === 'Fail' || dur === 'Fail') return 'Failed';
  if (perf === 'Pass' && out === 'Pass' && dur === 'Pass') return 'Passed';
  return 'In Progress';
};

const testBadge = (val) => {
  if (val === 'Pass') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (val === 'Fail') return 'bg-red-100 text-red-700 border-red-200';
  if (val === 'In Progress') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
};

const blankForm = { prototypeName: '', performanceTest: 'Pending', outputTest: 'Pending', durabilityTest: 'Pending', testNotes: '' };

export default function PrototypePanel({ machine, onChanged }) {
  const qc = useQueryClient();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('rnd', 'prototype', 'add');
  const canEdit = hasFeatureAccess('rnd', 'prototype', 'edit');
  const [form, setForm] = useState(null);       // null = closed; {} = new; {_id,...} = editing
  const machineId = machine._id;

  const { data, isLoading } = useQuery({
    queryKey: ['rd-prototypes', 'machine', machineId],
    queryFn: () => apiRequest('GET', `/api/rd/prototypes?machine=${machineId}`),
  });
  const prototypes = data?.data || [];

  const save = useMutation({
    mutationFn: (f) => {
      const status = deriveStatus(f.performanceTest, f.outputTest, f.durabilityTest);
      const payload = {
        prototypeName: f.prototypeName, performanceTest: f.performanceTest, outputTest: f.outputTest,
        durabilityTest: f.durabilityTest, testNotes: f.testNotes, status,
      };
      if (f._id) return apiRequest('PUT', `/api/rd/prototypes/${f._id}`, payload);
      return apiRequest('POST', '/api/rd/prototypes', { ...payload, machineId, machineName: machine.name, machineCode: machine.code });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rd-prototypes'] });
      setForm(null);
      onChanged?.();
    },
    onError: (e) => showSmartToast(e, 'Failed to save prototype'),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">At least one prototype must pass all three tests before this machine can be released.</p>
        {canAdd && !form && (
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setForm({ ...blankForm })}>
            <Plus className="h-3 w-3 mr-1" /> New Prototype
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-400">Loading prototypes...</p>
      ) : prototypes.length === 0 && !form ? (
        <p className="text-xs text-slate-400 italic">No prototypes yet.</p>
      ) : (
        prototypes.map(p => (
          <div key={p._id} className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-slate-800">{p.prototypeName}</span>
                <StageChip label="" value={p.status} tone={prototypeTone(p.status)} />
              </div>
              {canEdit && p.status !== 'Passed' && !form && (
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setForm({ ...p })}>
                  <Edit2 className="h-3 w-3 mr-1" /> Update
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {TESTS.map(t => (
                <span key={t.key} className="text-xs text-slate-500">
                  {t.label}: <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${testBadge(p[t.key])}`}>{p[t.key]}</span>
                </span>
              ))}
            </div>
            {p.testNotes && <p className="text-xs text-slate-500 mt-2 italic">{p.testNotes}</p>}
          </div>
        ))
      )}

      {form && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-slate-700">{form._id ? 'Update test results' : 'New prototype'}</p>
          {!form._id && (
            <Input placeholder="Prototype name, e.g. CM-001 Proto v2" value={form.prototypeName} onChange={e => setForm(f => ({ ...f, prototypeName: e.target.value }))} />
          )}
          <div className="grid grid-cols-3 gap-2">
            {TESTS.map(t => (
              <div key={t.key}>
                <p className="text-[11px] text-slate-500 mb-1">{t.label}</p>
                <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white" value={form[t.key]} onChange={e => setForm(f => ({ ...f, [t.key]: e.target.value }))}>
                  {TEST_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
          <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none bg-white" rows={2} placeholder="Observations and findings..." value={form.testNotes || ''} onChange={e => setForm(f => ({ ...f, testNotes: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button size="sm" disabled={!form.prototypeName?.trim() || save.isPending} onClick={() => save.mutate(form)} className="bg-blue-600 hover:bg-blue-700 text-white">
              {form._id ? 'Update Results' : 'Create Prototype'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
