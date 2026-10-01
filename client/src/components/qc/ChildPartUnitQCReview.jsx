import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, ClipboardCheck, CheckCircle, XCircle, History } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import ProductionCheckReviewRow from './ProductionCheckReviewRow';

const unitStatusBadge = {
  'Awaiting Production': { label: 'Awaiting Production', cls: 'bg-slate-100 text-slate-500' },
  'QC Pending': { label: 'Ready for QC', cls: 'bg-amber-100 text-amber-700' },
  'Approved': { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  'Rejected': { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
};

// QC's review of every UNIT of a Child Part order — direct sibling of
// SubChildPartQCReview, same one-QCJob-nested-entries shape, just keyed by
// unitNumber instead of a Sub-Child-Part's own _id (see QCJob.js's
// UnitQCEntrySchema comment). Renders nothing when job.unitChecks is empty
// (every other job type). Unlike SubChildPartQCReview's parts (which must
// all be Approved before this SAME job's Final Check below), a Child Part
// order has no whole-job Final Check at all — each unit's Approval is what
// unlocks that unit's own Painting step directly (confirmed with the user
// 2026-09-16: units reach/leave QC entirely independently of siblings).
//
// singleStage (2026-09-24): a per-unit Machine job uses this same review —
// one Final checklist per unit (stored as process[], initial[] empty)
// instead of Child Part's Initial/Process pair. A Machine unit is "Ready"
// (readyAt) once it's approved AND its last step is done — that's when it
// counts toward dispatch (or stock).
//
// stepped (Stage B, QC multi-checkpoint redesign, 2026-09-26): true only
// for a dynamic Child Part order (server-computed, see qcController.js's
// getQCJob — a bare unit.steps.length check can't tell "dynamic order, unit
// hasn't submitted its first step yet" apart from "Machine, permanently
// flat", so the backend tells us directly). When true, a unit decides
// per-STEP (Pass/Reject, several possible steps) instead of the whole unit
// at once — everything below this point in the file is unchanged, the new
// mode is a fully separate render path (renderStepped) so Machine's
// existing behavior (stepped always false there) is untouched.
export default function ChildPartUnitQCReview({ jobId, unitChecks, canEdit, onRefetch, singleStage = false, stepped = false }) {
  const [reviewUnit, setReviewUnit] = useState(null);
  const [reviewStep, setReviewStep] = useState(null); // { unit, entry } — stepped mode only
  const [historyStep, setHistoryStep] = useState(null); // { unit, entry } — stepped mode only

  if (!unitChecks?.length) return null;

  if (stepped) {
    return (
      <>
        <SteppedUnitsCard
          unitChecks={unitChecks}
          canEdit={canEdit}
          onReview={(unit, entry) => setReviewStep({ unit, entry })}
          onHistory={(unit, entry) => setHistoryStep({ unit, entry })}
        />
        {reviewStep && (
          <StepReviewDialog
            jobId={jobId}
            unit={reviewStep.unit}
            stepEntry={reviewStep.entry}
            onOpenChange={(v) => !v && setReviewStep(null)}
            onDecided={() => { setReviewStep(null); onRefetch(); }}
          />
        )}
        {historyStep && (
          <StepHistoryDialog unit={historyStep.unit} stepEntry={historyStep.entry} onOpenChange={(v) => !v && setHistoryStep(null)} />
        )}
      </>
    );
  }

  const approvedCount = unitChecks.filter(u => u.status === 'Approved').length;
  const readyCount = unitChecks.filter(u => u.readyAt).length;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-slate-50 pb-3">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4" /> Units
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          {singleStage
            ? `${approvedCount} of ${unitChecks.length} approved, ${readyCount} ready — an approved unit moves on to its next step, or is ready once its last step is done`
            : `${approvedCount} of ${unitChecks.length} approved — each unit's own Painting starts as soon as its own unit here is approved`}
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {unitChecks.map(unit => {
          const badge = unitStatusBadge[unit.status] || unitStatusBadge['Awaiting Production'];
          return (
            <div key={unit._id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Unit {unit.unitNumber}</p>
                {unit.producedBy && <p className="text-[10px] text-slate-400">sent by {unit.producedBy}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
                {unit.readyAt && <Badge className="text-xs bg-indigo-100 text-indigo-700">Ready</Badge>}
                {canEdit && unit.status === 'QC Pending' && (
                  <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => setReviewUnit(unit)}>
                    Review
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {reviewUnit && (
        <ReviewDialog
          jobId={jobId}
          unit={reviewUnit}
          singleStage={singleStage}
          onOpenChange={(v) => !v && setReviewUnit(null)}
          onDecided={() => { setReviewUnit(null); onRefetch(); }}
        />
      )}
    </Card>
  );
}

function ReviewDialog({ jobId, unit, singleStage, onOpenChange, onDecided }) {
  const [initial, setInitial] = useState(unit.initial.map(r => ({ ...r })));
  const [process, setProcess] = useState(unit.process.map(r => ({ ...r })));
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const decideMutation = useMutation({
    mutationFn: (body) => apiRequest('PUT', `/api/qc/jobs/${jobId}/units/${unit.unitNumber}/decision`, body),
    onSuccess: () => { showSuccessToast('Saved', 'Unit decision recorded.'); onDecided(); },
    onError: (e) => showSmartToast(e, 'Failed to record decision'),
  });

  const setRow = (list, setList, i, patch) => setList(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const allDecided = [...initial, ...process].every(r => r.qcStatus !== 'Pending');
  const failMissingRemarks = [...initial, ...process].some(r => r.qcStatus === 'Fail' && !r.qcRemarks?.trim());
  const toVerdicts = (rows) => rows.map(r => ({ _id: r._id, qcStatus: r.qcStatus, qcRemarks: r.qcRemarks }));

  const handleApprove = () => decideMutation.mutate({ decision: 'Approved', initial: toVerdicts(initial), process: toVerdicts(process) });
  const handleReject = () => {
    if (!rejectReason.trim()) { setShowRejectInput(true); return; }
    decideMutation.mutate({ decision: 'Rejected', rejectReason: rejectReason.trim(), initial: toVerdicts(initial), process: toVerdicts(process) });
  };

  const Section = ({ title, rows, setList }) => (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">No checks configured for this stage.</p>
        ) : rows.map((row, i) => (
          <ProductionCheckReviewRow key={row._id || i} row={row} canEdit onChange={patch => setRow(rows, setList, i, patch)} />
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review — Unit {unit.unitNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!singleStage && <Section title="Initial Checklist" rows={initial} setList={setInitial} />}
          <Section title={singleStage ? 'Final Checklist' : 'Process Checklist'} rows={process} setList={setProcess} />
        </div>

        {showRejectInput && (
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Reject Reason *</label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this unit being rejected?" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={!allDecided || failMissingRemarks || decideMutation.isPending}
            onClick={handleReject}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!allDecided || failMissingRemarks || decideMutation.isPending}
            onClick={handleApprove}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stage B (2026-09-26) — dynamic Child Part, per-step review ─────────────

// One row per unit's OWN steps[], each with its own status/Review/History —
// a step with an undecided attempt gets a Review button; every step with any
// attempts at all (decided or not) gets a History button, so QC can see what
// was checked in the current or any prior round, not just an aggregate count.
function SteppedUnitsCard({ unitChecks, canEdit, onReview, onHistory }) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-slate-50 pb-3">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4" /> Units
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          Each unit has its own QC steps — a unit's last step credits stock only once every one
          of its own steps is Approved.
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {unitChecks.map(unit => {
          const steps = unit.steps || [];
          const doneCount = steps.filter(s => s.status === 'Approved').length;
          return (
            <div key={unit._id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">Unit {unit.unitNumber}</p>
                {steps.length > 0 ? (
                  <Badge className="text-xs bg-slate-100 text-slate-600">{doneCount} of {steps.length} steps done</Badge>
                ) : (
                  <Badge className="text-xs bg-slate-100 text-slate-500">Awaiting Production</Badge>
                )}
              </div>
              {steps.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {steps.map(entry => {
                    const attempt = entry.attempts[entry.attempts.length - 1];
                    const pending = !!attempt && !attempt.decidedAt;
                    const badge = unitStatusBadge[entry.status] || unitStatusBadge['Awaiting Production'];
                    return (
                      <div key={entry._id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-md px-2.5 py-1.5">
                        <p className="text-xs text-slate-700">{entry.category} › {entry.stepName}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
                          {pending && canEdit && (
                            <Button size="sm" className="h-6 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => onReview(unit, entry)}>
                              Review
                            </Button>
                          )}
                          {entry.attempts.length > 0 && (
                            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onHistory(unit, entry)}>
                              <History className="h-3 w-3 mr-1" /> History
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Read-only — every attempt this step has ever had, oldest first.
function StepHistoryDialog({ unit, stepEntry, onOpenChange }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>History — Unit {unit.unitNumber} — {stepEntry.category} › {stepEntry.stepName}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          {stepEntry.attempts.map(attempt => (
            <div key={attempt._id || attempt.attemptNumber} className="border border-slate-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Attempt {attempt.attemptNumber}
                {attempt.submittedBy && ` — submitted by ${attempt.submittedBy}`}
                {attempt.submittedAt && `, ${new Date(attempt.submittedAt).toLocaleString()}`}
              </p>
              {attempt.rows.length === 0 ? (
                <p className="text-xs text-slate-400">No checks configured for this step.</p>
              ) : (
                <div className="space-y-2">
                  {attempt.rows.map((row, i) => <ReadOnlyChecklistRow key={row._id || i} row={row} />)}
                </div>
              )}
              {attempt.decidedAt ? (
                <div className="text-xs text-slate-600 border-t border-slate-100 pt-2">
                  <p>Decided by {attempt.decidedBy || '—'}, {new Date(attempt.decidedAt).toLocaleString()}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 h-6 px-2.5 text-xs rounded-md ${attempt.decision === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {attempt.decision === 'Pass' ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                    {attempt.decision}
                  </span>
                  {attempt.rejectReason && <p className="mt-1 italic text-slate-500">Reason: {attempt.rejectReason}</p>}
                </div>
              ) : (
                <p className="text-xs text-amber-600 border-t border-slate-100 pt-2">Awaiting QC decision.</p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Same visual shape as StepChecklistRow below, but read-only — no inputs, no
// Pass/Fail buttons, just what was recorded.
function ReadOnlyChecklistRow({ row }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
      <p className="text-sm font-medium text-slate-800">{row.parameter}</p>
      {row.type === 'value' && row.standardValue && (
        <p className="text-xs text-slate-400 mt-0.5">Standard: {row.standardValue}</p>
      )}
      {row.type === 'value' && row.actualValue && (
        <p className="text-xs text-slate-600 mt-1">Actual: {row.actualValue}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <span className={`h-6 px-2.5 text-xs rounded-md flex items-center gap-1 ${row.status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : row.status === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
          {row.status === 'Pass' && <CheckCircle className="h-3.5 w-3.5" />}
          {row.status === 'Fail' && <XCircle className="h-3.5 w-3.5" />}
          {row.status || 'Pending'}
        </span>
      </div>
      {row.remarks && <p className="text-xs text-slate-500 italic mt-1.5">{row.remarks}</p>}
    </div>
  );
}

function StepReviewDialog({ jobId, unit, stepEntry, onOpenChange, onDecided }) {
  const attempt = stepEntry.attempts[stepEntry.attempts.length - 1];
  const [rows, setRows] = useState(attempt.rows.map(r => ({ ...r })));
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const decideMutation = useMutation({
    mutationFn: (body) => apiRequest('PUT', `/api/qc/jobs/${jobId}/units/${unit.unitNumber}/decision`, body),
    onSuccess: () => { showSuccessToast('Saved', 'Step decision recorded.'); onDecided(); },
    onError: (e) => showSmartToast(e, 'Failed to record decision'),
  });

  const allDecided = rows.every(r => r.status !== 'Pending');
  const failMissingRemarks = rows.some(r => r.status === 'Fail' && !r.remarks?.trim());
  const canDecide = allDecided && !failMissingRemarks && !decideMutation.isPending;

  const handleDecide = (decision) => {
    if (decision === 'Reject' && !rejectReason.trim()) { setShowRejectInput(true); return; }
    decideMutation.mutate({
      category: stepEntry.category, step: stepEntry.stepName, decision,
      results: rows.map(r => ({ parameter: r.parameter, actualValue: r.actualValue, status: r.status, remarks: r.remarks })),
      rejectReason: decision === 'Reject' ? rejectReason.trim() : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review — Unit {unit.unitNumber} — {stepEntry.category} › {stepEntry.stepName}</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-2">
          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              No checks configured for this step by R&amp;D — decide Pass or Reject below directly.
            </p>
          ) : rows.map((row, i) => (
            <StepChecklistRow
              key={row._id || i}
              row={row}
              onChange={patch => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))}
            />
          ))}
        </div>

        {showRejectInput && (
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Reject Reason *</label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this step being rejected?" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={!canDecide}
            onClick={() => handleDecide('Reject')}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!canDecide}
            onClick={() => handleDecide('Pass')}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Pass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// QC fills status/actualValue/remarks directly, one shared fill (no separate
// Production-recorded layer to display alongside — unlike ProductionCheckReviewRow,
// which assumes one) — same shape SubChildPartBatchQCReview's own
// BatchChecklistRow already uses for this exact schema (QCFilledRowSchema).
function StepChecklistRow({ row, onChange }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
      <p className="text-sm font-medium text-slate-800">{row.parameter}</p>
      {row.type === 'value' && row.standardValue && (
        <p className="text-xs text-slate-400 mt-0.5">Standard: {row.standardValue}</p>
      )}
      {row.type === 'value' && (
        <Input
          className="h-8 text-xs mt-2" placeholder="Actual value"
          value={row.actualValue || ''} onChange={e => onChange({ actualValue: e.target.value })}
        />
      )}
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button" onClick={() => onChange({ status: 'Pass' })}
          className={`h-7 px-3 text-xs rounded-md flex items-center gap-1 ${row.status === 'Pass' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <CheckCircle className="h-3.5 w-3.5" /> Pass
        </button>
        <button
          type="button" onClick={() => onChange({ status: 'Fail' })}
          className={`h-7 px-3 text-xs rounded-md flex items-center gap-1 ${row.status === 'Fail' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <XCircle className="h-3.5 w-3.5" /> Fail
        </button>
      </div>
      {row.status === 'Fail' && (
        <div className="mt-2">
          <label className="text-xs font-semibold text-red-600 mb-1 block">Remarks *</label>
          <Input
            className="h-8 text-xs" placeholder="Why did this fail?"
            value={row.remarks || ''} onChange={e => onChange({ remarks: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
