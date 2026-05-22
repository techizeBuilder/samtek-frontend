import React from 'react';
import { useMarketing } from '@/contexts/MarketingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Upload, Edit } from 'lucide-react';

const ACTION_CONFIG = {
  Upload: { icon: Upload, color: 'bg-blue-100 text-blue-700', bg: 'bg-blue-50', text: 'uploaded a new asset' },
  Edit:   { icon: Edit,   color: 'bg-yellow-100 text-yellow-700', bg: 'bg-yellow-50', text: 'updated an asset' },
};

export default function MarketingNotifications() {
  const { notifications, notifLoading } = useMarketing();

  const fmt = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (notifLoading) return <div className="p-6 flex items-center justify-center min-h-64 text-slate-500">Loading notifications...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="text-slate-500 text-sm mt-1">Recent content uploads and updates</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Recent Activity
            {notifications.length > 0 && <Badge className="bg-blue-600 text-white">{notifications.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm">Upload or edit assets to see activity here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n, i) => {
                const cfg = ACTION_CONFIG[n.action] || ACTION_CONFIG.Upload;
                const Icon = cfg.icon;
                return (
                  <div key={n._id || i} className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg}`}>
                    <div className={`p-2 rounded-lg shrink-0 ${cfg.color}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">{n.performedBy?.fullName || 'Someone'}</span>
                        {' '}{cfg.text}
                        {n.assetName && <span className="font-medium"> "{n.assetName}"</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{fmt(n.createdAt)}</p>
                    </div>
                    <Badge className={`text-xs border-0 shrink-0 ${cfg.color}`}>{n.action}</Badge>
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
