import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ClipboardList, PackageCheck, Hourglass } from 'lucide-react';
import OutsourceRequestsView from './outsource/OutsourceRequestsView';
import OutsourceOrdersView from './outsource/OutsourceOrdersView';

// Purchases → Purchase & Outsource → Out Source Work (outsource-v2 slice 2,
// 2026-10-20 — server/docs/outsource-v2/slice-2-outsource-order-plan.md).
//   - New requests: outsource requests still to order (job-work orders and
//     hand-offs — how they arrive is unchanged). Tick some → Outsource Order.
//   - In progress (2026-10-21): requests already on an order — ordered, with
//     the vendor, at Store, in QC (and done ones with "Show done").
//   - Orders: the Outsource Orders. Dispatch sends, Store receives.
// The old direct Send Round is gone (decision Q1): every trip needs an order
// (a vendor, a price, the Company Admin's approval above the limit).
export default function SubChildJobWork({ initialView, initialOrderId } = {}) {
  const [view, setView] = useState(initialView || 'requests');
  const [openOrderId, setOpenOrderId] = useState(initialOrderId || null);
  const { data: counts } = useQuery({
    queryKey: ['outsource-orders', 'counts'],
    queryFn: () => apiRequest('GET', '/api/outsource-work/outsource-orders?limit=1'),
  });
  // Same query (and cache) as the requests views with no filters — for the tab counts.
  const { data: reqs } = useQuery({
    queryKey: ['outsource-requests', '', '', '', false],
    queryFn: () => apiRequest('GET', '/api/outsource-work/requests?'),
  });
  const allReqs = reqs?.data || [];
  const newCount = allReqs.filter(v => v.ready).length;
  const progressCount = allReqs.length - newCount;
  const c = counts?.counts || {};
  const openOrders = (c.Open || 0) + (c['With vendor'] || 0) + (c['Partly received'] || 0);
  const openOrder = (id) => { setView('orders'); setOpenOrderId(id); };
  const tab = (key) => `px-4 py-1.5 text-sm font-semibold rounded-md flex items-center gap-1.5 ${view === key ? 'bg-teal-600 text-white' : 'text-slate-600 hover:text-slate-900'}`;
  const pill = (key) => `text-[10px] px-1.5 rounded-full ${view === key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Outsource Work</h1>
        <p className="text-gray-600 mt-2">Pick new outsource requests, choose a vendor and make an Outsource Order. Dispatch sends the work to the vendor and Store receives it back.</p>
      </div>
      <div className="inline-flex flex-wrap gap-1 mb-4 rounded-lg bg-white border p-1 shadow-sm">
        <button type="button" onClick={() => setView('requests')} className={tab('requests')}>
          <ClipboardList className="w-4 h-4" />New requests
          {newCount > 0 && <span className={pill('requests')}>{newCount}</span>}
        </button>
        <button type="button" onClick={() => setView('progress')} className={tab('progress')}>
          <Hourglass className="w-4 h-4" />In progress
          {progressCount > 0 && <span className={pill('progress')}>{progressCount}</span>}
        </button>
        <button type="button" onClick={() => setView('orders')} className={tab('orders')}>
          <PackageCheck className="w-4 h-4" />Orders
          {(openOrders > 0 || c['Pending Approval'] > 0) && (
            <span className={pill('orders')}>
              {openOrders} open{c['Pending Approval'] ? ` · ${c['Pending Approval']} waiting` : ''}
            </span>
          )}
        </button>
      </div>
      {view === 'orders'
        ? <OutsourceOrdersView openOrderId={openOrderId} onOpened={() => setOpenOrderId(null)} />
        : <OutsourceRequestsView key={view} mode={view === 'progress' ? 'progress' : 'new'} onOpenOrder={openOrder} />}
    </div>
  );
}
