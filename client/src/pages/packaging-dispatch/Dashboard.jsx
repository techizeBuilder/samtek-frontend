import React from 'react';
import { Link } from 'wouter';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package, Truck, Clock, CheckCircle2, AlertTriangle,
  ClipboardList, ArrowRight, MapPin, BarChart3, Receipt
} from 'lucide-react';

const statusColor = {
  Ready: 'bg-blue-100 text-blue-700',
  Dispatched: 'bg-amber-100 text-amber-700',
  'In Transit': 'bg-purple-100 text-purple-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-500',
};

export default function PackagingDispatchDashboard() {
  const { dashboard, dashboardLoading } = usePackagingDispatch();

  const {
    readyForPackaging = 0,
    packaging = {},
    dispatch = {},
    delayedDeliveries = 0,
    recentDispatches = [],
  } = dashboard;

  const stats = [
    { label: 'Ready for Packaging', value: readyForPackaging, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', link: '/packaging/queue' },
    { label: 'Packaging In Progress', value: packaging.inProgress || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', link: '/packaging/jobs' },
    { label: 'Packed & Ready', value: packaging.packed || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/dispatch/planning' },
    { label: 'Delayed Deliveries', value: delayedDeliveries, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', link: '/dispatch/active' },
  ];

  const dispatchStats = [
    { label: 'Ready to Dispatch', value: dispatch.ready || 0, icon: ClipboardList, color: 'text-blue-600' },
    { label: 'In Transit', value: dispatch.inTransit || 0, icon: Truck, color: 'text-purple-600' },
    { label: 'Delivered', value: dispatch.delivered || 0, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Closed', value: dispatch.closed || 0, icon: BarChart3, color: 'text-slate-500' },
  ];

  const modules = [
    { label: 'Packaging Queue', path: '/packaging/queue', icon: Package, desc: `${readyForPackaging} orders ready`, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Packaging Jobs', path: '/packaging/jobs', icon: ClipboardList, desc: 'Manage active jobs & checklist', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Dispatch Planning', path: '/dispatch/planning', icon: MapPin, desc: 'Create & plan dispatch orders', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active Dispatches', path: '/dispatch/active', icon: Truck, desc: 'Track in-transit deliveries', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Dispatch History', path: '/dispatch/history', icon: BarChart3, desc: 'Completed & closed dispatches', color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Expenses', path: '/packaging-dispatch/expenses', icon: Receipt, desc: 'Log packing/dispatch costs', color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  if (dashboardLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Packaging & Dispatch</h1>
          <p className="text-slate-500 text-sm mt-0.5">Safe packaging, error-free dispatch, complete delivery visibility</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-200">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Alert for delayed deliveries */}
      {delayedDeliveries > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{delayedDeliveries} Delayed {delayedDeliveries === 1 ? 'Delivery' : 'Deliveries'}</p>
            <p className="text-sm text-red-600">Shipments past expected delivery date — action required</p>
          </div>
          <Link href="/dispatch/active" className="ml-auto text-sm font-medium text-red-700 hover:underline flex items-center gap-1">
            View <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Link key={i} href={s.link}>
            <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
              <CardContent className="p-5">
                <div className={`${s.bg} p-2.5 rounded-lg w-fit mb-3`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Dispatch Status Row */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Dispatch Status Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dispatchStats.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Shortcuts */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {modules.map((m, i) => (
            <Link key={i} href={m.path}>
              <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-5">
                  <div className={`${m.bg} p-2.5 rounded-lg w-fit mb-3`}>
                    <m.icon className={`h-5 w-5 ${m.color}`} />
                  </div>
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{m.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Dispatches */}
      {recentDispatches.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-slate-800">Recent Dispatches</h2>
              <Link href="/dispatch/history" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentDispatches.map((d) => (
                <div key={d._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{d.dispatchId}</p>
                    <p className="text-xs text-slate-500">{d.machineCode} — {d.customerName || 'No customer'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.trackingId && (
                      <span className="text-xs text-slate-400 hidden sm:block">{d.trackingId}</span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[d.status] || 'bg-slate-100 text-slate-600'}`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
