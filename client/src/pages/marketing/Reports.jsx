import React, { useState } from 'react';
import { useMarketing } from '@/contexts/MarketingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Users, FileText, Share2, Download } from 'lucide-react';

const tabs = [
  { id: 'employee', label: 'Employee Sharing', icon: Users },
  { id: 'customer', label: 'Customer-wise', icon: FileText },
  { id: 'mostUsed', label: 'Most Used Content', icon: BarChart },
];

const FILE_COLORS = { PDF: 'bg-red-100 text-red-700', DOC: 'bg-blue-100 text-blue-700', DOCX: 'bg-blue-100 text-blue-700', JPG: 'bg-green-100 text-green-700', JPEG: 'bg-green-100 text-green-700', PNG: 'bg-green-100 text-green-700', WEBP: 'bg-green-100 text-green-700', MP4: 'bg-purple-100 text-purple-700', MOV: 'bg-purple-100 text-purple-700' };

export default function MarketingReports() {
  const { reports, reportsLoading } = useMarketing();
  const [tab, setTab] = useState('employee');

  const { byEmployee = [], byCustomer = [], mostUsed = [], byMethod = [] } = reports;

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = filename + '.csv'; a.click();
  };

  if (reportsLoading) return <div className="p-6 flex items-center justify-center min-h-64 text-slate-500">Loading reports...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Content sharing analytics</p>
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
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Employee Sharing Report */}
      {tab === 'employee' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Employee Sharing Report</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => exportCSV(byEmployee.map(e => ({ Name: e.name, Shares: e.count, UniqueCustomers: e.uniqueCustomers })), 'employee-sharing-report')}><Download className="h-3.5 w-3.5" />Export CSV</Button>
          </CardHeader>
          <CardContent>
            {byEmployee.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No data yet</p> : (
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
            {byCustomer.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No data yet</p> : (
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
            {mostUsed.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No data yet</p> : (
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
