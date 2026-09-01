import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import ChecklistStepper from './ChecklistStepper';
import PartReferencePanel from '@/components/qc/PartReferencePanel';

const API = (orderId) => `/api/production-mfg/orders/${orderId}`;

const partStatusBadge = {
  'Awaiting Production': { label: 'Awaiting Production', cls: 'bg-slate-100 text-slate-500' },
  'QC Pending': { label: 'Sent to QC', cls: 'bg-amber-100 text-amber-700' },
  'Approved': { label: 'QC Approved', cls: 'bg-emerald-100 text-emerald-700' },
  'Rejected': { label: 'QC Rejected', cls: 'bg-red-100 text-red-700' },
};

// Production's own material-present -> allot team -> start -> Initial ->
// Process pipeline for one Sub Child Part — shown on the Fabrication step
// for an in-house/outsource-manufactured product only (see
// productionMfgController.js's ensurePartChecksStructure: the parts-qc
// endpoint returns an empty list for anything else, so this panel just
// renders nothing). Sequential within a part (Process locked until Initial
// is saved, both locked until started); parts themselves are fully
// independent of each other — any part can be worked whenever its own
// material's ready, several at once if enough people are free (confirmed
// 2026-09-01). `teams` is passed down from ProcessExecution.jsx's own
// useProduction() rather than re-fetched here — same list already used for
// every other Assign Team control on this page.
export default function SubChildPartQCPanel({ orderId, canEdit, teams = [] }) {
  const qc = useQueryClient();
  const [fillDialog, setFillDialog] = useState(null); // { partCheckId, stage, subChildPartName }
  const [teamDialogPart, setTeamDialogPart] = useState(null); // the part currently choosing a team

  const { data, isLoading } = useQuery({
    queryKey: ['parts-qc', orderId],
    queryFn: () => apiRequest('GET', `${API(orderId)}/parts-qc`),
    enabled: !!orderId,
  });
  const parts = data?.data?.partChecks || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['parts-qc', orderId] });
  const startPartMutation = useMutation({
    mutationFn: (partCheckId) => apiRequest('PUT', `${API(orderId)}/parts-qc/${partCheckId}/start`),
    onSuccess: () => { invalidate(); showSuccessToast('Started', 'Work started on this part.'); },
    onError: (e) => showSmartToast(e, 'Failed to start'),
  });

  if (isLoading) return <p className="text-xs text-slate-400 py-3 text-center">Loading parts…</p>;
  if (!parts.length) return null; // not a manufactured product (or no Sub Child Parts yet) — nothing to show

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-slate-50 pb-3">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4" /> Sub Child Part QC
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Material present → allot team → start → Initial → Process — saving Process automatically sends the part to QC</p>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {parts.map(part => {
          const badge = partStatusBadge[part.status] || partStatusBadge['Awaiting Production'];
          const editable = ['Awaiting Production', 'Rejected'].includes(part.status);
          const initialDone = part.initial?.length > 0;
          const team = teams.find(t => String(t._id) === String(part.assignedTeam?._id || part.assignedTeam));
          const started = !!part.startedAt;
          return (
            <div key={part._id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{part.subChildPartName}</p>
                  <p className="text-[10px] text-slate-400">{part.childPartName}</p>
                </div>
                <Badge className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
              </div>
              {part.status === 'Rejected' && part.rejectReason && (
                <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-100 rounded px-2 py-1.5 text-xs text-red-700">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" /> {part.rejectReason}
                </div>
              )}

              {/* Allot work / start — same material-present gate as Job
                  Work, narrowed to this part's own BOM lines (server-
                  enforced; a rejection here just surfaces the reason).
                  Team picker matches Job Work's own Assign Team dialog
                  exactly (2026-09-02), not a plain inline dropdown. */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                  {team ? `${team.name}` : <span className="text-slate-400">No team assigned</span>}
                  {editable && canEdit && (
                    <button className="text-blue-600 font-semibold ml-1" onClick={() => setTeamDialogPart(part)}>
                      {team ? 'Change' : '+ Assign'}
                    </button>
                  )}
                </span>
                {editable && !started && (
                  <Button
                    size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!canEdit || !part.assignedTeam || startPartMutation.isPending}
                    onClick={() => startPartMutation.mutate(part._id)}
                  >
                    Start
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2">
                {/* Viewable any time work has started, regardless of the
                    part's current status — only actually editable (inside
                    the dialog) while it's still Awaiting Production or
                    Rejected. Previously this button went fully disabled the
                    moment it was sent to QC, so Production couldn't even
                    look back at what they submitted or see QC's verdict
                    (confirmed 2026-09-02). */}
                <Button
                  size="sm" variant="outline" className="h-7 text-xs"
                  disabled={!started}
                  onClick={() => setFillDialog({ partCheckId: part._id, stage: 'initial', subChildPartName: part.subChildPartName, designFile: part.designFile, materials: part.materials, partStatus: part.status, canEdit })}
                >
                  {initialDone ? <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" /> : <Clock className="h-3 w-3 mr-1" />} Initial Checklist
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 text-xs"
                  disabled={!started || !initialDone}
                  onClick={() => setFillDialog({ partCheckId: part._id, stage: 'process', subChildPartName: part.subChildPartName, designFile: part.designFile, materials: part.materials, partStatus: part.status, canEdit })}
                  title={!initialDone ? 'Complete the Initial checklist first' : undefined}
                >
                  {part.process?.length > 0 ? <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" /> : <Clock className="h-3 w-3 mr-1" />} Process Checklist
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      {fillDialog && (
        <FillChecklistDialog
          orderId={orderId}
          {...fillDialog}
          onOpenChange={(v) => !v && setFillDialog(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['parts-qc', orderId] })}
        />
      )}

      {teamDialogPart && (
        <AssignPartTeamDialog
          orderId={orderId}
          part={teamDialogPart}
          teams={teams}
          onOpenChange={(v) => !v && setTeamDialogPart(null)}
          onAssigned={invalidate}
        />
      )}
    </Card>
  );
}

// Same card-picker Dialog ProcessExecution.jsx's own "Assign Team" already
// uses for every other stage — kept visually/behaviorally identical rather
// than a plain inline dropdown (2026-09-02), just pointed at this one part's
// own assign-team endpoint instead of a whole process step's.
function AssignPartTeamDialog({ orderId, part, teams, onOpenChange, onAssigned }) {
  const [selectedTeam, setSelectedTeam] = useState(String(part.assignedTeam?._id || part.assignedTeam || ''));

  const assignMutation = useMutation({
    mutationFn: () => apiRequest('PUT', `${API(orderId)}/parts-qc/${part._id}/assign-team`, { teamId: selectedTeam }),
    onSuccess: () => { onAssigned(); onOpenChange(false); },
    onError: (e) => showSmartToast(e, 'Failed to assign team'),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Assign Team — {part.subChildPartName}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {teams.map(t => {
            const tid = String(t._id || t.id);
            return (
              <button
                key={tid}
                onClick={() => setSelectedTeam(tid)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedTeam === tid ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}
              >
                <div className="font-semibold text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">Supervisor: {t.supervisor} · {t.members?.length || 0} members</div>
                {t.skills?.length > 0 && <div className="text-xs text-slate-400 mt-0.5">Skills: {t.skills.join(', ')}</div>}
                {t.efficiency != null && <div className="text-xs text-blue-600 mt-0.5 font-semibold">Efficiency: {t.efficiency}%</div>}
              </button>
            );
          })}
          {teams.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No teams set up yet.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => assignMutation.mutate()} disabled={!selectedTeam || assignMutation.isPending} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STAGE_LABEL = { initial: 'Initial Checklist', process: 'Process Checklist' };

function FillChecklistDialog({ orderId, partCheckId, stage, subChildPartName, designFile, materials, partStatus, canEdit, onOpenChange, onSaved }) {
  const [rows, setRows] = useState([]);
  // Same states savePartChecklist itself allows editing from — everything
  // else (QC Pending / Approved) is view-only: what was submitted, and QC's
  // verdict on it if one exists yet (confirmed 2026-09-02 — Production
  // couldn't previously even open this once sent to QC).
  const editable = canEdit && ['Awaiting Production', 'Rejected'].includes(partStatus);

  const { data, isFetching } = useQuery({
    queryKey: ['parts-qc-rows', orderId, partCheckId, stage],
    queryFn: () => apiRequest('GET', `${API(orderId)}/parts-qc/${partCheckId}/${stage}`),
  });

  useEffect(() => {
    if (!isFetching && data?.data?.rows) setRows(data.data.rows.map(r => ({ ...r })));
  }, [isFetching, data]);

  const saveMutation = useMutation({
    mutationFn: (results) => apiRequest('PUT', `${API(orderId)}/parts-qc/${partCheckId}/${stage}`, { results }),
    onSuccess: () => {
      showSuccessToast('Saved', stage === 'process' ? 'Process checklist saved — sent to QC.' : 'Initial checklist saved.');
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => showSmartToast(e, 'Failed to save checklist'),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{STAGE_LABEL[stage]} — {subChildPartName}</DialogTitle>
        </DialogHeader>

        {!editable && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded px-3 py-2 -mt-2">
            {partStatus === 'QC Pending' ? 'Sent to QC — view only until QC decides.' : partStatus === 'Approved' ? 'QC approved this part — view only.' : 'View only.'}
          </p>
        )}

        {isFetching ? (
          <p className="text-xs text-slate-400 py-8 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No checks configured yet for this part in Product Master QC.</p>
        ) : (
          <div className="py-2">
            <PartReferencePanel designFile={designFile} materials={materials} />
            <ChecklistStepper
              rows={rows}
              setRows={setRows}
              canEdit={editable}
              onSave={() => saveMutation.mutate(rows)}
              saving={saveMutation.isPending}
              saveLabel={stage === 'process' ? 'Save & Send to QC' : 'Save'}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
