import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Loader2, Trophy, Eye, Star, Clock, Shield, DollarSign, Package, CheckCircle2,
  XCircle, Users, BarChart3, Gavel, ChevronDown, ChevronUp, TrendingDown, RefreshCw
} from 'lucide-react';
import { formatDims } from '@/lib/fabricationDims';

// ── Helpers ───────────────────────────────────────────────────────────────────
const rfqStatusColor = (status) => {
  switch (status) {
    case 'Open': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Awarded': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Closed': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const bidStatusColor = (status) => {
  switch (status) {
    case 'Submitted': return 'bg-sky-100 text-sky-800';
    case 'Selected': return 'bg-emerald-100 text-emerald-800';
    case 'Rejected': return 'bg-red-100 text-red-700';
    case 'Invited': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const StarRating = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        className={`w-3 h-3 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
      />
    ))}
    <span className="text-xs text-slate-400 ml-1">({rating})</span>
  </div>
);

export default function VendorBids() {
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedRFQId, setSelectedRFQId] = useState(null);
  const [bidsModalOpen, setBidsModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState(null);
  const [selectedBidData, setSelectedBidData] = useState(null);
  const [page, setPage] = useState(1);

  // ── Fetch RFQs — paginated (this page browses full history, including
  // old Closed/Awarded RFQs, unlike RFQ Management's bounded active view) ──
  const { data: rfqResponse, isLoading: rfqLoading, refetch: refetchRFQs } = useQuery({
    queryKey: ['/api/rfq', page],
    queryFn: () => apiRequest('GET', `/api/rfq?page=${page}&limit=20`),
    keepPreviousData: true,
  });
  const rfqList = rfqResponse?.data || [];
  const rfqPagination = rfqResponse?.pagination || {};

  // ── Fetch bids for selected RFQ ───────────────────────────────────────────
  const { data: bidsData, isLoading: bidsLoading, refetch: refetchBids } = useQuery({
    queryKey: ['/api/rfq', selectedRFQId, 'bids'],
    queryFn: () => apiRequest('GET', `/api/rfq/${selectedRFQId}/bids`),
    enabled: !!selectedRFQId,
    select: (d) => d.data
  });

  // ── Select vendor mutation ────────────────────────────────────────────────
  const selectVendorMutation = useMutation({
    mutationFn: ({ rfqId, bidId }) => apiRequest('POST', `/api/rfq/${rfqId}/select-vendor`, { bidId }),
    onSuccess: (data) => {
      toast({
        title: '🎉 Vendor Selected!',
        description: data.message
      });
      setConfirmModalOpen(false);
      setBidsModalOpen(false);
      setSelectedRFQId(null);
      qc.invalidateQueries({ queryKey: ['/api/rfq'] });
      qc.invalidateQueries({ queryKey: ['/api/purchase-requests'] });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  // ── Resend a failed RFQ invite email ──────────────────────────────────────
  const resendMutation = useMutation({
    mutationFn: ({ rfqId, bidId }) => apiRequest('POST', `/api/rfq/${rfqId}/vendor-bid/${bidId}/resend`),
    onSuccess: (data) => {
      toast({ title: '📧 Email Resent', description: data.message });
      refetchBids();
    },
    onError: (err) => {
      toast({ title: 'Resend Failed', description: err.message, variant: 'destructive' });
    }
  });

  const handleViewBids = (rfq) => {
    setSelectedRFQId(rfq._id);
    setBidsModalOpen(true);
  };

  const handleSelectBid = (bid) => {
    setSelectedBidId(bid._id);
    setSelectedBidData(bid);
    setConfirmModalOpen(true);
  };

  const handleConfirmSelect = () => {
    selectVendorMutation.mutate({ rfqId: selectedRFQId, bidId: selectedBidId });
  };

  const rfqs = rfqList || [];
  const submittedBids = (bidsData?.bids || []).filter(b => b.status === 'Submitted' || b.status === 'Selected');
  const invitedBids = (bidsData?.bids || []).filter(b => b.status === 'Invited');

  // Find cheapest bid for highlight
  const cheapestPrice = submittedBids.length > 0
    ? Math.min(...submittedBids.map(b => b.unitPrice))
    : null;
  const fastestDelivery = submittedBids.length > 0
    ? Math.min(...submittedBids.map(b => b.deliveryDays))
    : null;

  const currentRFQ = bidsData?.rfq;

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Vendor Bids
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            View submitted quotations, compare vendors, and finalize the best bid.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchRFQs()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* ── RFQ List Table ─────────────────────────────────────────────── */}
      <Card className="shadow-sm border-0">
        <CardHeader className="border-b bg-slate-50/50 py-4">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-blue-500" />
            All RFQs — Bid Status
          </CardTitle>
          <CardDescription className="text-xs">
            Open RFQs show how many bids are received. Click "View Bids" to compare and select.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rfqLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : rfqs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Gavel className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No RFQs found</p>
              <p className="text-sm mt-1">Go to RFQ Management to send an RFQ first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">RFQ No</th>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">Product</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Qty</th>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">PR Reference</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Vendors</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Bids In</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Status</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqs.map(rfq => (
                    <tr key={rfq._id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800">{rfq.rfqNo}</td>
                      <td className="py-3 px-5 font-medium text-slate-700">
                        {rfq.productName}
                        {rfq.fabricationDimensionLines?.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                            {rfq.fabricationDimensionLines.map((l, i) => (
                              <span key={i}>{i > 0 && ' · '}{formatDims(l.values)} × {l.quantity}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center font-bold text-slate-700">{rfq.quantity}</td>
                      <td className="py-3 px-5 text-slate-500 text-xs">
                        {rfq.purchaseRequest?.requestId || '—'}
                      </td>
                      <td className="py-3 px-5 text-center text-slate-600">
                        {rfq.vendors?.length || 0}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`font-bold text-base ${(rfq.bidCount || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {rfq.bidCount || 0}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <Badge variant="outline" className={`text-xs font-bold ${rfqStatusColor(rfq.status)}`}>
                          {rfq.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-center">
                        {rfq.status === 'Awarded' ? (
                          <div className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {rfq.selectedVendor?.supplierName || 'Vendor Selected'}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleViewBids(rfq)}
                            className={`h-8 text-xs font-semibold shadow-sm ${(rfq.vendors?.length || 0) > 0 ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-200 text-slate-500 cursor-default'}`}
                            disabled={(rfq.vendors?.length || 0) === 0}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View Bids {(rfq.bidCount || 0) > 0 ? `(${rfq.bidCount})` : (rfq.failedEmailBids?.length || 0) > 0 ? '(email failed)' : ''}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rfqPagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={rfqPagination.page <= 1}>Previous</Button>
              <span className="text-sm text-slate-500">Page {rfqPagination.page} of {rfqPagination.pages} ({rfqPagination.total} RFQs)</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={rfqPagination.page >= rfqPagination.pages}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bids Comparison Modal ──────────────────────────────────────── */}
      <Dialog open={bidsModalOpen} onOpenChange={(open) => { setBidsModalOpen(open); if (!open) setSelectedRFQId(null); }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Bid Comparison — {currentRFQ?.rfqNo}
            </DialogTitle>
            <DialogDescription>
              {currentRFQ?.rfq?.productName || currentRFQ?.productName} · Qty: {currentRFQ?.quantity} · Compare vendor quotes and select the best offer.
            </DialogDescription>
            {currentRFQ?.fabricationDimensionLines?.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Covers: {currentRFQ.fabricationDimensionLines.map((l, i) => (
                  <span key={i}>{i > 0 && ' · '}{formatDims(l.values)} × {l.quantity}</span>
                ))}
              </p>
            )}
          </DialogHeader>

          {bidsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
              <p className="text-slate-400">Loading bids...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" /> Lowest Price
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-semibold">
                  <Clock className="w-3.5 h-3.5" /> Fastest Delivery
                </div>
              </div>

              {/* Submitted Bids */}
              {submittedBids.length === 0 ? (
                <div className="py-10 text-center bg-amber-50 rounded-xl border border-amber-200">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                  <p className="font-semibold text-amber-700">No bids submitted yet</p>
                  <p className="text-sm text-amber-600 mt-1">
                    {invitedBids.length} vendor(s) have been invited. Waiting for their responses.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submittedBids.map((bid, idx) => {
                    const isWinner = bid.status === 'Selected';
                    const isCheapest = bid.unitPrice === cheapestPrice;
                    const isFastest = bid.deliveryDays === fastestDelivery;

                    return (
                      <div
                        key={bid._id}
                        className={`rounded-xl border-2 p-4 transition-all ${
                          isWinner
                            ? 'border-emerald-400 bg-emerald-50'
                            : isCheapest
                            ? 'border-blue-200 bg-blue-50/50'
                            : 'border-slate-200 bg-white hover:border-purple-200'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          {/* Vendor Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-slate-800">{bid.vendorName}</span>
                              {isWinner && (
                                <Badge className="bg-emerald-500 text-white text-xs gap-1">
                                  <Trophy className="w-3 h-3" /> Selected
                                </Badge>
                              )}
                              {isCheapest && !isWinner && (
                                <Badge className="bg-blue-500 text-white text-xs">Lowest Price</Badge>
                              )}
                              {isFastest && !isWinner && (
                                <Badge className="bg-indigo-500 text-white text-xs">Fastest</Badge>
                              )}
                            </div>
                            <StarRating rating={bid.vendorRating || 3} />
                            {bid.remarks && (
                              <p className="text-xs text-slate-500 mt-1 italic">"{bid.remarks}"</p>
                            )}
                          </div>

                          {/* Bid Details */}
                          <div className="grid grid-cols-4 gap-3 text-center min-w-0 md:w-96 lg:w-auto">
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <DollarSign className="w-4 h-4 text-green-500 mx-auto mb-0.5" />
                              <p className="text-[10px] text-slate-400 uppercase">Unit Price</p>
                              <p className={`font-bold text-sm ${isCheapest ? 'text-emerald-600' : 'text-slate-800'}`}>
                                ₹{bid.unitPrice.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <Package className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
                              <p className="text-[10px] text-slate-400 uppercase">Total</p>
                              <p className="font-bold text-sm text-slate-800">
                                ₹{bid.totalPrice.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <Clock className="w-4 h-4 text-orange-500 mx-auto mb-0.5" />
                              <p className="text-[10px] text-slate-400 uppercase">Delivery</p>
                              <p className={`font-bold text-sm ${isFastest ? 'text-blue-600' : 'text-slate-800'}`}>
                                {bid.deliveryDays}d
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-slate-100">
                              <Shield className="w-4 h-4 text-purple-500 mx-auto mb-0.5" />
                              <p className="text-[10px] text-slate-400 uppercase">Warranty</p>
                              <p className="font-bold text-sm text-slate-800">
                                {bid.warrantyMonths}m
                              </p>
                            </div>
                          </div>

                          {/* Action */}
                          <div className="shrink-0">
                            {isWinner ? (
                              <div className="text-emerald-600 font-semibold text-sm flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Finalized
                              </div>
                            ) : currentRFQ?.status !== 'Awarded' && canEdit ? (
                              <Button
                                size="sm"
                                onClick={() => handleSelectBid(bid)}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-sm"
                              >
                                <Trophy className="w-3.5 h-3.5 mr-1" />
                                Select
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">Not Selected</Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-slate-400">
                          Submitted: {bid.submittedAt ? format(new Date(bid.submittedAt), 'dd MMM yyyy, hh:mm a') : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Awaiting vendors section */}
              {invitedBids.length > 0 && (
                <div className="border border-dashed border-amber-200 rounded-xl p-4 bg-amber-50/50">
                  <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Awaiting Response ({invitedBids.length})
                    {invitedBids.some(b => b.emailStatus === 'Failed') && (
                      <span className="normal-case font-semibold text-red-600 ml-1">
                        — {invitedBids.filter(b => b.emailStatus === 'Failed').length} email(s) failed to send
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {invitedBids.map(bid => (
                      bid.emailStatus === 'Failed' ? (
                        <div
                          key={bid._id}
                          title={bid.emailError || 'Email failed to send'}
                          className="flex items-center gap-1.5 text-xs bg-red-50 border border-red-200 text-red-700 rounded-full pl-3 pr-1.5 py-1"
                        >
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span>{bid.vendorName} — email failed</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-2 text-[11px] font-semibold text-red-700 hover:bg-red-100 hover:text-red-800"
                            disabled={resendMutation.isPending && resendMutation.variables?.bidId === bid._id}
                            onClick={() => resendMutation.mutate({ rfqId: selectedRFQId, bidId: bid._id })}
                          >
                            {resendMutation.isPending && resendMutation.variables?.bidId === bid._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Resend'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span key={bid._id} className="text-xs bg-white border border-amber-200 text-amber-700 rounded-full px-3 py-1">
                          {bid.vendorName}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setBidsModalOpen(false); setSelectedRFQId(null); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Select Vendor Modal ────────────────────────────────── */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Trophy className="w-5 h-5 text-amber-500" />
              Confirm Vendor Selection
            </DialogTitle>
          </DialogHeader>

          {selectedBidData && (
            <div className="space-y-4 py-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-bold text-slate-700 text-base">{selectedBidData.vendorName}</p>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <p className="text-xs text-slate-400">Unit Price</p>
                    <p className="font-bold text-emerald-600 text-base">₹{selectedBidData.unitPrice?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <p className="text-xs text-slate-400">Delivery</p>
                    <p className="font-bold text-blue-600 text-base">{selectedBidData.deliveryDays} Days</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <p className="text-xs text-slate-400">Warranty</p>
                    <p className="font-bold text-purple-600">{selectedBidData.warrantyMonths} Months</p>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                    <p className="text-xs text-slate-400">Total Value</p>
                    <p className="font-bold text-slate-800">₹{selectedBidData.totalPrice?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">On confirmation:</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Purchase Order will be <strong>automatically created</strong></li>
                  <li>Confirmation email will be sent to the vendor</li>
                  <li>Other vendors' bids will be marked as rejected</li>
                  <li>You can view the PO from Purchase Requests</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)} disabled={selectVendorMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSelect}
              disabled={selectVendorMutation.isPending}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold"
            >
              {selectVendorMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Trophy className="w-4 h-4 mr-2" /> Confirm & Generate PO</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
