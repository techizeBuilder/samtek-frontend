import React from 'react';
import { CheckCircle2, Clock, XCircle, FileText, MinusCircle } from 'lucide-react';

// The three BOM tiers the Approval page spans (same tab pattern BOM
// Management uses). `kind` is Item.productKind.
export const APPROVAL_TABS = [
  { kind: 'SubChildPart', label: 'Sub Child Part' },
  { kind: 'ChildPart', label: 'Child Part' },
  { kind: 'Machine', label: 'Machine' },
];

export const KIND_LABEL = { SubChildPart: 'Sub Child Part', ChildPart: 'Child Part', Machine: 'Machine' };

export const designStatusConfig = {
  Draft: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText, desc: 'Design created, not yet sent for testing' },
  Testing: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, desc: 'Under testing — pending R&D approval' },
  Approved: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, desc: 'Design approved' },
  Rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, desc: 'Rejected — redesign required' },
};

const TONES = {
  good: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-100 text-amber-700 border-amber-200',
  bad: 'bg-red-100 text-red-700 border-red-200',
  idle: 'bg-slate-100 text-slate-600 border-slate-200',
  na: 'bg-slate-50 text-slate-400 border-slate-100',
};

// One small labelled status pill ("Design · Approved"). `tone` picks colour.
export function StageChip({ label, value, tone = 'idle', title }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${TONES[tone]}`}>
      <span className="opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export const designTone = (s) => (s === 'Approved' ? 'good' : s === 'Rejected' ? 'bad' : s === 'Testing' ? 'warn' : 'idle');
export const prototypeTone = (s) => (s === 'Passed' ? 'good' : s === 'Failed' ? 'bad' : s === 'In Progress' ? 'warn' : 'idle');

// The full chip row for one item row/dialog header. A Purchase Machine skips
// Design / BOM / Prototype entirely, so those chips are shown as "n/a".
export function StageChips({ item }) {
  const purchase = item.purchaseMachine;
  const na = <MinusCircle className="h-3 w-3" />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {purchase ? (
        <StageChip label="Design" value={na} tone="na" title="Purchase Machine — no Design stage" />
      ) : (
        <StageChip label="Design" value={item.designStatus} tone={designTone(item.designStatus)} />
      )}
      {purchase ? (
        <StageChip label="BOM" value={na} tone="na" title="Purchase Machine — no BOM stage" />
      ) : (
        <StageChip label="BOM" value={item.bomApproved ? 'Approved' : 'Pending'} tone={item.bomApproved ? 'good' : 'idle'} />
      )}
      <StageChip label="QC List" value={item.qcListApproved ? 'Approved' : 'Pending'} tone={item.qcListApproved ? 'good' : 'idle'} />
      {item.productKind === 'Machine' && (
        purchase ? (
          <StageChip label="Prototype" value={na} tone="na" title="Purchase Machine — no Prototype stage" />
        ) : (
          <StageChip label="Prototype" value={item.prototypeStatus === 'None' ? 'Not started' : item.prototypeStatus} tone={prototypeTone(item.prototypeStatus)} />
        )
      )}
      <StageChip label="Release" value={item.releaseStatus} tone={item.releaseStatus === 'Released' ? 'good' : 'idle'} />
    </div>
  );
}

// "Approve these first" — the parts that block approving/releasing a parent.
export function BlockersPanel({ blockers, title = 'Approve these first' }) {
  if (!blockers || blockers.length === 0) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-red-700 mb-1.5">{title}</p>
      <ul className="space-y-1">
        {blockers.map((b, i) => (
          <li key={`${b._id}-${i}`} className="text-xs text-red-800 flex flex-wrap items-center gap-1.5">
            <span className="font-mono font-semibold">{b.code}</span>
            <span>{b.name}</span>
            <span className="text-[10px] bg-white/70 border border-red-200 rounded px-1.5 py-0.5">{KIND_LABEL[b.productKind] || b.productKind}</span>
            <span className="text-red-600">— {b.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
