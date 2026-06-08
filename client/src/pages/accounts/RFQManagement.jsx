import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Loader2, Send, Eye, FileText, CheckCircle2, AlertCircle, Clock, Package,
  ChevronRight, Users, Mail, BarChart3, Gavel, RefreshCw, Tag
} from 'lucide-react';

// ── Status badge helper ───────────────────────────────────────────────────────
const prStatusColor = (status) => {
  switch (status) {
    case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'Approved': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'Ordered': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'Received': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-300';
  }
};

const rfqStatusColor = (status) => {
  switch (status) {
    case 'Open': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Awarded': return 'bg-green-100 text-green-800 border-green-300';
    case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const priorityColor = (p) => {
  switch (p) {
    case 'High': return 'text-rose-600 bg-rose-50 border-rose-200';
    case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    default: return 'text-slate-500 bg-slate-50';
  }
};

export default function RFQManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── State ─────────────────────────────────────────────────────────────────
  // Inline date/notes — no pre-modal needed for category-matched flow
  const [sendingPRId, setSendingPRId] = useState(null); // tracks which row is loading

  // Manual vendor selection modal — only shown when backend returns 400 (no match)
  const [manualModal, setManualModal] = useState(false);
  const [manualPR, setManualPR] = useState(null);           // the PR being processed
  const [manualVendorList, setManualVendorList] = useState([]); // allVendors from backend
  const [manualVendorIds, setManualVendorIds] = useState([]); // user's checked selections
  const [manualRequiredByDate, setManualRequiredByDate] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [detectedCategory, setDetectedCategory] = useState('');

  // View RFQ modal
  const [viewRFQModal, setViewRFQModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: prData, isLoading: prLoading, refetch: refetchPRs } = useQuery({
    queryKey: ['/api/purchase-requests'],
    queryFn: () => apiRequest('GET', '/api/purchase-requests'),
    select: (d) => d.data || []
  });

  const { data: rfqData, isLoading: rfqLoading, refetch: refetchRFQs } = useQuery({
    queryKey: ['/api/rfq'],
    queryFn: () => apiRequest('GET', '/api/rfq'),
    select: (d) => d.data || []
  });

  const { data: statsData } = useQuery({
    queryKey: ['/api/rfq/stats'],
    queryFn: () => apiRequest('GET', '/api/rfq/stats'),
    select: (d) => d.data || {}
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  // Helper: invalidate all RFQ-related queries after success
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['/api/rfq'] });
    qc.invalidateQueries({ queryKey: ['/api/purchase-requests'] });
    qc.invalidateQueries({ queryKey: ['/api/rfq/stats'] });
  };

  // Direct send — category matched vendors → no modal
  const autoSendMutation = useMutation({
    mutationFn: (payload) => apiRequest('POST', '/api/rfq', payload),
    onSuccess: (data) => {
      toast({ title: '✅ RFQ Sent!', description: data.message });
      setSendingPRId(null);
      invalidateAll();
    },
    onError: (err) => {
      setSendingPRId(null);

      // Parse backend error — check if it has allVendors (no category match)
      let errData = null;
      try { errData = JSON.parse(err.message || '{}'); } catch (_) {}
      const noMatchPayload = errData?.data?.allVendors ? errData.data
        : err?.data?.allVendors ? err.data
        : null;

      if (noMatchPayload) {
        // Open manual selection modal with vendor list
        setManualVendorList(noMatchPayload.allVendors || []);
        setDetectedCategory(noMatchPayload.detectedCategory || '');
        setManualVendorIds([]);
        setManualModal(true);
        return;
      }

      toast({ title: 'Failed', description: err.message || 'Could not send RFQ', variant: 'destructive' });
    }
  });

  // Manual send — user selected vendors explicitly
  const manualSendMutation = useMutation({
    mutationFn: (payload) => apiRequest('POST', '/api/rfq', payload),
    onSuccess: (data) => {
      toast({ title: '✅ RFQ Sent!', description: data.message });
      setManualModal(false);
      setManualPR(null);
      setManualVendorIds([]);
      invalidateAll();
    },
    onError: (err) => {
      toast({ title: 'Failed', description: err.message || 'Could not send RFQ', variant: 'destructive' });
    }
  });

  // "Send RFQ" button on the table row — fire directly, no modal
  const handleSendRFQ = (pr) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const requiredByDate = defaultDate.toISOString().split('T')[0];

    // Store PR info in case we need manual modal later
    setManualPR(pr);
    setManualRequiredByDate(requiredByDate);
    setManualNotes('');
    setSendingPRId(pr._id);

    autoSendMutation.mutate({
      purchaseRequestId: pr._id,
      requiredByDate,
      notes: ''
    });
  };

  // "Send to X Vendors" inside manual modal
  const handleManualSend = () => {
    if (!manualPR || manualVendorIds.length === 0) return;
    manualSendMutation.mutate({
      purchaseRequestId: manualPR._id,
      requiredByDate: manualRequiredByDate,
      notes: manualNotes,
      vendorIds: manualVendorIds
    });
  };

  const toggleManualVendor = (vendorId) => {
    setManualVendorIds(prev =>
      prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]
    );
  };

  const handleViewRFQ = async (pr) => {
    const rfq = (rfqData || []).find(r => r.purchaseRequest?._id === pr._id || r.purchaseRequest === pr._id);
    if (rfq) {
      setSelectedRFQ(rfq);
      setViewRFQModal(true);
    }
  };

  // Filter PRs: only show Pending or Approved (Ordered ones already have PO or RFQ)
  const purchaseRequests = (prData || []).filter(pr => ['Pending', 'Approved'].includes(pr.status));
  const rfqList = rfqData || [];

  // Map rfqNo to PR for quick lookup
  const rfqByPRId = {};
  rfqList.forEach(rfq => {
    const prId = rfq.purchaseRequest?._id || rfq.purchaseRequest;
    if (prId) rfqByPRId[prId] = rfq;
  });

  const isLoading = prLoading || rfqLoading;

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Gavel className="w-6 h-6 text-blue-600" />
            RFQ Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Send RFQs to vendors for purchase requests. Vendors submit bids, you compare and select the best.
          </p>
        </div>
        <Button variant="outline" onClick={() => { refetchPRs(); refetchRFQs(); }} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total RFQs', value: statsData.total || 0, icon: FileText, color: 'text-blue-600 bg-blue-50' },
            { label: 'Open RFQs', value: statsData.open || 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Awarded', value: statsData.awarded || 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Total Bids', value: statsData.totalBids || 0, icon: Users, color: 'text-purple-600 bg-purple-50' },
            { label: 'Awaiting Bids', value: statsData.pendingBids || 0, icon: Mail, color: 'text-rose-600 bg-rose-50' },
          ].map(s => (
            <Card key={s.label} className="shadow-sm border-0">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-xl font-bold text-slate-800">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Purchase Requests needing RFQ ─────────────────────────────── */}
      <Card className="shadow-sm border-0">
        <CardHeader className="border-b bg-slate-50/50 py-4">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            Purchase Requests — Send RFQ
          </CardTitle>
          <CardDescription className="text-xs">
            These requests need vendor quotations. Click "Send RFQ" to invite vendors to bid.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : purchaseRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No pending purchase requests</p>
              <p className="text-sm mt-1">All requests either have RFQs sent or are already ordered.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">Req ID</th>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">Product</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Qty</th>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">Date</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Priority</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Status</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequests.map(pr => {
                    const existingRFQ = rfqByPRId[pr._id];
                    return (
                      <tr key={pr._id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-5 font-bold text-slate-800">{pr.requestId}</td>
                        <td className="py-3 px-5 font-medium text-slate-700">{pr.productName}</td>
                        <td className="py-3 px-5 text-center font-bold text-slate-700">{pr.quantity}</td>
                        <td className="py-3 px-5 text-slate-500">
                          {pr.requestDate ? format(new Date(pr.requestDate), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <Badge variant="outline" className={`text-xs font-semibold ${priorityColor(pr.priority)}`}>
                            {pr.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-5 text-center">
                          <Badge variant="outline" className={`text-xs font-bold ${prStatusColor(pr.status)}`}>
                            {pr.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-5 text-center">
                          {existingRFQ ? (
                            <div className="flex items-center justify-center gap-2">
                              <Badge variant="outline" className={`text-xs ${rfqStatusColor(existingRFQ.status)}`}>
                                {existingRFQ.rfqNo}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-50 h-7 px-2"
                                onClick={() => handleViewRFQ(pr)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-semibold shadow-sm"
                              disabled={sendingPRId === pr._id}
                              onClick={() => handleSendRFQ(pr)}
                            >
                              {sendingPRId === pr._id ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Sending...</>
                              ) : (
                                <><Send className="w-3.5 h-3.5 mr-1" /> Send RFQ</>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Active RFQs ────────────────────────────────────────────────── */}
      {rfqList.length > 0 && (
        <Card className="shadow-sm border-0">
          <CardHeader className="border-b bg-slate-50/50 py-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Active RFQs
            </CardTitle>
            <CardDescription className="text-xs">All sent RFQs and their bid status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">RFQ No</th>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">Product</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Qty</th>
                    <th className="text-left py-3 px-5 font-semibold text-slate-600">Vendors</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Bids Received</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Status</th>
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Sent On</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqList.map(rfq => (
                    <tr key={rfq._id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800">{rfq.rfqNo}</td>
                      <td className="py-3 px-5 font-medium text-slate-700">{rfq.productName}</td>
                      <td className="py-3 px-5 text-center font-bold text-slate-700">{rfq.quantity}</td>
                      <td className="py-3 px-5 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {rfq.vendors?.length || 0} vendors
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`font-bold text-sm ${(rfq.bidCount || 0) > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                          {rfq.bidCount || 0}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <Badge variant="outline" className={`text-xs font-bold ${rfqStatusColor(rfq.status)}`}>
                          {rfq.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-center text-slate-500 text-xs">
                        {rfq.emailSentAt ? format(new Date(rfq.emailSentAt), 'dd MMM yyyy') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Manual Vendor Selection Modal (only when no category match) ────── */}
      <Dialog open={manualModal} onOpenChange={(open) => { if (!open) { setManualModal(false); setManualVendorIds([]); } }}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              No Matching Vendors Found — Select Manually
            </DialogTitle>
            <DialogDescription>
              No vendor has categories matching <strong>{manualPR?.productName}</strong>
              {detectedCategory && <> (detected category: <strong>{detectedCategory}</strong>)</>}.
              Please tick the vendors you want to send this RFQ to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Vendor list with categories */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
                <p className="text-[10px] font-bold text-slate-500 uppercase">
                  All Vendors — tick to select
                </p>
                <span className="text-xs font-semibold text-blue-600">
                  {manualVendorIds.length} selected
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {manualVendorList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No vendors found in Vendor Master.</p>
                ) : (
                  manualVendorList.map(vendor => {
                    const isSelected = manualVendorIds.includes(vendor._id);
                    return (
                      <div
                        key={vendor._id}
                        onClick={() => toggleManualVendor(vendor._id)}
                        className={`flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>

                        {/* Vendor info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{vendor.supplierName}</p>
                          <p className="text-xs text-slate-400 truncate">{vendor.email}</p>
                          {/* Categories */}
                          {vendor.vendorCategories?.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {vendor.vendorCategories.map((cat, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded"
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  {cat}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-300 mt-1 italic">No categories set</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Required By Date */}
            <div className="space-y-1.5">
              <Label htmlFor="manual-rfq-date" className="text-xs font-semibold text-slate-700 uppercase">
                Required By Date
              </Label>
              <Input
                id="manual-rfq-date"
                type="date"
                value={manualRequiredByDate}
                onChange={(e) => setManualRequiredByDate(e.target.value)}
                className="border-slate-300"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="manual-rfq-notes" className="text-xs font-semibold text-slate-700 uppercase">
                Notes for Vendors (Optional)
              </Label>
              <textarea
                id="manual-rfq-notes"
                rows={2}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="e.g. Specific brand required, IS standard, etc."
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setManualModal(false); setManualVendorIds([]); }}>
              Cancel
            </Button>
            <Button
              onClick={handleManualSend}
              disabled={manualSendMutation.isPending || manualVendorIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {manualSendMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />
                  {manualVendorIds.length === 0
                    ? 'Select at least 1 vendor'
                    : `Send to ${manualVendorIds.length} Vendor${manualVendorIds.length !== 1 ? 's' : ''}`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View RFQ Info Modal ────────────────────────────────────────── */}
      <Dialog open={viewRFQModal} onOpenChange={setViewRFQModal}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              RFQ Details — {selectedRFQ?.rfqNo}
            </DialogTitle>
          </DialogHeader>
          {selectedRFQ && (
            <div className="space-y-3 py-2">
              <div className="bg-slate-50 border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Product</span>
                  <span className="font-semibold text-slate-700">{selectedRFQ.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Quantity</span>
                  <span className="font-semibold text-slate-700">{selectedRFQ.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vendors Invited</span>
                  <span className="font-semibold text-slate-700">{selectedRFQ.vendors?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bids Received</span>
                  <span className={`font-bold ${(selectedRFQ.bidCount || 0) > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {selectedRFQ.bidCount || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <Badge variant="outline" className={`text-xs font-bold ${rfqStatusColor(selectedRFQ.status)}`}>
                    {selectedRFQ.status}
                  </Badge>
                </div>
                {selectedRFQ.selectedVendor && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selected Vendor</span>
                    <span className="font-bold text-emerald-700">{selectedRFQ.selectedVendor?.supplierName || '—'}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <p className="text-xs text-slate-400 flex-1">
                  Go to <strong>Vendor Bids</strong> module to see all submitted quotes and select the winning vendor.
                </p>
                <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRFQModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
