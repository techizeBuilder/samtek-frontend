import React, { useState } from 'react';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Truck, Package, MapPin, X, Plus } from 'lucide-react';

const transportTypes = ['Local Transport', 'Transport Company', 'Courier'];

function CreateDispatchModal({ job, onClose }) {
  const { createDispatchOrder } = usePackagingDispatch();
  const { toast } = useToast();
  const [form, setForm] = useState({
    customerName: '',
    customerContact: '',
    deliveryAddress: '',
    transportType: 'Transport Company',
    plannedDispatchDate: '',
    expectedDeliveryDate: '',
    invoiceNumber: '',
    packingListNotes: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    setLoading(true);
    try {
      await createDispatchOrder({
        packagingJobId: job._id,
        productionOrderId: job.productionOrderId,
        orderId: job.orderId,
        machineCode: job.machineCode,
        machineName: job.machineName,
        serialNumber: job.serialNumber,
        ...form,
      });
      toast({ title: 'Dispatch order created', description: `Dispatch planned for ${job.orderId}` });
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
            <p className="text-sm font-medium text-slate-700">{job.jobId} — {job.orderId}</p>
            <p className="text-xs text-slate-500">{job.machineName} ({job.machineCode}) · SN: {job.serialNumber}</p>
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
                <Input className="mt-1" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} placeholder="INV-XXXX" />
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
  const [selected, setSelected] = useState(null);

  const packedJobs = jobs.filter(j => j.status === 'Packed');

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {selected && <CreateDispatchModal job={selected} onClose={() => setSelected(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dispatch Planning</h1>
        <p className="text-slate-500 text-sm mt-0.5">Create dispatch orders for packed machines</p>
      </div>

      {jobsLoading ? (
        <div className="text-center text-slate-500 py-16">Loading...</div>
      ) : packedJobs.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No packed jobs ready for dispatch</p>
          <p className="text-slate-400 text-sm mt-1">Complete packaging jobs to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packedJobs.map(job => (
            <Card key={job._id} className="border-none shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{job.jobId}</p>
                    <p className="text-sm text-slate-500">{job.machineName}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Packed</span>
                </div>
                <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                  <div className="flex gap-2"><Package className="h-3.5 w-3.5 text-slate-400 mt-0.5" /><span>{job.machineCode}</span></div>
                  <div className="flex gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5" /><span>SN: {job.serialNumber}</span></div>
                  <div className="flex gap-2"><Truck className="h-3.5 w-3.5 text-slate-400 mt-0.5" /><span>{job.packingType}</span></div>
                </div>
                <Button className="w-full" size="sm" onClick={() => setSelected(job)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Plan Dispatch
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
