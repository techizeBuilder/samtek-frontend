import React, { useState } from 'react';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Package, CheckCircle2, Clock, Plus, X, Lock, Boxes } from 'lucide-react';

const packingTypes = ['Wooden Packing', 'Bubble Wrap', 'Loose Dispatch'];

function CreateJobModal({ order, onClose }) {
  const { createJob } = usePackagingDispatch();
  const { toast } = useToast();
  const [form, setForm] = useState({
    packingType: 'Wooden Packing',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const unitsTotal = order.unitsTotal || 1;

  const handle = async () => {
    setLoading(true);
    try {
      const result = await createJob({
        productionOrderId: order._id,
        // Use salesOrderCode (resolved Order.orderCode) if available, else fall back to order.orderId
        // This ensures Accounts pages (NOC Request, Packed Orders) can match via Order.orderCode
        orderId: order.salesOrderCode || order.orderId,
        machineCode: order.machineCode,
        machineName: order.machineName,
        packingType: form.packingType,
        notes: form.notes,
      });
      const created = result?.unitsCreated || 1;
      toast({
        title: 'Packaging job created',
        description: created > 1
          ? `${created} unit jobs created for ${order.orderId} (one serial per unit)`
          : `Job created for ${order.orderId}`
      });
      onClose();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-slate-800">Create Packaging Job</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Order</p>
            <p className="font-medium text-slate-800">{order.orderId}</p>
            <p className="text-sm text-slate-600">{order.machineName} ({order.machineCode})</p>
            {unitsTotal > 1 && (
              <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                <Boxes className="h-3.5 w-3.5" />
                Qty {order.quantity}: {unitsTotal} unit jobs will be created, each with its own serial number
              </p>
            )}
            {order.quantity > 1 && unitsTotal === 1 && (
              <p className="text-xs text-slate-500 mt-1">One job carrying qty {order.quantity}</p>
            )}
          </div>
          <div>
            <Label>Packing Type</Label>
            <Select value={form.packingType} onValueChange={(v) => setForm(f => ({ ...f, packingType: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {packingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input className="mt-1" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special instructions..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handle} disabled={loading}>
            {loading ? 'Creating...' : unitsTotal > 1 ? `Create ${unitsTotal} Jobs` : 'Create Job'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PackagingQueue() {
  const { readyOrders, readyLoading } = usePackagingDispatch();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = readyOrders.filter(o =>
    !search || o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
    o.machineCode?.toLowerCase().includes(search.toLowerCase()) ||
    o.machineName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {selected && <CreateJobModal order={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Packaging Queue</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            QC-approved items ready for packaging — packing opens only when EVERY item of the order is QC-approved
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-slate-600">{readyOrders.length} ready</span>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by order ID or machine..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-white"
        />
      </div>

      {/* List */}
      {readyLoading ? (
        <div className="text-center text-slate-500 py-16">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No orders ready for packaging</p>
          <p className="text-slate-400 text-sm mt-1">QC-approved production orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const finalTest = order.processes?.find(p => p.step === 'Final Testing');
            const readiness = order.readiness;
            // Locked when the sales order is known and some of its items are not QC-approved yet
            const isLocked = readiness && !readiness.allReady;
            const pendingItems = isLocked
              ? readiness.items.filter(i => !i.ready)
              : [];

            return (
              <Card key={order._id} className={`border-none shadow-sm hover:shadow-md transition-all duration-200 ${isLocked ? 'opacity-90' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{order.orderId}</p>
                      <p className="text-sm text-slate-500">
                        {order.machineName}
                        {(order.quantity || 1) > 1 && (
                          <span className="ml-1.5 text-xs font-medium text-indigo-600">× {order.quantity}</span>
                        )}
                      </p>
                    </div>
                    {isLocked ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> {readiness.readyCount}/{readiness.totalCount} items
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        {readiness ? `All ${readiness.totalCount} item(s) ready` : 'QC Approved'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Package className="h-3.5 w-3.5 text-slate-400" />
                      <span>{order.machineCode}</span>
                    </div>
                    {finalTest && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Final Testing: {finalTest.qcStatus}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Created {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Pending items of the same order — why packing is locked */}
                  {isLocked && (
                    <div className="mb-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                        Waiting for order items
                      </p>
                      <ul className="space-y-0.5">
                        {pendingItems.map((pi, idx) => (
                          <li key={idx} className="text-xs text-amber-800 flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {pi.name} ×{pi.qty} — {pi.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="sm"
                    disabled={isLocked}
                    title={isLocked ? 'Packing opens when every item of this order is QC-approved' : ''}
                    onClick={() => !isLocked && setSelected(order)}
                  >
                    {isLocked ? (
                      <><Lock className="h-4 w-4 mr-1.5" /> Waiting for Full Order</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-1.5" /> Create Packaging Job{(order.unitsTotal || 1) > 1 ? `s (${order.unitsTotal})` : ''}</>
                    )}
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
