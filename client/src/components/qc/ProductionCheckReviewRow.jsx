import React from 'react';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const prodBadge = {
  Pass: { icon: CheckCircle, cls: 'text-emerald-600' },
  Fail: { icon: XCircle, cls: 'text-red-600' },
  Pending: { icon: Clock, cls: 'text-slate-400' },
};

// Read-only display of Production's own self-check result for one row, plus
// QC's own separate Pass/Fail verdict + (Fail-only) remarks. QC never edits
// Production's recorded fields here, only qcStatus/qcRemarks — Production's
// own actualValue/status/remarks stay exactly what they submitted (confirmed
// 2026-09-02: "show the result from production in display only and let the
// qc pass or fail them again"). Shared by SubChildPartQCReview's per-part
// dialog and QCInspection's Final Checklist section, so both look and behave
// the same.
export default function ProductionCheckReviewRow({ row, onChange, canEdit }) {
  const badge = prodBadge[row.status] || prodBadge.Pending;
  const ProdIcon = badge.icon;

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-800">{row.parameter}</p>
          {row.type === 'value' && row.standardValue && (
            <p className="text-xs text-slate-400 mt-0.5">Standard: {row.standardValue}</p>
          )}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${badge.cls}`}>
          <ProdIcon className="h-3.5 w-3.5" /> Production: {row.status}
        </div>
      </div>
      {row.type === 'value' && row.actualValue && (
        <p className="text-xs text-slate-500 mt-1.5">Recorded value: <span className="font-medium text-slate-700">{row.actualValue}</span></p>
      )}
      {row.remarks && <p className="text-xs text-slate-500 mt-1 italic">Production's note: {row.remarks}</p>}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
        <span className="text-xs text-slate-500 shrink-0">QC verdict:</span>
        <button
          type="button" disabled={!canEdit} onClick={() => onChange({ qcStatus: 'Pass' })}
          className={`h-7 px-3 text-xs rounded-md flex items-center gap-1 ${row.qcStatus === 'Pass' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <CheckCircle className="h-3.5 w-3.5" /> Pass
        </button>
        <button
          type="button" disabled={!canEdit} onClick={() => onChange({ qcStatus: 'Fail' })}
          className={`h-7 px-3 text-xs rounded-md flex items-center gap-1 ${row.qcStatus === 'Fail' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <XCircle className="h-3.5 w-3.5" /> Fail
        </button>
      </div>
      {row.qcStatus === 'Fail' && (
        <div className="mt-2">
          <label className="text-xs font-semibold text-red-600 mb-1 block">QC Remarks *</label>
          <Input
            className="h-8 text-xs" placeholder="Why is QC failing this?" disabled={!canEdit}
            value={row.qcRemarks || ''} onChange={e => onChange({ qcRemarks: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
