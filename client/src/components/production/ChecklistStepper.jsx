import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, ChevronLeft } from 'lucide-react';

// One parameter at a time, matching Job Work's own single-focused-action
// pattern (the Start button) instead of a big bulk form — Production's own
// self-check entry point (Sub Child Part Initial/Process, and Final
// Testing), shared by FillChecklistDialog and FinalChecklistPanel. A value
// box only shows for a row whose master type is 'value' (a real measured
// spec, not a plain checkbox); a remarks box only appears once that row is
// marked Fail (confirmed 2026-09-02).
export default function ChecklistStepper({ rows, setRows, canEdit, onSave, saving, saveLabel }) {
  const [index, setIndex] = useState(0);
  const total = rows.length;
  const safeIndex = Math.min(index, total - 1);
  const row = rows[safeIndex];

  const allDecided = total > 0 && rows.every(r => r.status !== 'Pending');
  const failMissingRemarks = rows.some(r => r.status === 'Fail' && !r.remarks?.trim());

  const patchRow = (i, patch) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const decide = (status) => {
    patchRow(safeIndex, { status });
    if (status === 'Pass' && safeIndex < total - 1) setIndex(safeIndex + 1);
  };

  if (!total) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">Item {safeIndex + 1} of {total}</p>
        <div className="flex gap-1">
          {rows.map((r, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full ${i === safeIndex ? 'bg-blue-500' : r.status === 'Pass' ? 'bg-emerald-400' : r.status === 'Fail' ? 'bg-red-400' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
        <p className="text-sm font-semibold text-slate-800">{row.parameter}</p>
        {row.type === 'value' && row.standardValue && (
          <p className="text-xs text-slate-400 mt-0.5">Standard: {row.standardValue}</p>
        )}
        {/* QC's own verdict on this row, once QC has actually reviewed it —
            visible whether Production is still filling it in or looking
            back at an already-submitted row, so they always know where QC
            landed on each parameter, not just when something failed
            (confirmed 2026-09-02: Production couldn't see QC's verdict at
            all before this). */}
        {row.qcStatus !== 'Pending' && (
          <p className={`text-xs rounded px-2 py-1.5 mt-2 border ${row.qcStatus === 'Pass' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
            QC verdict: {row.qcStatus}{row.qcRemarks ? ` — ${row.qcRemarks}` : ''}
          </p>
        )}

        {row.type === 'value' && (
          <Input
            className="h-9 text-sm mt-3" placeholder="Actual value" disabled={!canEdit}
            value={row.actualValue || ''}
            onChange={e => patchRow(safeIndex, { actualValue: e.target.value })}
          />
        )}

        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" disabled={!canEdit} className={`flex-1 ${row.status === 'Pass' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`} onClick={() => decide('Pass')}>
            <CheckCircle className="h-4 w-4 mr-1" /> Pass
          </Button>
          <Button size="sm" disabled={!canEdit} className={`flex-1 ${row.status === 'Fail' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`} onClick={() => decide('Fail')}>
            <XCircle className="h-4 w-4 mr-1" /> Fail
          </Button>
        </div>

        {row.status === 'Fail' && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-red-600 mb-1 block">Remarks *</label>
            <Input
              placeholder="Why did this fail?" disabled={!canEdit}
              value={row.remarks || ''}
              onChange={e => patchRow(safeIndex, { remarks: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={safeIndex === 0} onClick={() => setIndex(safeIndex - 1)}>
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        {safeIndex < total - 1 ? (
          <Button size="sm" variant="outline" disabled={row.status === 'Pending'} onClick={() => setIndex(safeIndex + 1)}>Next</Button>
        ) : canEdit ? (
          <Button
            size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            disabled={!allDecided || failMissingRemarks || saving}
            onClick={onSave}
          >
            {saving ? 'Saving…' : saveLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
