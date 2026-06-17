import React, { useState } from 'react';
import { useProduction } from '@/contexts/ProductionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ClipboardList, Plus, CheckCircle, AlertTriangle, Clock, Package,
  ChevronRight, FileCheck, Wrench, Send, Search, Filter
} from 'lucide-react';
import { useProduction as useProd } from '@/contexts/ProductionContext';
import { apiRequest } from '@/lib/queryClient';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const statusColor = {
  'Pending': 'bg-slate-100 text-slate-700 border-slate-200',
  'BOM Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'On Hold': 'bg-red-100 text-red-700 border-red-200',
};

const priorityColor = {
  'Urgent': 'bg-red-100 text-red-700 border-red-200',
  'Normal': 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusIcon = {
  'Pending': <Clock className="h-3.5 w-3.5" />,
  'BOM Pending': <AlertTriangle className="h-3.5 w-3.5" />,
  'In Progress': <ChevronRight className="h-3.5 w-3.5" />,
  'Completed': <CheckCircle className="h-3.5 w-3.5" />,
};

const UNITS = ['kg', 'pcs', 'ltr', 'm', 'set', 'nos'];
const emptyOrder = { machineCode: '', machineName: '', priority: 'Normal', deliveryDate: '' };
const emptyDemand = { materialCode: '', materialName: '', quantity: '', unit: 'kg' };

export default function OrderManagement() {
  const {
    orders, addOrder, verifyBOM, verifyDesign, raiseRDRequest,
    addMaterialDemand, updateMaterialStatus, markMaterialIssued,
    getOrderProgress,
  } = useProduction();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [addOpen, setAddOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [demandOpen, setDemandOpen] = useState(false);
  const [form, setForm] = useState(emptyOrder);
  const [demandForm, setDemandForm] = useState(emptyDemand);
  const [foundItem, setFoundItem] = useState(null);

  const statuses = ['All', 'Pending', 'BOM Pending', 'In Progress', 'Completed'];
  const sources = ['All', 'Store Orders', 'Rejected Items'];

  const filtered = orders.filter(o => {
    const matchSearch = !search || (o.orderId || o.id || '').toLowerCase().includes(search.toLowerCase()) || o.machineName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchSource = filterSource === 'All' || 
      (filterSource === 'Store Orders' && (!o.source || o.source === 'Store')) ||
      (filterSource === 'Rejected Items' && o.source === 'QC_Rejected');
    return matchSearch && matchStatus && matchSource;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    inProgress: orders.filter(o => o.status === 'In Progress').length,
    bomPending: orders.filter(o => o.status === 'BOM Pending').length,
    completed: orders.filter(o => o.status === 'Completed').length,
    urgent: orders.filter(o => o.priority === 'Urgent').length,
    storeOrders: orders.filter(o => !o.source || o.source === 'Store').length,
    rejectedOrders: orders.filter(o => o.source === 'QC_Rejected').length,
  };

  const handleAddOrder = () => {
    if (!form.machineCode || !form.machineName || !form.deliveryDate) return;
    addOrder(form);
    setForm(emptyOrder);
    setAddOpen(false);
  };

  const handleCodeChange = async (codeVal) => {
    setDemandForm(prev => ({ ...prev, materialCode: codeVal }));
    
    if (!codeVal.trim()) {
      setFoundItem(null);
      return;
    }
    
    try {
      const res = await apiRequest('GET', `/api/items/by-code?code=${encodeURIComponent(codeVal.trim())}`);
      if (res.success && res.data) {
        setFoundItem(res.data);
        setDemandForm(prev => ({
          ...prev,
          materialName: res.data.name,
          unit: res.data.unit || prev.unit
        }));
      } else {
        setFoundItem(null);
      }
    } catch (err) {
      setFoundItem(null);
    }
  };

  const handleAddDemand = async () => {
    if (!demandForm.materialCode || !demandForm.materialName || !demandForm.quantity) return;
    
    try {
      // 1. Add material demand locally to production order
      await addMaterialDemand(detailOrder._id || detailOrder.id, { 
        ...demandForm, 
        quantity: Number(demandForm.quantity) 
      });

      // 2. Raise a Purchase Request for the Store
      await apiRequest('POST', '/api/purchase-requests', {
        productName: demandForm.materialName,
        quantity: Number(demandForm.quantity),
        unit: demandForm.unit,
        requestFromDepartment: 'Production',
        source: 'Production',
        priority: 'Medium',
        materialCode: demandForm.materialCode,
        storeOrderId: detailOrder._id || detailOrder.id
      });

      showSuccessToast('Demand Raised', `Material demand for "${demandForm.materialName}" sent to Store for approval.`);
      setDemandForm(emptyDemand);
      setFoundItem(null);
      setDemandOpen(false);
    } catch (error) {
      console.error('Failed to raise material demand:', error);
      showSmartToast(error, 'Raise Material Demand');
    }
  };

  // Keep detailOrder in sync with updated orders state
  const detailOrderLive = detailOrder ? orders.find(o => String(o._id || o.id) === String(detailOrder._id || detailOrder.id)) : null;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" /> Order Management
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Machine manufacturing orders — triggered by Store notification</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> New Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, color: 'text-slate-800', bg: 'bg-white' },
          { label: 'Store Orders', value: stats.storeOrders, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rejected Orders', value: stats.rejectedOrders, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Pending', value: stats.pending, color: 'text-slate-600', bg: 'bg-white' },
          { label: 'BOM Pending', value: stats.bomPending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <Card key={s.label} className={`border-none shadow-sm ${s.bg}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by Order ID or Machine..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          
          {/* Source Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 flex items-center">Source:</span>
              {sources.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSource(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterSource === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}
                >{s}</button>
              ))}
            </div>
            
            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 flex items-center">Status:</span>
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                >{s}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Machine</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">BOM / Design</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No orders found.</td></tr>
                ) : filtered.map(order => {
                  const oid = order._id || order.id;
                  const progress = getOrderProgress(oid);
                  const isOverdue = order.deliveryDate && order.status !== 'Completed' && new Date(order.deliveryDate) < new Date();
                  const isRejected = order.source === 'QC_Rejected';
                  
                  return (
                    <tr key={oid} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isRejected ? 'bg-red-50/30' : ''}`}>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-blue-700">
                        {order.orderId || order.id}
                        {isRejected && <span className="block text-red-600 text-xs">REJECTED</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          isRejected 
                            ? 'bg-red-100 text-red-700 border-red-200' 
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {isRejected ? 'QC Rejected' : 'Store Order'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-900">{order.machineName}</div>
                        <div className="text-xs text-slate-400">{order.machineCode}</div>
                        {isRejected && order.rejectionDetails?.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">Reason: {order.rejectionDetails.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor[order.priority]}`}>
                          {order.priority === 'Urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor[order.status]}`}>
                          {statusIcon[order.status]} {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${order.bomVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            BOM {order.bomVerified ? '✓' : '✗'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${order.designVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            Design {order.designVerified ? '✓' : '✗'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 font-semibold">{progress}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                        {order.deliveryDate}
                        {isOverdue && <span className="block text-red-500">Overdue</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDetailOrder(order)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrderLive} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailOrderLive && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-slate-900">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  {detailOrderLive.orderId || detailOrderLive.id} — {detailOrderLive.machineName}
                  {detailOrderLive.source === 'QC_Rejected' && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                      QC REJECTED
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Rejection Details (if applicable) */}
                {detailOrderLive.source === 'QC_Rejected' && detailOrderLive.rejectionDetails && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> QC Rejection Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-red-600 mb-1">Original Order ID</p>
                        <p className="font-semibold text-red-800">{detailOrderLive.rejectionDetails.originalOrderId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 mb-1">Rejected Date</p>
                        <p className="font-semibold text-red-800">{detailOrderLive.rejectionDetails.rejectedDate || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-red-600 mb-1">Rejection Reason</p>
                        <p className="font-semibold text-red-800">{detailOrderLive.rejectionDetails.rejectionReason || 'No reason provided'}</p>
                      </div>
                      {detailOrderLive.rejectionDetails.qcJobId && (
                        <div className="col-span-2">
                          <p className="text-xs text-red-600 mb-1">QC Job ID</p>
                          <p className="font-mono text-red-800 text-xs">{detailOrderLive.rejectionDetails.qcJobId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Info */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Priority</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor[detailOrderLive.priority]}`}>{detailOrderLive.priority}</span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Received</p>
                    <p className="font-semibold text-slate-800">{detailOrderLive.receivedDate}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Delivery Date</p>
                    <p className="font-semibold text-slate-800">{detailOrderLive.deliveryDate}</p>
                  </div>
                </div>

                {/* BOM & Design Verification */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><FileCheck className="h-4 w-4" /> Design & BOM Verification</h3>
                  <div className="flex gap-3 flex-wrap">
                    <div className={`flex-1 p-3 rounded-lg border text-sm ${detailOrderLive.bomVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{detailOrderLive.bomVerified ? '✓ BOM Verified' : '✗ BOM Not Verified'}</span>
                        {!detailOrderLive.bomVerified && (
                          <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => verifyBOM(detailOrderLive._id || detailOrderLive.id)}>Verify</Button>
                        )}
                      </div>
                    </div>
                    <div className={`flex-1 p-3 rounded-lg border text-sm ${detailOrderLive.designVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{detailOrderLive.designVerified ? '✓ Design Verified' : '✗ Design Not Verified'}</span>
                        {!detailOrderLive.designVerified && (
                          <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => verifyDesign(detailOrderLive._id || detailOrderLive.id)}>Verify</Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {(!detailOrderLive.bomVerified || !detailOrderLive.designVerified) && !detailOrderLive.rdRequestRaised && (
                    <Button size="sm" variant="outline" className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-50 text-xs" onClick={() => raiseRDRequest(detailOrderLive._id || detailOrderLive.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Raise R&D Request
                    </Button>
                  )}
                  {detailOrderLive.rdRequestRaised && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> R&D request raised — awaiting design & BOM from R&D team</p>
                  )}
                </div>

                {/* Material Demands */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Package className="h-4 w-4" /> Material Demand</h3>
                    <div className="flex gap-2">
                      {!detailOrderLive.materialIssued && detailOrderLive.materialDemands.length > 0 && (
                        <Button size="sm" className="h-6 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markMaterialIssued(detailOrderLive._id || detailOrderLive.id)}>
                          Mark All Issued
                        </Button>
                      )}
                      <Button size="sm" className="h-6 text-xs" variant="outline" onClick={() => {
                        setDemandForm(emptyDemand);
                        setFoundItem(null);
                        setDemandOpen(true);
                      }}>
                        <Plus className="h-3 w-3 mr-1" /> Add Demand
                      </Button>
                    </div>
                  </div>
                  {detailOrderLive.materialDemands.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No material demands raised yet.</p>
                  ) : (
                    <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Code</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Material</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Qty</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrderLive.materialDemands.map(m => (
                          <tr key={m.id} className="border-t border-slate-50">
                            <td className="px-3 py-2 font-mono text-blue-700">{m.materialCode}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{m.materialName}</td>
                            <td className="px-3 py-2 text-slate-600">{m.quantity} {m.unit}</td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                                m.status === 'Issued' ? 'bg-emerald-100 text-emerald-700' :
                                m.status === 'Pending Purchase' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'}`}>{m.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Process Summary */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Wrench className="h-4 w-4" /> Process Status</h3>
                  <div className="space-y-1.5">
                    {detailOrderLive.processes.map((p, i) => (
                      <div key={p.step} className="flex items-center gap-3 text-xs">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                        <span className="w-32 font-medium text-slate-800">{p.step}</span>
                        <span className="text-slate-400 text-xs">{p.type}</span>
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          p.status === 'QC Pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOrder(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Order Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Code *</label>
                <Input placeholder="e.g. MCH-006" value={form.machineCode} onChange={e => setForm(f => ({ ...f, machineCode: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Priority</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Machine Name *</label>
              <Input placeholder="e.g. SPM Drilling Machine" value={form.machineName} onChange={e => setForm(f => ({ ...f, machineName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Delivery Date *</label>
              <Input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOrder} disabled={!form.machineCode || !form.machineName || !form.deliveryDate} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Demand Dialog */}
      <Dialog open={demandOpen} onOpenChange={setDemandOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Material Demand</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Code *</label>
                <Input placeholder="e.g. STL-010" value={demandForm.materialCode} onChange={e => handleCodeChange(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={demandForm.unit} onChange={e => setDemandForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Material Name *</label>
              <Input placeholder="e.g. MS Plate 12mm" value={demandForm.materialName} onChange={e => setDemandForm(f => ({ ...f, materialName: e.target.value }))} />
              {foundItem ? (
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  ✓ Found: {foundItem.name} ({foundItem.category})
                </p>
              ) : demandForm.materialCode.trim() ? (
                <p className="text-xs text-amber-500 font-medium mt-1">
                  ⚠ Code not matched. Enter name manually.
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity *</label>
              <Input type="number" min="0" placeholder="0" value={demandForm.quantity} onChange={e => setDemandForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemandOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDemand} disabled={!demandForm.materialCode || !demandForm.materialName || !demandForm.quantity} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add Demand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
