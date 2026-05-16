import React from 'react';
import { Link } from 'wouter';
import { useQC } from '@/contexts/QCContext';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClipboardList, CheckCircle2, XCircle, Clock, AlertTriangle,
  ArrowRight, BarChart3, Package, Wrench, Factory, ShoppingCart
} from 'lucide-react';

const statusColor = {
  Pending: 'bg-amber-100 text-amber-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

const sourceIcon = { Purchase: ShoppingCart, Production: Factory, Store: Package };
const categoryIcon = { Machine: Factory, 'Raw Material': Package, Tool: Wrench, 'Finished Good': CheckCircle2 };

export default function QCDashboard() {
  const { dashboard, dashboardLoading } = useQC();
  const { summary = {}, sourceBreakdown = [], categoryBreakdown = [], failReasons = [], recentJobs = [] } = dashboard;

  const statsCards = [
    { label: 'Total QC Jobs', value: summary.total || 0, icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Pending', value: summary.pending || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', link: '/qc/jobs?status=Pending' },
    { label: 'In Progress', value: summary.inProgress || 0, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50', link: '/qc/jobs?status=In Progress' },
    { label: 'Approved', value: summary.approved || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejected', value: summary.rejected || 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: "Today's Inspections", value: summary.todayCount || 0, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const modules = [
    { label: 'QC Inward Entry', path: '/qc/inward', icon: ClipboardList, desc: 'Create new QC job', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'All QC Jobs', path: '/qc/jobs', icon: BarChart3, desc: 'View & manage QC jobs', color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Pending Inspection', path: '/qc/jobs?status=Pending', icon: Clock, desc: `${summary.pending || 0} awaiting inspector`, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'In Progress', path: '/qc/jobs?status=In Progress', icon: AlertTriangle, desc: `${summary.inProgress || 0} being inspected`, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (dashboardLoading) {
    return <div className="p-6 flex items-center justify-center min-h-64 text-slate-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Control Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">QC Inward → Inspection → Decision → Transfer</p>
        </div>
        <Link href="/qc/inward">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <ClipboardList className="h-4 w-4" />
            New QC Entry
          </button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((s, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className={`${s.bg} p-2 rounded-lg w-fit mb-2`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">{s.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source breakdown */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Source-wise Inward</h2>
            {sourceBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-3">
                {sourceBreakdown.map((s) => {
                  const Icon = sourceIcon[s._id] || Package;
                  const pct = summary.total ? Math.round((s.count / summary.total) * 100) : 0;
                  return (
                    <div key={s._id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-700 font-medium">{s._id}</span>
                        </div>
                        <span className="text-slate-500">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failure analysis */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Top Failure Reasons</h2>
            {failReasons.length === 0 ? (
              <p className="text-sm text-slate-400">No rejections yet</p>
            ) : (
              <div className="space-y-2.5">
                {failReasons.map((f, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-sm text-slate-700 flex-1 leading-snug">{f._id}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0">{f.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Category Breakdown</h2>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map((c) => {
                  const Icon = categoryIcon[c._id] || Package;
                  return (
                    <div key={c._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-700">{c._id}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-slate-800">Recent QC Activities</h2>
              <Link href="/qc/jobs" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentJobs.map((j) => (
                <Link key={j._id} href={`/qc/jobs/${j._id}`}>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 text-sm">{j.qcJobId}</p>
                        <span className="text-xs text-slate-400">·</span>
                        <p className="text-sm text-slate-600 truncate">{j.itemName}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{j.source} · {j.category}{j.inspector ? ` · ${j.inspector}` : ''}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${statusColor[j.status]}`}>
                      {j.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
