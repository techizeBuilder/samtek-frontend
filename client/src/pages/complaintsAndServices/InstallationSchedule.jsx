import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CalendarCheck, MapPin, CheckCircle, Package, User, Phone, MessageCircle, Mail } from 'lucide-react';

export default function InstallationSchedule() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['dispatched-orders'],
    queryFn: () => apiRequest('GET', '/api/complaints/dispatched-orders')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/complaints/dispatched-orders/${id}/installation-schedule`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatched-orders'] });
      setSelectedOrder(null);
      toast({ title: 'Success', description: 'Installation schedule updated' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const orders = ordersData?.data || [];

  const reachedOrders = orders.filter(o => o.customerConfirmation?.status === 'Reached Safely');
  const pendingOrders = reachedOrders.filter(o => !o.installation || o.installation.status === 'Pending');
  const scheduledOrders = reachedOrders.filter(o => o.installation?.status === 'Scheduled');
  const completedOrders = reachedOrders.filter(o => o.installation?.status === 'Completed');

  const handleUpdate = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    updateMutation.mutate({
      id: selectedOrder._id,
      data: {
        status: fd.get('status'),
        scheduledDate: fd.get('scheduledDate'),
        technicianName: fd.get('technicianName'),
        remarks: fd.get('remarks')
      }
    });
  };

  const notifyCustomer = (order, e) => {
    if (e) e.stopPropagation();
    const text = `Hello ${order.customerName},\nYour installation for ${order.machineName} has been scheduled for ${new Date(order.installation?.scheduledDate).toLocaleDateString() || 'upcoming dates'}.\nOur technician ${order.installation?.technicianName || ''} will contact you.`;
    window.open(`https://wa.me/${(order.customerContact || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleWhatsApp = (phone, order, e) => {
    if (e) e.stopPropagation();
    const text = `Hello ${order.customerName},\nWe need to schedule the installation for your ${order.machineName}. When would be a convenient time for you?`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCall = (phone, e) => {
    if (e) e.stopPropagation();
    window.open(`tel:${phone}`);
  };

  const handleEmail = (email, order, e) => {
    if (e) e.stopPropagation();
    const subject = `Installation Schedule: ${order.machineName}`;
    const body = `Hello ${order.customerName},\n\nWe need to schedule the installation for your ${order.machineName}. Please let us know your preferred date and time.\n\nThank you,\nSamtek Team`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Installation Scheduling</h1>
          <p className="text-slate-500">Schedule technicians for machines that have reached safely.</p>
        </div>
      </div>

      <div className="w-full space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : reachedOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CalendarCheck className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">No orders ready for installation</p>
              <p className="text-slate-400">Only orders confirmed as 'Reached Safely' will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4 bg-slate-100">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                Pending ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-white">
                Scheduled ({scheduledOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-white">
                Completed ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              {pendingOrders.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center justify-center py-16">
                  <CalendarCheck className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">No pending installations</p>
                </CardContent></Card>
              ) : (
                <InstallationList 
                  list={pendingOrders} 
                  setSelectedOrder={setSelectedOrder} 
                  notifyCustomer={notifyCustomer}
                  handleWhatsApp={handleWhatsApp}
                  handleCall={handleCall}
                  handleEmail={handleEmail}
                  canEdit={true}
                />
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="mt-0">
              {scheduledOrders.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center justify-center py-16">
                  <CalendarCheck className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">No scheduled installations</p>
                </CardContent></Card>
              ) : (
                <InstallationList 
                  list={scheduledOrders} 
                  setSelectedOrder={setSelectedOrder} 
                  notifyCustomer={notifyCustomer}
                  handleWhatsApp={handleWhatsApp}
                  handleCall={handleCall}
                  handleEmail={handleEmail}
                  canEdit={true}
                />
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              {completedOrders.length === 0 ? (
                <Card><CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckCircle className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">No completed installations</p>
                </CardContent></Card>
              ) : (
                <InstallationList 
                  list={completedOrders} 
                  setSelectedOrder={setSelectedOrder} 
                  notifyCustomer={notifyCustomer}
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
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Schedule Installation</DialogTitle>
            <DialogDescription>
              Update installation details for {selectedOrder?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="pt-2">
              <div className="mb-5 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-slate-800">{selectedOrder.customerName}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedOrder.machineName}</p>
                <p className="text-xs text-slate-500">Contact: {selectedOrder.customerContact}</p>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={selectedOrder.installation?.status || "Scheduled"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Schedule Date</Label>
                  <Input
                    type="date"
                    name="scheduledDate"
                    defaultValue={selectedOrder.installation?.scheduledDate ? new Date(selectedOrder.installation.scheduledDate).toISOString().split('T')[0] : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Technician Name</Label>
                  <Input name="technicianName" defaultValue={selectedOrder.installation?.technicianName} placeholder="Enter technician name" />
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input name="remarks" defaultValue={selectedOrder.installation?.remarks} placeholder="Any notes..." />
                </div>

                <div className="flex gap-2 pt-2">
                  {selectedOrder.installation?.status === 'Scheduled' && (
                    <Button type="button" variant="outline" className="flex-1 text-green-600 border-green-200" onClick={() => notifyCustomer(selectedOrder, null)}>
                      Notify via WhatsApp
                    </Button>
                  )}
                  <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Save Schedule'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstallationList({ list, setSelectedOrder, notifyCustomer, handleWhatsApp, handleCall, handleEmail, canEdit = true }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(order => (
        <Card
          key={order._id}
          className={`transition-all ${canEdit ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : 'cursor-default opacity-90'}`}
          onClick={() => canEdit && setSelectedOrder(order)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{order.customerName || 'Unknown Customer'}</h3>
                <p className="text-sm text-slate-500">{order.orderId}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${order.installation?.status === 'Completed' ? 'bg-green-100 text-green-700' : order.installation?.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                {order.installation?.status || 'Pending'}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-3">
              <div className="flex items-center text-slate-600">
                <Package className="w-4 h-4 mr-2 text-slate-400" />
                {order.machineName}
              </div>
              <div className="flex items-center text-slate-600">
                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                {order.deliveryAddress || 'Address not specified'}
              </div>
            </div>

            {(order.installation?.status === 'Scheduled' || order.installation?.status === 'Completed') && (
              <div className="bg-slate-50 p-3 rounded-md text-sm border-t border-slate-100 pt-3 space-y-1">
                <div className="flex items-center text-slate-700 font-medium">
                  <CalendarCheck className="w-3.5 h-3.5 mr-2 text-blue-500" />
                  {order.installation.scheduledDate ? new Date(order.installation.scheduledDate).toLocaleDateString() : 'TBD'}
                </div>
                <div className="flex items-center text-slate-600">
                  <User className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  Tech: {order.installation.technicianName || 'TBD'}
                </div>
                {order.installation?.status === 'Scheduled' && (
                  <Button variant="outline" size="sm" className="w-full mt-2 text-green-600 border-green-200" onClick={(e) => { e.stopPropagation(); notifyCustomer(order, e); }}>
                    Notify Customer
                  </Button>
                )}
              </div>
            )}

            {/* Communication buttons for pending orders only */}
            {(!order.installation || order.installation.status === 'Pending') && (
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
              <p className="text-xs text-slate-400 mt-3 text-center">Click to update schedule</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
