import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Star, CheckCircle, User, Package, Phone, MessageCircle, Mail } from 'lucide-react';

export default function FeedbackRatings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(0);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['dispatched-orders'],
    queryFn: () => apiRequest('GET', '/api/complaints/dispatched-orders')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/complaints/dispatched-orders/${id}/feedback`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatched-orders'] });
      setSelectedOrder(null);
      setRating(0);
      toast({ title: 'Success', description: 'Feedback and rating saved' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const orders = ordersData?.data || [];

  // Filter for orders where installation is completed
  const completedOrders = orders.filter(o => o.installation?.status === 'Completed');
  const pendingFeedback = completedOrders.filter(o => !o.feedback?.rating);
  const receivedFeedback = completedOrders.filter(o => o.feedback?.rating > 0);

  const handleUpdate = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: 'Error', description: 'Please select a star rating', variant: 'destructive' });
      return;
    }
    const fd = new FormData(e.target);
    updateMutation.mutate({
      id: selectedOrder._id,
      data: { rating, comments: fd.get('comments') }
    });
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setRating(order.feedback?.rating || 0);
  };

  const handleWhatsApp = (phone, order, e) => {
    if (e) e.stopPropagation();
    const text = `Hello ${order.customerName},\nWe would love to get your feedback on the installation of your ${order.machineName}. How was your experience with our technician and the product?`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCall = (phone, e) => {
    if (e) e.stopPropagation();
    window.open(`tel:${phone}`);
  };

  const handleEmail = (email, order, e) => {
    if (e) e.stopPropagation();
    const subject = `Feedback Request: ${order.machineName}`;
    const body = `Hello ${order.customerName},\n\nWe hope you are satisfied with the installation of your ${order.machineName}. We would appreciate your feedback on our service and product quality.\n\nThank you,\nSamtek Team`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const ratingLabel = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Feedback & Ratings</h1>
        <p className="text-slate-500">Collect feedback for completed installations.</p>
      </div>

      <div className="w-full space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : completedOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Star className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">No completed installations</p>
              <p className="text-slate-400">Complete an installation to collect feedback.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4 bg-slate-100">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                Pending Feedback ({pendingFeedback.length})
              </TabsTrigger>
              <TabsTrigger value="received" className="data-[state=active]:bg-white">
                Received ({receivedFeedback.length})
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
                  handleSelectOrder={handleSelectOrder}
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
                <FeedbackList 
                  list={receivedFeedback} 
                  handleSelectOrder={handleSelectOrder}
                  handleWhatsApp={handleWhatsApp}
                  handleCall={handleCall}
                  handleEmail={handleEmail}
                  canEdit={false}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dialog Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setRating(0); } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Customer Feedback</DialogTitle>
            <DialogDescription>
              Collect feedback from {selectedOrder?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="pt-2">
              <div className="mb-5 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <p className="text-sm font-medium text-slate-800">{selectedOrder.customerName}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedOrder.machineName}</p>
                <p className="text-xs text-slate-500">Installed by: {selectedOrder.installation?.technicianName || 'Unknown'}</p>
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
                    defaultValue={selectedOrder.feedback?.comments}
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

function FeedbackList({ list, handleSelectOrder, handleWhatsApp, handleCall, handleEmail, canEdit = true }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(order => (
        <Card
          key={order._id}
          className={`transition-all ${canEdit ? 'cursor-pointer hover:border-amber-400 hover:shadow-md' : 'cursor-default opacity-90'}`}
          onClick={() => canEdit && handleSelectOrder(order)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{order.customerName || 'Unknown Customer'}</h3>
                <p className="text-sm text-slate-500">{order.orderId}</p>
              </div>
              {order.feedback?.rating ? (
                <div className="flex bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full items-center text-xs font-medium gap-1">
                  {order.feedback.rating}
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                </div>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                  Pending
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm mb-3">
              <div className="flex items-center text-slate-600">
                <Package className="w-4 h-4 mr-2 text-slate-400" />
                {order.machineName}
              </div>
              <div className="flex items-center text-slate-600">
                <User className="w-4 h-4 mr-2 text-slate-400" />
                Tech: {order.installation?.technicianName || 'Unknown'}
              </div>
            </div>

            {order.feedback?.comments && (
              <p className="text-xs text-slate-500 mt-3 italic border-t pt-2">"{order.feedback.comments}"</p>
            )}

            {/* Communication buttons for pending feedback only */}
            {!order.feedback?.rating && (
              <div className="flex gap-2 border-t pt-3 mt-3">
                <Button variant="outline" size="sm" className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 border-green-200" onClick={(e) => handleWhatsApp(order.customerContact, order, e)}>
                  <MessageCircle className="w-4 h-4 mr-1.5" /> WA
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" onClick={(e) => handleCall(order.customerContact, e)}>
                  <Phone className="w-4 h-4 mr-1.5" /> Call
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200" onClick={(e) => handleEmail('customer@example.com', order, e)}>
                  <Mail className="w-4 h-4 mr-1.5" /> Mail
                </Button>
              </div>
            )}

            {canEdit && (
              <p className="text-xs text-slate-400 mt-3 text-center">Click to {order.feedback?.rating ? 'update' : 'add'} feedback</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
