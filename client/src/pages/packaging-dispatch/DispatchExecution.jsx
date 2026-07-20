import React, { useState } from 'react';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, CheckCircle2, AlertTriangle, X, MapPin, Clock, Upload, FileText, FileCheck, Eye, Package } from 'lucide-react';
import DocumentViewerModal from '@/components/DocumentViewerModal';

const statusColor = {
  Ready: 'bg-blue-100 text-blue-700',
  Dispatched: 'bg-amber-100 text-amber-700',
  'In Transit': 'bg-purple-100 text-purple-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
};

// `group.jobs` is every DispatchOrder (one per machine) of a single sales
// order that's still eligible for this action. One form submit here drives
// all of them together — the same vehicle/driver/documents apply to the
// whole shipment, since it physically travels as one truckload — while each
// machine keeps its own DispatchOrder record underneath for serial-number
// tracking in the card list and Dispatch History.
function ExecuteDispatchModal({ group, onClose }) {
  const { executeDispatch } = usePackagingDispatch();
  const { toast } = useToast();
  const rep = group.jobs[0];
  const [form, setForm] = useState({
    vehicleNumber: rep.vehicleNumber || rep.gatePassVehicleNumber || '',
    driverName: rep.driverName || rep.gatePassDriverName || '',
    driverContact: rep.driverContact || rep.gatePassContactNumber || '',
    transportCompanyName: rep.transportCompanyName || '',
    notes: '',
  });
  const [files, setFiles] = useState({ noc: null, ewayBill: null, invoice: null });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setFile = (field) => (file) => setFiles(f => ({ ...f, [field]: file }));
  const allUploaded = files.noc && files.ewayBill && files.invoice;

  const handle = async () => {
    if (!allUploaded) {
      toast({ title: 'Documents required', description: 'Please upload NOC, E-Way Bill, and Invoice before dispatching.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Upload the 3 documents ONCE, against the first machine's dispatch
      // record — the rest of the order's machines (`siblingIds`) share that
      // same NOC/E-Way Bill/Invoice set server-side, instead of the browser
      // re-uploading identical files once per machine.
      const [first, ...siblings] = group.jobs;
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('noc', files.noc);
      fd.append('ewayBill', files.ewayBill);
      fd.append('invoice', files.invoice);
      if (siblings.length) fd.append('siblingIds', JSON.stringify(siblings.map(j => j._id)));

      await executeDispatch(first._id, fd);
      toast({
        title: 'Dispatched',
        description: `Order ${rep.orderId} is now dispatched (${group.jobs.length} machine${group.jobs.length > 1 ? 's' : ''})`
      });
      onClose();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const hasGatePass = rep.gatePassGenerated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        {/* Header — fixed */}
        <div className="flex justify-between items-center px-7 pt-7 pb-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg text-slate-800">Execute Dispatch</h2>
            <p className="text-xs text-slate-400 mt-0.5">Confirm vehicle & driver details to dispatch</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          {/* Dispatch Info */}
          <div className="p-4 bg-slate-50 rounded-xl text-sm border border-slate-100">
            <p className="font-semibold text-slate-700">{rep.orderId} — {group.jobs.length} machine{group.jobs.length > 1 ? 's' : ''}</p>
            <p className="text-slate-500 mt-0.5">{rep.customerName || 'Customer'}</p>
            {rep.deliveryAddress && (
              <p className="text-slate-400 text-xs mt-1">{rep.deliveryAddress}</p>
            )}
            {group.jobs.length > 1 && (
              <ul className="mt-2 pt-2 border-t border-slate-200 space-y-0.5">
                {group.jobs.map(j => (
                  <li key={j._id} className="text-xs text-slate-500">{j.machineName} · SN: {j.serialNumber}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Gate Pass autofill notice */}
          {hasGatePass && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">
                Gate Pass details auto-filled — {rep.gatePassNumber}
              </p>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium text-slate-700">Vehicle Number</Label>
            <Input
              className="mt-1.5"
              value={form.vehicleNumber}
              onChange={e => set('vehicleNumber', e.target.value)}
              placeholder="e.g. MH12AB1234"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Driver Name</Label>
            <Input
              className="mt-1.5"
              value={form.driverName}
              onChange={e => set('driverName', e.target.value)}
              placeholder="Driver full name"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Driver Contact</Label>
            <Input
              className="mt-1.5"
              value={form.driverContact}
              onChange={e => set('driverContact', e.target.value)}
              placeholder="10-digit mobile number"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Transport Company Name</Label>
            <Input
              className="mt-1.5"
              value={form.transportCompanyName}
              onChange={e => set('transportCompanyName', e.target.value)}
              placeholder="Company name (if applicable)"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Notes</Label>
            <Input
              className="mt-1.5"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Loading notes, special instructions..."
            />
          </div>

          {/* Delivery Documents — required before a dispatch can be executed */}
          <div className="pt-3 border-t border-slate-100 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Delivery Documents</p>
              <p className="text-xs text-slate-400 mt-0.5">Upload all 3 documents to execute the dispatch</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${files.noc ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {files.noc ? '✓' : '1'}
              </span>
              <div className={`flex-1 h-0.5 ${files.noc ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${files.ewayBill ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {files.ewayBill ? '✓' : '2'}
              </span>
              <div className={`flex-1 h-0.5 ${files.ewayBill ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${files.invoice ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {files.invoice ? '✓' : '3'}
              </span>
            </div>

            <FileUploadSlot
              label="NOC (No Objection Certificate)"
              fieldName="noc"
              icon={FileText}
              file={files.noc}
              onChange={setFile('noc')}
            />
            <FileUploadSlot
              label="E-Way Bill"
              fieldName="ewayBill"
              icon={FileText}
              file={files.ewayBill}
              onChange={setFile('ewayBill')}
            />
            <FileUploadSlot
              label="Invoice"
              fieldName="invoice"
              icon={FileText}
              file={files.invoice}
              onChange={setFile('invoice')}
            />

            {allUploaded && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">All documents uploaded — ready to dispatch</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer — fixed */}
        <div className="px-7 pb-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-11 bg-blue-600 hover:bg-blue-700" onClick={handle} disabled={loading || !allUploaded}>
            {loading ? 'Dispatching...' : 'Confirm Dispatch'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileUploadSlot({ label, fieldName, icon: Icon, file, onChange }) {
  const inputId = `delivery-doc-${fieldName}`;
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{label} <span className="text-red-500">*</span></Label>
      <label
        htmlFor={inputId}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${file
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'
          }`}
      >
        {file ? (
          <FileCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        ) : (
          <Icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {file ? (
            <p className="text-sm text-emerald-700 font-medium truncate">{file.name}</p>
          ) : (
            <p className="text-sm text-slate-500">Click to upload {label}</p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG — max 10 MB</p>
        </div>
        {file && (
          <button
            type="button"
            onClick={e => { e.preventDefault(); onChange(null); }}
            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}

function DeliveryModal({ group, onClose }) {
  const { confirmDelivery } = usePackagingDispatch();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const rep = group.jobs[0];

  const hasDocs = group.jobs.some(d => d.deliveryDocs && (
    d.deliveryDocs.noc || d.deliveryDocs.ewayBill || d.deliveryDocs.invoice
  ));

  const handle = async () => {
    setLoading(true);
    try {
      await Promise.all(group.jobs.map(j => confirmDelivery(j._id, { deliveryOTPVerified: true })));
      toast({
        title: 'Delivery confirmed',
        description: `Order ${rep.orderId} delivered and moved to Dispatch History (${group.jobs.length} machine${group.jobs.length > 1 ? 's' : ''})`
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg text-slate-800">Confirm Delivery</h2>
            <p className="text-xs text-slate-400 mt-0.5">This closes the dispatch and moves it to Dispatch History</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-sm border border-slate-100">
            <p className="font-semibold text-slate-700">{rep.orderId} — {group.jobs.length} machine{group.jobs.length > 1 ? 's' : ''}</p>
            <p className="text-slate-500 mt-0.5">{rep.customerName || 'Customer'}</p>
          </div>

          {hasDocs ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <FileCheck className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Delivery documents already uploaded at dispatch</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">No delivery documents found on this dispatch</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700" onClick={handle} disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm Delivery'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// One card per ORDER — `group.jobs` is every DispatchOrder (one per machine)
// of that order that's still active. Bulk actions below only ever touch the
// subset of `group.jobs` that's actually eligible for a given transition
// (e.g. only the ones still 'Dispatched' for Mark In Transit), so a slightly
// out-of-sync sibling never blocks or errors the whole order's action.
function DispatchGroupCard({ group }) {
  const { markInTransit, closeDispatch } = usePackagingDispatch();
  const { toast } = useToast();
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const rep = group.jobs[0];
  const today = new Date().toISOString().split('T')[0];
  const isDelayed = group.jobs.some(d => d.expectedDeliveryDate && d.expectedDeliveryDate < today &&
    ['Dispatched', 'In Transit'].includes(d.status));

  const hasDocs = group.jobs.some(d => d.deliveryDocs && (
    d.deliveryDocs.noc || d.deliveryDocs.ewayBill || d.deliveryDocs.invoice
  ));

  const readyJobs = group.jobs.filter(d => d.status === 'Ready');
  const dispatchedJobs = group.jobs.filter(d => d.status === 'Dispatched');
  const transitJobs = group.jobs.filter(d => d.status === 'In Transit');
  const deliveredJobs = group.jobs.filter(d => d.status === 'Delivered'); // legacy fallback

  const statusCounts = group.jobs.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});
  const uniformStatus = Object.keys(statusCounts).length === 1 ? group.jobs[0].status : null;

  const handleInTransit = async () => {
    setLoading(true);
    try {
      await Promise.all(dispatchedJobs.map(d => markInTransit(d._id)));
      toast({ title: 'Status updated', description: `Order ${rep.orderId} is In Transit` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    setLoading(true);
    try {
      await Promise.all(deliveredJobs.map(d => closeDispatch(d._id)));
      toast({ title: 'Dispatch closed', description: `Order ${rep.orderId} is closed` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {modal === 'execute' && <ExecuteDispatchModal group={{ ...group, jobs: readyJobs }} onClose={() => setModal(null)} />}
      {modal === 'deliver' && <DeliveryModal group={{ ...group, jobs: [...dispatchedJobs, ...transitJobs] }} onClose={() => setModal(null)} />}
      {modal === 'documents' && (
        <DocumentViewerModal
          title={`${rep.orderId} — Delivery Documents`}
          documents={[
            { label: 'NOC (No Objection Certificate)', path: rep.deliveryDocs?.noc },
            { label: 'E-Way Bill', path: rep.deliveryDocs?.ewayBill },
            { label: 'Invoice', path: rep.deliveryDocs?.invoice },
          ]}
          onClose={() => setModal(null)}
        />
      )}

      <Card className={`border-none shadow-sm hover:shadow-md transition-all duration-200 ${isDelayed ? 'ring-1 ring-red-300' : ''}`}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800">{rep.orderId}</p>
                {isDelayed && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </div>
              <p className="text-sm text-slate-500">{group.jobs.length} machine{group.jobs.length > 1 ? 's' : ''}</p>
            </div>
            {uniformStatus ? (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[uniformStatus]}`}>
                {uniformStatus}
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600" title={Object.entries(statusCounts).map(([s, n]) => `${n} ${s}`).join(', ')}>
                Mixed
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-sm text-slate-600 mb-4">
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {group.jobs.map(d => (
                <div key={d._id} className="flex items-start gap-2">
                  <Package className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{d.machineName} — <span className="text-slate-400">SN: {d.serialNumber}</span></span>
                  {!uniformStatus && (
                    <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor[d.status]}`}>{d.status}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-start">
              <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>{rep.customerName || '—'}{rep.deliveryAddress ? ` · ${rep.deliveryAddress.slice(0, 40)}...` : ''}</span>
            </div>
            <div className="flex gap-2">
              <Truck className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
              <span>{rep.transportType}{rep.vehicleNumber ? ` · ${rep.vehicleNumber}` : ''}</span>
            </div>
            {rep.trackingId && (
              <div className="flex gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                <span className="font-mono text-xs">{rep.trackingId}</span>
              </div>
            )}
            {rep.expectedDeliveryDate && (
              <div className={`flex gap-2 ${isDelayed ? 'text-red-600 font-medium' : ''}`}>
                <Clock className="h-3.5 w-3.5 mt-0.5" />
                <span>Expected: {new Date(rep.expectedDeliveryDate).toLocaleDateString('en-IN')}{isDelayed ? ' (DELAYED)' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {readyJobs.length > 0 && (
              <Button size="sm" className="flex-1" onClick={() => setModal('execute')}>
                <Truck className="h-4 w-4 mr-1.5" />
                Execute Dispatch{readyJobs.length > 1 ? ` (${readyJobs.length})` : ''}
              </Button>
            )}
            {dispatchedJobs.length > 0 && (
              <>
                {hasDocs && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setModal('documents')}>
                    <Eye className="h-4 w-4 mr-1.5" />
                    Docs
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1" onClick={handleInTransit} disabled={loading}>
                  Mark In Transit{dispatchedJobs.length > 1 ? ` (${dispatchedJobs.length})` : ''}
                </Button>
              </>
            )}
            {(dispatchedJobs.length > 0 || transitJobs.length > 0) && (
              <Button size="sm" className="flex-1" onClick={() => setModal('deliver')}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Confirm Delivery{(dispatchedJobs.length + transitJobs.length) > 1 ? ` (${dispatchedJobs.length + transitJobs.length})` : ''}
              </Button>
            )}
            {transitJobs.length > 0 && hasDocs && dispatchedJobs.length === 0 && (
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setModal('documents')}>
                <Eye className="h-4 w-4 mr-1.5" />
                Docs
              </Button>
            )}
            {/* Legacy fallback: dispatches that reached 'Delivered' before this step was
                merged into Confirm Delivery still need a way to close out. */}
            {deliveredJobs.length > 0 && (
              <>
                {hasDocs && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setModal('documents')}>
                    <Eye className="h-4 w-4 mr-1.5" />
                    View Documents
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
                  Close Dispatch{deliveredJobs.length > 1 ? ` (${deliveredJobs.length})` : ''}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function DispatchExecution() {
  const { dispatchOrders, dispatchOrdersLoading } = usePackagingDispatch();
  const [filter, setFilter] = useState('all');

  const activeStatuses = ['Ready', 'Dispatched', 'In Transit', 'Delivered'];
  const allStatuses = ['all', 'Ready', 'Dispatched', 'In Transit', 'Delivered'];

  const filtered = dispatchOrders.filter(d => {
    if (filter === 'all') return activeStatuses.includes(d.status);
    return d.status === filter;
  });

  // One card per ORDER, not per machine — an order with 8 machines used to
  // render 8 near-identical "Active Dispatch" cards, each needing its own
  // Execute/In-Transit/Confirm-Delivery clicks. Grouping here still keeps
  // each machine's own DispatchOrder underneath (for serial-number tracking)
  // — only the action buttons are now one entity per order.
  const orderGroups = Object.values(
    filtered.reduce((acc, d) => {
      if (!acc[d.orderId]) acc[d.orderId] = { orderId: d.orderId, jobs: [] };
      acc[d.orderId].jobs.push(d);
      return acc;
    }, {})
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Active Dispatches</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage ongoing dispatch operations and delivery tracking</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {allStatuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {s === 'all' ? 'All Active' : s} ({
              s === 'all'
                ? dispatchOrders.filter(d => activeStatuses.includes(d.status)).length
                : dispatchOrders.filter(d => d.status === s).length
            })
          </button>
        ))}
      </div>

      {dispatchOrdersLoading ? (
        <div className="text-center text-slate-500 py-16">Loading...</div>
      ) : orderGroups.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No active dispatches</p>
          <p className="text-slate-400 text-sm mt-1">Create dispatch orders from the planning page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orderGroups.map(group => <DispatchGroupCard key={group.orderId} group={group} />)}
        </div>
      )}
    </div>
  );
}
