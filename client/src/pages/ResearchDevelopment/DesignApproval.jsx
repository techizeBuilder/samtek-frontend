import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, ArrowRight, Search, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { APPROVAL_TABS, KIND_LABEL, StageChips, BlockersPanel } from './approval/approvalShared';
import ApprovalManageDialog from './approval/ApprovalManageDialog';

// The one consolidated R&D Approval page (docs/product-approval-gate-
// redesign-discussion-2026-09.md): Design + BOM + QC List + Prototype +
// Release, across all three BOM tiers via a tab switch (same pattern BOM
// Management uses). It replaced the old Machine-only Design Approval,
// Prototype Management and Approve Requests pages.
const PAGE_SIZE = 20;

// Page numbers to show: always first/last, a window around the current page,
// with null marking a gap (rendered as an ellipsis).
function pageWindow(current, total) {
  const nums = new Set([1, total, current - 1, current, current + 1].filter(n => n >= 1 && n <= total));
  const sorted = [...nums].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => { if (i > 0 && n - sorted[i - 1] > 1) out.push(null); out.push(n); });
  return out;
}

export default function DesignApproval() {
  const [kind, setKind] = useState('Machine');
  const [searchInput, setSearchInput] = useState('');
  // One request per pause in typing, not one per keystroke.
  const search = useDebouncedValue(searchInput.trim(), 400);
  const [page, setPage] = useState(1);
  const [managingId, setManagingId] = useState(null);

  useEffect(() => { setPage(1); }, [kind, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['approval-items', kind, search, page],
    queryFn: () => {
      const params = new URLSearchParams({ kind, page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/rd/approval/items?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
  const rows = data?.rows || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-blue-600" /> Approval
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">R&D's gate before anything is sold or built automatically — Design, BOM, QC List and Release at every level</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {['Design', 'BOM', 'QC List', 'Prototype (Machines)', 'Release'].map((step, i, arr) => (
            <React.Fragment key={step}>
              <div className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-slate-50 border-slate-200 text-slate-700">{step}</div>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          A parent can't be approved until the parts underneath it are. Machines marked <strong>Purchase Machine</strong> in Product Master only need their QC List approved.
          An unreleased part's automatic orders don't run, and an unreleased Machine isn't sellable.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {APPROVAL_TABS.map(t => (
          <button key={t.kind} onClick={() => setKind(t.kind)} className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${kind === t.kind ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder={`Search ${KIND_LABEL[kind]}s...`} className="pl-9" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
      </div>

      {isLoading ? (
        <Card className="border-none shadow-sm"><CardContent className="py-16 text-center text-slate-400">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card className="border-none shadow-sm"><CardContent className="py-16 text-center text-slate-400">No {KIND_LABEL[kind]}s found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const blocked = !r.releaseReadiness?.ready && r.releaseReadiness?.blockers?.filter(b => b._id !== r._id);
            return (
              <Card key={r._id} className="border-none shadow-sm hover:shadow-md transition-all bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-mono text-xs text-blue-600 font-semibold">{r.code}</p>
                      <h3 className="font-semibold text-slate-900 leading-tight">{r.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{r.category}{r.purchaseMachine ? ' · Purchase Machine' : ''}</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setManagingId(r._id)}>
                      <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Manage
                    </Button>
                  </div>
                  <StageChips item={r} />
                  {blocked && blocked.length > 0 && <BlockersPanel title="Waiting on parts underneath" blockers={blocked.slice(0, 5)} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          {pages > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageWindow(page, pages).map((n, i) => n === null ? (
                <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
              ) : (
                <Button key={n} size="sm" variant={n === page ? 'default' : 'outline'} className={`h-8 min-w-8 px-2 ${n === page ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`} onClick={() => setPage(n)}>
                  {n}
                </Button>
              ))}
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <ApprovalManageDialog itemId={managingId} open={!!managingId} onClose={() => setManagingId(null)} />
    </div>
  );
}
