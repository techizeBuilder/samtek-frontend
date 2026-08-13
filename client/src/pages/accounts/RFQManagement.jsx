import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
  Loader2, Send, Eye, FileText, CheckCircle2, AlertCircle, Clock, Package,
  ChevronRight, Users, Mail, BarChart3, Gavel, RefreshCw, Tag,
  Info, FlaskConical, Wrench, Shield // <-- Added missing icons for R&D
} from 'lucide-react';
import { formatDims } from '@/lib/fabricationDims';
import FabricationRFQDialog from '@/components/accounts/FabricationRFQDialog';

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
  const [sendingPRId, setSendingPRId] = useState(null);

  const [manualModal, setManualModal] = useState(false);
  const [manualPR, setManualPR] = useState(null);
  const [manualVendorList, setManualVendorList] = useState([]);
  const [manualVendorIds, setManualVendorIds] = useState([]);
  const [manualRequiredByDate, setManualRequiredByDate] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [detectedCategory, setDetectedCategory] = useState('');

  const [viewRFQModal, setViewRFQModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);

  // Active vs History tab for the RFQ list below the Purchase Requests table
  const [rfqTab, setRfqTab] = useState('active');
  const [historyPage, setHistoryPage] = useState(1);

  // NEW: State for R&D Specifications Modal
  const [viewPRModal, setViewPRModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);

  // Purchase-unit ordering modal (items with a defined Purchase Unit)
  const [pqModalOpen, setPqModalOpen] = useState(false);
  const [pqPR, setPqPR] = useState(null);
  const [pqQty, setPqQty] = useState('');

  // Fabrication Master items only — the "same editable form" that finalizes
  // the dimension breakdown/total AND sends the RFQ, replacing the plain
  // pqModal above for these rows. See FabricationRFQDialog.
  const [fabRFQPR, setFabRFQPR] = useState(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  // Only the still-actionable (Pending/Approved) purchase requests are
  // relevant here — scoped server-side instead of fetching the company's
  // entire purchase-request history and filtering client-side.
  const { data: prData, isLoading: prLoading, refetch: refetchPRs } = useQuery({
    queryKey: ['/api/purchase-requests', 'actionable'],
    queryFn: () => apiRequest('GET', '/api/purchase-requests?status=Pending,Approved&limit=200'),
    select: (d) => d.data || []
  });

  // Bounded (not truly paginated) — this page cross-checks every open
  // Purchase Request against the RFQ list to see if one's already been
  // created for it, so it needs to see all currently-relevant RFQs at once,
  // not one page at a time. Scoped to status=Open so it's genuinely
  // self-draining (an RFQ leaves this list the moment it's awarded/closed)
  // instead of accumulating every RFQ ever sent. Full historical browsing
  // (Awarded/Closed) is the "RFQ History" tab below, which is really paginated.
  const { data: rfqData, isLoading: rfqLoading, refetch: refetchRFQs } = useQuery({
    queryKey: ['/api/rfq', 'active'],
    queryFn: () => apiRequest('GET', '/api/rfq?status=Open&limit=200'),
    select: (d) => d.data || []
  });

  // RFQ History — Awarded + Closed, real backend pagination since this
  // genuinely grows forever (unlike the Active tab above).
  const { data: rfqHistoryData, isLoading: rfqHistoryLoading } = useQuery({
    queryKey: ['/api/rfq', 'history', historyPage],
    queryFn: () => apiRequest('GET', `/api/rfq?status=Awarded,Closed&page=${historyPage}&limit=20`),
    enabled: rfqTab === 'history',
    keepPreviousData: true,
  });
  const rfqHistoryList = rfqHistoryData?.data || [];
  const rfqHistoryPagination = rfqHistoryData?.pagination || { page: 1, pages: 1, total: 0 };

  const { data: statsData } = useQuery({
    queryKey: ['/api/rfq/stats'],
    queryFn: () => apiRequest('GET', '/api/rfq/stats'),
    select: (d) => d.data || {}
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['/api/rfq'] });
    qc.invalidateQueries({ queryKey: ['/api/purchase-requests'] });
    qc.invalidateQueries({ queryKey: ['/api/rfq/stats'] });
  };

  const autoSendMutation = useMutation({
    mutationFn: (payload) => apiRequest('POST', '/api/rfq', payload),
    onSuccess: (data) => {
      // Some vendor emails may still have failed even though the RFQ itself
      // was created (at least one vendor got it) — surface that honestly
      // instead of a blanket "sent to everyone" success toast.
      if (data.partialEmailFailure) {
        toast({ title: '⚠️ RFQ Sent Partially', description: data.message, variant: 'destructive' });
      } else {
        toast({ title: '✅ RFQ Sent!', description: data.message });
      }
      setSendingPRId(null);
      invalidateAll();
    },
    onError: (err) => {
      setSendingPRId(null);

      let errData = null;
      try { errData = JSON.parse(err.message || '{}'); } catch (_) { }
      const noMatchPayload = errData?.data?.allVendors ? errData.data
        : err?.data?.allVendors ? err.data
          : null;

      if (noMatchPayload) {
        setManualVendorList(noMatchPayload.allVendors || []);
        setDetectedCategory(noMatchPayload.detectedCategory || '');
        setManualVendorIds([]);
        setManualModal(true);
        return;
      }

      toast({ title: 'Failed', description: err.message || 'Could not send RFQ', variant: 'destructive' });
    }
  });

  const manualSendMutation = useMutation({
    mutationFn: (payload) => apiRequest('POST', '/api/rfq', payload),
    onSuccess: (data) => {
      if (data.partialEmailFailure) {
        toast({ title: '⚠️ RFQ Sent Partially', description: data.message, variant: 'destructive' });
      } else {
        toast({ title: '✅ RFQ Sent!', description: data.message });
      }
      setManualModal(false);
      setManualPR(null);
      setManualVendorIds([]);
      invalidateAll();
    },
    onError: (err) => {
      toast({ title: 'Failed', description: err.message || 'Could not send RFQ', variant: 'destructive' });
    }
  });

  const sendRFQ = (pr, purchaseQuantity = null) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const requiredByDate = defaultDate.toISOString().split('T')[0];

    setManualPR(pr);
    setManualRequiredByDate(requiredByDate);
    setManualNotes('');
    setSendingPRId(pr._id);

    autoSendMutation.mutate({
      purchaseRequestId: pr._id,
      requiredByDate,
      notes: '',
      ...(purchaseQuantity > 0 && pr.item?.purchaseUnit
        ? { purchaseQuantity, purchaseUnit: pr.item.purchaseUnit }
        : {})
    });
  };

  const handleSendRFQ = (pr) => {
    // Fabrication requests get the combined dimension-review + order-quantity
    // form (same form edits and sends) instead of the plain quantity-only modal.
    if (pr.fabricationDimensionLines?.length > 0) {
      setFabRFQPR(pr);
      return;
    }
    // Item has a defined Purchase Unit → ask Purchase dept for the order qty in that unit
    if (pr.item?.purchaseUnit) {
      setPqPR(pr);
      setPqQty('');
      setPqModalOpen(true);
      return;
    }
    sendRFQ(pr);
  };

  const handleConfirmPurchaseQty = () => {
    if (!pqPR || !(Number(pqQty) > 0)) return;
    setPqModalOpen(false);
    sendRFQ(pqPR, Number(pqQty));
  };

  const handleManualSend = () => {
    if (!manualPR || manualVendorIds.length === 0) return;
    manualSendMutation.mutate({
      purchaseRequestId: manualPR._id,
      requiredByDate: manualRequiredByDate,
      notes: manualNotes,
      vendorIds: manualVendorIds,
      ...(manualPR.item?.purchaseUnit && Number(pqQty) > 0
        ? { purchaseQuantity: Number(pqQty), purchaseUnit: manualPR.item.purchaseUnit }
        : {})
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

  // NEW: Handler for showing R&D Specs
  const handleViewPR = (pr) => {
    setSelectedPR(pr);
    setViewPRModal(true);
  };

  const purchaseRequests = (prData || []).filter(pr => ['Pending', 'Approved'].includes(pr.status));
  const rfqList = rfqData || [];

  const rfqByPRId = {};
  rfqList.forEach(rfq => {
    const prId = rfq.purchaseRequest?._id || rfq.purchaseRequest;
    if (prId) rfqByPRId[prId] = rfq;
  });

  const isLoading = prLoading || rfqLoading;

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6">

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
                    <th className="text-center py-3 px-5 font-semibold text-slate-600">Purchase Unit</th>
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
                        <td className="py-3 px-5 font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            {pr.productName}
                            {/* NEW: R&D Specs Info Button */}
                            {pr.item && (pr.item.specifications?.length > 0 || pr.item.warranty?.type) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-full"
                                onClick={() => handleViewPR(pr)}
                              >
                                <Info className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                          {pr.fabricationDimensionLines?.length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                              {pr.fabricationDimensionLines.map((l, i) => (
                                <span key={i}>{i > 0 && ' · '}{formatDims(l.values)} × {l.quantity}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-5 text-center font-bold text-slate-700">
                          {pr.quantity}
                          {(pr.item?.unit || pr.unit) && (
                            <span className="ml-1 font-medium text-slate-500 text-xs">{pr.item?.unit || pr.unit}</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-center">
                          {pr.item?.purchaseUnit ? (
                            <Badge variant="outline" className="text-xs font-semibold bg-violet-50 text-violet-700 border-violet-200">
                              {pr.item.purchaseUnit}
                            </Badge>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
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

      <Card className="shadow-sm border-0">
        <CardHeader className="border-b bg-slate-50/50 py-4">
          <Tabs value={rfqTab} onValueChange={setRfqTab}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  RFQs
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {rfqTab === 'active' ? 'RFQs still awaiting vendor bids' : 'Awarded and closed RFQs'}
                </CardDescription>
              </div>
              <TabsList>
                <TabsTrigger value="active">Active RFQs</TabsTrigger>
                <TabsTrigger value="history">RFQ History</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {rfqTab === 'active' ? (
            rfqList.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No RFQs awaiting bids right now</p>
              </div>
            ) : (
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
                        <td className="py-3 px-5 text-center font-bold text-slate-700">
                          {rfq.quantity}
                          {rfq.quantityUnit && <span className="ml-1 font-medium text-slate-500 text-xs">{rfq.quantityUnit}</span>}
                        </td>
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
            )
          ) : rfqHistoryLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : rfqHistoryList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No awarded or closed RFQs yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-3 px-5 font-semibold text-slate-600">RFQ No</th>
                      <th className="text-left py-3 px-5 font-semibold text-slate-600">Product</th>
                      <th className="text-center py-3 px-5 font-semibold text-slate-600">Qty</th>
                      <th className="text-left py-3 px-5 font-semibold text-slate-600">Selected Vendor</th>
                      <th className="text-center py-3 px-5 font-semibold text-slate-600">Bids Received</th>
                      <th className="text-center py-3 px-5 font-semibold text-slate-600">Status</th>
                      <th className="text-center py-3 px-5 font-semibold text-slate-600">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqHistoryList.map(rfq => (
                      <tr key={rfq._id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-5 font-bold text-slate-800">{rfq.rfqNo}</td>
                        <td className="py-3 px-5 font-medium text-slate-700">{rfq.productName}</td>
                        <td className="py-3 px-5 text-center font-bold text-slate-700">
                          {rfq.quantity}
                          {rfq.quantityUnit && <span className="ml-1 font-medium text-slate-500 text-xs">{rfq.quantityUnit}</span>}
                        </td>
                        <td className="py-3 px-5 text-slate-600">
                          {rfq.selectedVendor?.supplierName || '—'}
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
                          {rfq.updatedAt ? format(new Date(rfq.updatedAt), 'dd MMM yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rfqHistoryPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Button variant="outline" size="sm" onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={rfqHistoryPagination.page <= 1}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {rfqHistoryPagination.page} of {rfqHistoryPagination.pages} ({rfqHistoryPagination.total} RFQs)</span>
                  <Button variant="outline" size="sm" onClick={() => setHistoryPage(p => p + 1)} disabled={rfqHistoryPagination.page >= rfqHistoryPagination.pages}>Next</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Purchase Quantity Modal (items ordered in a Purchase Unit) ──────── */}
      <Dialog open={pqModalOpen} onOpenChange={(open) => { if (!open) setPqModalOpen(false); }}>
        <DialogContent className="sm:max-w-[440px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <Package className="w-5 h-5 text-violet-600" />
              Order Quantity — Purchase Unit
            </DialogTitle>
            <DialogDescription>
              This item is purchased in <strong>{pqPR?.item?.purchaseUnit}</strong>. Enter how much you want to order — the Store will convert it back to <strong>{pqPR?.item?.unit || 'the storage unit'}</strong> at receiving.
            </DialogDescription>
          </DialogHeader>

          {pqPR && (
            <div className="space-y-4 py-1">
              <div className="bg-slate-50 border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Item</span>
                  <span className="font-semibold text-slate-700">{pqPR.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Requested Quantity</span>
                  <span className="font-semibold text-slate-700">
                    {pqPR.quantity} {pqPR.item?.unit || pqPR.unit || ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Purchase Unit</span>
                  <Badge variant="outline" className="text-xs font-semibold bg-violet-50 text-violet-700 border-violet-200">
                    {pqPR.item?.purchaseUnit}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pq-qty" className="text-xs font-semibold text-slate-700 uppercase">
                  Order Quantity ({pqPR.item?.purchaseUnit}) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="pq-qty"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={`e.g. 20 (${pqPR.item?.purchaseUnit})`}
                  value={pqQty}
                  onChange={(e) => setPqQty(e.target.value)}
                  className="border-slate-300 font-semibold"
                />
                <p className="text-[11px] text-slate-400">
                  The RFQ and vendor bids will be for this quantity in {pqPR.item?.purchaseUnit}.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPqModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmPurchaseQty}
              disabled={!(Number(pqQty) > 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" /> Send RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Fabrication requests: same form finalizes the dimension breakdown
          AND sends the RFQ ─────────────────────────────────────────────── */}
      {fabRFQPR && (
        <FabricationRFQDialog
          pr={fabRFQPR}
          onClose={() => setFabRFQPR(null)}
          onFinalized={(finalQuantity) => {
            const pr = fabRFQPR;
            setFabRFQPR(null);
            sendRFQ(pr, finalQuantity);
          }}
        />
      )}

      {/* ── NEW: View R&D PR Specs Modal ────────────────────────────────────── */}
      <Dialog open={viewPRModal} onOpenChange={setViewPRModal}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              R&D Specifications
            </DialogTitle>
            <DialogDescription>
              Master Inventory parameters for <strong>{selectedPR?.productName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedPR?.item && (
            <div className="space-y-4 py-3">
              {selectedPR.item.specifications?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-slate-400" /> Technical Requirements
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-md overflow-hidden text-sm">
                    {selectedPR.item.specifications.map((spec, i) => (
                      <div key={i} className="flex border-b border-slate-100 last:border-0">
                        <div className="w-1/3 bg-slate-100 px-3 py-2 text-slate-600 font-medium">{spec.key}</div>
                        <div className="w-2/3 px-3 py-2 text-slate-900">{spec.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedPR.item.warranty && selectedPR.item.warranty.type && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-slate-400" /> Warranty Requirements
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm grid grid-cols-2 gap-2">
                    <div><span className="text-slate-500 text-xs uppercase block mb-1">Period</span><span className="font-medium text-slate-900">{selectedPR.item.warranty.period} Months</span></div>
                    <div><span className="text-slate-500 text-xs uppercase block mb-1">Type</span><span className="font-medium text-slate-900">{selectedPR.item.warranty.type}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPRModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualModal} onOpenChange={(open) => { if (!open) { setManualModal(false); setManualVendorIds([]); } }}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Select Vendors to Send RFQ
            </DialogTitle>
            <DialogDescription>
              Please tick the vendors you want to send this RFQ to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b">
                <p className="text-[10px] font-bold text-slate-500 uppercase">All Vendors — tick to select</p>
                <span className="text-xs font-semibold text-blue-600">{manualVendorIds.length} selected</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {manualVendorList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No vendors found.</p>
                ) : (
                  manualVendorList.map(vendor => {
                    const isSelected = manualVendorIds.includes(vendor._id);
                    return (
                      <div
                        key={vendor._id}
                        onClick={() => toggleManualVendor(vendor._id)}
                        className={`flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{vendor.supplierName}</p>
                          <p className="text-xs text-slate-400 truncate">{vendor.email}</p>
                          {vendor.vendorCategories?.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {vendor.vendorCategories.map((cat, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  <Tag className="w-2.5 h-2.5" />{cat}
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

            <div className="space-y-1.5">
              <Label htmlFor="manual-rfq-date" className="text-xs font-semibold text-slate-700 uppercase">Required By Date</Label>
              <Input
                id="manual-rfq-date"
                type="date"
                value={manualRequiredByDate}
                onChange={(e) => setManualRequiredByDate(e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manual-rfq-notes" className="text-xs font-semibold text-slate-700 uppercase">Notes for Vendors (Optional)</Label>
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
            <Button variant="outline" onClick={() => { setManualModal(false); setManualVendorIds([]); }}>Cancel</Button>
            <Button
              onClick={handleManualSend}
              disabled={manualSendMutation.isPending || manualVendorIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {manualSendMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />
                  {manualVendorIds.length === 0 ? 'Select at least 1 vendor' : `Send to ${manualVendorIds.length} Vendor${manualVendorIds.length !== 1 ? 's' : ''}`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewRFQModal} onOpenChange={setViewRFQModal}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-slate-800">RFQ Details — {selectedRFQ?.rfqNo}</DialogTitle>
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
                  <span className="font-semibold text-slate-700">
                    {selectedRFQ.quantity}{selectedRFQ.quantityUnit ? ` ${selectedRFQ.quantityUnit}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vendors Invited</span>
                  <span className="font-semibold text-slate-700">{selectedRFQ.vendors?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bids Received</span>
                  <span className={`font-bold ${(selectedRFQ.bidCount || 0) > 0 ? 'text-emerald-600' : 'text-amber-500'}`}>{selectedRFQ.bidCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <Badge variant="outline" className={`text-xs font-bold ${rfqStatusColor(selectedRFQ.status)}`}>{selectedRFQ.status}</Badge>
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