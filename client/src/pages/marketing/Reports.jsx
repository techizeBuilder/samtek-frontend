import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useMarketing } from '@/contexts/MarketingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Users, FileText, Share2, Download, TrendingUp, CheckCircle2, Clock,
} from 'lucide-react';

const tabs = [
  { id: 'sales', label: 'Sales Report', icon: TrendingUp },
  { id: 'employee', label: 'Employee Sharing', icon: Users },
  { id: 'customer', label: 'Customer-wise', icon: FileText },
  { id: 'mostUsed', label: 'Most Used Content', icon: BarChart },
];

const FILE_COLORS = { PDF: 'bg-red-100 text-red-700', DOC: 'bg-blue-100 text-blue-700', DOCX: 'bg-blue-100 text-blue-700', JPG: 'bg-green-100 text-green-700', JPEG: 'bg-green-100 text-green-700', PNG: 'bg-green-100 text-green-700', WEBP: 'bg-green-100 text-green-700', MP4: 'bg-purple-100 text-purple-700', MOV: 'bg-purple-100 text-purple-700' };

const exportCSV = (data, filename) => {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = filename + '.csv'; a.click();
};

export default function MarketingReports() {
  const { reports, reportsLoading } = useMarketing();
  const [tab, setTab] = useState('sales');

  const { byEmployee = [], byCustomer = [], mostUsed = [], byMethod = [] } = reports;

  // Sales/Lead report — scoped to the logged-in user's own company on the
  // backend (req.user.companyId), so this is automatically the right data
  // whichever company's Marketing Head is signed in.
  const { data: salesRes, isLoading: salesLoading } = useQuery({
    queryKey: ['mkt-lead-report'],
    queryFn: () => apiRequest('GET', '/api/marketing/reports/leads'),
  });
  const salesData = salesRes?.data || { totals: { total: 0, won: 0, late: 0, wonValue: 0, winRate: 0 }, byStage: [], bySource: [] };
  const { totals, byStage, bySource } = salesData;
  const maxStageTotal = Math.max(1, ...byStage.map(s => s.total));

  // Only the asset-sharing tabs (Employee/Customer/Most Used) depend on the
  // slower reports query — Sales Report has its own independent query below,
  // so it shouldn't be blocked from rendering while that one is in flight.
  const assetTabLoading = reportsLoading && tab !== 'sales';

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Sales pipeline performance &amp; content sharing analytics for your company</p>
        </div>
        {/* Method breakdown pills */}
        <div className="flex gap-2">
          {byMethod.map(m => (
            <div key={m._id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${m._id === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              <Share2 className="h-3.5 w-3.5" />{m._id}: {m.count}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Sales Report — Stage-wise, Won, Late, Source-wise */}
      {tab === 'sales' && (
        <div className="space-y-6">
          {salesLoading ? (
            <p className="text-slate-400 text-sm text-center py-8">Loading sales report...</p>
          ) : (
            <>
              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium opacity-80 text-white">Total Leads</CardTitle>
                    <Users className="h-4 w-4 opacity-80" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold">{totals.total}</div></CardContent>
                </Card>
                <Card className="border-none shadow-md bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Won</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{totals.won}</div>
                    {totals.wonValue > 0 && <p className="text-xs text-slate-400">₹{totals.wonValue.toLocaleString('en-IN')} value</p>}
                  </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Late Follow-ups</CardTitle>
                    <Clock className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{totals.late}</div>
                    <p className="text-xs text-slate-400">Overdue, not yet won</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Win Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                  </CardHeader>
                  <CardContent><div className="text-2xl font-bold text-indigo-600">{totals.winRate}%</div></CardContent>
                </Card>
              </div>

              {/* Stage-wise */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Stage-wise Leads</CardTitle></CardHeader>
                <CardContent>
                  {byStage.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No leads yet</p> : (
                    <div className="space-y-3">
                      {byStage.map((s) => (
                        <div key={s.stage} className="flex items-center gap-3">
                          <span className="w-40 shrink-0 text-sm text-slate-700 truncate" title={s.stage}>{s.stage}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${(s.total / maxStageTotal) * 100}%` }}
                            />
                          </div>
                          <span className="w-24 shrink-0 text-right text-sm text-slate-600">
                            {s.total} <span className="text-slate-400">({s.won} won)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Source-wise */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Source-wise Performance</CardTitle>
                  <Button
                    size="sm" variant="outline" className="gap-1.5 text-xs"
                    onClick={() => exportCSV(bySource.map(s => ({ Source: s.source, Total: s.total, Won: s.won, Late: s.late, WinRate: `${s.winRate}%`, WonValue: s.wonValue })), 'source-wise-report')}
                  >
                    <Download className="h-3.5 w-3.5" />Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {bySource.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No leads yet</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 text-slate-500 font-medium">Source</th>
                            <th className="text-center py-2 text-slate-500 font-medium">Total</th>
                            <th className="text-center py-2 text-slate-500 font-medium">Won</th>
                            <th className="text-center py-2 text-slate-500 font-medium">Late</th>
                            <th className="text-center py-2 text-slate-500 font-medium">Win Rate</th>
                            <th className="text-right py-2 text-slate-500 font-medium">Won Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bySource.map((s, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50">
                              <td className="py-2.5 font-medium">{s.source}</td>
                              <td className="py-2.5 text-center"><Badge variant="outline">{s.total}</Badge></td>
                              <td className="py-2.5 text-center text-green-600 font-medium">{s.won}</td>
                              <td className="py-2.5 text-center text-red-600 font-medium">{s.late}</td>
                              <td className="py-2.5 text-center text-slate-600">{s.winRate}%</td>
                              <td className="py-2.5 text-right text-slate-600">{s.wonValue > 0 ? `₹${s.wonValue.toLocaleString('en-IN')}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Employee Sharing Report */}
      {tab === 'employee' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Employee Sharing Report</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(byEmployee.map(e => ({ Name: e.name, Shares: e.count, UniqueCustomers: e.uniqueCustomers })), 'employee-sharing-report')}><Download className="h-3.5 w-3.5" />Export CSV</Button>
          </CardHeader>
          <CardContent>
            {assetTabLoading ? <p className="text-slate-400 text-sm text-center py-8">Loading...</p> : byEmployee.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No data yet</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2 text-slate-500 font-medium">Employee</th><th className="text-center py-2 text-slate-500 font-medium">Total Shares</th><th className="text-center py-2 text-slate-500 font-medium">Unique Customers</th></tr></thead>
                  <tbody>
                    {byEmployee.map((e, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="py-2.5 font-medium">{e.name || 'Unknown'}</td>
                        <td className="py-2.5 text-center"><Badge>{e.count}</Badge></td>
                        <td className="py-2.5 text-center text-slate-600">{e.uniqueCustomers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer-wise Report */}
      {tab === 'customer' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Customer-wise Shared Files</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(byCustomer.map(c => ({ Customer: c._id, Phone: c.phone, Shares: c.count, Files: c.files?.join(' | ') })), 'customer-sharing-report')}><Download className="h-3.5 w-3.5" />Export CSV</Button>
          </CardHeader>
          <CardContent>
            {assetTabLoading ? <p className="text-slate-400 text-sm text-center py-8">Loading...</p> : byCustomer.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No data yet</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2 text-slate-500 font-medium">Customer</th><th className="text-left py-2 text-slate-500 font-medium">Phone</th><th className="text-center py-2 text-slate-500 font-medium">Files Shared</th><th className="text-left py-2 text-slate-500 font-medium">Recent Files</th></tr></thead>
                  <tbody>
                    {byCustomer.map((c, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50">
                        <td className="py-2.5 font-medium">{c._id}</td>
                        <td className="py-2.5 text-slate-600">{c.phone || '—'}</td>
                        <td className="py-2.5 text-center"><Badge>{c.count}</Badge></td>
                        <td className="py-2.5 text-slate-500 text-xs max-w-xs truncate">{c.files?.slice(0, 3).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Most Used Content */}
      {tab === 'mostUsed' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Most Used Content</CardTitle></CardHeader>
          <CardContent>
            {assetTabLoading ? <p className="text-slate-400 text-sm text-center py-8">Loading...</p> : mostUsed.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No data yet</p> : (
              <div className="space-y-2">
                {mostUsed.map((a, i) => (
                  <div key={a._id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50">
                    <span className="text-lg font-bold text-slate-300 w-7">#{i + 1}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${FILE_COLORS[a.fileType] || 'bg-slate-100 text-slate-600'}`}>{a.fileType}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{a.fileName}</p>
                      <p className="text-xs text-slate-400">{a.category?.name || 'Uncategorized'} · v{a.versionNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-slate-800">{a.shareCount}</p>
                      <p className="text-xs text-slate-400">shares</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
