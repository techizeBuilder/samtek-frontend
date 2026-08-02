import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingRequestApi } from '@/api/marketingRequestService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Inbox, Clock, CheckCircle2, XCircle, User, Building2, Send,
  Film, FileText, Image as ImageIcon, SearchX, CheckSquare, Square, RefreshCw
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

const MATCH_MESSAGES = {
  product: { text: 'Matching content found by product name', cls: 'bg-green-50 border-green-200 text-green-700' },
  subcategory: { text: 'No exact match by product name — showing Sub-Category content', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
  category: { text: 'No match by product/sub-category — showing Category content', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
};

export default function SalesRequests() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('Pending');
  const [page, setPage] = useState(1);

  // Approve modal state
  const [approveReq, setApproveReq] = useState(null);
  const [selectedAssets, setSelectedAssets] = useState([]);

  // Reject modal state
  const [rejectReq, setRejectReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Reset to page 1 whenever the status tab changes so the user doesn't
  // land on a now-out-of-range page.
  useEffect(() => { setPage(1); }, [filter]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['marketing-sales-requests', page, filter],
    queryFn: () => marketingRequestApi.getAll({ page, limit: 20, status: filter }),
  });
  const filtered = data?.data || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };
  const summary = data?.summary || { Pending: 0, Approved: 0, Rejected: 0, All: 0 };

  // Matching assets for the request being approved
  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ['mkt-request-matches', approveReq?._id],
    queryFn: () => marketingRequestApi.getMatchingAssets(approveReq._id),
    enabled: !!approveReq,
  });
  const matchLevel = matchData?.data?.matchLevel || 'none';
  const matchAssets = matchData?.data?.assets || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['marketing-sales-requests'] });
    qc.invalidateQueries({ queryKey: ['my-marketing-requests'] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, assetIds }) => marketingRequestApi.approve(id, assetIds),
    onSuccess: () => {
      toast({ title: 'Approved', description: 'Content has been sent to the sales team' });
      setApproveReq(null);
      setSelectedAssets([]);
      invalidate();
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => marketingRequestApi.reject(id, reason),
    onSuccess: () => {
      toast({ title: 'Rejected', description: 'The request has been rejected' });
      setRejectReq(null);
      setRejectReason('');
      invalidate();
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const toggleAsset = (id) => setSelectedAssets(prev =>
    prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
  );

  const openApprove = (req) => { setApproveReq(req); setSelectedAssets([]); };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="h-6 w-6 text-indigo-600" />Sales Requests
          </h1>
          <p className="text-slate-500 text-sm mt-1">Content requests from the sales team — approve to send content</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        {['Pending', 'Approved', 'Rejected', 'All'].map(s => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            className="rounded-full text-xs"
            onClick={() => setFilter(s)}
          >
            {s}{s !== 'All' && ` (${summary[s] ?? 0})`}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-64 text-slate-500">Loading requests...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-slate-400">
          <Inbox className="h-10 w-10 mx-auto mb-3" />
          <p className="font-medium">No {filter === 'All' ? '' : filter.toLowerCase()} requests</p>
          <p className="text-sm">Requests sent by the sales team will appear here</p>
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
                        {' · '}{new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {req.status === 'Pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => openApprove(req)}>
                          <CheckCircle2 className="h-3.5 w-3.5" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-red-600 hover:bg-red-50" onClick={() => { setRejectReq(req); setRejectReason(''); }}>
                          <XCircle className="h-3.5 w-3.5" />Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
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
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" />Requested By</span>
                      <span className="text-xs text-slate-700">{req.requestedBy?.fullName || req.requestedBy?.username || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Notes</span>
                      <span className="text-xs text-slate-700">{req.notes || '—'}</span>
                    </div>
                  </div>

                  {req.status === 'Approved' && req.sentAssets?.length > 0 && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      {req.sentAssets.length} file(s) sent: {req.sentAssets.map(a => a.fileName).join(', ')}
                    </p>
                  )}
                  {req.status === 'Rejected' && req.rejectReason && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">Reason: {req.rejectReason}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages} ({pagination.total} requests)</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
        </div>
      )}

      {/* ─── Approve Modal: matching content select + send ─────────── */}
      <Dialog open={!!approveReq} onOpenChange={(o) => { if (!o) { setApproveReq(null); setSelectedAssets([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-green-600" />Send Content — {approveReq?.productName}
            </DialogTitle>
            <DialogDescription>
              {approveReq?.category?.name || 'No category'}{approveReq?.subcategory?.name ? ` › ${approveReq.subcategory.name}` : ''} · Lead {approveReq?.lead?.leadCode}
            </DialogDescription>
          </DialogHeader>

          {matchLoading ? (
            <div className="py-12 text-center text-slate-500">Searching for matching content...</div>
          ) : matchAssets.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <SearchX className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium text-slate-600">Not Found</p>
              <p className="text-sm">No content related to this product, sub-category or category exists in the library.<br />Please add content via Upload Content first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className={cn('text-xs border rounded-lg px-3 py-2', MATCH_MESSAGES[matchLevel]?.cls)}>
                {MATCH_MESSAGES[matchLevel]?.text} ({matchAssets.length} items) — select the files you want to send
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {matchAssets.map(asset => {
                  const selected = selectedAssets.includes(asset._id);
                  return (
                    <div
                      key={asset._id}
                      className={cn(
                        'border-2 rounded-lg overflow-hidden bg-white cursor-pointer transition-all relative',
                        selected ? 'border-green-500 ring-2 ring-green-200' : 'border-slate-200 hover:border-slate-300'
                      )}
                      onClick={() => toggleAsset(asset._id)}
                    >
                      <div className="absolute top-1.5 right-1.5 z-10 bg-white rounded shadow-sm">
                        {selected ? <CheckSquare className="h-5 w-5 text-green-600" /> : <Square className="h-5 w-5 text-slate-300" />}
                      </div>
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
                        <p className="text-[10px] text-slate-400 truncate">{asset.product || asset.category?.name || asset.fileType}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveReq(null); setSelectedAssets([]); }}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              disabled={selectedAssets.length === 0 || approveMutation.isPending}
              onClick={() => approveMutation.mutate({ id: approveReq._id, assetIds: selectedAssets })}
            >
              {approveMutation.isPending ? (
                <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
              ) : (
                <><Send className="h-4 w-4" />Send ({selectedAssets.length})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Reject Modal ───────────────────────────────────────────── */}
      <Dialog open={!!rejectReq} onOpenChange={(o) => { if (!o) setRejectReq(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" />Reject Request</DialogTitle>
            <DialogDescription>"{rejectReq?.productName}" — Lead {rejectReq?.lead?.leadCode}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Input className="mt-1" placeholder="Reason for rejection" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectReq(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: rejectReq._id, reason: rejectReason })}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
