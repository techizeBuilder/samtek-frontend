import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { History, RefreshCw, X } from 'lucide-react';

// Purchase audit log (procurement-v2 gap 17, 2026-10-10) — read only.
// Every step in a PO's life: created / sent for approval, approved / rejected,
// emailed / email failed, cancel asked / cancelled / short closed / refused,
// lines received / fully received — who did it, when, from which IP. Rows are
// written by the server at the moment it happens and can't be changed.
// Seen by the Company Admin, and by Purchase users given the "Purchase Audit
// Log" permission (accounts.purchaseAuditLog).
const ACTION_TONE = {
  created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sent_for_approval: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  emailed: 'bg-blue-50 text-blue-700 border-blue-200',
  email_failed: 'bg-amber-50 text-amber-800 border-amber-200',
  cancel_requested: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  short_closed: 'bg-slate-100 text-slate-700 border-slate-300',
  cancel_refused: 'bg-slate-50 text-slate-600 border-slate-200',
  line_received: 'bg-teal-50 text-teal-700 border-teal-200',
  fully_received: 'bg-teal-100 text-teal-800 border-teal-300',
  date_revised: 'bg-sky-50 text-sky-700 border-sky-200',
  delivery_overdue: 'bg-red-50 text-red-700 border-red-200',
  advance_paid: 'bg-violet-50 text-violet-700 border-violet-200',
  payment_made: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  fully_accepted: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  qc_rejected: 'bg-red-50 text-red-700 border-red-200',
  rejection_recorded: 'bg-orange-50 text-orange-700 border-orange-200',
  refund_received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const LABELS = {
  created: 'Created', sent_for_approval: 'Sent for approval', approved: 'Approved', rejected: 'Rejected',
  emailed: 'Emailed to vendor', email_failed: 'Email failed', cancel_requested: 'Cancel asked', cancelled: 'Cancelled',
  short_closed: 'Short closed', cancel_refused: 'Cancel refused', line_received: 'Line received', fully_received: 'Fully received',
  date_revised: 'Date changed', delivery_overdue: 'Delivery overdue',
  advance_paid: 'Advance paid', payment_made: 'Payment made', fully_accepted: 'Fully accepted',
  qc_rejected: 'QC rejected', rejection_recorded: 'Vendor answer recorded', refund_received: 'Refund received',
};
const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export function useCanSeeAudit() {
  const { user } = useAuth();
  const { hasFeatureAccess } = usePermissions();
  return ['Company Admin', 'Super Admin', 'Superadmin'].includes(user?.role) || hasFeatureAccess('accounts', 'purchaseAuditLog', 'view');
}

export function ActionBadge({ action }) {
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${ACTION_TONE[action] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {LABELS[action] || action}
    </span>
  );
}

const byLine = (l) => (
  <span className="text-[11px] text-slate-500">
    {l.byName || 'System'}{l.byRole ? ` · ${l.byRole}` : ''}{l.ip ? ` · ${l.ip}` : ''}
  </span>
);

// One PO's history as a timeline, oldest first.
export function PoHistoryDialog({ open, onOpenChange, poId, poNumber, vendorName }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-audit', 'po', poId],
    queryFn: () => apiRequest('GET', `/api/purchase-audit?po=${poId}`),
    enabled: open && !!poId,
  });
  const logs = data?.logs || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4 text-indigo-600" /> History — {poNumber}</DialogTitle>
          <DialogDescription>{vendorName ? `${vendorName} · ` : ''}Every step of this PO, oldest first. Recorded by the system as it happened; it can't be edited.</DialogDescription>
        </DialogHeader>
        {isLoading ? <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
          : error ? <p className="text-sm text-red-600 py-6 text-center">{error.message}</p>
            : !logs.length ? <p className="text-sm text-slate-400 py-6 text-center">Nothing recorded for this PO yet. (POs made before 10 Oct 2026 have no history.)</p>
              : (
                <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                  {logs.map(l => (
                    <li key={l._id} className="ml-4">
                      <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionBadge action={l.action} />
                        <span className="text-[11px] text-slate-400 tabular-nums">{fmt(l.at)}</span>
                      </div>
                      <p className="text-sm text-slate-800 mt-0.5">{l.summary}</p>
                      {byLine(l)}
                    </li>
                  ))}
                </ol>
              )}
      </DialogContent>
    </Dialog>
  );
}

// The full log: filters + paginated table.
export function AuditLogTable() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState(null); // { poId, poNumber, vendorName }

  // The box updates as you type; the server is asked once typing pauses
  // (not once per key).
  const searchText = useDebouncedValue(search.trim(), 400);
  const params = new URLSearchParams({ page: String(page), limit: '25' });
  if (searchText) params.set('search', searchText);
  if (action) params.set('action', action);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['purchase-audit', 'list', params.toString()],
    queryFn: () => apiRequest('GET', `/api/purchase-audit?${params.toString()}`),
  });
  const logs = data?.logs || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };
  const anyFilter = search || action || from || to;
  const reset = (fn) => (v) => { fn(v); setPage(1); };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Every step of every purchase order — who did it, when, and from where. Recorded as it happens; nobody can edit or delete it.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-600 space-y-1 flex-1 min-w-[200px]">
          <span>Search</span>
          <Input id="audit-search" className="h-9 text-sm" value={search} onChange={e => reset(setSearch)(e.target.value)} placeholder="PO number, vendor or person" />
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>What happened</span>
          <select id="audit-action" value={action} onChange={e => reset(setAction)(e.target.value)} className="block border rounded-md px-2 h-9 text-sm bg-white">
            <option value="">Everything</option>
            {(data?.actions || Object.keys(LABELS).map(v => ({ value: v, label: LABELS[v] }))).map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>From</span>
          <Input id="audit-from" type="date" className="h-9 text-sm" value={from} onChange={e => reset(setFrom)(e.target.value)} />
        </label>
        <label className="text-xs text-slate-600 space-y-1">
          <span>To</span>
          <Input id="audit-to" type="date" className="h-9 text-sm" value={to} onChange={e => reset(setTo)(e.target.value)} />
        </label>
        {anyFilter && (
          <button type="button" className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 h-9" onClick={() => { setSearch(''); setAction(''); setFrom(''); setTo(''); setPage(1); }}>
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <Button size="sm" variant="outline" className="ml-auto h-9" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh</Button>
      </div>

      <div className="border rounded-lg bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-[11px] uppercase text-slate-400 text-left border-b">
              <th className="px-3 py-2 font-semibold">When</th>
              <th className="px-3 py-2 font-semibold">PO</th>
              <th className="px-3 py-2 font-semibold">What happened</th>
              <th className="px-3 py-2 font-semibold">Details</th>
              <th className="px-3 py-2 font-semibold">Who</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-red-600">{error.message}</td></tr>
            ) : !logs.length ? (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">{anyFilter ? 'Nothing matches these filters.' : 'Nothing recorded yet. Steps are recorded from 10 Oct 2026 on.'}</td></tr>
            ) : logs.map(l => (
              <tr key={l._id} className="align-top">
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap tabular-nums">{fmt(l.at)}</td>
                <td className="px-3 py-2">
                  <button type="button" className="font-mono text-xs text-blue-700 hover:underline text-left" onClick={() => setHistory({ poId: l.entityId, poNumber: l.entityRef, vendorName: l.vendorName })} title="This PO's full history">
                    {l.entityRef || '—'}
                  </button>
                  <span className="block text-[11px] text-slate-500">{l.vendorName}</span>
                </td>
                <td className="px-3 py-2"><ActionBadge action={l.action} /></td>
                <td className="px-3 py-2 text-slate-700 max-w-[360px]">{l.summary}</td>
                <td className="px-3 py-2 whitespace-nowrap">{byLine(l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
          <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} entries)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}>Next</Button>
        </div>
      )}

      <PoHistoryDialog open={!!history} onOpenChange={(v) => { if (!v) setHistory(null); }} poId={history?.poId} poNumber={history?.poNumber} vendorName={history?.vendorName} />
    </div>
  );
}
