import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import RejectionPhotoPicker from './RejectionPhotoPicker';

// The reject breakdown (2026-10-30, docs/qc-reject-breakdown-2026-10.md): when
// QC rejects more than one piece, each LINE says how many (or which serials),
// what failed (a check on this job's list, or Other — typed), what was wrong,
// how bad (purchase) and, for a fabrication delivery of several sizes, which
// size — with its own photos. Each line becomes its own Purchase rejection.

const SEVERITIES = [['Minor', 'Cosmetic / usable'], ['Major', 'Not usable as is'], ['Critical', 'Unsafe / wrong item']];
const OTHER = '__other';
let seq = 0;
export const newRejectLine = () => ({ key: `l${++seq}`, qty: '', serials: [], parameter: '', otherText: '', remark: '', severity: 'Major', size: '', files: [] });

const lineQty = (l, serialMode) => (serialMode ? (l.serials || []).length : Number(l.qty) || 0);

// { ok, message, total } — what's still missing, in the order QC fills it.
export function breakdownState(lines, { inQc, serialMode = false, multiSize = false, needPhoto = false }) {
  const total = Math.round(lines.reduce((s, l) => s + lineQty(l, serialMode), 0) * 1000) / 1000;
  if (!lines.length) return { ok: false, total, message: 'Add a line: how many, what failed, and what was wrong.' };
  for (const l of lines) {
    if (!(lineQty(l, serialMode) > 0)) return { ok: false, total, message: serialMode ? 'Tick the serial numbers on each line.' : 'Each line needs how many were rejected.' };
    if (!l.parameter || (l.parameter === OTHER && !l.otherText.trim())) return { ok: false, total, message: 'Pick what failed on each line — a check, or Other.' };
    if (!l.remark.trim()) return { ok: false, total, message: 'Say what was wrong on each line.' };
    if (multiSize && !l.size) return { ok: false, total, message: 'Pick the size on each line.' };
  }
  if (total > inQc + 1e-9) return { ok: false, total, message: `Only ${inQc} are in QC — the lines add up to ${total}.` };
  if (needPhoto && !lines.some(l => l.files.length)) return { ok: false, total, message: 'Add at least one photo of the rejected material.' };
  return { ok: true, total, message: '' };
}

// → { rejectLines (for the JSON), files (all photos, in order) }.
export function breakdownPayload(lines, { serialMode = false, sizes = [] }) {
  const files = [];
  const rejectLines = lines.map(l => {
    const photoIndexes = l.files.map(f => files.push(f) - 1);
    const size = sizes.find(z => z.key === l.size);
    return {
      ...(serialMode ? { serials: l.serials } : { qty: Number(l.qty) }),
      parameter: l.parameter === OTHER ? '' : l.parameter,
      other: l.parameter === OTHER,
      otherText: l.parameter === OTHER ? l.otherText.trim() : '',
      remark: l.remark.trim(),
      severity: l.severity,
      ...(size ? { size: size.values } : {}),
      photoIndexes,
    };
  });
  return { rejectLines, files };
}

// The decision as multipart: the JSON under "payload", every line's photos under "photos".
export function breakdownBody(payload, lines, opts) {
  const { rejectLines, files } = breakdownPayload(lines, opts);
  const fd = new FormData();
  fd.append('payload', JSON.stringify({ ...payload, rejectLines }));
  files.forEach(f => fd.append('photos', f));
  return fd;
}

export default function RejectBreakdownEditor({
  lines, onChange, checks = [], inQc, unit = '', isPurchase = false,
  serialPieces = null, sizes = [], formatSize = (v) => JSON.stringify(v), onError,
}) {
  const serialMode = Array.isArray(serialPieces) && serialPieces.length > 0;
  const multiSize = sizes.length > 1;
  const set = (key, patch) => onChange(lines.map(l => (l.key === key ? { ...l, ...patch } : l)));
  const takenElsewhere = (key) => new Set(lines.filter(l => l.key !== key).flatMap(l => l.serials || []));
  const { total } = breakdownState(lines, { inQc, serialMode });
  const over = total > inQc + 1e-9;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">What was rejected <span className="text-red-500">*</span></p>
        <p className={`text-xs font-medium ${over ? 'text-red-600' : 'text-slate-600'}`}>Rejecting {total} of {inQc} {unit} in QC</p>
      </div>
      <p className="text-xs text-slate-500">One line per fault — e.g. 2 for Rust, 1 for length. Each line goes to Purchase on its own, with its photos.</p>

      {lines.map((l, i) => {
        const taken = takenElsewhere(l.key);
        return (
          <div key={l.key} className="border border-red-100 bg-red-50/30 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 pt-2 w-5">{i + 1}.</span>
              {!serialMode && (
                <div className="w-24">
                  <label className="text-[11px] text-slate-500">Qty</label>
                  <Input className="h-8 text-sm" type="number" min={0} max={inQc} value={l.qty} onChange={e => set(l.key, { qty: e.target.value })} placeholder="0" />
                </div>
              )}
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11px] text-slate-500">What failed</label>
                <select className="h-8 w-full rounded-md border border-input bg-white px-2 text-sm" value={l.parameter} onChange={e => set(l.key, { parameter: e.target.value })}>
                  <option value="">Pick a check…</option>
                  {checks.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value={OTHER}>Other (type it)</option>
                </select>
                {l.parameter === OTHER && (
                  <Input className="h-8 text-sm mt-1" value={l.otherText} onChange={e => set(l.key, { otherText: e.target.value })} placeholder="What failed, e.g. wrong grade" />
                )}
              </div>
              {multiSize && (
                <div className="min-w-[150px]">
                  <label className="text-[11px] text-slate-500">Size</label>
                  <select className="h-8 w-full rounded-md border border-input bg-white px-2 text-xs" value={l.size} onChange={e => set(l.key, { size: e.target.value })}>
                    <option value="">Pick…</option>
                    {sizes.map(z => <option key={z.key} value={z.key}>{formatSize(z.values)} ({z.quantity})</option>)}
                  </select>
                </div>
              )}
              <button type="button" onClick={() => onChange(lines.filter(x => x.key !== l.key))} title="Remove this line"
                className="pt-6 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>

            {serialMode && (
              <div>
                <label className="text-[11px] text-slate-500">Which pieces (serial numbers)</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {serialPieces.map(u => {
                    const on = (l.serials || []).includes(u._id);
                    const elsewhere = taken.has(u._id);
                    return (
                      <label key={u._id} className={`px-2 py-0.5 rounded border text-xs font-mono cursor-pointer ${on ? 'border-red-300 bg-red-100 text-red-800' : elsewhere ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="checkbox" className="hidden" disabled={elsewhere} checked={on}
                          onChange={() => set(l.key, { serials: on ? l.serials.filter(s => s !== u._id) : [...(l.serials || []), u._id] })} />
                        {u.serialNumber}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] text-slate-500">What was wrong *</label>
              <Input className="h-8 text-sm" value={l.remark} onChange={e => set(l.key, { remark: e.target.value })} placeholder="e.g. rust patches on the outer wall / shorter by 20 mm" />
            </div>

            {isPurchase && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Severity</span>
                <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                  {SEVERITIES.map(([s, hint]) => (
                    <button key={s} type="button" title={hint} onClick={() => set(l.key, { severity: s })}
                      className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium ${l.severity === s ? (s === 'Critical' ? 'bg-red-600 text-white' : s === 'Major' ? 'bg-amber-500 text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <RejectionPhotoPicker files={l.files} onChange={files => set(l.key, { files })} required={false} onError={onError} />
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, newRejectLine()])}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add a line
      </Button>
    </div>
  );
}
