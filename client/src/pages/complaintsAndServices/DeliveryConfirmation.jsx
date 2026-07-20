import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Phone, MessageCircle, Mail, MapPin, Truck, CheckCircle, Package, AlertCircle } from 'lucide-react';

// One consolidated confirmation entity per sales order — an order with
// several dispatched machines used to render one card per machine here,
// each needing its own separate WhatsApp/call/status update even though
// it's the same customer being asked about the same delivery. Grouping by
// orderId means Complaint Management confirms delivery once per order; the
// underlying per-machine DispatchOrder records are all updated together.
const groupByOrder = (list) => Object.values(
  (list || []).reduce((acc, o) => {
    if (!acc[o.orderId]) acc[o.orderId] = { orderId: o.orderId, jobs: [] };
    acc[o.orderId].jobs.push(o);
    return acc;
  }, {})
);

// Issue on any machine takes priority (needs attention); otherwise the group
// only counts as "Reached Safely" once every machine has been confirmed.
const groupConfirmationStatus = (jobs) => {
  if (jobs.some(o => o.customerConfirmation?.status === 'Issue')) return 'Issue';
  if (jobs.every(o => o.customerConfirmation?.status === 'Reached Safely')) return 'Reached Safely';
  return 'Pending';
};

export default function DeliveryConfirmation() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['dispatched-orders'],
    queryFn: () => apiRequest('GET', '/api/complaints/dispatched-orders')
  });

  const updateMutation = useMutation({
    mutationFn: ({ ids, data }) => apiRequest('PUT', `/api/complaints/dispatched-orders/bulk/customer-confirmation`, { ids, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatched-orders'] });
      setSelectedGroup(null);
      toast({ title: 'Success', description: 'Customer confirmation updated' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const orders = ordersData?.data || [];
  const groups = groupByOrder(orders);

  // Group orders
  const pendingOrders = groups.filter(g => groupConfirmationStatus(g.jobs) === 'Pending');
  const confirmedOrders = groups.filter(g => groupConfirmationStatus(g.jobs) === 'Reached Safely');
  const issueOrders = groups.filter(g => groupConfirmationStatus(g.jobs) === 'Issue');

  const handleUpdate = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    updateMutation.mutate({
      ids: selectedGroup.jobs.map(j => j._id),
      data: {
        status: fd.get('status'),
        remarks: fd.get('remarks')
      }
    });
  };

  const handleWhatsApp = (phone, group) => {
    const rep = group.jobs[0];
    const text = `Hello ${rep.customerName},\nWe dispatched your machine${group.jobs.length > 1 ? 's' : ''} (${group.jobs.map(j => j.machineName).join(', ')}) on ${rep.actualDispatchDate || 'recently'}. Has it reached safely?`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmail = (email, group) => {
    const rep = group.jobs[0];
    const subject = `Delivery Confirmation: ${rep.machineName}`;
    const body = `Hello ${rep.customerName},\n\nWe dispatched your machine${group.jobs.length > 1 ? 's' : ''} (${group.jobs.map(j => j.machineName).join(', ')}) recently. Please let us know if it has reached safely.\n\nThank you,\nSamtek Team`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleCall = (phone) => {
    window.open(`tel:${phone}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Delivery Confirmation</h1>
          <p className="text-slate-500">Confirm with customers if their dispatched machine reached safely.</p>
        </div>
      </div>

      <div className="w-full space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">No dispatched orders</p>
              <p className="text-slate-400">There are currently no dispatched orders to confirm.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="mb-4 bg-slate-100">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                Pending ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="data-[state=active]:bg-white">
                Confirmed ({confirmedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="issues" className="data-[state=active]:bg-white">
                Issues ({issueOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              {pendingOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <CheckCircle className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">No pending confirmations</p>
                  </CardContent>
                </Card>
              ) : (
                <OrderList
                  list={pendingOrders}
                  canEdit={true}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  handleWhatsApp={handleWhatsApp}
                  handleCall={handleCall}
                  handleEmail={handleEmail}
                />
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="mt-0">
              {confirmedOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Package className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">No confirmed deliveries yet</p>
                  </CardContent>
                </Card>
              ) : (
                <OrderList
                  list={confirmedOrders}
                  canEdit={false}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  handleWhatsApp={handleWhatsApp}
                  handleCall={handleCall}
                  handleEmail={handleEmail}
                />
              )}
            </TabsContent>

            <TabsContent value="issues" className="mt-0">
              {issueOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <CheckCircle className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-lg font-medium text-slate-600">No reported issues</p>
                  </CardContent>
                </Card>
              ) : (
                <OrderList
                  list={issueOrders}
                  canEdit={false}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  handleWhatsApp={handleWhatsApp}
                  handleCall={handleCall}
                  handleEmail={handleEmail}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="sm:max-w-[560px] mt-8 mb-16 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Update delivery confirmation status for {selectedGroup?.jobs[0]?.customerName}
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="pt-4 pb-8">
              <div className="mb-6 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-slate-800">{selectedGroup.jobs[0].customerName}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedGroup.jobs.map(j => j.machineName).join(', ')}
                </p>
                <p className="text-xs text-slate-500">Contact: {selectedGroup.jobs[0].customerContact}</p>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Confirmation Status</Label>
                  <Select name="status" defaultValue={selectedGroup.jobs[0].customerConfirmation?.status || "Reached Safely"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Reached Safely">Reached Safely</SelectItem>
                      <SelectItem value="Issue">Issue / Delay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Remarks / Conversation details</Label>
                  <Input name="remarks" defaultValue={selectedGroup.jobs[0].customerConfirmation?.remarks} placeholder="Spoke to customer..." />
                </div>

                <Button type="submit" className="w-full mt-4" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Confirmation'}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderList({ list, canEdit = false, selectedGroup, setSelectedGroup, handleWhatsApp, handleCall, handleEmail }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(group => {
        const rep = group.jobs[0];
        const status = groupConfirmationStatus(group.jobs);
        return (
        <Card
          key={group.orderId}
          className={`transition-all ${canEdit ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : 'cursor-default opacity-90'} ${selectedGroup?.orderId === group.orderId ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : ''}`}
          onClick={() => canEdit && setSelectedGroup(group)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{rep.customerName || 'Unknown Customer'}</h3>
                <p className="text-sm text-slate-500">{rep.orderId}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status === 'Issue' ? 'bg-red-100 text-red-700' : status === 'Reached Safely' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {status}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {group.jobs.map(j => (
                  <div key={j._id} className="flex items-center text-slate-600">
                    <Package className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{j.machineName} (SN: {j.serialNumber})</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center text-slate-600">
                <Truck className="w-4 h-4 mr-2 text-slate-400" />
                Dispatched: {rep.actualDispatchDate || 'N/A'}
              </div>
              <div className="flex items-center text-slate-600">
                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                {rep.deliveryAddress || 'Address not specified'}
              </div>
            </div>

            <div className="flex gap-2 border-t pt-3">
              <Button variant="outline" size="sm" className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 border-green-200" onClick={(e) => { e.stopPropagation(); handleWhatsApp(rep.customerContact, group); }}>
                <MessageCircle className="w-4 h-4 mr-1.5" /> WA
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" onClick={(e) => { e.stopPropagation(); handleCall(rep.customerContact); }}>
                <Phone className="w-4 h-4 mr-1.5" /> Call
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200" onClick={(e) => { e.stopPropagation(); handleEmail('customer@example.com', group); }}>
                <Mail className="w-4 h-4 mr-1.5" /> Mail
              </Button>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
