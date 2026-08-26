import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/api/orderService';
import { adminSettingsApi } from '@/api/adminSettingsApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { sendWhatsApp } from '@/lib/whatsapp';
import SendEmailModal from '@/components/email/SendEmailModal';
import {
  ShieldCheck, Phone, CheckCircle2, XCircle, MessageSquare, Mail,
  Calendar, User, MapPin, Briefcase, Eye, History, Star, ThumbsUp,
  ChevronRight, FileText, Package, CreditCard, Clock, AlertCircle,
  ThumbsDown, X, ChevronLeft, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────── helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN') : 'N/A';
const fmtAmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : 'N/A';

const PRIORITY_COLORS = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low:    'bg-green-100 text-green-700',
};

/* ═══════════════════════════════════════════════════════════════════════ */
// Helper: get the effective service status of an order
// Schema statuses: pending_service_approval → pending (after verify) → approved etc.
// rejected_by_service → rejected by service team
const getServiceStatus = (o) => {
  if (o.status === 'rejected_by_service') return 'rejected';
  if (o.status === 'pending_service_approval') return 'pending';
  // Check serviceVerification sub-document (most reliable source)
  if (o.serviceVerification?.status === 'verified') return 'verified';
  if (o.serviceVerification?.status === 'rejected') return 'rejected';
  // Check statusHistory for service_verified entry
  const wasServiceVerified = (o.statusHistory || []).some(
    h => h.status === 'service_verified' || h.status === 'service_Confirm' || h.status === 'service_verified'
  );
  if (wasServiceVerified) return 'verified';
  // Order never went through service approval flow → pending
  return 'pending';
};

// Check if order is still awaiting service verification
const isPendingVerification = (o) => 
  o.status === 'pending_service_approval' && 
  (!o.serviceVerification?.status || o.serviceVerification?.status === 'pending');

const STATUS_TABS = [
  { key: 'all',      label: 'All',      color: 'bg-blue-100 text-blue-800'    },
  { key: 'pending',  label: 'Pending',  color: 'bg-yellow-100 text-yellow-800' },
  { key: 'verified', label: 'Verified', color: 'bg-green-100 text-green-800'   },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800'      },
];

const DealVerifications = () => {
  const { toast } = useToast();
  const { hasFeatureAccess } = usePermissions();
  const canEdit = hasFeatureAccess('complaints', 'dealVerifications', 'edit');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  /* ── data ── */
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['service-deal-verifications', currentPage, activeTab],
    queryFn: () => {
      const params = {
        page: currentPage,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      // 'all' → no serviceStatus param; others pass the tab key directly
      if (activeTab !== 'all') params.serviceStatus = activeTab;
      return orderApi.getDealVerifications(params);
    },
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const orders          = ordersData?.orders || [];
  const paginatedOrders = orders;  // backend already gives us the current page slice
  const totalOrders     = ordersData?.pagination?.totalOrders || 0;
  const totalPages      = ordersData?.pagination?.totalPages  || 1;
  const allOrders       = orders; // alias used in header badge

  /* ── modal states ── */
  const [verifyModal,  setVerifyModal]  = useState({ open: false, order: null });
  const [detailModal,  setDetailModal]  = useState({ open: false, order: null });
  const [historyModal, setHistoryModal] = useState({ open: false, order: null });
  const [notesModal,   setNotesModal]   = useState({ open: false, order: null });
  const [docsModal,    setDocsModal]    = useState({ open: false, order: null });
  const [priorityModal,setPriorityModal]= useState({ open: false, order: null });
  const [statusModal,  setStatusModal]  = useState({ open: false, order: null });
  const [emailModal,   setEmailModal]   = useState({ open: false, to: '' });

  // Checklist points are configured by Super Admin under Settings > Lead
  // Settings > Sales Checklist, so this reads dynamically instead of a
  // hardcoded point list.
  const { data: adminSettingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminSettingsApi.getAll(),
  });
  const salesChecklistConfig = adminSettingsData?.settings?.salesChecklist || [];

  const [verifyFormData, setVerifyFormData] = useState({
    remarks: '',
    callRecordingUrl: '',
    salesChecklist: {}
  });

  const handleOpenVerifyModal = (order) => {
    // Always use the latest version of the order from cache (not the stale card reference)
    const latestOrder = queryClient.getQueryData(['service-deal-verifications', currentPage, activeTab])?.orders?.find(
      (o) => o._id === order._id
    ) || order;

    const checklist = latestOrder.salesChecklist || {};
    setVerifyFormData({
      remarks: '',
      callRecordingUrl: '',
      salesChecklist: JSON.parse(JSON.stringify(checklist)) // Deep copy
    });
    setVerifyModal({ open: true, order: latestOrder });
  };

  const [newNote,       setNewNote]       = useState('');
  const [selPriority,   setSelPriority]   = useState('Medium');
  const [selStatus,     setSelStatus]     = useState('pending');

  /* ── mutations ── */
  const verifyMutation = useMutation({
    mutationFn: ({ id, data }) => orderApi.verifyServiceOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-deal-verifications'] });
      toast({ title: 'Success', description: 'Order verified successfully' });
      setVerifyModal({ open: false, order: null });
    },
    onError: (e) => toast({ title: 'Error', description: e?.message || 'Failed', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => orderApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-deal-verifications'] });
      toast({ title: 'Updated', description: 'Order updated successfully' });
      setPriorityModal({ open: false, order: null });
      setStatusModal({ open: false, order: null });
      setNotesModal(prev => ({ ...prev, open: false }));
    },
    onError: (e) => toast({ title: 'Error', description: e?.message || 'Failed', variant: 'destructive' }),
  });

  const [savingKey, setSavingKey] = useState(null); // tracks which checklist item is currently saving

  // Silent auto-save: saves salesChecklist immediately on each toggle
  // so progress is never lost if user closes modal without final submit
  const autoSaveChecklistMutation = useMutation({
    mutationFn: ({ id, salesChecklist, key }) => orderApi.update(id, { salesChecklist }).then(res => ({ res, key })),
    onSuccess: ({ key }, variables) => {
      setSavingKey(null);
      // Update local form state ONLY after API confirms save
      setVerifyFormData(p => ({ ...p, salesChecklist: variables.salesChecklist }));
      // Directly patch the React Query cache so reopening modal shows saved state instantly
      queryClient.setQueryData(['service-deal-verifications', currentPage, activeTab], (old) => {
        if (!old?.orders) return old;
        return {
          ...old,
          orders: old.orders.map((o) =>
            o._id === variables.id
              ? { ...o, salesChecklist: variables.salesChecklist }
              : o
          ),
        };
      });
    },
    onError: (_, variables) => {
      setSavingKey(null);
      // On failure, revert to the last known good checklist from cache
      const cachedOrder = queryClient.getQueryData(['service-deal-verifications', currentPage, activeTab])?.orders?.find(
        (o) => o._id === variables.id
      );
      if (cachedOrder?.salesChecklist) {
        setVerifyFormData(p => ({ ...p, salesChecklist: JSON.parse(JSON.stringify(cachedOrder.salesChecklist)) }));
      }
      toast({ title: 'Save Failed', description: 'Could not save checklist. Change reverted.', variant: 'destructive' });
    },
  });

  /* ── contact helpers ── */
  const call      = (m) => m && window.open(`tel:${m}`);
  const whatsapp  = async (m, ctx = {}) => {
    if (!m) return;
    const text = ctx.orderCode
      ? `Hello ${ctx.name || ''}, this is Samtek Machinery regarding your order #${ctx.orderCode}. We'd like to confirm a few details with you — please let us know a good time to talk.`
      : `Hello ${ctx.name || ''}, this is Samtek Machinery. We'd like to get in touch regarding your recent order.`;
    const result = await sendWhatsApp(m, text);
    if (result.automatic) {
      toast({ title: 'Sent!', description: 'Message sent automatically via WhatsApp' });
    }
  };
  const email     = (e) => e && setEmailModal({ open: true, to: e });

  /* ── handlers ── */
  const handleVerifySubmit = (status) => {
    if (!verifyModal.order) return;
    verifyMutation.mutate({
      id: verifyModal.order._id,
      data: {
        status,
        remarks: verifyFormData.remarks,
        callRecordingUrl: verifyFormData.callRecordingUrl,
        salesChecklist: verifyFormData.salesChecklist
      }
    });
  };

  const handleSavePriority = () => {
    if (!priorityModal.order) return;
    updateMutation.mutate({ id: priorityModal.order._id, data: { priority: selPriority } });
  };

  const handleSaveStatus = () => {
    if (!statusModal.order) return;
    updateMutation.mutate({ id: statusModal.order._id, data: { status: selStatus } });
  };

  const handleAddNote = () => {
    if (!notesModal.order || !newNote.trim()) {
      toast({ title: 'Required', description: 'Note cannot be empty', variant: 'destructive' });
      return;
    }
    const existing = notesModal.order.notes || '';
    const updated  = existing ? `${existing}\n\n[${new Date().toLocaleString()}] ${newNote.trim()}` : `[${new Date().toLocaleString()}] ${newNote.trim()}`;
    updateMutation.mutate({ id: notesModal.order._id, data: { notes: updated } });
    setNewNote('');
  };

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Deal Verifications (Service Team)</h1>
        <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1 border border-blue-200">
          {totalOrders} Total
        </Badge>
      </div>

      {/* ── Status Filter Tabs ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeTab === tab.key
                ? `${tab.color} border-transparent shadow-sm`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-white/60">
                {totalOrders}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-100">
            <ShieldCheck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-600">No Deals Found</h3>
            <p className="text-gray-400 mt-2">
              {activeTab === 'all' ? 'No deals available.' : `No ${STATUS_TABS.find(t => t.key === activeTab)?.label?.toLowerCase()} deals.`}
            </p>
          </div>
        ) : (
          paginatedOrders.map((order) => {
            const customer    = order.customer  || {};
            const salesPerson = order.salesPerson || {};
            const products    = order.products   || [];
            const svcStatus   = getServiceStatus(order);
            const isPending   = isPendingVerification(order);

            return (
              <Card key={order._id} className={cn(
                "shadow-sm border transition-colors",
                svcStatus === 'verified' ? 'border-green-200 hover:border-green-300' :
                svcStatus === 'rejected' ? 'border-red-200 hover:border-red-300' :
                'border-gray-100 hover:border-blue-200'
              )}>
                <CardContent className="p-0">

                  {/* ── Top Content Row ── */}
                  <div className="flex flex-col lg:flex-row p-4 gap-6">

                    {/* LEFT – Core details */}
                    <div className="flex-1 flex flex-col">

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-3">
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xs">Order Code</span>
                          <span className="font-semibold text-blue-600">#{order.orderCode || order._id?.slice(-6)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xs">Order Date</span>
                          <span className="text-gray-700">{fmt(order.orderDate || order.createdAt)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xs">Sales Person</span>
                          <span className="text-gray-700">{salesPerson.fullName || salesPerson.username || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xs">Deal Value</span>
                          <span className="font-semibold text-green-700">{fmtAmt(order.totalAmount)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xs">Priority</span>
                          <Badge className={cn('text-xs mt-0.5', PRIORITY_COLORS[order.priority] || PRIORITY_COLORS.Medium)}>
                            {order.priority || 'Medium'}
                          </Badge>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-400 text-xs">Payment</span>
                          <span className="text-gray-700">{order.paymentStatus || 'Pending'}</span>
                        </div>
                        {svcStatus === 'verified' && (
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">Order Form</span>
                            <Badge className={cn('text-xs mt-0.5 w-fit',
                              order.orderFormStatus === 'Submitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              order.orderFormStatus === 'Returned' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-500 border-gray-200'
                            )}>
                              {order.orderFormStatus === 'Submitted' ? 'Submitted' :
                               order.orderFormStatus === 'Returned' ? 'Returned' : 'Not Filled'}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Action Icons Row */}
                      <div className="flex items-center gap-4 mt-1 mb-3 px-1 border-b border-gray-100 pb-2">
                        {/* Star → Priority */}
                        <button
                          onClick={() => { setSelPriority(order.priority || 'Medium'); setPriorityModal({ open: true, order }); }}
                          className={cn('transition-colors', order.priority === 'High' ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500')}
                          title="Set Priority"
                        >
                          <Star className={cn('h-5 w-5', order.priority === 'High' ? 'fill-yellow-500 text-yellow-500' : '')} />
                        </button>

                        {/* ThumbsUp → Status */}
                        <button
                          onClick={() => { setSelStatus(order.status || 'pending'); setStatusModal({ open: true, order }); }}
                          className={cn('transition-colors', order.status === 'approved' ? 'text-green-600' : 'text-gray-400 hover:text-green-600')}
                          title="Update Status"
                        >
                          <ThumbsUp className={cn('h-5 w-5', order.status === 'approved' ? 'fill-green-600 text-green-600' : '')} />
                        </button>

                        {/* ThumbsDown → Reject status */}
                        <button
                          onClick={() => { setSelStatus('rejected'); setStatusModal({ open: true, order }); }}
                          className={cn('transition-colors', order.status === 'rejected' ? 'text-red-600' : 'text-gray-400 hover:text-red-600')}
                          title="Reject Order"
                        >
                          <ThumbsDown className={cn('h-5 w-5', order.status === 'rejected' ? 'fill-red-600 text-red-600' : '')} />
                        </button>

                        {/* Notes */}
                        <button
                          onClick={() => { setNewNote(''); setNotesModal({ open: true, order }); }}
                          className={cn('relative transition-colors', order.notes ? 'text-blue-500 hover:text-blue-600' : 'text-gray-400 hover:text-blue-500')}
                          title="Notes"
                        >
                          <MessageSquare className="h-5 w-5" />
                          {order.notes && (
                            <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full text-[10px] min-w-[16px] h-[16px] flex items-center justify-center font-bold border border-white">
                              !
                            </span>
                          )}
                        </button>

                        {/* Mail disabled */}
                        <button disabled className="text-gray-200 cursor-not-allowed" title="Mail (Disabled)">
                          <Mail className="h-5 w-5" />
                        </button>

                        {/* Order History */}
                        <Button
                          variant="outline" size="sm"
                          className="h-7 px-2.5 text-xs bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                          onClick={() => setHistoryModal({ open: true, order })}
                        >
                          <History className="h-3.5 w-3.5 mr-1" /> Order History
                        </Button>
                      </div>

                      {/* Company + Products */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-blue-600 font-bold text-lg leading-tight">
                            {customer.name || 'N/A'}
                          </h3>
                          {/* Service Status Badge */}
                          {svcStatus === 'verified' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </span>
                          )}
                          {svcStatus === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              <XCircle className="h-3 w-3" /> Rejected
                            </span>
                          )}
                          {svcStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">Products:</span>{' '}
                          {products.length > 0
                            ? products.map((p, i) => (
                                <span key={i}>
                                  {p.product?.name || p.product?.itemName || p.product || 'Item'} ×{p.quantity}
                                  {i < products.length - 1 ? ', ' : ''}
                                </span>
                              ))
                            : 'N/A'}
                        </p>
                        {order.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">📝 {order.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* RIGHT – Contact panel */}
                    <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6 flex flex-col">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {customer.contactPerson || customer.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Mobile: {customer.mobile || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Email: {customer.email || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            Location: {[customer.city, customer.state, customer.country].filter(Boolean).join(', ') || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">Category: {customer.category || 'N/A'}</p>
                          {customer.gstin && <p className="text-xs text-gray-500">GSTIN: {customer.gstin}</p>}
                        </div>
                        {isPending && canEdit ? (
                          <Button
                            variant="outline" size="sm"
                            className="h-8 px-2 text-xs bg-blue-50 text-blue-600 border-blue-100 shrink-0"
                            onClick={() => handleOpenVerifyModal(order)}
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verify <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        ) : (
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold',
                            svcStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          )}>
                            {svcStatus === 'verified' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {svcStatus === 'verified' ? 'Verified' : 'Rejected'}
                          </span>
                        )}
                      </div>

                      {/* Icon buttons */}
                      <div className="flex gap-1 mt-3">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" title="View Details"
                          onClick={() => setDetailModal({ open: true, order })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" title="Documents"
                          onClick={() => setDocsModal({ open: true, order })}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" title="Notes"
                          onClick={() => { setNewNote(''); setNotesModal({ open: true, order }); }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" title="Order History"
                          onClick={() => setHistoryModal({ open: true, order })}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" title="Priority"
                          onClick={() => { setSelPriority(order.priority || 'Medium'); setPriorityModal({ open: true, order }); }}>
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* ── Action bar ── */}
                  <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-gray-50 bg-white">
                    <Button variant="outline" size="sm" className="h-8 text-xs bg-gray-50"
                      onClick={() => email(customer.email)}>
                      Email Reply
                    </Button>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" className="h-8 text-xs rounded-full"
                        onClick={() => setHistoryModal({ open: true, order })}>
                        Order History
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs rounded-full"
                        onClick={() => setDetailModal({ open: true, order })}>
                        View Details
                      </Button>
                      {isPending && canEdit ? (
                        <Button variant="default" size="sm"
                          className="h-8 text-xs rounded-full bg-green-600 hover:bg-green-700"
                          onClick={() => handleOpenVerifyModal(order)}>
                          <ShieldCheck className="h-3 w-3 mr-1" /> Verify Lead
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled
                          className={cn('h-8 text-xs rounded-full cursor-not-allowed opacity-60',
                            svcStatus === 'verified' ? 'border-green-200 text-green-600 bg-green-50' : 'border-red-200 text-red-600 bg-red-50'
                          )}>
                          {svcStatus === 'verified'
                            ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Already Verified</>
                            : <><XCircle className="h-3 w-3 mr-1" /> Rejected</>
                          }
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ── Bottom stats bar ── */}
                  <div className="bg-gray-50 p-2 border-t border-gray-100 grid grid-cols-2 md:grid-cols-6 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order Date</span>
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <span>{fmt(order.orderDate || order.createdAt)}</span>
                        <Calendar className="h-3 w-3 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sales Person</span>
                      <span className="text-xs text-gray-700">{salesPerson.fullName || salesPerson.username || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Amount</span>
                      <span className="text-xs font-semibold text-green-700">{fmtAmt(order.totalAmount)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Service</span>
                      <span className={cn('text-xs font-semibold capitalize',
                        svcStatus === 'verified' ? 'text-green-700' :
                        svcStatus === 'rejected' ? 'text-red-600' : 'text-yellow-700'
                      )}>
                        {svcStatus}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Products</span>
                      <span className="text-xs text-gray-700 line-clamp-1">{products.length} item(s)</span>
                    </div>

                    {/* Contact action group */}
                    <div className="flex flex-col col-span-2 md:col-span-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Contact</span>
                      <div className="flex items-center">
                        <div className="flex items-center bg-white border border-gray-200 rounded shadow-sm overflow-hidden ml-auto">
                          <Button variant="ghost" size="icon" className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-blue-50 text-blue-600"
                            title="Call" onClick={() => call(customer.mobile)}>
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-green-50 text-green-600"
                            title="WhatsApp" onClick={() => whatsapp(customer.mobile, { name: customer.name, orderCode: order.orderCode })}>
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-8 border-r border-gray-100 rounded-none hover:bg-blue-50 text-blue-700"
                            title="Email" onClick={() => email(customer.email)}>
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          {isPending && canEdit ? (
                            <Button variant="ghost" size="icon" className="h-7 w-8 rounded-none hover:bg-purple-50 text-purple-600"
                              title="Verify" onClick={() => handleOpenVerifyModal(order)}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" disabled
                              className={cn('h-7 w-8 rounded-none opacity-60 cursor-not-allowed',
                                svcStatus === 'verified' ? 'text-green-500' : 'text-red-400'
                              )}
                              title={svcStatus === 'verified' ? 'Already Verified' : 'Rejected'}>
                              {svcStatus === 'verified'
                                ? <CheckCircle2 className="h-3.5 w-3.5" />
                                : <XCircle className="h-3.5 w-3.5" />
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Pagination Controls ── */}
      {totalOrders > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">
            Showing <span className="font-semibold">{(currentPage - 1) * 10 + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(currentPage * 10, totalOrders)}</span> of{" "}
            <span className="font-medium">{totalOrders}</span> entries
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900 border-gray-200"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900 border-gray-200"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {(() => {
              const pageNumbers = [];
              const maxVisiblePages = 5;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }

              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
              }

              return pageNumbers.map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 w-8 font-semibold text-xs",
                    currentPage === page
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200"
                  )}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ));
            })()}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900 border-gray-200"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-gray-600 hover:text-gray-900 border-gray-200"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Send Email Modal
      ══════════════════════════════════════════════════════ */}
      <SendEmailModal
        open={emailModal.open}
        onOpenChange={(open) => setEmailModal((p) => ({ ...p, open }))}
        to={emailModal.to}
        department="INFO"
      />

      {/* ══════════════════════════════════════════════════════
          MODAL 1 – VERIFY
      ══════════════════════════════════════════════════════ */}
      <Dialog open={verifyModal.open} onOpenChange={(o) => !o && setVerifyModal({ open: false, order: null })}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="h-6 w-6 text-blue-600" /> Verify Deal / Commitment Check
            </DialogTitle>
          </DialogHeader>
          {verifyModal.order && (() => {
            const c = verifyModal.order.customer || {};
            
            // Check list config
            const checklistConfig = salesChecklistConfig;

            const checklist = verifyFormData.salesChecklist || {};
            const allCheckedVerified = checklistConfig.every(cfg => {
              const item = checklist[cfg.key] || { checked: false, verified: false };
              return !item.checked || item.verified;
            });

            return (
              <div className="space-y-5 py-2">
                {/* Customer strip */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-bold text-blue-900">{c.name || 'N/A'}</p>
                      <p className="text-xs text-blue-700 font-semibold mt-1">Order: #{verifyModal.order.orderCode}</p>
                      <p className="text-xs text-blue-700 font-semibold">Deal Value: {fmtAmt(verifyModal.order.totalAmount)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-700 hover:bg-blue-100" title="Call"
                        onClick={() => call(c.mobile)}>
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" title="WhatsApp"
                        onClick={() => whatsapp(c.mobile, { name: c.name, orderCode: verifyModal.order.orderCode })}>
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-700 hover:bg-blue-100" title="Email"
                        onClick={() => email(c.email)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-blue-800">
                    <span>📞 {c.mobile || 'N/A'}</span>
                    <span>✉️ {c.email || 'N/A'}</span>
                    <span>📍 {[c.city, c.state].filter(Boolean).join(', ') || 'N/A'}</span>
                    <span>🏷️ {c.category || 'N/A'}</span>
                  </div>
                </div>

                {/* 📋 SALES COMMITMENTS CHECKLIST */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    Sales Commitments Checklist
                  </h4>
                  <p className="text-xs text-gray-500">
                    Service team must verify each commitment marked by the Sales employee.
                  </p>
                  
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {checklistConfig.map((cfg, idx) => {
                      const item = checklist[cfg.key] || { checked: false, value: '', verified: false };

                      return (
                        <div
                          key={cfg.key}
                          className={cn(
                            "p-3 rounded-lg border flex items-center justify-between transition-all shadow-xs",
                            item.checked
                              ? (item.verified ? "bg-green-50/40 border-green-200" : "bg-orange-50/40 border-orange-200")
                              : "bg-gray-50/40 border-gray-150"
                          )}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-800">{idx + 1}. {cfg.label}</span>
                              {item.checked ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] h-5 px-1.5 font-bold">
                                  Discussed
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-gray-400 font-medium">Not Discussed</span>
                              )}
                            </div>

                            {item.checked ? (
                              <p className="text-xs text-gray-600 mt-1 font-medium bg-white/70 p-1.5 rounded border border-gray-100 inline-block">
                                Value declared by Sales: <strong className="text-blue-700">{cfg.valueType === 'number' ? `₹${item.value}` : (cfg.valueType === 'none' ? 'Agreed' : item.value || 'N/A')}</strong>
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400 mt-0.5">Not yet marked as discussed by Sales.</p>
                            )}

                            {/* Real warranty from Item master — so service team can compare
                                against what the salesman promised */}
                            {cfg.key === 'warranty' && (
                              <div className="text-xs mt-1.5 bg-blue-50/70 border border-blue-100 rounded p-1.5">
                                <span className="font-semibold text-blue-800">Real Warranty (Item Master):</span>
                                {(verifyModal.order.products || []).length === 0 ? (
                                  <span className="text-gray-500 ml-1">-</span>
                                ) : (
                                  (verifyModal.order.products || []).map((p, i) => {
                                    const period = p.product?.warranty?.period;
                                    const hasPeriod = period === 0 || (period != null && period !== '');
                                    const wLabel = hasPeriod
                                      ? `${period} Month${period === 1 ? '' : 's'}${p.product?.warranty?.type ? ` (${p.product.warranty.type})` : ''}`
                                      : '-';
                                    return (
                                      <span key={p.product?._id || i} className="block text-gray-700 mt-0.5">
                                        {p.product?.name || 'Item'}: <strong className="text-blue-700">{wLabel}</strong>
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant={item.verified ? "default" : "outline"}
                              disabled={savingKey === cfg.key}
                              className={cn(
                                "h-8 text-xs font-semibold px-3 rounded-full transition-all shadow-xs",
                                item.verified 
                                  ? "bg-green-600 hover:bg-green-700 text-white" 
                                  : "border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100"
                              )}
                              onClick={() => {
                                const newChecklist = {
                                  ...verifyFormData.salesChecklist,
                                  [cfg.key]: {
                                    ...item,
                                    verified: !item.verified
                                  }
                                };
                                // DO NOT update local state here — wait for API success (onSuccess updates it)
                                if (verifyModal.order?._id) {
                                  setSavingKey(cfg.key); // mark only this item as saving
                                  autoSaveChecklistMutation.mutate({
                                    id: verifyModal.order._id,
                                    salesChecklist: newChecklist,
                                    key: cfg.key
                                  });
                                }
                              }}
                            >
                              {savingKey === cfg.key ? (
                                <span className="flex items-center gap-1">
                                  <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  Saving...
                                </span>
                              ) : item.verified ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white fill-green-700" />
                                  Verified
                                </span>
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700">Call Recording URL (Optional)</Label>
                  <Input placeholder="https://..."
                    value={verifyFormData.callRecordingUrl}
                    onChange={(e) => setVerifyFormData(p => ({ ...p, callRecordingUrl: e.target.value }))} />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-700">Remarks</Label>
                  <Textarea placeholder="Enter conversation details..."
                    value={verifyFormData.remarks}
                    onChange={(e) => setVerifyFormData(p => ({ ...p, remarks: e.target.value }))} />
                </div>

                {!allCheckedVerified && (
                  <p className="text-xs text-orange-600 bg-orange-50 border border-orange-150 p-2.5 rounded-lg flex items-start gap-1.5 shadow-xs">
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Verification Pending:</strong> Please verify all discussed commitments (marked in orange/Discussed) with the customer before approving this deal.
                    </span>
                  </p>
                )}

                <div className="flex gap-3 mt-4">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() => handleVerifySubmit('verified')}
                    disabled={verifyMutation.isPending || !allCheckedVerified || !canEdit}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Deal
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 font-bold"
                    onClick={() => handleVerifySubmit('rejected')}
                    disabled={verifyMutation.isPending || !canEdit}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Reject Deal
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MODAL 2 – VIEW DETAILS
      ══════════════════════════════════════════════════════ */}
      <Dialog open={detailModal.open} onOpenChange={(o) => !o && setDetailModal({ open: false, order: null })}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" /> Order Details
            </DialogTitle>
          </DialogHeader>
          {detailModal.order && (() => {
            const o = detailModal.order;
            const c = o.customer || {};
            const sp = o.salesPerson || {};
            return (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg">
                  <div><p className="text-xs text-gray-500">Order Code</p><p className="font-semibold text-blue-700">#{o.orderCode || 'N/A'}</p></div>
                  <div><p className="text-xs text-gray-500">Order Date</p><p className="font-semibold">{fmt(o.orderDate || o.createdAt)}</p></div>
                  <div><p className="text-xs text-gray-500">Total Amount</p><p className="font-bold text-green-700">{fmtAmt(o.totalAmount)}</p></div>
                  <div><p className="text-xs text-gray-500">Status</p>
                    <Badge className="bg-yellow-100 text-yellow-800 capitalize text-xs">{(o.status || '').replace(/_/g, ' ')}</Badge>
                  </div>
                  <div><p className="text-xs text-gray-500">Priority</p>
                    <Badge className={cn('text-xs', PRIORITY_COLORS[o.priority] || PRIORITY_COLORS.Medium)}>{o.priority || 'Medium'}</Badge>
                  </div>
                  <div><p className="text-xs text-gray-500">Payment Status</p><p className="font-semibold">{o.paymentStatus || 'Pending'}</p></div>
                  {o.requestedDeliveryDate && <div><p className="text-xs text-gray-500">Requested Delivery</p><p>{fmt(o.requestedDeliveryDate)}</p></div>}
                  {o.discountAmount > 0 && <div><p className="text-xs text-gray-500">Discount</p><p>{fmtAmt(o.discountAmount)}</p></div>}
                  {o.gst > 0 && <div><p className="text-xs text-gray-500">GST</p><p>{fmtAmt(o.gst)}</p></div>}
                </div>

                {/* Customer Info */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Info</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400 text-xs">Company</span><p className="font-semibold">{c.name || 'N/A'}</p></div>
                    <div><span className="text-gray-400 text-xs">Contact Person</span><p>{c.contactPerson || 'N/A'}</p></div>
                    <div><span className="text-gray-400 text-xs">Mobile</span>
                      <p className="text-blue-600 cursor-pointer" onClick={() => call(c.mobile)}>{c.mobile || 'N/A'}</p>
                    </div>
                    <div><span className="text-gray-400 text-xs">Email</span>
                      <p className="text-blue-600 cursor-pointer" onClick={() => email(c.email)}>{c.email || 'N/A'}</p>
                    </div>
                    <div><span className="text-gray-400 text-xs">City</span><p>{c.city || 'N/A'}</p></div>
                    <div><span className="text-gray-400 text-xs">State</span><p>{c.state || 'N/A'}</p></div>
                    <div><span className="text-gray-400 text-xs">Category</span><p>{c.category || 'N/A'}</p></div>
                    {c.gstin && <div><span className="text-gray-400 text-xs">GSTIN</span><p>{c.gstin}</p></div>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 text-blue-600 border-blue-200" onClick={() => call(c.mobile)}>
                      <Phone className="h-3 w-3 mr-1" /> Call
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-green-600 border-green-200" onClick={() => whatsapp(c.mobile, { name: c.name, orderCode: o.orderCode })}>
                      <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 text-blue-700 border-blue-200" onClick={() => email(c.email)}>
                      <Mail className="h-3 w-3 mr-1" /> Email
                    </Button>
                  </div>
                </div>

                {/* Sales Person */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sales Person</p>
                  <p className="font-semibold">{sp.fullName || sp.username || 'N/A'}</p>
                  {sp.email && <p className="text-xs text-gray-500">{sp.email}</p>}
                </div>

                {/* Products */}
                {(o.products || []).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Products</p>
                    <div className="space-y-1">
                      {o.products.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                          <div>
                            <span className="font-medium">{p.product?.name || p.product?.itemName || `Item ${i+1}`}</span>
                            <span className="text-gray-500 text-xs ml-2">× {p.quantity} @ {fmtAmt(p.price)}</span>
                          </div>
                          <span className="font-semibold text-green-700">{fmtAmt(p.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold pt-1">
                        <span>Total</span><span className="text-green-700">{fmtAmt(o.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {o.notes && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{o.notes}</p>
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => { setDetailModal({ open: false, order: null }); handleOpenVerifyModal(o); }}>
                      <ShieldCheck className="h-4 w-4 mr-2" /> Verify This Deal
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MODAL 3 – ORDER HISTORY
      ══════════════════════════════════════════════════════ */}
      <Dialog open={historyModal.open} onOpenChange={(o) => !o && setHistoryModal({ open: false, order: null })}>
        <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" /> Order History
              {historyModal.order && <span className="text-sm text-gray-400 font-normal">#{historyModal.order.orderCode}</span>}
            </DialogTitle>
          </DialogHeader>
          {historyModal.order && (
            <div className="space-y-3 py-2">
              {(historyModal.order.statusHistory || []).length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No history available yet</p>
                </div>
              ) : (
                [...(historyModal.order.statusHistory || [])].reverse().map((h, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',
                      h.status === 'approved' ? 'bg-green-500' :
                      h.status === 'rejected' || h.status === 'rejected_by_service' ? 'bg-red-500' :
                      h.status === 'pending_service_approval' ? 'bg-blue-500' : 'bg-yellow-500'
                    )} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <Badge className={cn('text-xs capitalize',
                          h.status === 'approved' ? 'bg-green-100 text-green-700' :
                          h.status?.includes('rejected') ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {(h.status || '').replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400">{fmtDT(h.updatedAt)}</span>
                      </div>
                      {h.remarks && <p className="text-xs text-gray-600 mt-1">{h.remarks}</p>}
                      {h.updatedBy && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          By: {h.updatedBy?.fullName || h.updatedBy?.username || 'System'}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Current status */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Current Status</p>
                <Badge className="bg-yellow-100 text-yellow-800 mt-1 capitalize">
                  {(historyModal.order.status || 'pending').replace(/_/g, ' ')}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">Created: {fmtDT(historyModal.order.createdAt)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MODAL 4 – NOTES
      ══════════════════════════════════════════════════════ */}
      <Dialog open={notesModal.open} onOpenChange={(o) => !o && setNotesModal({ open: false, order: null })}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" /> Order Notes
            </DialogTitle>
          </DialogHeader>
          {notesModal.order && (
            <div className="space-y-4 py-2">
              {notesModal.order.notes ? (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Existing Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{notesModal.order.notes}</p>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">No notes yet. Add one below.</div>
              )}
              <div className="space-y-2">
                <Label>Add Note</Label>
                <Textarea
                  placeholder="Write your note here..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
              </div>
              <Button className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleAddNote} disabled={updateMutation.isPending || !canEdit}>
                Add Note
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MODAL 5 – DOCUMENTS / QUOTATION
      ══════════════════════════════════════════════════════ */}
      <Dialog open={docsModal.open} onOpenChange={(o) => !o && setDocsModal({ open: false, order: null })}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" /> Documents
            </DialogTitle>
          </DialogHeader>
          {docsModal.order && (
            <div className="space-y-4 py-2">
              {docsModal.order.quotation ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm font-semibold text-green-700 mb-2">📄 Quotation Available</p>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const q = docsModal.order.quotation;
                      if (q.startsWith('data:application/pdf')) {
                        const w = window.open();
                        w.document.write(`<iframe src="${q}" frameborder="0" style="width:100%;height:100%;border:0;position:fixed;top:0;left:0;right:0;bottom:0;"></iframe>`);
                      } else {
                        const a = document.createElement('a');
                        a.href = q; a.download = `Quotation_${docsModal.order.orderCode}.pdf`; a.click();
                      }
                    }}>
                    <Eye className="h-4 w-4 mr-2" /> View Quotation
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No documents uploaded yet</p>
                </div>
              )}
              <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                <p className="font-bold text-gray-600 mb-1">Order: #{docsModal.order.orderCode}</p>
                <p className="text-gray-500">Customer: {docsModal.order.customer?.name || 'N/A'}</p>
                <p className="text-gray-500">Amount: {fmtAmt(docsModal.order.totalAmount)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MODAL 6 – PRIORITY
      ══════════════════════════════════════════════════════ */}
      <Dialog open={priorityModal.open} onOpenChange={(o) => !o && setPriorityModal({ open: false, order: null })}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" /> Set Priority
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={selPriority} onValueChange={setSelPriority}>
              <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="High">🔴 High</SelectItem>
                <SelectItem value="Medium">🟡 Medium</SelectItem>
                <SelectItem value="Low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSavePriority} disabled={updateMutation.isPending || !canEdit}>
              Save Priority
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════
          MODAL 7 – STATUS UPDATE
      ══════════════════════════════════════════════════════ */}
      <Dialog open={statusModal.open} onOpenChange={(o) => !o && setStatusModal({ open: false, order: null })}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-600" /> Update Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={selStatus} onValueChange={setSelStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">⏳ Pending</SelectItem>
                <SelectItem value="pending_service_approval">🔵 Pending Service Approval</SelectItem>
                <SelectItem value="approved">✅ Approved</SelectItem>
                <SelectItem value="rejected">❌ Rejected</SelectItem>
                <SelectItem value="in_production">🏭 In Production</SelectItem>
                <SelectItem value="completed">🎉 Completed</SelectItem>
                <SelectItem value="cancelled">🚫 Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveStatus} disabled={updateMutation.isPending || !canEdit}>
              Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default DealVerifications;
