import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesItemRequestApi } from '@/api/salesItemRequestApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, RefreshCw, PackagePlus, Package } from 'lucide-react';

const getImageUrl = (path) => {
  if (!path || path.trim() === '') return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
  return `${baseUrl}${path}`;
};

const TABS = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' },
];

function RequestCard({ request, onReview, isReviewing }) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [remarks, setRemarks] = useState('');
  const imageUrl = getImageUrl(request.image);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="h-16 w-16 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={request.productName} className="h-full w-full object-cover" />
            ) : (
              <Package className="h-6 w-6 text-gray-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold text-gray-800">{request.productName}</p>
              {request.leadCode && <Badge variant="outline" className="text-[10px]">Lead #{request.leadCode}</Badge>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
              {request.category && <span>Category: <span className="text-gray-700">{request.category}</span></span>}
              {request.production && <span>Production: <span className="text-gray-700">{request.production}</span></span>}
              {request.application && <span>Application: <span className="text-gray-700">{request.application}</span></span>}
              <span>Quantity: <span className="text-gray-700">{request.quantity}</span></span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Requested by {request.requestedBy?.fullName || request.requestedBy?.username || 'Unknown'} · {new Date(request.createdAt).toLocaleString()}
            </p>
            {request.status !== 'Pending' && (
              <p className="text-xs text-gray-500 mt-1">
                {request.status} by {request.reviewedBy?.fullName || request.reviewedBy?.username || '—'}
                {request.reviewedAt ? ` on ${new Date(request.reviewedAt).toLocaleString()}` : ''}
                {request.reviewRemarks ? ` — "${request.reviewRemarks}"` : ''}
              </p>
            )}
          </div>

          {request.status === 'Pending' && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isReviewing}
                  onClick={() => onReview(request._id, 'approve')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  disabled={isReviewing}
                  onClick={() => setShowRejectBox(v => !v)}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />Reject
                </Button>
              </div>
              {showRejectBox && (
                <div className="w-64 space-y-2">
                  <Textarea
                    rows={2}
                    className="text-sm"
                    placeholder="Reason (optional)"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowRejectBox(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isReviewing}
                      onClick={() => onReview(request._id, 'reject', remarks)}
                    >
                      Confirm Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SalesItemRequests() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Pending');

  const { data, isLoading } = useQuery({
    queryKey: ['sales-item-requests', 'rnd', tab],
    queryFn: () => salesItemRequestApi.listRequests({ status: tab }),
  });
  const requests = data?.requests || [];

  const reviewM = useMutation({
    mutationFn: ({ id, decision, remarks }) => salesItemRequestApi.reviewRequest(id, { decision, remarks }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['sales-item-requests'] });
      toast({ title: variables.decision === 'approve' ? 'Approved' : 'Rejected', description: 'The Sales user has been notified.' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleReview = (id, decision, remarks) => reviewM.mutate({ id, decision, remarks });

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <PackagePlus className="h-5 w-5 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-800">Sales Item Requests</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        New products Sales has asked to be added, raised from a specific lead's Quotation page. Approving just marks it — add the actual product via Product Master using these details as reference.
      </p>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Clock className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No {tab.toLowerCase()} requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <RequestCard key={r._id} request={r} onReview={handleReview} isReviewing={reviewM.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}
