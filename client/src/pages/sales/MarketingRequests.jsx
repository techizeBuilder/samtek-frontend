import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketingRequestApi } from '@/api/marketingRequestService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Megaphone, Mail, MessageSquare, Clock, CheckCircle2, XCircle,
  Phone, User, Building2, Eye, Film, FileText, Image as ImageIcon, RefreshCw
} from 'lucide-react';

const IMAGE_TYPES = ['JPG', 'JPEG', 'PNG', 'WEBP'];
const VIDEO_TYPES = ['MP4', 'MOV'];

const getFileUrl = (fileUrl) => {
  const base = window.location.origin.replace(':5173', ':5000').replace(':3000', ':5000');
  return `${base}/${fileUrl}`;
};

const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};
const STATUS_ICONS = { Pending: Clock, Approved: CheckCircle2, Rejected: XCircle };

export default function MarketingRequests() {
  const { toast } = useToast();
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);

  const changeFilter = (value) => { setFilter(value); setPage(1); };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-marketing-requests', filter, page],
    queryFn: () => marketingRequestApi.getMy({ status: filter, page, limit: 20 }),
    keepPreviousData: true,
  });
  // Already filtered/paginated server-side — `filtered` name kept for minimal diff below.
  const filtered = data?.data || [];
  const pagination = data?.pagination || {};
  const statusCounts = data?.summary || {};

  const comingSoon = () => toast({ title: 'Coming Soon', description: 'Send API is not integrated yet — it will be active soon' });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-orange-600" />Marketing Requests
          </h1>
          <p className="text-slate-500 text-sm mt-1">Content requests sent from your leads and their status</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        {['All', 'Pending', 'Approved', 'Rejected'].map(s => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            className="rounded-full text-xs"
            onClick={() => changeFilter(s)}
          >
            {s}{s !== 'All' && ` (${statusCounts[s] || 0})`}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-64 text-slate-500">Loading requests...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-slate-400">
          <Megaphone className="h-10 w-10 mx-auto mb-3" />
          <p className="font-medium">No requests found</p>
          <p className="text-sm">Send a request from the Megaphone icon on any lead card in the Leads page</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => {
            const StatusIcon = STATUS_ICONS[req.status] || Clock;
            return (
              <Card key={req._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {req.productName}
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1', STATUS_STYLES[req.status])}>
                          <StatusIcon className="h-3 w-3" />{req.status}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        {req.category?.name || 'No category'}{req.subcategory?.name ? ` › ${req.subcategory.name}` : ''}
                        {' · '}Requested on {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {req.status === 'Approved' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-blue-600 hover:bg-blue-50" title="Send via Email" onClick={comingSoon}>
                          <Mail className="h-3.5 w-3.5" />Mail
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-green-600 hover:bg-green-50" title="Send via WhatsApp" onClick={comingSoon}>
                          <MessageSquare className="h-3.5 w-3.5" />WhatsApp
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Lead / Customer details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Building2 className="h-3 w-3" />Lead</span>
                      <span className="text-xs text-slate-700 font-medium">{req.lead?.leadCode || 'N/A'} — {req.lead?.companyName || ''}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" />Customer</span>
                      <span className="text-xs text-slate-700">{req.lead?.contactPerson || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>
                      <span className="text-xs text-slate-700 break-all">{req.lead?.email || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Phone className="h-3 w-3" />Mobile</span>
                      <span className="text-xs text-slate-700">{req.lead?.mobile || 'N/A'}</span>
                    </div>
                  </div>

                  {req.status === 'Rejected' && req.rejectReason && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">Reason: {req.rejectReason}</p>
                  )}

                  {/* Received content after approval */}
                  {req.status === 'Approved' && req.sentAssets?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-2">Received Content ({req.sentAssets.length})</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {req.sentAssets.map(asset => (
                          <div key={asset._id} className="border border-slate-200 rounded-lg overflow-hidden bg-white group">
                            <div className="h-24 bg-slate-100 flex items-center justify-center overflow-hidden">
                              {IMAGE_TYPES.includes(asset.fileType) ? (
                                <img src={getFileUrl(asset.fileUrl)} alt={asset.fileName} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                              ) : VIDEO_TYPES.includes(asset.fileType) ? (
                                <video src={getFileUrl(asset.fileUrl)} className="w-full h-full object-cover" muted preload="metadata" />
                              ) : (
                                <FileText className="h-8 w-8 text-slate-400" />
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-[11px] font-medium text-slate-700 truncate flex items-center gap-1">
                                {VIDEO_TYPES.includes(asset.fileType) ? <Film className="h-3 w-3 text-purple-500 shrink-0" /> : IMAGE_TYPES.includes(asset.fileType) ? <ImageIcon className="h-3 w-3 text-blue-500 shrink-0" /> : <FileText className="h-3 w-3 text-slate-400 shrink-0" />}
                                {asset.fileName}
                              </p>
                              <Button size="sm" variant="ghost" className="w-full h-6 mt-1 text-[10px] gap-1" onClick={() => window.open(getFileUrl(asset.fileUrl), '_blank')}>
                                <Eye className="h-3 w-3" />View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={pagination.page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages} ({pagination.total} requests)
          </span>
          <Button
            variant="outline" size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={pagination.page >= pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
