import React from 'react';
import { Link } from 'wouter';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package, CheckCircle2, Layers, AlertTriangle, Beaker, Clock,
  ClipboardList, Cog, ShieldAlert, FolderOpen, ArrowRight, XCircle
} from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    Approved: 'bg-emerald-100 text-emerald-700',
    Testing: 'bg-amber-100 text-amber-700',
    Draft: 'bg-slate-100 text-slate-600',
    Rejected: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

const crStatusBadge = (status) => {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-slate-100 text-slate-500';
};

export default function RDDashboard() {
  const { machines, changeRequests, prototypes, stats } = useRD();

  const recentMachines = machines.filter(m => !m.isDiscontinued).slice(0, 5);
  const pendingCRs = changeRequests.filter(cr => cr.status === 'Pending').slice(0, 4);
  const inProgressPrototypes = prototypes.filter(p => p.status === 'In Progress');

  const modules = [
    { label: 'Product Master', path: '/r&d/product-master', icon: Package, desc: `${stats.totalMachines} active machines`, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Design Approval', path: '/r&d/design-approval', icon: CheckCircle2, desc: `${stats.pendingApproval} pending review`, color: 'text-amber-600', bg: 'bg-amber-50', badge: stats.pendingApproval },
    { label: 'BOM Management', path: '/r&d/bom-management', icon: ClipboardList, desc: 'Material definitions', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Tool & Process', path: '/r&d/tool-process', icon: Cog, desc: 'Manufacturing process steps', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Prototype', path: '/r&d/prototype', icon: Beaker, desc: `${inProgressPrototypes.length} in testing`, color: 'text-teal-600', bg: 'bg-teal-50', badge: inProgressPrototypes.length },
    { label: 'Change Management', path: '/r&d/change-management', icon: AlertTriangle, desc: `${stats.openChangeRequests} open requests`, color: 'text-red-600', bg: 'bg-red-50', badge: stats.openChangeRequests },
    { label: 'Quality Parameters', path: '/r&d/quality-parameters', icon: ShieldAlert, desc: 'QC standards & checklists', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Documentation', path: '/r&d/documentation', icon: FolderOpen, desc: 'Design files & manuals', color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">R&D Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Research, Innovation & Development — No production starts without R&D approval</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-200">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Machines', value: stats.totalMachines, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approved Designs', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Released for Production', value: stats.released, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Open Change Requests', value: stats.openChangeRequests, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-5">
              <div className={`${s.bg} p-2.5 rounded-lg w-fit mb-3`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Design Status Breakdown */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Design Status Breakdown</p>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Draft', value: stats.draft, color: 'bg-slate-200', text: 'text-slate-700' },
              { label: 'Testing', value: stats.pendingApproval, color: 'bg-amber-400', text: 'text-white' },
              { label: 'Approved', value: stats.approved, color: 'bg-emerald-500', text: 'text-white' },
              { label: 'Rejected', value: stats.rejected, color: 'bg-red-500', text: 'text-white' },
              { label: 'Discontinued', value: stats.discontinued, color: 'bg-slate-400', text: 'text-white' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2 ${s.color} px-4 py-2 rounded-full`}>
                <span className={`text-sm font-bold ${s.text}`}>{s.value}</span>
                <span className={`text-xs font-semibold ${s.text} opacity-80`}>{s.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Quick Access */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map(mod => (
              <Link key={mod.path} href={mod.path}>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${mod.bg} p-2.5 rounded-lg`}><mod.icon className={`h-5 w-5 ${mod.color}`} /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 text-sm">{mod.label}</p>
                          {!!mod.badge && mod.badge > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{mod.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{mod.desc}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Pending Change Requests */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Pending Change Requests</CardTitle>
              <Link href="/r&d/change-management">
                <span className="text-xs text-blue-600 hover:underline cursor-pointer">View all</span>
              </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {pendingCRs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No pending requests</p>
              ) : pendingCRs.map(cr => (
                <div key={cr._id} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-blue-600 font-semibold">{cr.machineCode}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{cr.changeType}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{cr.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">from {cr.department} · {cr.raisedAt}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Prototypes in Testing */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Prototypes in Testing</CardTitle>
              <Link href="/r&d/prototype">
                <span className="text-xs text-blue-600 hover:underline cursor-pointer">View all</span>
              </Link>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {inProgressPrototypes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No prototypes currently in testing</p>
              ) : inProgressPrototypes.map(p => (
                <div key={p._id} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[11px] text-blue-600 font-semibold">{p.machineCode}</span>
                    <span className="text-xs text-slate-700 font-medium">{p.prototypeName}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { l: 'Perf', v: p.performanceTest },
                      { l: 'Output', v: p.outputTest },
                      { l: 'Durability', v: p.durabilityTest },
                    ].map(t => (
                      <span key={t.l} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${t.v === 'Pass' ? 'bg-emerald-100 text-emerald-700' : t.v === 'Fail' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{t.l}: {t.v}</span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Department Integration Status */}
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-800">Department Integration</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {[
                { dept: 'Production', note: 'Approved designs access', status: 'Active' },
                { dept: 'Purchase', note: 'R&D defined materials', status: 'Active' },
                { dept: 'Store', note: 'Approved inventory', status: 'Active' },
                { dept: 'Quality', note: 'R&D standards', status: 'Active' },
                { dept: 'Service', note: 'Field feedback loop', status: 'Pending' },
                { dept: 'Sales', note: 'New product launch', status: 'Pending' },
              ].map(d => (
                <div key={d.dept} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 w-20">{d.dept}</span>
                  <span className="text-slate-400 flex-1 text-center">{d.note}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${d.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>{d.status === 'Active' ? 'Active' : 'Soon'}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Machines */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-3">
          <CardTitle className="text-base font-semibold text-slate-800">Recent Machines</CardTitle>
          <Link href="/r&d/product-master">
            <Button size="sm" variant="outline" className="text-xs">View All Machines</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Design Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Release</th>
                </tr>
              </thead>
              <tbody>
                {recentMachines.map(m => (
                  <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-mono text-xs text-blue-600 font-semibold">{m.code}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{m.name}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{m.category}</td>
                    <td className="px-5 py-3.5"><span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${statusBadge(m.designStatus)}`}>{m.designStatus}</span></td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{m.releaseStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
