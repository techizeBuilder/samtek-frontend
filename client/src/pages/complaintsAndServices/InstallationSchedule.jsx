import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getServicemen } from '@/api/complaintApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CalendarCheck, MapPin, CheckCircle, Package, User, Phone, MessageCircle, Mail, Send, ChevronDown, Search } from 'lucide-react';

// One consolidated installation entity per sales order — a multi-machine
// order used to render one card per machine, each needing its own schedule
// even though one technician visit installs everything for the same
// customer at once. Grouping by orderId means one schedule/status update
// (and, on Completed, one feedback email) covers the whole order.
const groupByOrder = (list) => Object.values(
  (list || []).reduce((acc, o) => {
    if (!acc[o.orderId]) acc[o.orderId] = { orderId: o.orderId, jobs: [] };
    acc[o.orderId].jobs.push(o);
    return acc;
  }, {})
);

const groupInstallationStatus = (jobs) => {
  if (jobs.every(j => j.installation?.status === 'Completed')) return 'Completed';
  if (jobs.some(j => j.installation?.status === 'Scheduled')) return 'Scheduled';
  return 'Pending';
};

export default function InstallationSchedule() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [historyPage, setHistoryPage] = useState(1);

  // Reset to page 1 whenever the search changes so the user doesn't land on
  // a now-out-of-range page.
  useEffect(() => { setHistoryPage(1); }, [search]);

  const [formState, setFormState] = useState({
    status: 'Scheduled',
    scheduledDate: '',
    technicians: [], // [{ technicianId, technicianName }] — supports multiple technicians per installation
    manualTechnicianName: '', // free-text fallback when no servicemen list is available
    remarks: ''
  });

  // Pending/Scheduled are the "active worklist" — one technician visit
  // installs every machine of an order together (see
  // bulkUpdateInstallationSchedule), so this bucket only ever holds orders
  // still awaiting/undergoing installation; fetched in full, no pagination
  // needed since it drains as work gets done.
  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['dispatched-orders', 'installation', 'active', search],
    queryFn: () => {
      const params = new URLSearchParams({ stage: 'installation', bucket: 'active' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/complaints/dispatched-orders?${params.toString()}`);
    },
  });

  // Completed is the ever-growing history — real backend pagination, 10
  // orders per page.
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['dispatched-orders', 'installation', 'history', historyPage, search],
    queryFn: () => {
      const params = new URLSearchParams({ stage: 'installation', bucket: 'history', page: String(historyPage), limit: '10' });
      if (search) params.set('search', search);
      return apiRequest('GET', `/api/complaints/dispatched-orders?${params.toString()}`);
    },
    keepPreviousData: true,
  });

  const { data: servicemenData } = useQuery({
    queryKey: ['servicemen'],
    queryFn: () => getServicemen(),
    staleTime: 1000 * 60 * 5
  });

  const updateMutation = useMutation({
    mutationFn: ({ ids, data }) =>
      apiRequest('PUT', `/api/complaints/dispatched-orders/bulk/installation-schedule`, { ids, ...data }),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['dispatched-orders'] });
      setSelectedGroup(null);

      // Show specific toast based on whether feedback email was sent
      if (response?.emailSent) {
        toast({
          title: '✅ Installation Completed',
          description: `Feedback email automatically sent to ${response.customerEmail}`
        });
      } else if (formState.status === 'Completed') {
        toast({
          title: '✅ Installation Completed',
          description: 'Schedule saved. No customer email found — feedback link not sent.'
        });
      } else {
        toast({ title: 'Success', description: 'Installation schedule updated' });
      }
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const isLoading = activeLoading || historyLoading;
  const orders = activeData?.data || [];
  const servicemen = servicemenData?.servicemen || servicemenData?.data || [];

  const groups = groupByOrder(orders);
  // Installation can only proceed once every machine of the order has been
  // confirmed as reached safely — a partially-confirmed order isn't ready
  // yet. (Backend's stage=installation fetch already guarantees this; kept
  // as a defensive no-op filter.)
  const reachedGroups = groups.filter(g => g.jobs.every(o => o.customerConfirmation?.status === 'Reached Safely'));
  const pendingOrders = reachedGroups.filter(g => groupInstallationStatus(g.jobs) === 'Pending');
  const scheduledOrders = reachedGroups.filter(g => groupInstallationStatus(g.jobs) === 'Scheduled');

  const historyOrders = historyData?.data || [];
  const completedOrders = groupByOrder(historyOrders); // already all "Completed" — backend-filtered
  const historyPagination = historyData?.pagination || { page: 1, pages: 1, total: 0 };
  const noOrdersAtAll = reachedGroups.length === 0 && historyPagination.total === 0;

  const openModal = (group) => {
    setSelectedGroup(group);
    const rep = group.jobs[0];

    // Prefer the structured multi-technician array; fall back to splitting
    // the legacy comma-joined technicianName string for older records,
    // trying to recover each technician's id by matching against the
    // servicemen list.
    const existingTechnicians = Array.isArray(rep.installation?.technicians) && rep.installation.technicians.length > 0
      ? rep.installation.technicians
      : (rep.installation?.technicianName || '')
          .split(',')
          .map(n => n.trim())
          .filter(Boolean)
          .map(name => {
            const match = servicemen.find(s => (s.fullName || s.name || s.username) === name);
            return { technicianId: match ? (match._id || match.id) : '', technicianName: name };
          });

    setFormState({
      status: rep.installation?.status || 'Scheduled',
      scheduledDate: rep.installation?.scheduledDate
        ? new Date(rep.installation.scheduledDate).toISOString().split('T')[0]
        : '',
      technicians: existingTechnicians,
      manualTechnicianName: existingTechnicians.map(t => t.technicianName).join(', '),
      remarks: rep.installation?.remarks || ''
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    // Date is required for Scheduled and Completed status
    if ((formState.status === 'Scheduled' || formState.status === 'Completed') && !formState.scheduledDate) {
      toast({
        title: 'Date Required',
        description: 'Please select a scheduled date before saving.',
        variant: 'destructive'
      });
      return;
    }

    const technicians = servicemen.length > 0
      ? formState.technicians
      : formState.manualTechnicianName.split(',').map(n => n.trim()).filter(Boolean).map(name => ({ technicianId: '', technicianName: name }));

    // Technician is required for Scheduled and Completed status
    if ((formState.status === 'Scheduled' || formState.status === 'Completed') && technicians.length === 0) {
      toast({
        title: 'Technician Required',
        description: 'Please select at least one technician/serviceman before saving.',
        variant: 'destructive'
      });
      return;
    }

    updateMutation.mutate({
      ids: selectedGroup.jobs.map(j => j._id),
      data: {
        status: formState.status,
        scheduledDate: formState.scheduledDate,
        technicians,
        technicianName: technicians.map(t => t.technicianName).join(', '),
        remarks: formState.remarks
      }
    });
  };

  const notifyCustomer = (group, e) => {
    if (e) e.stopPropagation();
    const rep = group.jobs[0];
    const machines = group.jobs.map(j => j.machineName).join(', ');
    const text = `Hello ${rep.customerName},\nYour installation for ${machines} has been scheduled for ${rep.installation?.scheduledDate ? new Date(rep.installation.scheduledDate).toLocaleDateString() : 'upcoming dates'}.\nOur technician ${rep.installation?.technicianName || ''} will contact you.`;
    window.open(`https://wa.me/${(rep.customerContact || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleWhatsApp = (phone, group, e) => {
    if (e) e.stopPropagation();
    const rep = group.jobs[0];
    const machines = group.jobs.map(j => j.machineName).join(', ');
    const text = `Hello ${rep.customerName},\nWe need to schedule the installation for your ${machines}. When would be a convenient time for you?`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCall = (phone, e) => {
    if (e) e.stopPropagation();
    window.open(`tel:${phone}`);
  };

  const handleEmail = (email, group, e) => {
    if (e) e.stopPropagation();
    const rep = group.jobs[0];
    const machines = group.jobs.map(j => j.machineName).join(', ');
    const subject = `Installation Schedule: ${machines}`;
    const body = `Hello ${rep.customerName},\n\nWe need to schedule the installation for your ${machines}. Please let us know your preferred date and time.\n\nThank you,\nSamtek Team`;
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
              <CalendarCheck className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">No orders ready for installation</p>
              <p className="text-slate-400">Only orders confirmed as 'Reached Safely' will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 bg-slate-100">
              <TabsTrigger value="pending" className="data-[state=active]:bg-white">
                Pending ({pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-white">
                Scheduled ({scheduledOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-white">
                Completed ({historyPagination.total})
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
                  setSelectedGroup={openModal}
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
                  setSelectedGroup={openModal}
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
                <>
                  <InstallationList
                    list={completedOrders}
                    setSelectedGroup={setSelectedGroup}
                    notifyCustomer={notifyCustomer}
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

      {/* Modal */}
      {!!selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>

            {/* Header */}
            <div className="flex justify-between items-center px-7 pt-7 pb-5 border-b border-slate-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Schedule Installation</h2>
                <p className="text-xs text-slate-400 mt-0.5">Update installation details for {selectedGroup.jobs[0].customerName}</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <span className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</span>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-7 py-5">
              {/* Customer info card */}
              <div className="mb-5 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-slate-800">{selectedGroup.jobs[0].customerName}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedGroup.jobs.map(j => j.machineName).join(', ')}</p>
                <p className="text-xs text-slate-500">Contact: {selectedGroup.jobs[0].customerContact}</p>
                {selectedGroup.jobs[0].customerEmail && (
                  <p className="text-xs text-blue-600 mt-1">📧 {selectedGroup.jobs[0].customerEmail}</p>
                )}
              </div>

              <form id="installation-form" onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Status</Label>
                  <Select
                    value={formState.status}
                    onValueChange={(v) => setFormState(f => ({ ...f, status: v }))}
                  >
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

                {/* Auto email notice when Completed is selected */}
                {formState.status === 'Completed' && selectedGroup.jobs[0].installation?.status !== 'Completed' && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    <Send className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700">Feedback email will be sent automatically</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {selectedGroup.jobs[0].customerEmail
                          ? `Email: ${selectedGroup.jobs[0].customerEmail}`
                          : 'Customer email will be fetched from order records automatically.'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Schedule Date
                    {(formState.status === 'Scheduled' || formState.status === 'Completed') && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <Input
                    type="date"
                    value={formState.scheduledDate}
                    onChange={e => setFormState(f => ({ ...f, scheduledDate: e.target.value }))}
                    required={formState.status === 'Scheduled' || formState.status === 'Completed'}
                    className={!formState.scheduledDate && (formState.status === 'Scheduled' || formState.status === 'Completed') ? 'border-red-300 focus-visible:ring-red-400' : ''}
                  />
                  {!formState.scheduledDate && (formState.status === 'Scheduled' || formState.status === 'Completed') && (
                    <p className="text-xs text-red-500">Date is required to schedule installation</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Technician / Serviceman
                    {(formState.status === 'Scheduled' || formState.status === 'Completed') && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  {servicemen.length > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={`w-full justify-between font-normal ${
                            formState.technicians.length === 0 && (formState.status === 'Scheduled' || formState.status === 'Completed')
                              ? 'border-red-300 focus-visible:ring-red-400'
                              : ''
                          }`}
                        >
                          <span className="truncate text-left">
                            {formState.technicians.length > 0
                              ? formState.technicians.map(t => t.technicianName).join(', ')
                              : 'Select technician(s)'}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-2 max-h-64 overflow-y-auto" align="start">
                        {servicemen.map((s) => {
                          const id = s._id || s.id;
                          const name = s.fullName || s.name || s.username || 'Unknown';
                          const extra = s.designation || s.role || s.serviceZone || '';
                          const checked = formState.technicians.some(t => t.technicianId === id);
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  setFormState(f => ({
                                    ...f,
                                    technicians: isChecked
                                      ? [...f.technicians, { technicianId: id, technicianName: name }]
                                      : f.technicians.filter(t => t.technicianId !== id)
                                  }));
                                }}
                              />
                              <span className="text-slate-700">{name}{extra ? ` — ${extra}` : ''}</span>
                            </label>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input
                      value={formState.manualTechnicianName}
                      onChange={e => setFormState(f => ({ ...f, manualTechnicianName: e.target.value }))}
                      placeholder="Enter technician name(s), comma separated"
                      className={!formState.manualTechnicianName.trim() && (formState.status === 'Scheduled' || formState.status === 'Completed') ? 'border-red-300 focus-visible:ring-red-400' : ''}
                    />
                  )}
                  {((servicemen.length > 0 && formState.technicians.length === 0) || (servicemen.length === 0 && !formState.manualTechnicianName.trim())) &&
                    (formState.status === 'Scheduled' || formState.status === 'Completed') && (
                    <p className="text-xs text-red-500">Technician is required to schedule installation</p>
                  )}
                  {formState.technicians.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formState.technicians.map((t) => (
                        <span
                          key={t.technicianId || t.technicianName}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 text-xs"
                        >
                          {t.technicianName}
                          <button
                            type="button"
                            onClick={() => setFormState(f => ({ ...f, technicians: f.technicians.filter(x => x !== t) }))}
                            className="hover:text-emerald-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Remarks</Label>
                  <Input
                    value={formState.remarks}
                    onChange={e => setFormState(f => ({ ...f, remarks: e.target.value }))}
                    placeholder="Any notes..."
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-7 pb-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
              {selectedGroup.jobs[0].installation?.status === 'Scheduled' && (
                <Button type="button" variant="outline" className="flex-1 text-green-600 border-green-200" onClick={() => notifyCustomer(selectedGroup, null)}>
                  Notify via WhatsApp
                </Button>
              )}
              <Button type="submit" form="installation-form" className="flex-1 h-11" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InstallationList({ list, setSelectedGroup, notifyCustomer, handleWhatsApp, handleCall, handleEmail, canEdit = true }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map(group => {
        const rep = group.jobs[0];
        const status = groupInstallationStatus(group.jobs);
        return (
        <Card
          key={group.orderId}
          className={`transition-all ${canEdit ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : 'cursor-default opacity-90'}`}
          onClick={() => canEdit && setSelectedGroup(group)}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{rep.customerName || 'Unknown Customer'}</h3>
                <p className="text-sm text-slate-500">{rep.orderId}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                status === 'Completed' ? 'bg-green-100 text-green-700' :
                status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {status}
              </span>
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
                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                {rep.deliveryAddress || 'Address not specified'}
              </div>
            </div>

            {(rep.installation?.status === 'Scheduled' || rep.installation?.status === 'Completed') && (
              <div className="bg-slate-50 p-3 rounded-md text-sm border-t border-slate-100 pt-3 space-y-1">
                <div className="flex items-center text-slate-700 font-medium">
                  <CalendarCheck className="w-3.5 h-3.5 mr-2 text-blue-500" />
                  {rep.installation.scheduledDate
                    ? new Date(rep.installation.scheduledDate).toLocaleDateString()
                    : 'TBD'}
                </div>
                <div className="flex items-center text-slate-600">
                  <User className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  Tech: {rep.installation.technicianName || 'TBD'}
                </div>
                {rep.installation?.status === 'Scheduled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-green-600 border-green-200"
                    onClick={(e) => { e.stopPropagation(); notifyCustomer(group, e); }}
                  >
                    Notify Customer
                  </Button>
                )}
              </div>
            )}

            {/* Communication buttons for pending orders */}
            {(!rep.installation || rep.installation.status === 'Pending') && (
              <div className="flex gap-2 border-t pt-3 mt-3">
                <Button variant="outline" size="sm" className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 border-green-200" onClick={(e) => handleWhatsApp(rep.customerContact, group, e)}>
                  <MessageCircle className="w-4 h-4 mr-1.5" /> WA
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" onClick={(e) => handleCall(rep.customerContact, e)}>
                  <Phone className="w-4 h-4 mr-1.5" /> Call
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200" onClick={(e) => handleEmail('customer@example.com', group, e)}>
                  <Mail className="w-4 h-4 mr-1.5" /> Mail
                </Button>
              </div>
            )}

            {canEdit && (
              <p className="text-xs text-slate-400 mt-3 text-center">Click to update schedule</p>
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
