import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, RotateCw, ShoppingCart, Mail, Clock, FileWarning, Truck, PackageX, RefreshCw, UserCheck,
  ShieldCheck, Wallet, Store, AlertTriangle, Award, IndianRupee, TrendingDown, TrendingUp, PieChart, Percent, Siren, Users,
} from 'lucide-react';

// Purchase Dashboard (2026-10-13, blueprint §21) — three views, picked by the
// server from the role (user decision):
//   mine  — purchase employee (Account Employee): my work to do
//   head  — purchase head (Accounts Head): the team, money and vendors (+ "My work")
//   admin — Company Admin: approvals waiting + management numbers
// Every number is worked out live (services/purchaseDashboardService.js);
// full logic: server/docs/procurement-v2/purchase-dashboard-design-2026-10.md.
// Tiles link to where you act: other pages via the URL, the Company Admin's
// own tabs via `onOpenTab(group, tab)`.
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const monthShort = (k) => { const [y, m] = String(k).split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' }); };
const TONE = {
  red: 'border-red-200 bg-red-50',
  amber: 'border-amber-200 bg-amber-50',
  green: 'border-emerald-200 bg-emerald-50',
  plain: 'border-slate-200 bg-white',
};
const scoreTone = (s) => (s == null ? 'text-slate-400' : s >= 80 ? 'text-emerald-700' : s >= 60 ? 'text-amber-700' : 'text-red-700');
const PURCHASE = '/accounts/purchases/purchase-outsource';

function Tile({ icon: Icon, title, value, sub, tone = 'plain', onClick, children }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`text-left border rounded-xl p-3.5 flex flex-col gap-1 min-w-0 transition-shadow ${TONE[tone]} ${onClick ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {Icon && <Icon className="w-3.5 h-3.5" />} {title}
      </span>
      {value != null && <span className="text-2xl font-bold tabular-nums text-slate-900 leading-tight">{value}</span>}
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
      {children}
    </button>
  );
}

const Section = ({ title, children }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>
  </div>
);

// ── "Work to do" tiles — mine (one person) or the whole team ────────────────
function WorkTiles({ work, go, team }) {
  const w = work;
  const d = w.deliveries;
  return (
    <Section title={team ? 'Team work to do' : 'My work to do'}>
      <Tile icon={ShoppingCart} title="Items to buy" value={w.itemsToBuy} sub="RFQ/PO cards with requests (whole team)" onClick={() => go(`${PURCHASE}?tab=rfqPo`)} />
      <Tile icon={Mail} title={team ? 'Quote requests waiting' : 'My quote requests waiting'} value={w.quoteRequests.waiting}
        tone={w.quoteRequests.noReply ? 'amber' : 'plain'}
        sub={`${w.quoteRequests.noReply} with no reply after 3 days${w.quoteRequests.ranOut ? ` · ${w.quoteRequests.ranOut} link ran out` : ''}`} onClick={() => go(`${PURCHASE}?tab=rfqPo`)} />
      <Tile icon={Clock} title="Quotes expiring soon" value={w.quotesExpiring} tone={w.quotesExpiring ? 'amber' : 'plain'} sub="Order them or ask again — within 2 days" onClick={() => go(`${PURCHASE}?tab=rfqPo`)} />
      <Tile icon={FileWarning} title={team ? 'POs to look at' : 'My POs'} value={w.pos.pendingApproval + w.pos.rejectedRecent + w.pos.notEmailed}
        tone={w.pos.notEmailed || w.pos.rejectedRecent ? 'amber' : 'plain'}
        sub={`${w.pos.pendingApproval} waiting for approval · ${w.pos.rejectedRecent} rejected (30 d) · ${w.pos.notEmailed} not emailed`} onClick={() => go(`${PURCHASE}?tab=orders`)} />
      <Tile icon={Truck} title={team ? 'Deliveries' : 'My deliveries'} value={d.overdue} tone={d.overdue ? 'red' : d.today ? 'amber' : 'plain'}
        sub={`overdue · ${d.today} due today · ${d.soon} due in 3 days`} onClick={() => go(`${PURCHASE}?tab=orders`)} />
      <Tile icon={PackageX} title="QC rejections to settle" value={w.rejections.awaiting} tone={w.rejections.awaitingLong ? 'red' : w.rejections.awaiting ? 'amber' : 'plain'}
        sub={`${w.rejections.awaitingLong} waiting over 3 days for the vendor's answer`} onClick={() => go('/accounts/purchases/exchanges')} />
      <Tile icon={RefreshCw} title="Replacements expected" value={w.rejections.replacements} sub="Vendor will replace QC-rejected material" onClick={() => go('/accounts/purchases/exchanges')} />
    </Section>
  );
}

function ScoreTile({ s, onClick }) {
  if (!s) return <Tile icon={UserCheck} title="My score" value="—" sub="No purchase records yet" onClick={onClick} />;
  return (
    <Tile icon={UserCheck} title="My score" onClick={onClick}>
      <span className="flex items-baseline gap-3">
        <span className={`text-2xl font-bold tabular-nums ${scoreTone(s.month)}`}>{s.month ?? '—'}<span className="text-xs text-slate-400">/100 month</span></span>
        <span className={`text-sm font-semibold tabular-nums ${scoreTone(s.rolling)}`}>{s.rolling ?? '—'} <span className="text-[11px] font-normal text-slate-400">12 mo</span></span>
      </span>
      {s.weakest && <span className="text-xs text-slate-600">Weakest: {s.weakest.label} ({Math.round(s.weakest.pct)}%)</span>}
      {s.limitedHistory && <span className="text-[11px] text-slate-400">Limited history</span>}
    </Tile>
  );
}

function ScoreList({ rows }) {
  if (!rows?.length) return <p className="text-xs text-slate-400 italic">No purchase records yet.</p>;
  return (
    <div className="border rounded-xl bg-white divide-y">
      {rows.map(r => (
        <div key={r.userId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <span className="min-w-0"><span className="font-medium text-slate-800">{r.name}</span> <span className="text-xs text-slate-400">{r.role}</span></span>
          <span className="flex items-center gap-3 shrink-0">
            {r.weakest && <span className="text-[11px] text-slate-500 hidden sm:inline">weakest: {r.weakest.label}</span>}
            <span className={`font-bold tabular-nums ${scoreTone(r.month)}`}>{r.month ?? '—'}</span>
            <span className={`text-xs tabular-nums ${scoreTone(r.rolling)}`}>{r.rolling ?? '—'} <span className="text-slate-400">12 mo</span></span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MoneyTiles({ money, go }) {
  return (
    <>
      <Tile icon={Wallet} title="Payments" value={inr(money.advanceDue + money.payableNow)} tone={money.overdue ? 'red' : 'plain'}
        sub={`${inr(money.advanceDue)} advances due · ${inr(money.payableNow)} payable now${money.overdue ? ` · ${inr(money.overdue)} overdue (${money.overdueBills})` : ''}`}
        onClick={() => go('/accounts/purchases/payments')} />
      <Tile icon={IndianRupee} title="Refunds due from vendors" value={inr(money.refundsDue)} sub={`${money.refundsCount} refund${money.refundsCount === 1 ? '' : 's'} to collect`} onClick={() => go('/accounts/purchases/payments')} />
    </>
  );
}

function VendorTile({ vendors, onClick }) {
  return (
    <Tile icon={Award} title="Vendors to watch" value={vendors.watchlist.length} tone={vendors.watchlist.length ? 'red' : 'plain'}
      sub={`on the Watchlist · ${vendors.probationary} probationary · ${vendors.highRisk} high risk · ${vendors.suspended} suspended / blacklisted`} onClick={onClick}>
      {vendors.lowest.length > 0 && (
        <span className="text-[11px] text-slate-500">Lowest: {vendors.lowest.map(v => `${v.name} ${v.score}${v.limitedHistory ? '*' : ''}`).join(' · ')}</span>
      )}
    </Tile>
  );
}

// ── Views ────────────────────────────────────────────────────────────────────
function MineView({ data, go }) {
  return (
    <div className="space-y-5">
      <WorkTiles work={data.work} go={go} />
      <Section title="How I'm doing">
        <ScoreTile s={data.myScore} onClick={() => go(`${PURCHASE}?tab=myScore`)} />
      </Section>
    </div>
  );
}

function HeadView({ data, go }) {
  return (
    <div className="space-y-5">
      <Section title="Waiting on others">
        <Tile icon={ShieldCheck} title="Waiting for the Company Admin" value={data.approvals.poPending + data.approvals.cancelRequests}
          sub={`${data.approvals.poPending} PO approval${data.approvals.poPending === 1 ? '' : 's'} · ${data.approvals.cancelRequests} cancellation request${data.approvals.cancelRequests === 1 ? '' : 's'}`} onClick={() => go(`${PURCHASE}?tab=orders`)} />
        <Tile icon={Store} title="Store & QC" value={data.store.awaitingQc} tone={data.store.overdue ? 'amber' : 'plain'}
          sub={`received, waiting for QC · ${data.store.dueToday} due today · ${data.store.overdue} overdue`} />
        <Tile icon={Percent} title="3-vendor compliance (this month)" value={data.compliance.pct == null ? '—' : `${data.compliance.pct}%`}
          tone={data.compliance.pct != null && data.compliance.pct < 80 ? 'amber' : 'plain'} sub={`${data.compliance.passed} of ${data.compliance.total} PO items had enough vendors asked`} />
        <Tile icon={AlertTriangle} title="Open warranty claims" value={data.claims.open} tone={data.claims.waitingLong ? 'amber' : 'plain'}
          sub={`${data.claims.waitingLong} waiting over 7 days`} onClick={() => go(`${PURCHASE}?tab=vendorRatings`)} />
      </Section>
      <WorkTiles work={data.work} go={go} team />
      <Section title="Money & vendors">
        <MoneyTiles money={data.money} go={go} />
        <VendorTile vendors={data.vendors} onClick={() => go(`${PURCHASE}?tab=vendorRatings`)} />
      </Section>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team scores</p>
        <ScoreList rows={data.team} />
      </div>
    </div>
  );
}

function AdminView({ data, openTab }) {
  const a = data.approvals;
  const pv = data.purchaseValue;
  const max = Math.max(1, ...pv.trend.map(t => t.value));
  const vr = Object.entries(a.vendorRequests || {}).map(([k, n]) => `${n} ${({ NewVendor: 'new vendor', DetailsChange: 'vendor change', Suspend: 'suspend', Blacklist: 'blacklist', Reinstate: 'reinstate' })[k] || k}`).join(' · ');
  const tab = (g, t) => (openTab ? () => openTab(g, t) : undefined);
  return (
    <div className="space-y-5">
      <Section title="Waiting for you">
        <Tile icon={ShieldCheck} title="PO approvals" value={a.poPending} tone={a.poPending ? 'amber' : 'plain'}
          sub={`${a.overLimit} over the ₹ limit · ${a.selection} vendor selection exception${a.charges ? ` · ${a.charges} charges above quotation` : ''}`} onClick={tab('orders', 'POApprovals')} />
        <Tile icon={FileWarning} title="Cancellation requests" value={a.cancelRequests} tone={a.cancelRequests ? 'amber' : 'plain'} onClick={tab('orders', 'POApprovals')} />
        <Tile icon={Users} title="Vendor requests" value={a.vendorRequestsTotal} tone={a.vendorRequestsTotal ? 'amber' : 'plain'} sub={vr || 'Nothing waiting'} onClick={tab('vendors', 'NewVendor')} />
        <Tile icon={Wallet} title="Payables" value={inr(data.money.owedNow)} tone={data.money.overdue ? 'red' : 'plain'}
          sub={`owed now · ${inr(data.money.overdue)} overdue · ${inr(data.money.refundsDue)} refunds due to us`} />
      </Section>
      <Section title="The period">
        <Tile icon={IndianRupee} title="Purchase value" value={inr(pv.total)} sub={`${pv.pos} PO${pv.pos === 1 ? '' : 's'}`}>
          <span className="flex items-end gap-1 h-12 mt-1">
            {pv.trend.map(t => (
              <span key={t.month} className="flex flex-col items-center gap-0.5 flex-1" title={`${monthShort(t.month)}: ${inr(t.value)}`}>
                <span className="w-full bg-slate-100 rounded-sm h-8 flex items-end overflow-hidden"><span className="w-full bg-indigo-500" style={{ height: `${t.value ? Math.max(4, (t.value / max) * 100) : 0}%` }} /></span>
                <span className="text-[9px] text-slate-400">{monthShort(t.month)}</span>
              </span>
            ))}
          </span>
        </Tile>
        <Tile icon={TrendingDown} title="Savings" value={inr(data.savings.saved)} tone={data.savings.paidAbove ? 'amber' : 'green'}
          sub={`vs the next-best quote on ${data.savings.savedPOs} PO${data.savings.savedPOs === 1 ? '' : 's'} · ${inr(data.savings.paidAbove)} paid above the cheapest on ${data.savings.paidAbovePOs}`} onClick={tab('orders', 'POApprovals')} />
        <Tile icon={TrendingUp} title="Price rises" value={data.priceRises.lines} tone={data.priceRises.lines ? 'amber' : 'plain'}
          sub={`lines above the vendor's last price · ${inr(data.priceRises.extra)} extra`}>
          {data.priceRises.examples.slice(0, 2).map((e, i) => <span key={i} className="text-[11px] text-slate-500 truncate">{e.item} · {e.vendor} +{e.change}%</span>)}
        </Tile>
        <Tile icon={PieChart} title="Top 3 vendors" value={data.concentration.topShare == null ? '—' : `${data.concentration.topShare}%`} sub="of purchase value">
          {data.concentration.vendors.map(v => <span key={v.vendorId} className="text-[11px] text-slate-500 truncate">{v.name} {v.share}%</span>)}
        </Tile>
        <Tile icon={Percent} title="3-vendor compliance" value={data.compliance.pct == null ? '—' : `${data.compliance.pct}%`}
          tone={data.compliance.pct != null && data.compliance.pct < 80 ? 'amber' : 'plain'} sub={`${data.compliance.passed} of ${data.compliance.total} PO items`} />
        <Tile icon={Siren} title="Exceptions / urgent" value={data.exceptions.withException} tone={data.exceptions.withException ? 'amber' : 'plain'}
          sub={data.exceptions.byReason.map(r => `${r.count} ${r.reason}`).join(' · ') || 'No vendor selection exceptions'} onClick={tab('orders', 'POApprovals')} />
        <VendorTile vendors={data.vendors} onClick={tab('vendors', 'Watchlist')} />
      </Section>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchaser scores</p>
        <ScoreList rows={data.scores} />
      </div>
    </div>
  );
}

export default function PurchaseDashboard({ onOpenTab }) {
  const [, setLocation] = useLocation();
  const [view, setView] = useState(null);        // null = the server's default for my role
  const [period, setPeriod] = useState('month');
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['/api/purchase-dashboard', view, period],
    queryFn: () => apiRequest('GET', `/api/purchase-dashboard?${new URLSearchParams({ ...(view ? { view } : {}), period })}`),
  });
  const d = data?.data;
  const views = data?.views || [];
  const go = (path) => setLocation(path);

  return (
    <div className={onOpenTab ? 'space-y-4' : 'p-6 bg-slate-50 min-h-screen space-y-4'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-2 rounded-lg"><LayoutDashboard className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <h1 className={onOpenTab ? 'text-lg font-bold text-slate-800' : 'text-2xl font-bold text-slate-900'}>Purchase Dashboard</h1>
            <p className="text-xs text-slate-500">{d?.view === 'admin' ? 'What needs you, and how purchasing is going' : d?.view === 'head' ? 'The team\'s work, money and vendors' : 'Your purchase work — click a tile to act on it'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {views.length > 1 && (
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {views.map(v => (
                <button key={v} type="button" onClick={() => setView(v)} className={`text-xs px-2.5 py-1 rounded-md font-medium ${(view || views[0]) === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                  {v === 'head' ? 'Team' : 'My work'}
                </button>
              ))}
            </div>
          )}
          {d?.view === 'admin' && (
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="border rounded-md px-2 h-8 text-sm bg-white">
              <option value="month">This month</option>
              <option value="3m">Last 3 months</option>
              <option value="12m">Last 12 months</option>
            </select>
          )}
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RotateCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</Button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-slate-400 py-16 text-center">Loading the dashboard…</p>
        : isError || !d ? <Card><CardContent className="p-6 text-sm text-red-600">The dashboard couldn't be loaded.</CardContent></Card>
          : d.view === 'admin' ? <AdminView data={d} openTab={onOpenTab} />
            : d.view === 'head' ? <HeadView data={d} go={go} />
              : <MineView data={d} go={go} />}
    </div>
  );
}
