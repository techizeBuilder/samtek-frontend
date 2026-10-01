import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardCheck, CheckCircle, XCircle, History } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

// QC's review of a Sub Child Part order's own whole-batch QC steps (QC
// multi-checkpoint redesign, slice 2, 2026-09-26) — direct sibling of
// ChildPartUnitQCReview, but quantity-based: QC splits the submitted
// quantity into Passed/Rework/Scrap (must sum to what was submitted)
// instead of a plain Pass/Reject, since Sub Child Part is always one
// physical batch, never per-unit. Renders nothing when job.batchSteps is
// empty (every other job type). A step's checklist (if R&D configured one)
// is filled by QC directly, one shared fill for the whole submitted
// quantity — NOT ProductionCheckReviewRow (that one shows Production's own
// separately-recorded value and only lets QC add a second qcStatus verdict
// on top; there's no such first layer here, QC fills status/actualValue/
// remarks directly, one single fill — see QCFilledRowSchema).
export default function SubChildPartBatchQCReview({ jobId, batchSteps, canEdit, onRefetch }) {
  const [reviewStep, setReviewStep] = useState(null);
  const [historyStep, setHistoryStep] = useState(null);
  if (!batchSteps?.length) return null;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-slate-50 pb-3">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4" /> Batch Steps
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          Each step is a quantity split — Passed pieces move on (or reach stock/dispatch on the
          last step, as each decision resolves), Rework goes back to Production, Scrap is written off.
          The next step waits only while some quantity is still out for rework.
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {batchSteps.map(step => {
          const attempt = step.attempts?.[step.attempts.length - 1];
          const pending = !!attempt && !attempt.decidedAt;
          const resolved = step.reworkPendingQty === 0 && (step.passedQty + step.scrapQty) === step.qtyEnteringStep;
          return (
            <div key={step._id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{step.category} › {step.stepName}</p>
                <p className="text-[10px] text-slate-400">
                  Entering: {step.qtyEnteringStep ?? '—'} · Passed: {step.passedQty} · Scrap: {step.scrapQty}
                  {step.reworkPendingQty > 0 && ` · Rework pending: ${step.reworkPendingQty}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {resolved ? (
                  <Badge className="text-xs bg-emerald-100 text-emerald-700">Resolved</Badge>
                ) : pending ? (
                  canEdit && (
                    <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => setReviewStep(step)}>
                      Review ({attempt.qtySubmitted})
                    </Button>
                  )
                ) : (
                  <Badge className="text-xs bg-slate-100 text-slate-500">Awaiting Production</Badge>
                )}
                {step.attempts?.length > 0 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setHistoryStep(step)}>
                    <History className="h-3.5 w-3.5 mr-1" /> History
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {reviewStep && (
        <ReviewDialog
          jobId={jobId}
          stepEntry={reviewStep}
          onOpenChange={(v) => !v && setReviewStep(null)}
          onDecided={() => { setReviewStep(null); onRefetch(); }}
        />
      )}

      {historyStep && (
        <BatchStepHistoryDialog stepEntry={historyStep} onOpenChange={(v) => !v && setHistoryStep(null)} />
      )}
    </Card>
  );
}

// Read-only — every attempt this step has ever had, oldest first, so QC can
// see what was checked (and decided) in a prior round, not just the current
// one. Purely additive: no mutation, no editing, nothing here changes what
// ReviewDialog above does.
function BatchStepHistoryDialog({ stepEntry, onOpenChange }) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>History — {stepEntry.category} › {stepEntry.stepName}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          {stepEntry.attempts.map(attempt => (
            <div key={attempt._id || attempt.attemptNumber} className="border border-slate-100 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Attempt {attempt.attemptNumber} — submitted {attempt.qtySubmitted}
                {attempt.submittedBy && ` by ${attempt.submittedBy}`}
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
                  <p className="mt-0.5">
                    Passed: {attempt.passedQty ?? 0} · Rework: {attempt.reworkQty ?? 0} · Scrap: {attempt.scrapQty ?? 0}
                  </p>
                  {attempt.reason && <p className="mt-0.5 italic text-slate-500">Reason: {attempt.reason}</p>}
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

// Same visual shape as BatchChecklistRow below, but read-only — no inputs,
// no Pass/Fail buttons, just what was recorded.
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

function ReviewDialog({ jobId, stepEntry, onOpenChange, onDecided }) {
  const attempt = stepEntry.attempts[stepEntry.attempts.length - 1];
  const [rows, setRows] = useState(attempt.rows.map(r => ({ ...r })));
  const [split, setSplit] = useState({ passedQty: String(attempt.qtySubmitted), reworkQty: '0', scrapQty: '0' });
  const [reason, setReason] = useState('');

  const decideMutation = useMutation({
    mutationFn: (body) => apiRequest('PUT', `/api/qc/jobs/${jobId}/batch-steps/decision`, body),
    onSuccess: () => { showSuccessToast('Saved', 'Step decision recorded.'); onDecided(); },
    onError: (e) => showSmartToast(e, 'Failed to record decision'),
  });

  const passedQty = Number(split.passedQty) || 0;
  const reworkQty = Number(split.reworkQty) || 0;
  const scrapQty = Number(split.scrapQty) || 0;
  const sumValid = passedQty + reworkQty + scrapQty === attempt.qtySubmitted;
  const reasonNeeded = reworkQty > 0 || scrapQty > 0;
  const reasonValid = !reasonNeeded || !!reason.trim();
  const rowsDecided = rows.every(r => r.status !== 'Pending');
  const failMissingRemarks = rows.some(r => r.status === 'Fail' && !r.remarks?.trim());
  const canSave = sumValid && reasonValid && rowsDecided && !failMissingRemarks && !decideMutation.isPending;

  const handleSave = () => {
    decideMutation.mutate({
      category: stepEntry.category,
      step: stepEntry.stepName,
      results: rows.map(r => ({ parameter: r.parameter, actualValue: r.actualValue, status: r.status, remarks: r.remarks })),
      passedQty, reworkQty, scrapQty,
      reason: reason.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review — {stepEntry.category} › {stepEntry.stepName} ({attempt.qtySubmitted} submitted)</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-2">
          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              No checks configured for this step by R&amp;D — decide the quantity split below directly.
            </p>
          ) : rows.map((row, i) => (
            <BatchChecklistRow
              key={row._id || i}
              row={row}
              onChange={patch => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))}
            />
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-3">
          <p className="text-xs font-semibold text-slate-600">Quantity split — must add up to {attempt.qtySubmitted}</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Passed</label>
              <Input type="number" min="0" value={split.passedQty} onChange={e => setSplit(s => ({ ...s, passedQty: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Rework</label>
              <Input type="number" min="0" value={split.reworkQty} onChange={e => setSplit(s => ({ ...s, reworkQty: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Scrap</label>
              <Input type="number" min="0" value={split.scrapQty} onChange={e => setSplit(s => ({ ...s, scrapQty: e.target.value }))} />
            </div>
          </div>
          {!sumValid && (
            <p className="text-xs text-red-600">Passed + Rework + Scrap must equal {attempt.qtySubmitted} (currently {passedQty + reworkQty + scrapQty}).</p>
          )}
          {reasonNeeded && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason *</label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why rework or scrap?" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!canSave} onClick={handleSave}>
            Save Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// One QCFilledRowSchema row — QC fills status/actualValue/remarks directly,
// all visible at once (not a step-through wizard — this is one shared
// checklist for the whole submitted quantity, not a per-piece walk).
function BatchChecklistRow({ row, onChange }) {
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
