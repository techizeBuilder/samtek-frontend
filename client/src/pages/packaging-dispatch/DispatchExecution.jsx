import React, { useState } from 'react';
import { usePackagingDispatch } from '@/contexts/PackagingDispatchContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, CheckCircle2, AlertTriangle, X, MapPin, Clock, Upload, FileText, FileCheck, Eye } from 'lucide-react';
import DocumentViewerModal from '@/components/DocumentViewerModal';

const statusColor = {
  Ready: 'bg-blue-100 text-blue-700',
  Dispatched: 'bg-amber-100 text-amber-700',
  'In Transit': 'bg-purple-100 text-purple-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
};

function ExecuteDispatchModal({ dispatch, onClose }) {
  const { executeDispatch } = usePackagingDispatch();
  const { toast } = useToast();
  const [form, setForm] = useState({
    vehicleNumber: dispatch.vehicleNumber || dispatch.gatePassVehicleNumber || '',
    driverName: dispatch.driverName || dispatch.gatePassDriverName || '',
    driverContact: dispatch.driverContact || dispatch.gatePassContactNumber || '',
    transportCompanyName: dispatch.transportCompanyName || '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async () => {
    setLoading(true);
    try {
      await executeDispatch(dispatch._id, form);
      toast({ title: 'Dispatched', description: `${dispatch.dispatchId} is now dispatched` });
      onClose();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const hasGatePass = dispatch.gatePassGenerated;

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
            <p className="font-semibold text-slate-700">{dispatch.dispatchId}</p>
            <p className="text-slate-500 mt-0.5">{dispatch.machineName} → {dispatch.customerName || 'Customer'}</p>
            {dispatch.deliveryAddress && (
              <p className="text-slate-400 text-xs mt-1">{dispatch.deliveryAddress}</p>
            )}
          </div>

          {/* Gate Pass autofill notice */}
          {hasGatePass && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">
                Gate Pass details auto-filled — {dispatch.gatePassNumber}
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
        </div>

        {/* Footer — fixed */}
        <div className="px-7 pb-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 h-11 bg-blue-600 hover:bg-blue-700" onClick={handle} disabled={loading}>
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

function DeliveryModal({ dispatch, onClose }) {
  const { confirmDelivery } = usePackagingDispatch();
  const { toast } = useToast();
  const [files, setFiles] = useState({ noc: null, ewayBill: null, invoice: null });
  const [loading, setLoading] = useState(false);

  const setFile = (field) => (file) => setFiles(f => ({ ...f, [field]: file }));

  const allUploaded = files.noc && files.ewayBill && files.invoice;

  const handle = async () => {
    if (!allUploaded) {
      toast({ title: 'Documents required', description: 'Please upload NOC, E-Way Bill, and Invoice before confirming delivery.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('noc', files.noc);
      formData.append('ewayBill', files.ewayBill);
      formData.append('invoice', files.invoice);
      formData.append('deliveryOTPVerified', 'true');

      await confirmDelivery(dispatch._id, formData);
      toast({ title: 'Delivery confirmed', description: `${dispatch.dispatchId} marked as delivered` });
      onClose();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 60px)' }}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg text-slate-800">Confirm Delivery</h2>
            <p className="text-xs text-slate-400 mt-0.5">Upload all 3 documents to confirm delivery</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Order info */}
          <div className="p-3 bg-slate-50 rounded-xl text-sm border border-slate-100">
            <p className="font-semibold text-slate-700">{dispatch.dispatchId}</p>
            <p className="text-slate-500 mt-0.5">{dispatch.machineName} → {dispatch.customerName || 'Customer'}</p>
          </div>

          {/* Progress indicator */}
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
              <span className="font-medium">All documents uploaded — ready to confirm delivery</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className={`flex-1 h-11 ${allUploaded ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`}
            onClick={handle}
            disabled={loading || !allUploaded}
          >
            {loading ? 'Confirming...' : 'Confirm Delivery'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DispatchCard({ dispatch }) {
  const { markInTransit, closeDispatch } = usePackagingDispatch();
  const { toast } = useToast();
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isDelayed = dispatch.expectedDeliveryDate && dispatch.expectedDeliveryDate < today &&
    ['Dispatched', 'In Transit'].includes(dispatch.status);

  const hasDocs = !!(dispatch.deliveryDocs && (
    dispatch.deliveryDocs.noc || dispatch.deliveryDocs.ewayBill || dispatch.deliveryDocs.invoice
  ));

  const handleInTransit = async () => {
    setLoading(true);
    try {
      await markInTransit(dispatch._id);
      toast({ title: 'Status updated', description: `${dispatch.dispatchId} is In Transit` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    setLoading(true);
    try {
      await closeDispatch(dispatch._id);
      toast({ title: 'Dispatch closed', description: `${dispatch.dispatchId} is closed` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {modal === 'execute' && <ExecuteDispatchModal dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'deliver' && <DeliveryModal dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'documents' && (
        <DocumentViewerModal
          title={`${dispatch.dispatchId} — Delivery Documents`}
          documents={[
            { label: 'NOC (No Objection Certificate)', path: dispatch.deliveryDocs?.noc },
            { label: 'E-Way Bill', path: dispatch.deliveryDocs?.ewayBill },
            { label: 'Invoice', path: dispatch.deliveryDocs?.invoice },
          ]}
          onClose={() => setModal(null)}
        />
      )}

      <Card className={`border-none shadow-sm hover:shadow-md transition-all duration-200 ${isDelayed ? 'ring-1 ring-red-300' : ''}`}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800">{dispatch.dispatchId}</p>
                {isDelayed && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </div>
              <p className="text-sm text-slate-500">{dispatch.machineName} — {dispatch.machineCode}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[dispatch.status]}`}>
              {dispatch.status}
            </span>
          </div>

          <div className="space-y-1.5 text-sm text-slate-600 mb-4">
            <div className="flex gap-2 items-start">
              <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <span>{dispatch.customerName || '—'}{dispatch.deliveryAddress ? ` · ${dispatch.deliveryAddress.slice(0, 40)}...` : ''}</span>
            </div>
            <div className="flex gap-2">
              <Truck className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
              <span>{dispatch.transportType}{dispatch.vehicleNumber ? ` · ${dispatch.vehicleNumber}` : ''}</span>
            </div>
            {dispatch.trackingId && (
              <div className="flex gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                <span className="font-mono text-xs">{dispatch.trackingId}</span>
              </div>
            )}
            {dispatch.expectedDeliveryDate && (
              <div className={`flex gap-2 ${isDelayed ? 'text-red-600 font-medium' : ''}`}>
                <Clock className="h-3.5 w-3.5 mt-0.5" />
                <span>Expected: {new Date(dispatch.expectedDeliveryDate).toLocaleDateString('en-IN')}{isDelayed ? ' (DELAYED)' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {dispatch.status === 'Ready' && (
              <Button size="sm" className="flex-1" onClick={() => setModal('execute')}>
                <Truck className="h-4 w-4 mr-1.5" />
                Execute Dispatch
              </Button>
            )}
            {dispatch.status === 'Dispatched' && (
              <>
                <Button size="sm" variant="outline" className="flex-1" onClick={handleInTransit} disabled={loading}>
                  Mark In Transit
                </Button>
                <Button size="sm" className="flex-1" onClick={() => setModal('deliver')}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Confirm Delivery
                </Button>
              </>
            )}
            {dispatch.status === 'In Transit' && (
              <Button size="sm" className="flex-1" onClick={() => setModal('deliver')}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Confirm Delivery
              </Button>
            )}
            {dispatch.status === 'Delivered' && (
              <>
                {hasDocs && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setModal('documents')}>
                    <Eye className="h-4 w-4 mr-1.5" />
                    View Documents
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
                  Close Dispatch
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No active dispatches</p>
          <p className="text-slate-400 text-sm mt-1">Create dispatch orders from the planning page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => <DispatchCard key={d._id} dispatch={d} />)}
        </div>
      )}
    </div>
  );
}
