import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Info, ArrowLeft, UserCheck } from 'lucide-react';

// Purchaser score (2026-10-13) — the client blueprint's purchaser performance
// score (§13): process quality, not just buying cheap. Worked out on the
// server (services/purchaserScoreService.js), all automatic. The Company
// Admin sees everyone (PurchaserScoreList); a purchaser sees their own
// (PurchaserScoreDetail userId="me"). Full logic:
// server/docs/procurement-v2/purchaser-score-logic-2026-10.md.
export const P_PARTS = [
  ['coverage', 'RFQ coverage'], ['completeness', 'Quotation completeness'], ['savings', 'Savings / landed cost'],
  ['followUp', 'Delivery follow-up'], ['quality', 'Quality outcome'], ['documentation', 'Documentation'],
  ['poAccuracy', 'PO accuracy'], ['relationship', 'Relationship process'], ['policy', 'Policy compliance'],
];
const DEFAULT_WEIGHTS = { coverage: 15, completeness: 10, savings: 15, followUp: 15, quality: 15, documentation: 10, poAccuracy: 10, relationship: 5, policy: 5 };
const KEY = '/api/purchaser-scores';
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (k) => { const [y, m] = String(k || '').split('-').map(Number); return y ? new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''; };
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
const inr = (n) => (n == null ? '—' : `₹${Math.round(Number(n)).toLocaleString('en-IN')}`);
const pctText = (n) => (n == null ? '—' : `${Math.round(n)}%`);
const tone = (n) => (n == null ? 'slate' : n >= 80 ? 'emerald' : n >= 60 ? 'amber' : 'red');
const TONES = {
  emerald: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  amber: { pill: 'bg-amber-50 text-amber-800 border-amber-200', bar: 'bg-amber-500' },
  red: { pill: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500' },
  slate: { pill: 'bg-slate-50 text-slate-500 border-slate-200', bar: 'bg-slate-300' },
};

function Pill({ score, label }) {
  const t = TONES[tone(score)];
  return (
    <span className={`inline-flex flex-col items-center border rounded-lg px-2.5 py-1 ${t.pill}`}>
      <span className="text-lg font-bold tabular-nums leading-tight">{score == null ? '—' : score}<span className="text-[10px] font-medium opacity-70">/100</span></span>
      {label && <span className="text-[10px] font-medium opacity-80">{label}</span>}
    </span>
  );
}

function Bars({ parts, weights }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-9 gap-x-3 gap-y-1.5">
      {P_PARTS.map(([k, label]) => {
        const p = parts?.[k]?.pct;
        return (
          <div key={k} className="min-w-0" title={`${label} (weight ${weights?.[k] ?? '—'}) · ${parts?.[k]?.events || 0} event(s)`}>
            <div className="flex justify-between text-[10px] text-slate-500 gap-1">
              <span className="truncate">{label}</span>
              <span className="tabular-nums font-semibold text-slate-600">{pctText(p)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${TONES[tone(p)].bar}`} style={{ width: `${p == null ? 0 : Math.max(2, p)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthPicker({ value, onChange }) {
  return <Input type="month" className="w-40 h-9" value={value} max={thisMonth()} onChange={(e) => onChange(e.target.value || thisMonth())} />;
}

// ── The explanation, English / Hinglish ──────────────────────────────────────
const HOW = {
  en: {
    title: 'How the purchaser score is worked out',
    intro: 'Out of 100 — how well the purchase process was followed, worked out automatically from the records (nothing typed in). Buying cheap is only one part: quality and follow-up count as much.',
    parts: {
      coverage: 'each PO: enough vendors asked for every item (asked ÷ needed).',
      completeness: 'each manual quotation: evidence, GST, delivery days and payment terms filled (25 each); an email request the vendor answered = 100.',
      savings: 'each PO: the cheapest full landed quote ÷ the one chosen (choosing the cheapest = 100).',
      followUp: 'each missed due date: days until a new date was recorded or the goods came — within 2 days = 100, −20 a day after, still overdue keeps losing.',
      quality: 'QC results on their POs — the share accepted, rejections by severity (Minor 1×, Major 1.5×, Critical 2×).',
      documentation: 'each PO: actually emailed to the vendor (50) + its lines backed by a quote with evidence (50).',
      poAccuracy: 'each PO: 0 if the Company Admin rejected it or it was cancelled as "Ordered by mistake" / "Need no longer exists"; vendor-side cancels don\'t count against.',
      relationship: 'each QC rejection: days to record the vendor\'s answer — within 3 days = 100, 0 at 15.',
      policy: 'each PO: a vendor selection exception (urgent, sole vendor…) = 50, none = 100.',
    },
    outro: 'Month = events in that month; 12 months = recent counting more. A part with no events is left out and the rest are scaled up. Fewer than 3 POs = Limited history. Weights: Company Admin → Settings.',
    toggle: 'Hinglish',
  },
  hi: {
    title: 'Purchaser score kaise banta hai',
    intro: '100 mein se — purchase ka process kitna theek follow hua, records se apne aap banta hai (kuch type nahi hota). Sasta khareedna sirf ek hissa hai: quality aur follow-up utne hi zaroori hain.',
    parts: {
      coverage: 'har PO: har item ke liye kaafi vendors se poocha gaya ya nahi (poocha ÷ chahiye).',
      completeness: 'har manual quotation: evidence, GST, delivery days aur payment terms bhare (25-25); vendor ne email request ka jawab diya = 100.',
      savings: 'har PO: sabse sasta poora landed quote ÷ jo chuna (sabse sasta chuna = 100).',
      followUp: 'har chhooti hui due date: nayi date record karne ya maal aane tak kitne din — 2 din ke andar = 100, uske baad har din −20, abhi bhi overdue to number girta rehta hai.',
      quality: 'unke PO par QC results — kitna accept hua, reject severity ke hisaab se (Minor 1×, Major 1.5×, Critical 2×).',
      documentation: 'har PO: vendor ko sach mein email hua (50) + uski lines evidence wale quote se (50).',
      poAccuracy: 'har PO: 0 agar Company Admin ne reject kiya ya "Ordered by mistake" / "Need no longer exists" se cancel hua; vendor ki taraf ka cancel unke khilaaf nahi ginta.',
      relationship: 'har QC rejection: vendor ka jawab record karne mein kitne din — 3 din ke andar = 100, 15 din par 0.',
      policy: 'har PO: vendor selection exception (urgent, akela vendor…) = 50, nahi = 100.',
    },
    outro: 'Month = us mahine ke events; 12 months = naye events zyada gine jaate hain. Jis part mein event nahi woh chhod diya jaata hai aur baaki scale hote hain. 3 se kam PO = Limited history. Weights: Company Admin → Settings.',
    toggle: 'English',
  },
};

export function HowPurchaserScoreWorks({ weights }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('purchaserScoreHowLang') || 'en'; } catch { return 'en'; } });
  const t = HOW[lang] || HOW.en;
  const w = weights || DEFAULT_WEIGHTS;
  const switchLang = () => {
    const next = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    try { localStorage.setItem('purchaserScoreHowLang', next); } catch { /* fine */ }
  };
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <button type="button" className="flex-1 flex items-center gap-1.5 text-xs font-semibold text-blue-800 text-left" onClick={() => setOpen(o => !o)}>
          <Info className="w-3.5 h-3.5" /> {t.title}
        </button>
        {open && <button type="button" onClick={switchLang} className="text-[11px] font-semibold text-blue-700 border border-blue-300 bg-white rounded-md px-2 py-0.5 hover:bg-blue-100">{t.toggle}</button>}
        <button type="button" onClick={() => setOpen(o => !o)} aria-label="Show or hide">
          {open ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 text-xs text-blue-900 space-y-1.5">
          <p>{t.intro}</p>
          <ul className="list-disc list-inside space-y-1">
            {P_PARTS.map(([k, label]) => <li key={k}><strong>{label} ({w[k]}):</strong> {t.parts[k]}</li>)}
          </ul>
          <p>{t.outro}</p>
        </div>
      )}
    </div>
  );
}

// ── Evidence ─────────────────────────────────────────────────────────────────
function Table({ title, part, weight, head, rows, empty }) {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
        <p className="text-xs font-semibold text-slate-700">{title} <span className="font-normal text-slate-400">· weight {weight}</span></p>
        <span className="text-xs font-bold tabular-nums text-slate-700">{pctText(part?.pct)}</span>
      </div>
      {rows.length === 0 ? <p className="px-3 py-2 text-xs text-slate-400 italic">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[10px] uppercase text-slate-400">{head.map((h, i) => <th key={i} className="text-left font-semibold px-3 py-1">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-1 text-slate-600 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Evidence({ evidence, parts, weights, inScope }) {
  const e = Object.fromEntries(P_PARTS.map(([k]) => [k, (evidence?.[k] || []).filter(x => inScope(x.date))]));
  const s = (n) => <span className="font-semibold tabular-nums">{Math.round(n)}</span>;
  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <Table title="RFQ coverage" part={parts.coverage} weight={weights.coverage} empty="No POs made from quotes." head={['PO date', 'PO', 'Vendors asked per item', 'Score']}
        rows={e.coverage.map(x => [day(x.date), x.poNumber, x.items, s(x.score)])} />
      <Table title="Quotation completeness" part={parts.completeness} weight={weights.completeness} empty="No manual quotations or answered requests." head={['Date', 'Quote', 'Vendor', 'Missing', 'Score']}
        rows={e.completeness.map(x => [day(x.date), `${x.number} (${x.kind === 'Manual quotation' ? 'manual' : 'email'})`, x.vendor, x.missing || '—', s(x.score)])} />
      <Table title="Savings / landed cost" part={parts.savings} weight={weights.savings} empty="No PO with competing full quotes." head={['PO date', 'PO', 'Vendor', 'Chosen', 'Cheapest', 'Score']}
        rows={e.savings.map(x => [day(x.date), x.poNumber, x.vendor, inr(x.chosen), inr(x.cheapest), s(x.score)])} />
      <Table title="Delivery follow-up" part={parts.followUp} weight={weights.followUp} empty="No due date was missed." head={['Due', 'PO', 'Item', 'What happened', 'Days', 'Score']}
        rows={e.followUp.map(x => [day(x.due), x.poNumber, x.item, `${x.action}${x.actionAt ? ` ${day(x.actionAt)}` : ''}`, x.late, s(x.score)])} />
      <Table title="Quality outcome" part={parts.quality} weight={weights.quality} empty="No QC results yet." head={['QC', 'PO', 'Item', 'Accepted', 'Rejected', 'Score']}
        rows={e.quality.map(x => [day(x.date), x.poNumber, x.item, x.accepted, x.rejected, s(x.score)])} />
      <Table title="Documentation" part={parts.documentation} weight={weights.documentation} empty="No POs." head={['PO date', 'PO', 'Emailed', 'Lines with evidence', 'Score']}
        rows={e.documentation.map(x => [day(x.date), x.poNumber, x.emailed ? 'Yes' : 'No', x.backed, s(x.score)])} />
      <Table title="PO accuracy" part={parts.poAccuracy} weight={weights.poAccuracy} empty="No POs." head={['PO date', 'PO', 'Result', 'Score']}
        rows={e.poAccuracy.map(x => [day(x.date), x.poNumber, x.why, s(x.score)])} />
      <Table title="Relationship process" part={parts.relationship} weight={weights.relationship} empty="No QC rejections to answer." head={['Rejected', 'PO', 'Rejection', 'Answered', 'Score']}
        rows={e.relationship.map(x => [day(x.date), x.poNumber, `${x.number} · ${x.item}`, x.answeredAt ? `${day(x.answeredAt)} (${x.outcome})` : 'Not yet', s(x.score)])} />
      <Table title="Policy compliance" part={parts.policy} weight={weights.policy} empty="No POs with a selection check." head={['PO date', 'PO', 'Exception', 'Score']}
        rows={e.policy.map(x => [day(x.date), x.poNumber, x.why, s(x.score)])} />
    </div>
  );
}

// ── One purchaser ────────────────────────────────────────────────────────────
export function PurchaserScoreDetail({ userId = 'me', onBack, initialMonth }) {
  const [month, setMonth] = useState(initialMonth || thisMonth());
  const [scope, setScope] = useState('month'); // month | rolling
  const { data, isLoading } = useQuery({ queryKey: [KEY, userId, month], queryFn: () => apiRequest('GET', `${KEY}/${userId}?month=${month}`) });
  const s = data?.score;
  const weights = data?.weights || DEFAULT_WEIGHTS;
  const view = s ? (scope === 'month' ? s.month : s.rolling) : null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1); const end = new Date(y, m, 1);
  const yearAgo = Date.now() - 365 * 86400000;
  const inScope = (d) => { const t = new Date(d).getTime(); return scope === 'month' ? t >= start.getTime() && t < end.getTime() : t >= yearAgo; };
  const maxTrend = 100;

  return (
    <div className="space-y-3">
      {onBack && <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> All purchasers</button>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-2 rounded-lg"><UserCheck className="w-4 h-4 text-indigo-600" /></div>
          <div>
            <p className="font-semibold text-slate-800">{data?.name || '…'}</p>
            <p className="text-xs text-slate-400">{data?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} />
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {[['month', monthLabel(month)], ['rolling', 'Last 12 months']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setScope(v)} className={`text-xs px-2.5 py-1 rounded-md font-medium ${scope === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <HowPurchaserScoreWorks weights={weights} />

      {isLoading ? <p className="text-sm text-slate-400 py-6 text-center">Loading…</p> : !s ? (
        <p className="text-sm text-slate-400 italic py-6 text-center">No purchase records yet.</p>
      ) : (
        <>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-4">
                <Pill score={s.month.score} label={monthLabel(month)} />
                <Pill score={s.rolling.score} label="12 months" />
                {view?.limitedHistory && <span className="text-[11px] border rounded-full px-2 py-0.5 bg-slate-50 text-slate-500 border-slate-200">Limited history ({view.pos} PO{view.pos === 1 ? '' : 's'})</span>}
                <div className="ml-auto flex items-end gap-1.5 h-14" title="Last 6 months">
                  {(s.trend || []).map(t => (
                    <div key={t.month} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] tabular-nums text-slate-500">{t.score ?? '—'}</span>
                      <div className="w-5 bg-slate-100 rounded-sm h-8 flex items-end overflow-hidden">
                        <div className={`w-full ${TONES[tone(t.score)].bar}`} style={{ height: `${t.score == null ? 0 : Math.max(4, (t.score / maxTrend) * 100)}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-400">{monthLabel(t.month).split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Bars parts={view.parts} weights={weights} />
            </CardContent>
          </Card>
          <Evidence evidence={s.evidence} parts={view.parts} weights={weights} inScope={inScope} />
        </>
      )}
    </div>
  );
}

// ── Everyone (Company Admin) ─────────────────────────────────────────────────
export function PurchaserScoreList() {
  const [month, setMonth] = useState(thisMonth());
  const [open, setOpen] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: [KEY, 'list', month], queryFn: () => apiRequest('GET', `${KEY}?month=${month}`) });
  const rows = data?.rows || [];
  const weights = data?.weights || DEFAULT_WEIGHTS;
  if (open) return <PurchaserScoreDetail userId={open} initialMonth={month} onBack={() => setOpen(null)} />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">Everyone who created POs or quotations — how well they followed the purchase process (blueprint §13). Click a purchaser for every event behind their score.</p>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      <HowPurchaserScoreWorks weights={weights} />
      {isLoading ? <p className="text-sm text-slate-400 py-10 text-center">Loading…</p> : rows.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-10 text-center">No purchase records yet.</p>
      ) : rows.map(r => (
        <Card key={r.userId} className="border-0 shadow-sm cursor-pointer hover:shadow" onClick={() => setOpen(r.userId)}>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">{r.role}{r.month.limitedHistory ? ' · Limited history' : ''} · {r.month.pos} PO{r.month.pos === 1 ? '' : 's'} in {monthLabel(month)}</p>
              </div>
              <div className="flex items-end gap-2">
                <Pill score={r.month.score} label={monthLabel(month)} />
                <Pill score={r.rolling.score} label="12 months" />
              </div>
            </div>
            <Bars parts={r.month.parts} weights={weights} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
