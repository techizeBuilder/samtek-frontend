import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Star, CheckCircle, User, Package, Phone, MessageCircle, Mail, BadgeCheck, Link2, Search } from 'lucide-react';
import { sendWhatsApp } from '@/lib/whatsapp';
import SendEmailModal from '@/components/email/SendEmailModal';

// One consolidated feedback entity per sales order — a multi-machine order
// used to render one feedback card per machine, asking the same customer to
// rate the same visit multiple times. Grouping by orderId means one rating
// covers the whole order (see bulkUpdateInstallationSchedule, which shares
// one feedback token/email across every machine of the order too).
const groupByOrder = (list) => Object.values(
  (list || []).reduce((acc, o) => {
    if (!acc[o.orderId]) acc[o.orderId] = { orderId: o.orderId, jobs: [] };
    acc[o.orderId].jobs.push(o);
    return acc;
  }, {})
);

export default function FeedbackRatings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rating, setRating] = useState(0);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [historyPage, setHistoryPage] = useState(1);
  const [emailModal, setEmailModal] = useState({ open: false, to: '', subject: '', message: '' });

  // Reset to page 1 whenever the search changes so the user doesn't land on
  // a now-out-of-range page.
  useEffect(() => { setHistoryPage(1); }, [search]);

  // Pending Feedback is the "active worklist" — one rating from Complaint
  // Management covers every machine of the order at once (see
  // bulkUpdateFeedbackAndRatings), so this bucket only ever holds orders
  // still awaiting feedback; fetched in full, no pagination needed since it
  // drains as feedback comes in.
  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['dispatched-orders', 'feedback', 'active', search],
    queryFn: () => {
      const params = new URLSearchParams({ stage: 'feedback', bucket: 'active' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/complaints/dispatched-orders?${params.toString()}`);
    },
  });

  // Received is the ever-growing history — real backend pagination, 10
  // orders per page.
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['dispatched-orders', 'feedback', 'history', historyPage, search],
    queryFn: () => {
      const params = new URLSearchParams({ stage: 'feedback', bucket: 'history', page: String(historyPage), limit: '10' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/complaints/dispatched-orders?${params.toString()}`);
    },
    keepPreviousData: true,
  });

  const updateMutation = useMutation({
    mutationFn: ({ ids, data }) => apiRequest('PUT', `/api/complaints/dispatched-orders/bulk/feedback`, { ids, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatched-orders'] });
      setSelectedGroup(null);
      setRating(0);
      toast({ title: 'Success', description: 'Feedback and rating saved' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const isLoading = activeLoading || historyLoading;
  const orders = activeData?.data || [];
  const groups = groupByOrder(orders);

  // Feedback only makes sense once every machine of the order is installed.
  // (Backend's stage=feedback fetch already guarantees this; kept as a
  // defensive no-op filter.)
  const pendingFeedback = groups.filter(g => g.jobs.every(o => o.installation?.status === 'Completed'));

  const historyOrders = historyData?.data || [];
  const receivedFeedback = groupByOrder(historyOrders); // already rated — backend-filtered
  const historyPagination = historyData?.pagination || { page: 1, pages: 1, total: 0 };
  const noOrdersAtAll = pendingFeedback.length === 0 && historyPagination.total === 0;

  const handleUpdate = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: 'Error', description: 'Please select a star rating', variant: 'destructive' });
      return;
    }
    const fd = new FormData(e.target);
    updateMutation.mutate({
      ids: selectedGroup.jobs.map(j => j._id),
      data: { rating, comments: fd.get('comments') }
    });
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setRating(group.jobs[0].feedback?.rating || 0);
  };

  const handleWhatsApp = async (phone, group, e) => {
    if (e) e.stopPropagation();
    const rep = group.jobs[0];
    const machines = group.jobs.map(j => j.machineName).join(', ');
    const text = `Hello ${rep.customerName},\nWe would love to get your feedback on the installation of your ${machines}. How was your experience with our technician and the product?`;
    const result = await sendWhatsApp(phone, text);
    if (result.automatic) {
      toast({ title: 'Sent!', description: 'Feedback request sent automatically via WhatsApp' });
    }
  };

  const handleCall = (phone, e) => {
    if (e) e.stopPropagation();
    window.open(`tel:${phone}`);
  };

  const handleEmail = (email, group, e) => {
    if (e) e.stopPropagation();
    if (!email) {
      toast({ title: 'No Email', description: 'Customer ka email register nahi hai', variant: 'destructive' });
      return;
    }
    const rep = group.jobs[0];
    const machines = group.jobs.map(j => j.machineName).join(', ');
    const subject = `Feedback Request: ${machines}`;
    const body = `Hello ${rep.customerName},\n\nWe hope you are satisfied with the installation of your ${machines}. We would appreciate your feedback on our service and product quality.\n\nThank you,\nSamtek Team`;
    setEmailModal({ open: true, to: email, subject, message: body });
  };

  const ratingLabel = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Feedback & Ratings</h1>
        <p className="text-slate-500">Collect feedback for completed installations.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search by order ID or customer name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="w-full space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : noOrdersAtAll ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Star className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">No completed installations</p>
              <p className="text-slate-400">Complete an installation to collect feedback.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 bg-slate-100">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                Pending Feedback ({pendingFeedback.length})
              </TabsTrigger>
              <TabsTrigger value="received" className="data-[state=active]:bg-white">
                Received ({historyPagination.total})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              {pendingFeedback.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle className="h-12 w-12 text-green-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">All feedback collected!</p>
                </CardContent></Card>
              ) : (
                <FeedbackList
                  list={pendingFeedback}
                  handleSelectGroup={handleSelectGroup}
                  handleWhatsApp={handleWhatsApp}
                  handleCall={handleCall}
                  handleEmail={handleEmail}
                  canEdit={true}
                />
              )}
            </TabsContent>

            <TabsContent value="received" className="mt-0">
              {receivedFeedback.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center justify-center py-16">
                  <Star className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">No feedback received yet</p>
                </CardContent></Card>
              ) : (
                <>
                  <FeedbackList
                    list={receivedFeedback}
                    handleSelectGroup={handleSelectGroup}
                    handleWhatsApp={handleWhatsApp}
                    handleCall={handleCall}
                    handleEmail={handleEmail}
                    canEdit={false}
                  />
                  <Pager page={historyPage} totalPages={historyPagination.pages} setPage={setHistoryPage} />
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Send Email Modal */}
      <SendEmailModal
        open={emailModal.open}
        onOpenChange={(open) => setEmailModal((p) => ({ ...p, open }))}
        to={emailModal.to}
        department="INFO"
        defaultSubject={emailModal.subject}
        defaultMessage={emailModal.message}
      />

      {/* Dialog Modal */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => { if (!open) { setSelectedGroup(null); setRating(0); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Customer Feedback</DialogTitle>
            <DialogDescription>
              Collect feedback from {selectedGroup?.jobs[0]?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="pt-2">
              <div className="mb-5 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <p className="text-sm font-medium text-slate-800">{selectedGroup.jobs[0].customerName}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedGroup.jobs.map(j => j.machineName).join(', ')}</p>
                <p className="text-xs text-slate-500">Installed by: {selectedGroup.jobs[0].installation?.technicianName || 'Unknown'}</p>
              </div>

              <form onSubmit={handleUpdate} className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-center block">Customer Rating</Label>
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="focus:outline-none transition-transform hover:scale-110"
                        onClick={() => setRating(star)}
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${rating >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200 hover:text-amber-200'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-center text-sm font-semibold text-amber-600">
                      {rating}/5 — {ratingLabel[rating]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Customer Comments</Label>
                  <Textarea
                    name="comments"
                    rows={3}
                    defaultValue={selectedGroup.jobs[0].feedback?.comments}
                    placeholder="What did the customer say about the product and installation?"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={updateMutation.isPending || rating === 0}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Submit Feedback'}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeedbackList({ list, handleSelectGroup, handleWhatsApp, handleCall, handleEmail, canEdit = true }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(group => {
        const rep = group.jobs[0];
        return (
        <Card
          key={group.orderId}
          className={`transition-all ${canEdit ? 'cursor-pointer hover:border-amber-400 hover:shadow-md' : 'cursor-default opacity-90'}`}
          onClick={() => canEdit && handleSelectGroup(group)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{rep.customerName || 'Unknown Customer'}</h3>
                <p className="text-sm text-slate-500">{rep.orderId}</p>
              </div>
              {rep.feedback?.rating ? (
                <div className="flex bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full items-center text-xs font-medium gap-1">
                  {rep.feedback.rating}
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                </div>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                  Pending
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm mb-3">
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {group.jobs.map(j => (
                  <div key={j._id} className="flex items-center text-slate-600">
                    <Package className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{j.machineName}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center text-slate-600">
                <User className="w-4 h-4 mr-2 text-slate-400" />
                Tech: {rep.installation?.technicianName || 'Unknown'}
              </div>
            </div>

            {/* Show if feedback was submitted by customer via form */}
            {rep.feedback?.submittedViaForm && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-full px-3 py-1 mb-2 w-fit">
                <BadgeCheck className="w-3.5 h-3.5" />
                Submitted by customer
              </div>
            )}

            {/* Show if feedback link was sent (pending feedback) */}
            {!rep.feedback?.rating && rep.feedback?.feedbackToken && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-2 w-fit">
                <Link2 className="w-3.5 h-3.5" />
                Feedback link sent
              </div>
            )}

            {rep.feedback?.comments && (
              <p className="text-xs text-slate-500 mt-3 italic border-t pt-2">"{rep.feedback.comments}"</p>
            )}

            {/* Communication buttons for pending feedback only */}
            {!rep.feedback?.rating && (
              <div className="flex gap-2 border-t pt-3 mt-3">
                <Button variant="outline" size="sm" className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 border-green-200" onClick={(e) => handleWhatsApp(rep.customerContact, group, e)}>
                  <MessageCircle className="w-4 h-4 mr-1.5" /> WA
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" onClick={(e) => handleCall(rep.customerContact, e)}>
                  <Phone className="w-4 h-4 mr-1.5" /> Call
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200" onClick={(e) => handleEmail(rep.customerEmail, group, e)}>
                  <Mail className="w-4 h-4 mr-1.5" /> Mail
                </Button>
              </div>
            )}

            {canEdit && (
              <p className="text-xs text-slate-400 mt-3 text-center">Click to {rep.feedback?.rating ? 'update' : 'add'} feedback</p>
            )}
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}

function Pager({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
      <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
    </div>
  );
}
