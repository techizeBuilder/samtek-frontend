import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useProduction, useProductionOrdersList, computeOrderProgress } from '@/contexts/ProductionContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import {
  ClipboardList, Plus, CheckCircle, AlertTriangle, Clock,
  ChevronRight, Search, Layers, ShieldAlert
} from 'lucide-react';
import { useProduction as useProd } from '@/contexts/ProductionContext';

const statusColor = {
  'Pending': 'bg-slate-100 text-slate-700 border-slate-200',
  'BOM Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Pending QC': 'bg-purple-100 text-purple-700 border-purple-200',
  'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-red-100 text-red-700 border-red-200',
};

const priorityColor = {
  'Urgent': 'bg-red-100 text-red-700 border-red-200',
  'Normal': 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusIcon = {
  'Pending': <Clock className="h-3.5 w-3.5" />,
  'BOM Pending': <AlertTriangle className="h-3.5 w-3.5" />,
  'In Progress': <ChevronRight className="h-3.5 w-3.5" />,
  'Pending QC': <ShieldAlert className="h-3.5 w-3.5" />,
  'Completed': <CheckCircle className="h-3.5 w-3.5" />,
};

const emptyOrder = { machineCode: '', machineName: '', priority: 'Normal', deliveryDate: '', source: 'Stock' };

export default function OrderManagement() {
  const { addOrder } = useProduction();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('production', 'orders', 'add');
  // Production routes are mirrored 3 ways (/production/..., /super-admin/
  // production/..., /unit-head/production/...) — see ProductionModule.jsx —
  // so the Plan modal's "open Process Execution" link is built off the
  // current prefix rather than a single hardcoded path.
  const [location, setLocation] = useLocation();
  const goToProcessExecution = (orderId) => setLocation(`${location.replace(/\/orders$/, '')}/process-execution?order=${orderId}`);

  // Machine Orders vs Sub Child Part Orders — a Sub Child Part order is
  // always Stock-sourced (auto-raised when its stock hits Min Stock, see
  // subChildPartReorderService.js) and never tied to a real sales order, so
  // it's a genuinely separate list to browse rather than something to filter
  // Machine Orders down to.
  const [orderTab, setOrderTab] = useState('Machine'); // 'Machine' | 'ChildPart'
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [page, setPage] = useState(1);

  // Any filter change jumps back to page 1, same as SuperAdminOrders.jsx.
  const changeSearch = (value) => { setSearch(value); setPage(1); };
  const changeStatus = (value) => { setFilterStatus(value); setPage(1); };
  const changeSource = (value) => { setFilterSource(value); setPage(1); };
  const changeOrderTab = (value) => { setOrderTab(value); setPage(1); setSearch(''); setFilterStatus('All'); setFilterSource('All'); };

  const { data: ordersListData, isLoading: ordersLoading } = useProductionOrdersList({
    page,
    limit: 20,
    search,
    status: filterStatus === 'All' ? 'all' : filterStatus,
    source: filterSource === 'Store Orders' ? 'Store' : filterSource === 'Rejected Items' ? 'QC_Rejected' : 'all',
    orderKind: orderTab,
    // One row per real order instead of one per machine — see
    // productionMfgController.js's getOrders. Only this page's own list
    // query passes this; Job Cards/Process & QC's own useProductionOrdersList
    // calls omit it and keep getting the flat per-machine shape unchanged.
    grouped: 'true',
  });

  // Each entry is now { groupKey, machines: [...] } — one real order (or one
  // standalone Stock/legacy entry), not one machine. `machines` is already
  // sorted oldest-first by the server (mirrors the order machines were added
  // on the Order Form).
  const orders = ordersListData?.data?.orders || [];
  const pagination = ordersListData?.data?.pagination || {};
  const summary = ordersListData?.data?.summary || {};

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyOrder);

  const statuses = ['All', 'Pending', 'BOM Pending', 'In Progress', 'On Hold', 'Completed'];
  const sources = ['All', 'Store Orders', 'Rejected Items'];

  // Real sales-order id (ORD-xxx) that this production belongs to:
  //  - orderCode        → set server-side from the linked Order at creation
  //                       (Store-triggered and QC_Rejected rebuilds both resolve it)
  //  - older records without orderCode fall back to the legacy fields so
  //    nothing already in the DB goes blank
  //  - Stock production → no sales order (company stock)
  const getRealOrderId = (o) => {
    if (o.orderCode) return o.orderCode;
    if (o.source === 'QC_Rejected') return o.rejectionDetails?.originalOrderId || o.machineCode || null;
    if (!o.source || o.source === 'Store') return o.machineCode || null;
    return null; // 'Stock'
  };

  // ── Group-level display helpers ──────────────────────────────────────────
  // A "group" is one row of the (now grouped-by-order) list: { groupKey,
  // machines }. Priority/Source/Delivery are stored per-machine in the
  // schema but are really order-level facts (every machine in one real order
  // is raised from the same Order at the same time) — shown from the first
  // machine. Status/BOM/Design/Progress are genuinely per-machine, so a
  // multi-machine group shows a breakdown instead of one collapsed value.
  const groupSources = (machines) => [...new Set(machines.map(m => m.source))];
  const groupStatusCounts = (machines) => {
    const counts = {};
    machines.forEach(m => { counts[m.status] = (counts[m.status] || 0) + 1; });
    return counts; // e.g. { Completed: 2, 'In Progress': 1 }
  };
  const groupBomDesignCounts = (machines) => ({
    bomDone: machines.filter(m => m.bomVerified).length,
    designDone: machines.filter(m => m.designVerified).length,
    total: machines.length,
  });
  // machines are already oldest-first (Sale.items order) from the server —
  // "currently active" = the first one not yet Completed, so the bar tracks
  // whichever machine the shop floor is actually working on right now. Once
  // every machine is Completed, it settles on the last one at 100%.
  const groupProgress = (machines) => {
    let idx = machines.findIndex(m => m.status !== 'Completed');
    if (idx === -1) idx = machines.length - 1;
    return { position: idx + 1, total: machines.length, pct: computeOrderProgress(machines[idx]) };
  };

  // Search/status/source filtering and the stat counts below now happen
  // server-side (see useProductionOrdersList) — `orders` is already the
  // current page of the filtered result set.
  const filtered = orders;
  const stats = summary;

  const handleAddOrder = () => {
    if (!form.machineCode || !form.machineName || !form.deliveryDate) return;
    addOrder(form);
    setForm(emptyOrder);
    setAddOpen(false);
  };

  const [planGroup, setPlanGroup] = useState(null);
  // Kept in sync with live `orders` data (refetches on an interval), so the
  // modal reflects updates while it's open.
  const planGroupLive = planGroup ? orders.find(g => g.groupKey === planGroup.groupKey) : null;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" /> Order Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Machine manufacturing orders — triggered by Store notification</p>
        </div>
        {canAdd && (
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> New Order
          </Button>
        )}
      </div>

      {/* Machine Orders vs Sub Child Part Orders — a Sub Child Part order is
          always Stock-sourced (auto-raised on low stock, never tied to a
          real sales order), so it's a genuinely separate list from actual
          machine builds. */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 gap-1">
        {[['Machine', 'Machine Orders'], ['ChildPart', 'Child Part Orders'], ['SubChildPart', 'Sub Child Part Orders']].map(([kind, label]) => (
          <button
            key={kind}
            onClick={() => changeOrderTab(kind)}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${orderTab === kind
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats — scoped to the active tab (Machine vs Sub Child Part), same
          as the list below (see getOrders' summaryMatch). Still global
          within that tab, ignoring search/status filters. */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, color: 'text-slate-800', bg: 'bg-white' },
          { label: 'Store Orders', value: stats.storeOrders, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rejected Orders', value: stats.rejectedOrders, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Pending', value: stats.pending, color: 'text-slate-600', bg: 'bg-white' },
          { label: 'BOM Pending', value: stats.bomPending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'On Hold', value: stats.onHold, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <Card key={s.label} className={`border-none shadow-sm ${s.bg}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by Order ID or Machine..." className="pl-9" value={search} onChange={e => changeSearch(e.target.value)} />
          </div>

          {/* Source Filter — meaningless for Sub Child Part Orders (always
              Stock-sourced), so hidden on that tab. */}
          <div className="flex flex-col sm:flex-row gap-3">
            {orderTab === 'Machine' && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 flex items-center">Source:</span>
                {sources.map(s => (
                  <button
                    key={s}
                    onClick={() => changeSource(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterSource === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
                  >{s}</button>
                ))}
              </div>
            )}

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 flex items-center">Status:</span>
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >{s}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table — Machine/Child Part shape only; Sub Child Part gets
          its own static shell below, since its real columns (Sub Child Part,
          Job Work) don't fit this one's Machine/BOM-Design/Progress shape. */}
      {orderTab !== 'SubChildPart' && (
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">BOM / Design</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading orders...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No orders found.</td></tr>
                ) : filtered.map(group => {
                  const machines = group.machines || [];
                  const primary = machines[0] || {};
                  const oid = group.groupKey;
                  const isMulti = machines.length > 1;
                  const hasRejected = machines.some(m => m.source === 'QC_Rejected');
                  const allCompleted = machines.every(m => m.status === 'Completed');
                  const isOverdue = primary.deliveryDate && !allCompleted && new Date(primary.deliveryDate) < new Date();
                  const { position, total, pct } = groupProgress(machines);
                  const { bomDone, designDone, total: bdTotal } = groupBomDesignCounts(machines);

                  return (
                    <tr key={oid} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${hasRejected ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {(() => {
                          const realOrderId = getRealOrderId(primary);
                          return realOrderId ? (
                            <>
                              {/* Real sales order id — batata hai kis order ka item ban raha hai */}
                              <span className="font-bold text-blue-700">{realOrderId}</span>
                              {/* Production id (solo) or machine count (grouped) — chhota, sirf reference ke liye */}
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                {isMulti ? `${machines.length} machines` : (primary.orderId || primary.id)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-blue-700">{primary.orderId || primary.id}</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">Stock Production</span>
                            </>
                          );
                        })()}
                        {hasRejected && <span className="block text-red-600 text-xs">{isMulti ? 'REJECTED (partial)' : 'REJECTED'}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          {groupSources(machines).map(src => (
                            <span key={src} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border w-fit ${src === 'QC_Rejected'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}>
                              {src === 'QC_Rejected' ? 'QC Rejected' : 'Store Order'}
                            </span>
                          ))}
                        </div>
                        {/* Purpose badge — Stock groups are always solo, so
                            reading it off `primary` alone is safe here. */}
                        <span className={`mt-1 flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border w-fit ${primary.source === 'Stock'
                            ? 'bg-violet-100 text-violet-700 border-violet-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                          {primary.source === 'Stock' ? '🏭 Stock' : '📦 Order'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Hover reveals every machine's own name+code in this
                            order — the compact row only shows the first plus
                            a "+N more" badge when there's more than one. */}
                        <HoverCard openDelay={150}>
                          <HoverCardTrigger asChild>
                            <div className={isMulti ? 'cursor-help' : ''}>
                              <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                {primary.machineName}
                                {(primary.orderQuantity || 1) > 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">×{primary.orderQuantity}</span>
                                )}
                                {isMulti && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">+{machines.length - 1} more</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">{primary.machineCode}</div>
                            </div>
                          </HoverCardTrigger>
                          {isMulti && (
                            <HoverCardContent className="w-72">
                              <p className="text-xs font-semibold text-slate-500 mb-2">{machines.length} machines in this order</p>
                              <div className="space-y-1.5">
                                {machines.map(m => (
                                  <div key={m._id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="text-slate-800">{m.machineName}{(m.orderQuantity || 1) > 1 ? ` ×${m.orderQuantity}` : ''}</span>
                                    <span className="text-slate-400 font-mono text-xs">{m.machineCode}</span>
                                  </div>
                                ))}
                              </div>
                            </HoverCardContent>
                          )}
                        </HoverCard>
                        {!isMulti && hasRejected && primary.rejectionDetails?.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">Reason: {primary.rejectionDetails.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Priority is really an order-level fact (every
                            machine in one real order is raised together) —
                            shown once for the whole group. */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor[primary.priority]}`}>
                          {primary.priority === 'Urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {primary.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(groupStatusCounts(machines)).map(([st, count]) => (
                            <span key={st} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor[st]}`}>
                              {statusIcon[st]} {isMulti ? `${count} ` : ''}{st}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${bomDone === bdTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            BOM {isMulti ? `${bomDone}/${bdTotal}` : (bomDone ? '✓' : '✗')}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${designDone === bdTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            Design {isMulti ? `${designDone}/${bdTotal}` : (designDone ? '✓' : '✗')}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Multi-machine: "position/total" is which machine
                            is currently being worked on (the first not yet
                            Completed), pct is that one machine's own
                            progress — e.g. "1/3 · 80%". */}
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 font-semibold">{isMulti ? `${position}/${total} · ` : ''}{pct}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {primary.deliveryDate}
                        {isOverdue && <span className="block text-red-500">Overdue</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Child Part orders are always raised individually
                            (the low-stock cron, never a batched Sales
                            Order) — machines[] is always exactly one entry,
                            so the group-picker Machine Orders needs (a real
                            Sales Order can batch several machines) is just
                            overhead here. Navigate straight to Process
                            Execution instead. */}
                        <Button
                          size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => orderTab === 'ChildPart' ? goToProcessExecution(primary._id || primary.id) : setPlanGroup(group)}
                        >
                          Plan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.pages} ({pagination.total} orders)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Sub Child Part Orders — In-House route only (Out-Source/Purchase
          orders for the same level live at /accounts/purchases/sub-child-
          job-work instead — see SubChildJobWork.jsx). Cron-raised only, no
          manual creation. "Plan" navigates straight to Process Execution
          (ProcessExecution.jsx's orderKind:'SubChildPart' support) — the
          standalone detail dialog this tab used to open here was retired in
          favor of that, same as Child Part's own Plan button above. */}
      {orderTab === 'SubChildPart' && (
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sub Child Part</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Work</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading orders...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">In-house Sub Child Part orders will appear here.</td></tr>
                ) : orders.map(group => {
                  const o = group.machines?.[0];
                  if (!o) return null;
                  return (
                    <tr key={o._id || o.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-700">{o.orderId}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{o.machineName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{o.machineCode}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(o.subChildPartJobWorkTypes || []).length
                            ? o.subChildPartJobWorkTypes.map(t => (
                                <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{t}</span>
                              ))
                            : <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{o.orderQuantity}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor[o.priority]}`}>{o.priority}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[o.status]}`}>
                          {statusIcon[o.status]}{o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{o.deliveryDate}</td>
                      <td className="px-5 py-3">
                        {/* Same reasoning as Child Part's own Plan button —
                            always exactly one order per group here too. The
                            whole build/QC flow now lives on Process
                            Execution (see ProcessExecution.jsx's
                            orderKind:'SubChildPart' support) — this button
                            used to open a standalone modal instead. */}
                        <Button size="sm" variant="outline" onClick={() => goToProcessExecution(o._id || o.id)}>
                          Plan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Plan Modal — order-level summary + a clickable list of the order's
          machines. Clicking a machine opens its own existing detail dialog
          below, completely unchanged — this is purely a new grouping layer
          on top of what was already there. */}
      <Dialog open={!!planGroupLive} onOpenChange={() => setPlanGroup(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {planGroupLive && (() => {
            const machines = planGroupLive.machines || [];
            const primary = machines[0] || {};
            const isMulti = machines.length > 1;
            const realOrderId = getRealOrderId(primary);
            const hasRejected = machines.some(m => m.source === 'QC_Rejected');
            const { position, total, pct } = groupProgress(machines);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-slate-900">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                    {realOrderId || primary.orderId || primary.id}
                    {hasRejected && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                        {isMulti ? 'HAS REJECTED MACHINE' : 'QC REJECTED'}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-blue-500 mb-1">Machines</p>
                      <p className="font-bold text-blue-800 text-base">{machines.length}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Priority</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor[primary.priority]}`}>{primary.priority}</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Delivery</p>
                      <p className="font-semibold text-slate-800">{primary.deliveryDate}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Progress</p>
                      <p className="font-semibold text-slate-800">{isMulti ? `${position}/${total} · ` : ''}{pct}%</p>
                    </div>
                  </div>

                  {/* Status breakdown */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(groupStatusCounts(machines)).map(([st, count]) => (
                      <span key={st} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor[st]}`}>
                        {statusIcon[st]} {isMulti ? `${count} ` : ''}{st}
                      </span>
                    ))}
                  </div>

                  {/* Machines list — click one to open its full detail (BOM,
                      process steps, QC, material demands — unchanged). */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Layers className="h-4 w-4" /> Machines in this order
                    </h3>
                    <div className="space-y-2">
                      {machines.map(m => {
                        const mProgress = computeOrderProgress(m);
                        return (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => goToProcessExecution(m._id || m.id)}
                            className="w-full text-left border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="font-medium text-slate-900 flex items-center gap-1.5">
                                {m.machineName}
                                {(m.orderQuantity || 1) > 1 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">×{m.orderQuantity}</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">{m.machineCode}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[m.status]}`}>
                                {statusIcon[m.status]} {m.status}
                              </span>
                              <span className="text-xs text-slate-500 font-semibold w-9 text-right">{mProgress}%</span>
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Order Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Code *</label>
                <Input placeholder="e.g. MCH-006" value={form.machineCode} onChange={e => setForm(f => ({ ...f, machineCode: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Priority</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Type *</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              >
                <option value="Stock">Stock — Company ka apna stock badhana</option>
                <option value="Store">Store Order — Customer order ke liye</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {form.source === 'Stock'
                  ? '🏭 QC pass hone ke baad item inventory mein add ho jaayega'
                  : '📦 QC pass hone ke baad item dispatch/packing queue mein jaayega'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Name *</label>
              <Input placeholder="e.g. SPM Drilling Machine" value={form.machineName} onChange={e => setForm(f => ({ ...f, machineName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Delivery Date *</label>
              <Input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOrder} disabled={!form.machineCode || !form.machineName || !form.deliveryDate} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
