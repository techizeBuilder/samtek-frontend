import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadSettingRequestApi } from '@/api/leadSettingRequestApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, RefreshCw, Settings2 } from 'lucide-react';

const FIELD_LABELS = {
  leadStages: 'Lead Stage',
  leadSources: 'Lead Source',
  businessTypes: 'Business Type',
  documentTypes: 'Document Type',
  leadRejectReasons: 'Lead Reject Reason',
  salesChecklist: 'Sales Checklist',
};

const describeItem = (field, item) => {
  if (!item) return '(deleted)';
  if (field === 'salesChecklist') return item.label;
  return item.name ?? item.label ?? '';
};

const TABS = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' },
];

function RequestCard({ request, onReview, isReviewing }) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [remarks, setRemarks] = useState('');
  const actionLabel = request.action === 'add' ? 'Add' : request.action === 'edit' ? 'Edit' : 'Delete';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge variant="outline" className="text-xs">{FIELD_LABELS[request.field] || request.field}</Badge>
              <Badge className="text-xs" variant="secondary">{actionLabel}</Badge>
            </div>
            <p className="text-sm text-gray-800">
              {request.action === 'delete' && <>Delete <span className="font-medium">"{describeItem(request.field, request.previousValue)}"</span></>}
              {request.action === 'add' && <>Add <span className="font-medium">"{describeItem(request.field, request.payload)}"</span></>}
              {request.action === 'edit' && (
                <>
                  <span className="font-medium">"{describeItem(request.field, request.previousValue)}"</span>
                  {' → '}
                  <span className="font-medium">"{describeItem(request.field, request.payload)}"</span>
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Requested by {request.requestedBy?.fullName || request.requestedBy?.username || 'Unknown'} · {new Date(request.requestedAt || request.createdAt).toLocaleString()}
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

export default function LeadSettingRequests() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Pending');

  const { data, isLoading } = useQuery({
    queryKey: ['lead-setting-requests', 'company-admin', tab],
    queryFn: () => leadSettingRequestApi.listRequests({ status: tab }),
  });
  const requests = data?.requests || [];

  const reviewM = useMutation({
    mutationFn: ({ id, decision, remarks }) => leadSettingRequestApi.reviewRequest(id, { decision, remarks }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['lead-setting-requests'] });
      toast({ title: variables.decision === 'approve' ? 'Approved' : 'Rejected', description: 'The Sales Head has been notified.' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleReview = (id, decision, remarks) => reviewM.mutate({ id, decision, remarks });

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <Settings2 className="h-5 w-5 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-800">Lead Setting Requests</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Changes to Lead Stage / Source / Business Type / Document Type / Reject Reason / Sales Checklist proposed by your Sales Head — nothing goes live until approved here.
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
