import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardCheck, History } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import QcCheckRow, { checksState } from './QcCheckRow';
import RejectionPhotoPicker, { decisionBody } from './RejectionPhotoPicker';
import RejectionEvidence from './RejectionEvidence';
import SerialPicker, { emptyPick } from '@/components/serials/SerialPicker';
import { useConfirmWarnings } from '@/components/serials/useConfirmWarnings';

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
export default function SubChildPartBatchQCReview({ jobId, batchSteps, canEdit, onRefetch, inspector = '' }) {
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
        {batchSteps.map((step, si) => {
          const attempt = step.attempts?.[step.attempts.length - 1];
          const pending = !!attempt && !attempt.decidedAt;
          // 2026-10-25: in order. (2026-10-30: no "start inspection first" — the
          // first QC person to save or decide becomes the inspector.)
          const earlier = batchSteps.slice(0, si).find(s => { const a = s.attempts?.[s.attempts.length - 1]; return a && !a.decidedAt; });
          const why = earlier ? `after ${earlier.stepName}` : '';
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
                  canEdit && (why
                    ? <span className="text-xs text-slate-500">{why}</span>
                    : (
                    <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => setReviewStep(step)}>
                      Review ({attempt.qtySubmitted})
                    </Button>
                  ))
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
                  {attempt.rows.map((row, i) => <QcCheckRow key={row._id || i} row={row} readOnly />)}
                </div>
              )}
              {attempt.decidedAt ? (
                <div className="text-xs text-slate-600 border-t border-slate-100 pt-2">
                  <p>Decided by {attempt.decidedBy || '—'}, {new Date(attempt.decidedAt).toLocaleString()}</p>
                  <p className="mt-0.5">
                    Passed: {attempt.passedQty ?? 0} · Rework: {attempt.reworkQty ?? 0} · Scrap: {attempt.scrapQty ?? 0}
                  </p>
                  {attempt.reason && <p className="mt-0.5 italic text-slate-500">Reason: {attempt.reason}</p>}
                  <div className="mt-1.5"><RejectionEvidence failedChecks={attempt.failedChecks} photos={attempt.photos} downloadName={`${stepEntry.stepName}-${attempt.attemptNumber}`} /></div>
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

function ReviewDialog({ jobId, stepEntry, onOpenChange, onDecided }) {
  const attempt = stepEntry.attempts[stepEntry.attempts.length - 1];
  const [rows, setRows] = useState(attempt.rows.map(r => ({ ...r })));
  const [split, setSplit] = useState({ passedQty: String(attempt.qtySubmitted), reworkQty: '0', scrapQty: '0' });
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState([]); // of what goes to rework / scrap (2026-10-30)
  const { runChecked, warningDialog } = useConfirmWarnings();
  const [scrapPick, setScrapPick] = useState(emptyPick()); // serials in the scrapped pieces (2 Nov review)
  const [scrapPickOk, setScrapPickOk] = useState(true);

  const decideMutation = useMutation({
    mutationFn: (bodyFor) => runChecked((ack) => apiRequest('PUT', `/api/qc/jobs/${jobId}/batch-steps/decision`, bodyFor(ack))),
    onSuccess: (res) => { if (!res) return; showSuccessToast('Saved', 'Step decision recorded.'); onDecided(); },
    onError: (e) => showSmartToast(e, 'Failed to record decision'),
  });
  // "Save checks" (2026-10-30): the rows this person checked, no decision —
  // someone else can carry on.
  const results = () => rows.map(r => ({ parameter: r.parameter, actualValue: r.actualValue, status: r.status, remarks: r.remarks }));
  const checksMutation = useMutation({
    mutationFn: () => apiRequest('PUT', `/api/qc/jobs/${jobId}/batch-steps/checks`, { category: stepEntry.category, step: stepEntry.stepName, results: results() }),
    onSuccess: () => { showSuccessToast('Saved', 'Checks saved — the decision can be made later.'); onDecided(); },
    onError: (e) => showSmartToast(e, 'Failed to save the checks'),
  });

  const passedQty = Number(split.passedQty) || 0;
  const reworkQty = Number(split.reworkQty) || 0;
  const scrapQty = Number(split.scrapQty) || 0;
  const sumValid = passedQty + reworkQty + scrapQty === attempt.qtySubmitted;
  const reasonNeeded = reworkQty > 0 || scrapQty > 0;
  const reasonValid = !reasonNeeded || !!reason.trim();
  const { pending, failMissingRemarks } = checksState(rows);
  const rowsDecided = pending === 0;
  const busy = decideMutation.isPending || checksMutation.isPending;
  const canSave = sumValid && reasonValid && rowsDecided && !failMissingRemarks && !busy && (scrapQty === 0 || scrapPickOk);

  const handleSave = () => {
    decideMutation.mutate((acknowledgeWarnings) => decisionBody({
      category: stepEntry.category,
      step: stepEntry.stepName,
      results: results(),
      passedQty, reworkQty, scrapQty,
      reason: reason.trim(),
      acknowledgeWarnings,
      ...(scrapQty > 0 ? { scrapSerials: scrapPick } : {}),
    }, reasonNeeded ? photos : []));
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        {warningDialog}
        <DialogHeader>
          <DialogTitle>Review — {stepEntry.category} › {stepEntry.stepName} ({attempt.qtySubmitted} submitted)</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-2">
          {rows.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              No checks configured for this step by R&amp;D — decide the quantity split below directly.
            </p>
          ) : rows.map((row, i) => (
            <QcCheckRow
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
          {scrapQty > 0 && (
            <SerialPicker mode="scpPieces" jobId={jobId} qty={scrapQty} onFloor={attempt.qtySubmitted} title="Serial numbers in the scrapped pieces"
              value={scrapPick} onChange={setScrapPick} onValidity={(ok) => setScrapPickOk(ok)} />
          )}
          {reasonNeeded && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason *</label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why rework or scrap?" />
              <div className="mt-2"><RejectionPhotoPicker files={photos} onChange={setPhotos} onError={(m) => showSmartToast(new Error(m), 'Photo not added')} /></div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {rows.length > 0 && (
            <Button variant="outline" disabled={busy || failMissingRemarks} onClick={() => checksMutation.mutate()} title={failMissingRemarks ? 'Add a remark for each failed check' : 'Save the checks you did; the decision can be made later (by you or someone else)'}>
              Save checks
            </Button>
          )}
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!canSave} onClick={handleSave}>
            Save Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
