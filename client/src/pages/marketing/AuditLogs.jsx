import React, { useState } from 'react';
import { useMarketing } from '@/contexts/MarketingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Edit, Trash2, Share2, History } from 'lucide-react';

const ACTION_CONFIG = {
  Upload: { icon: Upload, color: 'bg-blue-100 text-blue-700', label: 'Uploaded' },
  Edit:   { icon: Edit,   color: 'bg-yellow-100 text-yellow-700', label: 'Edited' },
  Delete: { icon: Trash2, color: 'bg-red-100 text-red-700', label: 'Deleted' },
  Share:  { icon: Share2, color: 'bg-green-100 text-green-700', label: 'Shared' },
};

const METHOD_COLORS = { WhatsApp: 'bg-green-100 text-green-700', Email: 'bg-blue-100 text-blue-700' };

export default function AuditLogs() {
  const { auditLogs, auditLoading } = useMarketing();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? auditLogs : auditLogs.filter(l => l.action === filter);

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (auditLoading) return <div className="p-6 flex items-center justify-center min-h-64 text-slate-500">Loading audit logs...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} records</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="Upload">Uploads</SelectItem>
            <SelectItem value="Edit">Edits</SelectItem>
            <SelectItem value="Delete">Deletes</SelectItem>
            <SelectItem value="Share">Shares</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Activity History</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History className="h-10 w-10 mx-auto mb-3" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((log, i) => {
                const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.Upload;
                const Icon = cfg.icon;
                return (
                  <div key={log._id || i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border-b last:border-0">
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cfg.color}`}><Icon className="h-3.5 w-3.5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-800 text-sm">{log.performedBy?.fullName || 'Unknown'}</span>
                        <Badge className={`text-xs ${cfg.color} border-0`}>{cfg.label}</Badge>
                        {log.assetName && <span className="text-sm text-slate-600 truncate">"{log.assetName}"</span>}
                      </div>
                      {log.action === 'Share' && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {log.shareMethod && <Badge className={`text-xs border-0 ${METHOD_COLORS[log.shareMethod] || 'bg-slate-100 text-slate-600'}`}>{log.shareMethod}</Badge>}
                          {log.customerName && <span className="text-xs text-slate-500">→ {log.customerName}</span>}
                          {log.customerPhone && <span className="text-xs text-slate-400">{log.customerPhone}</span>}
                          {log.customerEmail && <span className="text-xs text-slate-400">{log.customerEmail}</span>}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{fmt(log.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${cfg.color}`}>{log.action}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
