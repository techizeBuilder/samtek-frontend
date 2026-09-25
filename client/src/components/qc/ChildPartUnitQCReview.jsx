import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, ClipboardCheck } from 'lucide-react';
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
export default function ChildPartUnitQCReview({ jobId, unitChecks, canEdit, onRefetch, singleStage = false }) {
  const [reviewUnit, setReviewUnit] = useState(null);

  if (!unitChecks?.length) return null;

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
