import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, RotateCw, Award, Search, X, Info, AlertTriangle } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

// Vendor score (2026-10-13) — the client blueprint's weighted score (§11–§12),
// 0–100, worked out from what actually happened (services/vendorScoreService.js
// on the server): Price · Quality · Delivery · Credit terms · Warranty ·
// Response, last 12 months with recent events counting more. Replaces the old
// 1–5 star rating, which predated the blueprint.
const PARTS = [
  ['price', 'Price'], ['quality', 'Quality'], ['delivery', 'Delivery'],
  ['credit', 'Credit terms'], ['warranty', 'Warranty'], ['response', 'Response'],
];
const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');
const pctText = (n) => (n == null ? '—' : `${Math.round(n)}%`);
const toneOf = (n, below = 60) => (n == null ? 'slate' : n >= 80 ? 'emerald' : n >= below ? 'amber' : 'red');
const TONES = {
  emerald: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  amber: { pill: 'bg-amber-50 text-amber-800 border-amber-200', bar: 'bg-amber-500' },
  red: { pill: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500' },
  slate: { pill: 'bg-slate-50 text-slate-500 border-slate-200', bar: 'bg-slate-300' },
};
const STAGE_TONE = {
  Watchlist: 'bg-red-50 text-red-700 border-red-200',
  Probationary: 'bg-amber-50 text-amber-800 border-amber-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function ScorePill({ score, below, size = 'lg' }) {
  const t = TONES[toneOf(score, below)];
  return (
    <span className={`inline-flex items-baseline gap-0.5 border rounded-lg font-bold tabular-nums ${t.pill} ${size === 'lg' ? 'px-2.5 py-1 text-lg' : 'px-1.5 py-0.5 text-xs'}`}>
      {score == null ? '—' : score}<span className={`font-medium ${size === 'lg' ? 'text-xs' : 'text-[10px]'} opacity-70`}>/100</span>
    </span>
  );
}

function PartBars({ parts, weights, below }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1.5">
      {PARTS.map(([k, label]) => {
        const p = parts?.[k]?.pct;
        const t = TONES[toneOf(p, below)];
        return (
          <div key={k} className="min-w-0" title={`${label} (weight ${weights?.[k] ?? '—'}) · ${parts?.[k]?.events || 0} event(s) in 12 months`}>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className="truncate">{label} <span className="text-slate-300">{weights?.[k]}</span></span>
              <span className="tabular-nums font-semibold text-slate-600">{pctText(p)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${t.bar}`} style={{ width: `${p == null ? 0 : Math.max(2, p)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// One small table of the events behind a part. The score above uses every
// event; the table lists the newest ones (2026-10-19): `total` = how many
// there are, so a cut-off list says so, and `flags[i]` marks a row older than
// 12 months — it counts in the lifetime score only.
function EvidenceTable({ title, pct, weight, note, head, rows, flags = [], total = null, empty }) {
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5">
        <p className="text-xs font-semibold text-slate-700">{title} <span className="font-normal text-slate-400">· weight {weight}</span></p>
        <span className="text-xs font-bold tabular-nums text-slate-700">{pctText(pct)}</span>
      </div>
      {note && <p className="px-3 pt-1.5 text-[11px] text-slate-500">{note}</p>}
      {rows.length === 0 ? <p className="px-3 py-2 text-xs text-slate-400 italic">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-[10px] uppercase text-slate-400">{head.map((h, i) => <th key={i} className="text-left font-semibold px-3 py-1">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{rows.map((r, i) => (
              <tr key={i} className={flags[i] ? 'opacity-50' : ''} title={flags[i] ? 'Older than 12 months — counts in the lifetime score only' : undefined}>
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1 text-slate-600 whitespace-nowrap">
                    {c}{flags[i] && j === r.length - 1 && <span className="ml-1.5 text-[9px] uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1">lifetime only</span>}
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table>
          {total != null && total > rows.length && (
            <p className="px-3 py-1.5 text-[11px] text-slate-400 border-t">Showing the newest {rows.length} of {total} — the score above uses all {total}.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Evidence({ score, weights }) {
  const e = score?.evidence || {};
  const p = score?.parts || {};
  const t = score?.evidenceTotals || {};
  const s = (n) => <span className="font-semibold tabular-nums">{Math.round(n)}</span>;
  // Rows + which of them are older than 12 months (lifetime only).
  const lines = (list, fn) => ({ rows: (list || []).map(fn), flags: (list || []).map(x => !!x.lifetimeOnly) });
  const price = lines(e.price, x => [day(x.date), x.poNumber, x.item, `${inr(x.price)}${x.unit ? `/${x.unit}` : ''}`, `${inr(x.lowest)} ${x.lowestOwn ? '(theirs)' : `(${x.lowestKind})`}`, s(x.score)]);
  const quality = lines(e.quality, x => [day(x.date), x.poNumber, x.item, x.accepted, x.rejected.length ? x.rejected.map(r => `${r.qty} ${r.severity}${r.refused ? ' (refused)' : ''}`).join(', ') : '—', s(x.score)]);
  const delivery = lines(e.delivery, x => [day(x.received), x.poNumber, `${x.item}${x.kind === 'Replacement' ? ' (replacement)' : ''}`, x.kind === 'Before advance' ? 'Before the advance' : day(x.promised), x.kind === 'Before advance' ? 'Early' : x.daysLate ? `${x.daysLate} d` : 'On time', s(x.score)]);
  const credit = lines(e.credit, x => [day(x.date), x.poNumber, x.creditDays, `${x.advancePercent}%`, s(x.score)]);
  const wQuotes = lines(e.warrantyDuration, x => [day(x.date), `Quote · ${x.item}`, `${x.months} mo (best ${x.best})`, s(x.score)]);
  const wClaims = lines(e.claims, x => [day(x.date), `Claim ${x.number}`, `${x.outcome}${x.stars ? ` · ${x.stars}★` : ''}`, s(x.score)]);
  const response = lines(e.response, x => [day(x.sentAt), `${x.number} (${x.items} items)`, x.submittedAt ? day(x.submittedAt) : 'No reply', s(x.score)]);
  const warrantyTotal = t.warrantyDuration != null || t.claims != null ? (t.warrantyDuration || 0) + (t.claims || 0) : null;
  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <EvidenceTable title="Price" pct={p.price?.pct} weight={weights?.price}
        note="Each delivered price (before GST) against the lowest any vendor charged or quoted for that item. Lowest = 100."
        head={['Delivered', 'PO', 'Item', 'Price', 'Lowest', 'Score']} empty="No item another vendor also priced."
        {...price} total={t.price ?? null} />
      <EvidenceTable title="Quality" pct={p.quality?.pct} weight={weights?.quality}
        note="Share QC accepted. Rejected pieces count 1× Minor, 1.5× Major, 2× Critical — twice if the vendor refused to replace or refund."
        head={['QC', 'PO', 'Item', 'Accepted', 'Rejected', 'Score']} empty="No QC decisions yet."
        {...quality} total={t.quality ?? null} />
      <EvidenceTable title="Delivery" pct={p.delivery?.pct} weight={weights?.delivery}
        note="Against the date first promised (a replacement against the date given for it). −10 for each day late. Received before the advance was paid = early (100)."
        head={['Received', 'PO', 'Item', 'Promised', 'Late', 'Score']} empty="No deliveries yet."
        {...delivery} total={t.delivery ?? null} />
      <EvidenceTable title="Credit terms" pct={p.credit?.pct} weight={weights?.credit}
        note="Each PO: half for credit days (full at 30+), half for the advance (0% = full)."
        head={['Ordered', 'PO', 'Credit days', 'Advance', 'Score']} empty="No POs yet."
        {...credit} total={t.credit ?? null} />
      <EvidenceTable title="Warranty" pct={p.warranty?.pct} weight={weights?.warranty}
        note={`Two halves: warranty months quoted vs the best quoted for the item (${pctText(p.warranty?.duration)}), and warranty claims (${pctText(p.warranty?.claims)}) — our ★, resolved or not, response speed.`}
        head={['Date', 'What', 'Detail', 'Score']} empty="No warranty quoted and no claims."
        rows={[...wQuotes.rows, ...wClaims.rows]} flags={[...wQuotes.flags, ...wClaims.flags]} total={warrantyTotal} />
      <EvidenceTable title="Response" pct={p.response?.pct} weight={weights?.response}
        note="Quotation requests emailed: answered (70) and how fast (30 — within a day is full). No reply before the link ran out = 0."
        head={['Sent', 'Request', 'Answered', 'Score']} empty="No quotation requests yet."
        {...response} total={t.response ?? null} />
    </div>
  );
}

function VendorRow({ vendor, weights, below }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', `/api/suppliers/${vendor._id}/item-breakdown`);
      setData(res?.data || { score: null, items: [] });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (open && data === null) load(); /* eslint-disable-next-line */ }, [open]);

  const onTime = vendor.counts?.onTime;
  const qcPct = vendor.counts?.qc?.acceptedPct;
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <button type="button" className="w-full flex items-start justify-between gap-3 text-left" onClick={() => setOpen(o => !o)}>
          <div className="flex items-start gap-3 min-w-0">
            <div className="bg-amber-50 p-2 rounded-lg shrink-0"><Award className="h-4 w-4 text-amber-600" /></div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 flex flex-wrap items-center gap-1.5">
                {vendor.supplierName}
                {vendor.stage && <span className={`text-[10px] font-semibold border rounded-full px-1.5 py-0.5 ${STAGE_TONE[vendor.stage] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{vendor.stage}</span>}
                {vendor.limitedHistory && vendor.score != null && <span className="text-[10px] border rounded-full px-1.5 py-0.5 bg-slate-50 text-slate-500 border-slate-200">Limited history</span>}
              </p>
              <p className="text-xs text-slate-400">
                {vendor.itemCount} product{vendor.itemCount === 1 ? '' : 's'}
                {onTime?.total ? ` · on time ${onTime.on}/${onTime.total}` : ''}
                {qcPct != null ? ` · QC accepted ${qcPct}%` : ''}
                {vendor.lifetime != null ? ` · lifetime ${vendor.lifetime}` : ''}
              </p>
              {vendor.watchReason && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {vendor.watchReason}</p>}
              {vendor.claims?.count > 0 && (
                <p className="text-xs text-violet-700">
                  Warranty claims: {vendor.claims.count}{vendor.claims.open ? ` (${vendor.claims.open} open)` : ''}
                  {vendor.claims.avgSatisfaction != null ? ` · ${vendor.claims.avgSatisfaction}★ handling` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScorePill score={vendor.score} below={below} />
            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {vendor.score != null && <PartBars parts={vendor.parts} weights={weights} below={below} />}

        {open && (
          <div className="space-y-3 pt-1">
            {loading || !data ? <p className="text-sm text-slate-400">Loading...</p> : (
              <>
                {data.score ? <Evidence score={data.score} weights={weights} /> : <p className="text-sm text-slate-400 italic">No history yet.</p>}
                {(data.items || []).length > 0 && (
                  <div className="border rounded-md divide-y">
                    {/* "Bought before" — what we paid this vendor on DELIVERED purchases,
                        before GST, per purchase unit (quoteChecksService). */}
                    <div className="grid grid-cols-4 gap-2 px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase">
                      <span className="col-span-2">Item</span>
                      <span>Bought before: Avg / Last</span>
                      <span>Lowest bought</span>
                    </div>
                    {data.items.map(item => (
                      <div key={item.itemId} className="grid grid-cols-4 gap-2 px-3 py-2 text-sm items-center">
                        <span className="col-span-2 truncate">{item.itemName}</span>
                        <span className="text-slate-600">
                          {inr(item.avgPrice)} / {inr(item.lastPrice)}{item.priceUnit ? <span className="text-[11px] text-slate-400"> /{item.priceUnit}</span> : ''}
                          {item.deliveries > 0 && <span className="block text-[10px] text-slate-400">{item.deliveries} deliver{item.deliveries === 1 ? 'y' : 'ies'}</span>}
                        </span>
                        <span className="text-slate-600">{inr(item.lowestPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// The explanation panel, in English or Hinglish (Roman — the language of the
// daily reports). Full logic: server/docs/procurement-v2/vendor-score-logic-2026-10.md.
// Keep both in step with services/vendorScoreService.js.
const DEFAULT_WEIGHTS = { price: 25, quality: 30, delivery: 20, credit: 10, warranty: 10, response: 5 };
const HOW_TEXT = {
  en: {
    title: 'How the vendor score is worked out',
    intro: <>Out of 100, from what actually happened in the <strong>last 12 months</strong> — recent events count more (today in full, 6 months ago ¾, a year ago half). Nothing is typed in.</>,
    parts: {
      price: 'each delivered price (before GST, same unit) vs the lowest any vendor charged or quoted for that item within a year. Lowest = 100, twice the lowest = 50. Items no other vendor priced aren\'t counted.',
      quality: 'share of the delivery QC accepted. Rejected pieces count by severity — Minor 1×, Major 1.5×, Critical 2× — and twice more if the vendor refused to replace or refund. Only QC-decided deliveries count.',
      delivery: 'each delivery vs the date first promised (a changed date doesn\'t help); a replacement vs the date given for it. On time = 100, −10 per day late, 0 at 10+ days. Received before the advance was paid (no date promised yet) = early, 100.',
      credit: 'each PO\'s terms — half for credit days (full at 30+), half for the advance (0% = full).',
      warranty: 'half: warranty months quoted vs the most any vendor quoted for the item; half: warranty claims — our ★ (50%), resolved or not (25%), how fast they answered (25%). A claim refused while under warranty, or ignored 15+ days, = 0.',
      response: 'each emailed quotation request — answered (70) + how fast (30, full within a day, none after 7). No reply before the link ran out = 0.',
    },
    outro: (below) => <>A part with no data is <strong>left out</strong> (not counted as 0) and the rest are scaled up. With fewer than 5 deliveries / QC checks a vendor shows <strong>Limited history</strong> and isn't put on the Watchlist by its score. Below <strong>{below}</strong> the vendor goes on the Company Admin's Watchlist (also: refused to settle a rejection in the last 90 days). Worked out live; saved nightly for the trend. Weights and the Watchlist line are the Company Admin's (Settings).</>,
    toggle: 'Hinglish',
  },
  hi: {
    title: 'Vendor score kaise banta hai',
    intro: <>100 mein se, <strong>pichhle 12 mahine</strong> mein jo sach mein hua uske hisaab se — nayi cheezein zyada gini jaati hain (aaj ki poori, 6 mahine purani ¾, ek saal purani aadhi). Kuch bhi haath se type nahi hota.</>,
    parts: {
      price: 'har delivered price (GST se pehle, same unit) ko us item ke sabse kam price se milaya jaata hai jo kisi bhi vendor ne ek saal ke andar liya ya quote kiya. Sabse kam = 100, double price = 50. Jis item ka price kisi aur vendor ne nahi diya, woh nahi gina jaata.',
      quality: 'delivery ka kitna hissa QC ne accept kiya. Reject hue piece severity ke hisaab se gine jaate hain — Minor 1×, Major 1.5×, Critical 2× — aur agar vendor ne replace ya refund se mana kiya to do guna aur. Sirf woh delivery ginti hai jiska QC faisla ho chuka hai.',
      delivery: 'har delivery ko pehle diye gaye date se milaya jaata hai (date badalne se fayda nahi); replacement apne diye gaye date se. Time par = 100, har din late par −10, 10+ din late = 0. Advance milne se pehle hi maal aa gaya (tab tak koi date nahi di gayi thi) = jaldi delivery, 100.',
      credit: 'har PO ki terms — aadha credit days ka (30+ din = poore), aadha advance ka (0% = poore).',
      warranty: 'aadha: quote kiye warranty mahine vs us item ke liye kisi bhi vendor ka sabse zyada; aadha: warranty claims — hamare ★ (50%), resolve hua ya nahi (25%), kitni jaldi jawab diya (25%). Warranty mein hote hue claim mana kiya, ya 15+ din jawab nahi diya = 0.',
      response: 'har email kiya gaya quotation request — jawab diya (70) + kitni jaldi (30, ek din mein = poore, 7 din ke baad kuch nahi). Link khatam hone tak jawab nahi = 0.',
    },
    outro: (below) => <>Jis part ka data nahi hai woh <strong>chhod diya jaata hai</strong> (0 nahi gina jaata) aur baaki ko 100 tak scale kiya jaata hai. 5 se kam delivery / QC check par vendor <strong>Limited history</strong> dikhata hai aur score ki wajah se Watchlist par nahi jaata. <strong>{below}</strong> se neeche vendor Company Admin ki Watchlist par chala jaata hai (aur: pichhle 90 din mein reject maal replace/refund karne se mana kiya). Score har baar khulne par naya banta hai; trend ke liye roz raat save hota hai. Weights aur Watchlist line Company Admin set karta hai (Settings).</>,
    toggle: 'English',
  },
};

function HowScoreWorks({ weights, below }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('vendorScoreHowLang') || 'en'; } catch { return 'en'; } });
  const t = HOW_TEXT[lang] || HOW_TEXT.en;
  const w = weights || DEFAULT_WEIGHTS;
  const switchLang = (e) => {
    e.stopPropagation();
    const next = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    try { localStorage.setItem('vendorScoreHowLang', next); } catch { /* not saved — fine */ }
  };
  return (
    <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
      <div className="w-full flex items-center justify-between px-3 py-2 gap-2">
        <button type="button" className="flex-1 flex items-center gap-1.5 text-xs font-semibold text-blue-800 text-left" onClick={() => setOpen(o => !o)}>
          <Info className="w-3.5 h-3.5" /> {t.title}
        </button>
        {open && (
          <button type="button" onClick={switchLang} className="text-[11px] font-semibold text-blue-700 border border-blue-300 bg-white rounded-md px-2 py-0.5 hover:bg-blue-100">
            {t.toggle}
          </button>
        )}
        <button type="button" onClick={() => setOpen(o => !o)} aria-label="Show or hide">
          {open ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />}
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 text-xs text-blue-900 space-y-1.5">
          <p>{t.intro}</p>
          <ul className="list-disc list-inside space-y-1">
            {PARTS.map(([k, label]) => (
              <li key={k}><strong>{label} ({w[k]}):</strong> {t.parts[k]}</li>
            ))}
          </ul>
          <p>{t.outro(below)}</p>
        </div>
      )}
    </div>
  );
}

export default function VendorRatingsTab() {
  const [vendors, setVendors] = useState([]);
  const [weights, setWeights] = useState(null);
  const [below, setBelow] = useState(60);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [scoredOnly, setScoredOnly] = useState(false);
  const [sortBy, setSortBy] = useState('scoreDesc'); // scoreDesc | scoreAsc | name
  // A page at a time, searched / sorted on the server (2026-10-19) — it loaded
  // every vendor with every score part in one response.
  const searchText = useDebouncedValue(searchTerm.trim(), 400);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [totalVendors, setTotalVendors] = useState(0);
  useEffect(() => { setPage(1); }, [searchText, scoredOnly, sortBy]);

  const load = async (fresh = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', sort: sortBy, ...(searchText ? { search: searchText } : {}), ...(scoredOnly ? { scoredOnly: 'true' } : {}), ...(fresh ? { fresh: '1' } : {}) });
      const res = await apiRequest('GET', `/api/suppliers/vendor-ratings?${params}`);
      setVendors(res?.data || []);
      setWeights(res?.weights || null);
      if (res?.watchlistBelow != null) setBelow(res.watchlistBelow);
      setPagination(res?.pagination || { page: 1, pages: 1, total: (res?.data || []).length });
      setTotalVendors(res?.totalVendors ?? (res?.data || []).length);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [page, searchText, scoredOnly, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleVendors = vendors;
  const anyFilterActive = searchTerm || scoredOnly;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Each vendor's score out of 100, from deliveries, QC, prices, terms, warranty and quotation replies — expand a vendor to see every event behind it.</p>
        <Button size="sm" variant="outline" onClick={() => load(true)}><RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      <HowScoreWorks weights={weights} below={below} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by vendor name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-md p-2 text-sm bg-white">
          <option value="scoreDesc">Score: High to Low</option>
          <option value="scoreAsc">Score: Low to High</option>
          <option value="name">Name: A to Z</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={scoredOnly} onChange={e => setScoredOnly(e.target.checked)} /> Scored vendors only
        </label>
        {anyFilterActive && (
          <button type="button" onClick={() => { setSearchTerm(''); setScoredOnly(false); }} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
      </div>

      {loading && vendors.length === 0 ? (
        <p className="text-slate-400 py-10 text-center">Loading...</p>
      ) : totalVendors === 0 ? (
        <p className="text-slate-400 py-10 text-center">No vendors yet.</p>
      ) : visibleVendors.length === 0 ? (
        <p className="text-slate-400 py-10 text-center">No vendors match these filters.</p>
      ) : (
        visibleVendors.map(v => <VendorRow key={v._id} vendor={v} weights={weights} below={below} />)
      )}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 pt-1">
          <span>{pagination.total} vendor{pagination.total === 1 ? '' : 's'} · page {pagination.page} of {pagination.pages}</span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.pages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
          </span>
        </div>
      )}
    </div>
  );
}
