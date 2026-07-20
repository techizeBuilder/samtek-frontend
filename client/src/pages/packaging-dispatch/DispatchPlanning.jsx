import React, { useState } from 'react';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Truck, Package, MapPin, X, Plus, FileText } from 'lucide-react';

const transportTypes = ['Local Transport', 'Transport Company', 'Courier'];

// `group` is one consolidated order — `group.jobs` holds every packed
// machine of that order. One "Create Dispatch Order" click plans dispatch
// for the whole order in a single wrapper action: the backend still creates
// one DispatchOrder per machine underneath (so Active Dispatches / Dispatch
// History keep per-serial-number tracking), it's just no longer something
// the planner has to trigger job-by-job.
function CreateDispatchModal({ group, onClose }) {
  const { createDispatchOrder } = usePackagingDispatch();
  const { toast } = useToast();
  const rep = group.jobs[0]; // representative job — shared order-level fields
  const [form, setForm] = useState({
    customerName: rep.customerName || '',
    customerContact: rep.customerContact || '',
    deliveryAddress: '',
    transportType: 'Transport Company',
    plannedDispatchDate: '',
    expectedDeliveryDate: '',
    invoiceNumber: rep.invoiceNumber || '',
    packingListNotes: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    setLoading(true);
    try {
      await createDispatchOrder({
        packagingJobIds: group.jobs.map(j => j._id),
        orderId: rep.orderId,
        ...form,
      });
      toast({
        title: 'Dispatch order created',
        description: `Dispatch planned for ${rep.orderId} (${group.jobs.length} machine${group.jobs.length > 1 ? 's' : ''})`
      });
      onClose();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Plan Dispatch</h2>
            <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
          </div>
          <div className="mt-2 p-3 bg-slate-50 rounded-lg">
            <p className="text-sm font-medium text-slate-700">{rep.orderId} — {group.jobs.length} machine{group.jobs.length > 1 ? 's' : ''}</p>
          </div>
          {/* Every packed machine of this order — all get their own
              DispatchOrder in this one action. */}
          <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide mb-1">
              This order dispatches together ({group.jobs.length} packed job{group.jobs.length > 1 ? 's' : ''})
            </p>
            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
              {group.jobs.map(s => (
                <li key={s._id} className="text-xs text-indigo-800">
                  {s.machineName}{(s.quantity || 1) > 1 ? ` ×${s.quantity}` : ''} · SN: {s.serialNumber}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Customer / Destination</p>
            <div className="space-y-3">
              <div>
                <Label>Customer Name</Label>
                <Input className="mt-1" value={form.customerName} onChange={e => set('customerName', e.target.value)} placeholder="Customer / company name" />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input className="mt-1" value={form.customerContact} onChange={e => set('customerContact', e.target.value)} placeholder="Phone number" />
              </div>
              <div>
                <Label>Delivery Address</Label>
                <Input className="mt-1" value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} placeholder="Full delivery address" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Transport</p>
            <div className="space-y-3">
              <div>
                <Label>Transport Type</Label>
                <Select value={form.transportType} onValueChange={v => set('transportType', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {transportTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Planned Dispatch Date</Label>
                  <Input type="date" className="mt-1" value={form.plannedDispatchDate} onChange={e => set('plannedDispatchDate', e.target.value)} />
                </div>
                <div>
                  <Label>Expected Delivery Date</Label>
                  <Input type="date" className="mt-1" value={form.expectedDeliveryDate} onChange={e => set('expectedDeliveryDate', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Documents</p>
            <div className="space-y-3">
              <div>
                <Label>Invoice Number</Label>
                {/* Auto-filled from the order's generated invoice — never manually
                    editable, so dispatch always ties back to a real invoice. */}
                <div className="mt-1 flex items-center gap-2 h-10 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium text-sm">
                  <FileText className="h-4 w-4" />
                  {form.invoiceNumber || '—'}
                </div>
              </div>
              <div>
                <Label>Packing List Notes</Label>
                <Input className="mt-1" value={form.packingListNotes} onChange={e => set('packingListNotes', e.target.value)} placeholder="Items included in packing..." />
              </div>
              <div>
                <Label>Notes</Label>
                <Input className="mt-1" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 pb-6 pt-4 border-t border-slate-100">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handle} disabled={loading}>
              {loading ? 'Creating...' : 'Create Dispatch Order'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DispatchPlanning() {
  const { jobs, jobsLoading } = usePackagingDispatch();
  const { toast } = useToast();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const packedJobs = jobs.filter(j => j.status === 'Packed');

  // Multi-item: all packaging jobs of the same order travel together
  const jobsOfOrder = (orderId) => jobs.filter(j => j.orderId === orderId);
  const packedSiblings = (orderId) => jobsOfOrder(orderId).filter(j => j.status === 'Packed' || j.status === 'Dispatched');
  const unpackedSiblings = (orderId) => jobsOfOrder(orderId).filter(j => j.status === 'Pending' || j.status === 'In Progress');

  // One card per ORDER, not per packaging job — an order with 8 packed
  // machines used to render 8 near-identical "waiting for NOC" cards.
  // Accounts only needs to act on the NOC/Gate Pass/Plan Dispatch once per
  // order; the individual machines are listed inside that one card.
  const orderGroups = Object.values(
    packedJobs.reduce((acc, job) => {
      if (!acc[job.orderId]) acc[job.orderId] = { orderId: job.orderId, jobs: [] };
      acc[job.orderId].jobs.push(job);
      return acc;
    }, {})
  );

  const handlePlanDispatch = (group) => {
    const rep = group.jobs[0];
    // 🚧 The full order dispatches together — block planning while any
    // packaging job of the same order is still not Packed (server enforces
    // this too, plus the "every item QC-approved" readiness gate).
    const stillPacking = unpackedSiblings(group.orderId);
    if (stillPacking.length > 0) {
      toast({
        title: 'Order Not Fully Packed',
        description: `${stillPacking.length} job(s) of order ${group.orderId} still packing: ${stillPacking.map(s => s.machineName).join(', ')}. The full order dispatches together.`,
        variant: 'destructive'
      });
      return;
    }
    // Invoice must exist for the order before dispatch can be planned — this
    // is enforced again server-side, but checking here avoids opening the
    // modal just to have it rejected on submit.
    if (!rep.invoiceNumber) {
      toast({
        title: 'Invoice Not Generated',
        description: 'Accounts must generate the invoice (Pakka/Kachha) for this order before dispatch can be planned.',
        variant: 'destructive'
      });
      return;
    }

    // If there's no linked Sale (old packed jobs before NOC system), allow dispatch directly
    const hasSaleLinked = !!(rep.customerName || rep.nocStatus || rep.gatePassStatus);

    if (hasSaleLinked) {
      // New flow: must have NOC approved first
      if (rep.nocStatus === 'Pending' || !rep.nocStatus) {
        toast({
          title: 'NOC Not Approved',
          description: 'Accounts department must approve the NOC request before dispatch planning.',
          variant: 'destructive'
        });
        return;
      }
      // Then must have Gate Pass
      if (rep.gatePassStatus !== 'Generated') {
        toast({
          title: 'Gate Pass Not Generated',
          description: 'Gate pass must be generated by Accounts before dispatch planning.',
          variant: 'destructive'
        });
        return;
      }
    }
    // Old packed jobs (no Sale linked) go directly to dispatch
    setSelectedOrderId(group.orderId);
  };

  const selectedGroup = selectedOrderId
    ? { orderId: selectedOrderId, jobs: packedSiblings(selectedOrderId) }
    : null;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {selectedGroup && selectedGroup.jobs.length > 0 && (
        <CreateDispatchModal
          group={selectedGroup}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dispatch Planning</h1>
        <p className="text-slate-500 text-sm mt-0.5">Create dispatch orders for packed machines</p>
      </div>

      {jobsLoading ? (
        <div className="text-center text-slate-500 py-16">Loading...</div>
      ) : orderGroups.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No packed jobs ready for dispatch</p>
          <p className="text-slate-400 text-sm mt-1">Complete packaging jobs to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orderGroups.map(group => {
            const rep = group.jobs[0];
            const stillPacking = unpackedSiblings(group.orderId);
            const ready = rep.invoiceNumber && rep.nocStatus === 'Approved' && rep.gatePassStatus === 'Generated';
            return (
            <Card key={group.orderId} className="border-none shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{group.orderId}</p>
                    <p className="text-sm text-slate-500">
                      {group.jobs.length} machine{group.jobs.length > 1 ? 's' : ''} packed
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Packed</span>
                </div>
                <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {group.jobs.map(j => (
                      <div key={j._id} className="flex items-start gap-2">
                        <Package className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <span>{j.machineName}{(j.quantity || 1) > 1 ? ` ×${j.quantity}` : ''} — <span className="text-slate-400">SN: {j.serialNumber}</span></span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2"><Truck className="h-3.5 w-3.5 text-slate-400 mt-0.5" /><span>{rep.packingType}</span></div>
                  {stillPacking.length > 0 && (
                    <div className="text-xs text-amber-600 font-medium">
                      ⏳ Waiting: {stillPacking.length} job(s) of this order still packing
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-slate-100">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${rep.invoiceNumber ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {rep.invoiceNumber ? `Invoice: ${rep.invoiceNumber}` : 'Invoice: Not Generated'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${rep.nocStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      NOC: {rep.nocStatus || 'Pending'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${rep.gatePassStatus === 'Generated' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      GP: {rep.gatePassStatus || 'Pending'}
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handlePlanDispatch(group)}
                  variant={ready ? 'default' : 'secondary'}
                  title={!rep.invoiceNumber ? 'Invoice not generated for this order yet' : undefined}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Plan Dispatch ({group.jobs.length})
                </Button>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
