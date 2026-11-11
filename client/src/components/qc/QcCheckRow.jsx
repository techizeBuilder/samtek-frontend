import React from 'react';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

// One QC check row, the same everywhere (2026-10-30): purchase / store jobs,
// production unit steps, batch steps, a machine's Sub Child Parts.
//   - Pass / Fail buttons; the actual value only for a measured check;
//   - a Remarks box on every row, required when it's Fail;
//   - "checked by … · when" — who last changed it (from the login, server-side).
// `row` = { parameter, standardValue, type, status, actualValue, remarks,
// checkedBy, checkedAt }. `production` = Production's own recorded result when
// Production filled the row first (shown, never edited — QC's verdict is the
// row's status / remarks). readOnly → History.

export const fmtWhen = (d) => (d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '');

// "Standard: Checkbox" says nothing — a standard only when it's a real value.
const realStandard = (row) => !!row.standardValue && row.standardValue.toLowerCase() !== 'checkbox';
const measured = (row, production) => !production && (row.type === 'value' || (realStandard(row) && row.standardValue !== 'Visual Inspection'));

export function CheckStatusChip({ status }) {
  const cls = status === 'Pass' ? 'bg-emerald-100 text-emerald-700' : status === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500';
  return (
    <span className={`h-6 px-2.5 text-xs rounded-md inline-flex items-center gap-1 shrink-0 ${cls}`}>
      {status === 'Pass' && <CheckCircle className="h-3.5 w-3.5" />}
      {status === 'Fail' && <XCircle className="h-3.5 w-3.5" />}
      {(!status || status === 'Pending') && <Clock className="h-3.5 w-3.5" />}
      {status || 'Pending'}
    </span>
  );
}

export default function QcCheckRow({ row, onChange, readOnly = false, production = null }) {
  const set = (patch) => onChange?.(patch);
  const fail = row.status === 'Fail';
  return (
    <div className={`border rounded-lg p-3 ${fail ? 'bg-red-50/40 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{row.parameter}</p>
          {realStandard(row) && <p className="text-xs text-slate-400 mt-0.5">Standard: {row.standardValue}</p>}
        </div>
        {readOnly && <CheckStatusChip status={row.status} />}
      </div>

      {production && (
        <p className="text-xs text-slate-500 mt-1.5">
          Production: <span className="font-medium text-slate-700">{production.status || 'Pending'}</span>
          {production.actualValue ? ` · ${production.actualValue}` : ''}{production.remarks ? ` — ${production.remarks}` : ''}
        </p>
      )}

      {readOnly ? (
        <>
          {!production && row.actualValue && <p className="text-xs text-slate-600 mt-1">Actual: {row.actualValue}</p>}
          {row.remarks && <p className="text-xs text-slate-600 mt-1 italic">{row.remarks}</p>}
        </>
      ) : (
        <>
          {measured(row, production) && (
            <Input className="h-8 text-xs mt-2" placeholder="Actual value" value={row.actualValue || ''} onChange={e => set({ actualValue: e.target.value })} />
          )}
          <div className="flex items-center gap-2 mt-2">
            <button type="button" onClick={() => set({ status: 'Pass' })}
              className={`h-7 px-3 text-xs rounded-md flex items-center gap-1 ${row.status === 'Pass' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              <CheckCircle className="h-3.5 w-3.5" /> Pass
            </button>
            <button type="button" onClick={() => set({ status: 'Fail' })}
              className={`h-7 px-3 text-xs rounded-md flex items-center gap-1 ${fail ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
              <XCircle className="h-3.5 w-3.5" /> Fail
            </button>
          </div>
          <div className="mt-2">
            <label className={`text-xs mb-1 block ${fail ? 'font-semibold text-red-600' : 'text-slate-500'}`}>Remarks{fail ? ' *' : ''}</label>
            <Input className="h-8 text-xs" value={row.remarks || ''} onChange={e => set({ remarks: e.target.value })}
              placeholder={fail ? 'Why did this fail?' : 'Optional'} />
          </div>
        </>
      )}

      {row.checkedBy && (
        <p className="text-[10px] text-slate-400 mt-1.5">checked by {row.checkedBy}{row.checkedAt ? ` · ${fmtWhen(row.checkedAt)}` : ''}</p>
      )}
    </div>
  );
}

// Every Fail has a remark and nothing is Pending — shared by every Review.
export const checksState = (rows) => ({
  pending: rows.filter(r => !r.status || r.status === 'Pending').length,
  failMissingRemarks: rows.some(r => r.status === 'Fail' && !String(r.remarks || '').trim()),
  pass: rows.filter(r => r.status === 'Pass').length,
  fail: rows.filter(r => r.status === 'Fail').length,
});
