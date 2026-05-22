import React from 'react';
import { Link } from 'wouter';
import { useMarketing } from '@/contexts/MarketingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Upload, Share2, BarChart, FileText, Package, Clock, TrendingUp } from 'lucide-react';

const FILE_COLORS = { PDF: 'bg-red-100 text-red-700', DOC: 'bg-blue-100 text-blue-700', DOCX: 'bg-blue-100 text-blue-700', JPG: 'bg-green-100 text-green-700', JPEG: 'bg-green-100 text-green-700', PNG: 'bg-green-100 text-green-700', WEBP: 'bg-green-100 text-green-700', MP4: 'bg-purple-100 text-purple-700', MOV: 'bg-purple-100 text-purple-700' };

export default function MarketingDashboard() {
  const { dashboard, dashboardLoading } = useMarketing();
  const { totalAssets = 0, totalCategories = 0, sharesToday = 0, totalShares = 0, recentUploads = [], topAssets = [], fileTypeBreakdown = [] } = dashboard;

  const stats = [
    { label: 'Total Assets', value: totalAssets, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Categories', value: totalCategories, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Shares Today', value: sharesToday, icon: Share2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Shares', value: totalShares, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const quickLinks = [
    { label: 'Marketing Library', path: '/marketing/library', icon: FolderOpen, desc: 'Browse all assets', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Upload Content', path: '/marketing/upload', icon: Upload, desc: 'Add new assets', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Category Management', path: '/marketing/categories', icon: Package, desc: 'Manage categories', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Reports', path: '/marketing/reports', icon: BarChart, desc: 'Sharing analytics', color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Audit Logs', path: '/marketing/audit-logs', icon: FileText, desc: 'Track all actions', color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Notifications', path: '/marketing/notifications', icon: Clock, desc: 'Recent updates', color: 'text-pink-600', bg: 'bg-pink-50' },
  ];

  if (dashboardLoading) return <div className="p-6 flex items-center justify-center min-h-64 text-slate-500">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Centralized marketing content repository</p>
        </div>
        <Link href="/marketing/upload">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Upload className="h-4 w-4" /> Upload Content
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
              <div><p className="text-2xl font-bold text-slate-900">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickLinks.map(l => (
            <Link key={l.path} href={l.path}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${l.bg}`}><l.icon className={`h-5 w-5 ${l.color}`} /></div>
                  <div><p className="font-medium text-slate-800 text-sm">{l.label}</p><p className="text-xs text-slate-500">{l.desc}</p></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Uploads</CardTitle></CardHeader>
          <CardContent>
            {recentUploads.length === 0 ? <p className="text-slate-400 text-sm text-center py-4">No uploads yet</p> : (
              <div className="space-y-2">
                {recentUploads.map(a => (
                  <div key={a._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${FILE_COLORS[a.fileType] || 'bg-slate-100 text-slate-600'}`}>{a.fileType}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.fileName}</p>
                      <p className="text-xs text-slate-400">{a.category?.name || 'Uncategorized'} · {a.uploadedBy?.fullName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Shared Assets */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Most Shared Assets</CardTitle></CardHeader>
          <CardContent>
            {topAssets.length === 0 ? <p className="text-slate-400 text-sm text-center py-4">No shares yet</p> : (
              <div className="space-y-2">
                {topAssets.map((a, i) => (
                  <div key={a._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <span className="text-sm font-bold text-slate-400 w-5">#{i + 1}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${FILE_COLORS[a.fileType] || 'bg-slate-100 text-slate-600'}`}>{a.fileType}</span>
                    <p className="flex-1 text-sm font-medium text-slate-800 truncate">{a.fileName}</p>
                    <span className="text-xs text-slate-500 shrink-0">{a.shareCount} shares</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File Type Breakdown */}
      {fileTypeBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Assets by File Type</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {fileTypeBreakdown.map(f => (
                <div key={f._id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${FILE_COLORS[f._id] || 'bg-slate-100 text-slate-600'}`}>
                  <span className="font-bold text-sm">{f._id}</span>
                  <span className="text-sm">{f.count} files</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
