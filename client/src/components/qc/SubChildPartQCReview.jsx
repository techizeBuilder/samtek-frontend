import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ThumbsUp, ThumbsDown, ClipboardCheck } from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import ProductionCheckReviewRow from './ProductionCheckReviewRow';
import PartReferencePanel from './PartReferencePanel';

const partStatusBadge = {
  'Awaiting Production': { label: 'Awaiting Production', cls: 'bg-slate-100 text-slate-500' },
  'QC Pending': { label: 'Ready for QC', cls: 'bg-amber-100 text-amber-700' },
  'Approved': { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' },
  'Rejected': { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
};

// QC's review of every Sub Child Part on an in-house/outsource-manufactured
// product's job — renders nothing when job.partChecks is empty (every other
// job type). Reviews Initial+Process together, in one sitting, only once
// Production has sent the part (status 'QC Pending') — matches "the initial
// check will be done in production but... only then the qc will check
// initial and process check" (confirmed 2026-09-01). The job's own flat
// Checklist/Decision section below this is the Final Check — the whole
// point of keeping everything on ONE job instead of several.
export default function SubChildPartQCReview({ jobId, partChecks, canEdit, onRefetch }) {
  const [reviewPart, setReviewPart] = useState(null);

  if (!partChecks?.length) return null;

  const approvedCount = partChecks.filter(p => p.status === 'Approved').length;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b border-slate-50 pb-3">
        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <ClipboardCheck className="h-4 w-4" /> Sub Child Parts
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">{approvedCount} of {partChecks.length} approved — every part must be approved before the Final Check below</p>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {partChecks.map(part => {
          const badge = partStatusBadge[part.status] || partStatusBadge['Awaiting Production'];
          return (
            <div key={part._id} className="flex items-center justify-between gap-3 border border-slate-100 rounded-lg p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{part.subChildPartName}</p>
                <p className="text-[10px] text-slate-400">{part.childPartName}{part.producedBy && ` · sent by ${part.producedBy}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
                {canEdit && part.status === 'QC Pending' && (
                  <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={() => setReviewPart(part)}>
                    Review
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      {reviewPart && (
        <ReviewDialog
          jobId={jobId}
          part={reviewPart}
          onOpenChange={(v) => !v && setReviewPart(null)}
          onDecided={() => { setReviewPart(null); onRefetch(); }}
        />
      )}
    </Card>
  );
}

function ReviewDialog({ jobId, part, onOpenChange, onDecided }) {
  const [initial, setInitial] = useState(part.initial.map(r => ({ ...r })));
  const [process, setProcess] = useState(part.process.map(r => ({ ...r })));
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const decideMutation = useMutation({
    // Only QC's own qcStatus/qcRemarks per row travel to the server —
    // Production's own recorded fields are never re-sent/editable here (see
    // decidePartCheck's applyQcVerdicts, which matches by _id and touches
    // nothing else).
    mutationFn: (body) => apiRequest('PUT', `/api/qc/jobs/${jobId}/parts/${part._id}/decision`, body),
    onSuccess: () => { showSuccessToast('Saved', 'Part decision recorded.'); onDecided(); },
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
          <DialogTitle>Review — {part.subChildPartName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <PartReferencePanel designFile={part.designFile} materials={part.materials} />
          <Section title="Initial Checklist" rows={initial} setList={setInitial} />
          <Section title="Process Checklist" rows={process} setList={setProcess} />
        </div>

        {showRejectInput && (
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Reject Reason *</label>
            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this part being rejected?" />
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
