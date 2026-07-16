import React, { useState, useEffect } from 'react';
import { useProduction } from '@/contexts/ProductionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ClipboardList, Plus, CheckCircle, AlertTriangle, Clock, Package,
  ChevronRight, FileCheck, Wrench, Send, Search, Filter, FileText, ExternalLink, ShoppingCart, ArrowDownToLine, Eye
} from 'lucide-react';
import { useProduction as useProd } from '@/contexts/ProductionContext';
import { apiRequest } from '@/lib/queryClient';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { config } from '@/config/environment';

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
const emptyOrder = { machineCode: '', machineName: '', priority: 'Normal', deliveryDate: '', source: 'Stock' };
const emptyDemand = { materialCode: '', materialName: '', quantity: '', unit: 'kg' };

const groupByLabel = (customFields) =>
  (customFields || []).reduce((acc, cf) => {
    (acc[cf.groupLabel] = acc[cf.groupLabel] || []).push(cf);
    return acc;
  }, {});

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
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueRow, setIssueRow] = useState(null);
  const [issueQty, setIssueQty] = useState('');

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnRow, setReturnRow] = useState(null);
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState('Excess');

  // R&D BOM lookup (by machine code) — powers the "View" eye button on each material
  // demand row, so Production can see the full BOM entry (hierarchy, material type,
  // Product Master snapshot, specs, custom fields) without leaving this page.
  const [bomView, setBomView] = useState({ loading: false, bom: null, forCode: null });
  const [viewMat, setViewMat] = useState(null);

  // ── NEW HANDLER ──
  const handleIssueMaterial = async () => {
    if (!issueRow || !issueQty || Number(issueQty) <= 0 || Number(issueQty) > issueRow.remainingQty) return;
    try {
      const orderId = detailOrderLive?._id || detailOrderLive?.id;
      // Hitting the updated specific API route
      await apiRequest('PUT', `/api/production-mfg/orders/${orderId}/mark-material-issued`, {
        materialCode: issueRow.materialCode,
        receivedQuantity: Number(issueQty)
      });

      showSuccessToast('Material Received', `Successfully received ${issueQty} ${issueRow.unit}.`);
      setIssueModalOpen(false);
      setIssueRow(null);
      setIssueQty('');
      // If you have a refresh function in your context, call it here (e.g., refreshOrders())
    } catch (error) {
      showSmartToast(error, 'Receive Material Failed');
    }
  };

  const handleReturnMaterial = async () => {
    if (!returnRow || !returnQty || Number(returnQty) <= 0 || Number(returnQty) > returnRow.issuedQuantity) return;
    try {
      const orderId = detailOrderLive?._id || detailOrderLive?.id;
      await apiRequest('POST', `/api/production-mfg/orders/${orderId}/materials/return`, {
        materialCode: returnRow.materialCode,
        returnQuantity: Number(returnQty),
        reason: returnReason,
        returnType
      });

      showSuccessToast('Return Requested', `Return request for ${returnQty} ${returnRow.unit} submitted.`);
      setReturnModalOpen(false);
      setReturnRow(null);
      setReturnQty('');
      setReturnReason('');
      setReturnType('Excess');
    } catch (error) {
      showSmartToast(error, 'Return Material Failed');
    }
  };

  const handleDownloadPDF = async () => {
    const orderId = detailOrderLive?._id || detailOrderLive?.id;
    if (!orderId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.baseURL}/api/production-mfg/production-orders/${orderId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MaterialList-${detailOrderLive?.orderId || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showSmartToast(error, 'Download Failed');
    }
  };

  const statuses = ['All', 'Pending', 'BOM Pending', 'In Progress', 'Completed'];
  const sources = ['All', 'Store Orders', 'Rejected Items'];

  // Real sales-order id (ORD-xxx) that this production belongs to:
  //  - Store-triggered  → machineCode holds the sales orderCode
  //  - QC_Rejected      → rejectionDetails.originalOrderId
  //  - Stock production → no sales order (company stock)
  const getRealOrderId = (o) => {
    if (o.source === 'QC_Rejected') return o.rejectionDetails?.originalOrderId || o.machineCode || null;
    if (!o.source || o.source === 'Store') return o.machineCode || null;
    return null; // 'Stock'
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      (o.orderId || o.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (getRealOrderId(o) || '').toLowerCase().includes(search.toLowerCase()) ||
      o.machineName.toLowerCase().includes(search.toLowerCase());
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
      await addMaterialDemand(detailOrder._id || detailOrder.id, {
        ...demandForm,
        quantity: Number(demandForm.quantity)
      });
      showSuccessToast('Sent to R&D', `Extra material demand for "${demandForm.materialName}" is pending R&D approval.`);
      setDemandForm(emptyDemand);
      setFoundItem(null);
      setDemandOpen(false);
    } catch (error) {
      console.error('Failed to add material demand:', error);
      showSmartToast(error, 'Add Material Demand');
    }
  };

  // Keep detailOrder in sync with updated orders state
  const detailOrderLive = detailOrder ? orders.find(o => String(o._id || o.id) === String(detailOrder._id || detailOrder.id)) : null;

  // Fetch the R&D BOM for this order's machine once per code, so the "View" eye button
  // on each material row can show the full BOM entry without an extra request per click.
  useEffect(() => {
    const code = detailOrderLive?.machineCode;
    if (!code || bomView.forCode === code) return;
    setBomView({ loading: true, bom: null, forCode: code });
    apiRequest('GET', `/api/rd/boms/by-code/${encodeURIComponent(code)}`)
      .then(res => setBomView({ loading: false, bom: res?.data?.bom || null, forCode: code }))
      .catch(() => setBomView({ loading: false, bom: null, forCode: code }));
  }, [detailOrderLive?.machineCode]);

  const openMaterialView = (materialCode) => {
    const bomMat = bomView.bom?.materials?.find(mm => (mm.code || '').toLowerCase() === (materialCode || '').toLowerCase());
    setViewMat(bomMat ? { found: true, ...bomMat } : { found: false, code: materialCode });
  };

  const handleRaiseRDRequest = async (id) => {
    try {
      await raiseRDRequest(id);
      showSuccessToast('R&D Request Raised', 'The request has been sent to the R&D team.');
    } catch (error) {
      showSmartToast(error, 'Failed to raise R&D request');
    }
  };

  const handleVerifyBOM = async (id) => {
    try {
      await verifyBOM(id);
      showSuccessToast('BOM Verified', 'The Bill of Materials has been verified.');
    } catch (error) {
      showSmartToast(error, 'Failed to verify BOM');
    }
  };

  const handleVerifyDesign = async (id) => {
    try {
      await verifyDesign(id);
      showSuccessToast('Design Verified', 'The machine design has been verified.');
    } catch (error) {
      showSmartToast(error, 'Failed to verify design');
    }
  };

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
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {(() => {
                          const realOrderId = getRealOrderId(order);
                          return realOrderId ? (
                            <>
                              {/* Real sales order id — batata hai kis order ka item ban raha hai */}
                              <span className="font-bold text-blue-700">{realOrderId}</span>
                              {/* Production id — chhota, sirf reference ke liye */}
                              <span className="block text-[10px] text-slate-400 mt-0.5">{order.orderId || order.id}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-blue-700">{order.orderId || order.id}</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">Stock Production</span>
                            </>
                          );
                        })()}
                        {isRejected && <span className="block text-red-600 text-xs">REJECTED</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${isRejected
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                          {isRejected ? 'QC Rejected' : 'Store Order'}
                        </span>
                        {/* Purpose badge */}
                        <span className={`mt-1 flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border w-fit ${order.source === 'Stock'
                            ? 'bg-violet-100 text-violet-700 border-violet-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                          }`}>
                          {order.source === 'Stock' ? '🏭 Stock' : '📦 Order'}
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
                  {getRealOrderId(detailOrderLive) || detailOrderLive.orderId || detailOrderLive.id} — {detailOrderLive.machineName}
                  {getRealOrderId(detailOrderLive) && (
                    <span className="text-xs font-normal text-slate-400 font-mono">({detailOrderLive.orderId || detailOrderLive.id})</span>
                  )}
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
                      </div>
                    </div>
                    <div className={`flex-1 p-3 rounded-lg border text-sm ${detailOrderLive.designVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{detailOrderLive.designVerified ? '✓ Design Verified' : '✗ Design Not Verified'}</span>
                      </div>
                    </div>
                  </div>
                  {(!detailOrderLive.bomVerified || !detailOrderLive.designVerified) && !detailOrderLive.rdRequestRaised && (
                    <Button size="sm" variant="outline" className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-50 text-xs" onClick={() => handleRaiseRDRequest(detailOrderLive._id || detailOrderLive.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Raise R&D Request
                    </Button>
                  )}
                  {detailOrderLive.rdRequestRaised && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> R&D request raised — awaiting design & BOM from R&D team</p>
                  )}
                </div>

                {/* Design Documents */}
                {detailOrderLive.designDocuments && detailOrderLive.designDocuments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Design Documents</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {detailOrderLive.designDocuments.map(doc => {
                        // Support relative paths from backend using environment config
                        const url = doc.fileUrl.startsWith('http') ? doc.fileUrl : `${config.baseURL}${doc.fileUrl}`;
                        return (
                          <a key={doc._id || doc.id} href={url} target="_blank" rel="noreferrer" className="flex items-center p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-md mr-3 group-hover:bg-blue-200 transition-colors">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                              <p className="text-[10px] text-slate-500">Version: {doc.version || 'v1.0'}</p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors ml-2 flex-shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Material Demands */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Package className="h-4 w-4" /> Material Demand</h3>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-6 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200" variant="outline" onClick={handleDownloadPDF} title="Download Material Ledger PDF">
                        <ArrowDownToLine className="h-3 w-3 mr-1" /> Download PDF
                      </Button>
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
                          <th className="text-left px-3 py-2 text-slate-500 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrderLive.materialDemands.map(m => {
                          const issued = m.issuedQuantity || 0;
                          const remaining = m.quantity - issued;

                          return (
                            <tr key={m._id || m.id} className="border-t border-slate-50">
                              <td className="px-3 py-2 font-mono text-blue-700">{m.materialCode}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{m.materialName}</td>

                              <td className="px-3 py-2">
                                {m.bomQuantity !== null && m.bomQuantity !== undefined ? (
                                  <div className="flex flex-col">
                                    <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                                      Req: {m.quantity} {m.unit}
                                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200">BOM</span>
                                    </span>
                                    <span className={`text-[10px] font-bold mt-0.5 ${issued === m.quantity ? 'text-emerald-600' : 'text-blue-600'}`}>
                                      Issued: {issued} / {m.quantity}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-purple-700 font-bold flex items-center gap-1.5">
                                      Req: {m.quantity} {m.unit}
                                      <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded uppercase font-bold border border-purple-200">Out of BOM</span>
                                    </span>
                                    <span className={`text-[10px] font-bold mt-0.5 ${issued === m.quantity ? 'text-emerald-600' : 'text-blue-600'}`}>
                                      Issued: {issued} / {m.quantity}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${m.status === 'Issued' ? 'bg-emerald-100 text-emerald-700' :
                                    m.status === 'Pending Purchase' ? 'bg-amber-100 text-amber-700' :
                                      m.status === 'Pending R&D' ? 'bg-orange-100 text-orange-700' :
                                        m.status === 'R&D Rejected' ? 'bg-red-100 text-red-700' :
                                          'bg-slate-100 text-slate-600'}`}>{m.status}</span>
                              </td>

                              <td className="px-3 py-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openMaterialView(m.materialCode)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                                    title="View full BOM entry from R&D"
                                  >
                                    <Eye className="h-3 w-3" /> View
                                  </button>
                                  {(m.status === 'Requested' || m.status === 'In Transit') && remaining > 0 && (
                                    <button
                                      onClick={() => {
                                        const inTransitQty = (m.transferredQuantity || 0) - (m.issuedQuantity || 0);
                                        setIssueRow({ materialCode: m.materialCode, materialName: m.materialName, remainingQty: inTransitQty > 0 ? inTransitQty : remaining, unit: m.unit });
                                        setIssueQty(inTransitQty > 0 ? inTransitQty : remaining); // Default to exactly what they need
                                        setIssueModalOpen(true);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                      title="Receive items internally from the Store shelf"
                                    >
                                      <ArrowDownToLine className="h-3 w-3" /> Receive
                                    </button>
                                  )}
                                  {m.status === 'Issued' && (
                                    <button
                                      onClick={() => {
                                        setReturnRow({ materialCode: m.materialCode, materialName: m.materialName, issuedQuantity: m.issuedQuantity, unit: m.unit });
                                        setReturnQty('');
                                        setReturnModalOpen(true);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                                      title="Return items to the Store"
                                    >
                                      <Package className="h-3 w-3" /> Return
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
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
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Production Type *</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              >
                <option value="Stock">Stock — Company ka apna stock badhana</option>
                <option value="Store">Store Order — Customer order ke liye</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">
                {form.source === 'Stock'
                  ? '🏭 QC pass hone ke baad item inventory mein add ho jaayega'
                  : '📦 QC pass hone ke baad item dispatch/packing queue mein jaayega'}
              </p>
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

            {/* R&D Gating Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold block mb-0.5">R&D Authorization Required</span>
                This demand will be locked as <strong>Pending R&D</strong> and an R&D ticket will be auto-generated. This material will only become available for receiving after R&D approves the request.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDemandOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDemand} disabled={!demandForm.materialCode || !demandForm.materialName || !demandForm.quantity} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">Add Demand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── RETURN MATERIAL MODAL ─── */}
      <Dialog open={returnModalOpen} onOpenChange={(o) => { setReturnModalOpen(o); if (!o) { setReturnRow(null); setReturnQty(''); setReturnReason(''); setReturnType('Excess'); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Package className="h-5 w-5" /> Return Material
            </DialogTitle>
          </DialogHeader>
          {returnRow && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Return excess or defective materials back to the store.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Code</span><span className="font-mono text-blue-700 text-xs font-semibold">{returnRow.materialCode}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Material</span><span className="text-slate-800 text-xs font-medium truncate ml-2">{returnRow.materialName}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-xs text-slate-500 font-semibold">Max Returnable</span><span className="text-amber-700 text-xs font-bold">{returnRow.issuedQuantity} {returnRow.unit}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity to Return *</label>
                  <Input
                    type="number"
                    min="0"
                    max={returnRow.issuedQuantity}
                    value={returnQty}
                    onChange={e => setReturnQty(e.target.value)}
                    className={Number(returnQty) > returnRow.issuedQuantity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {Number(returnQty) > returnRow.issuedQuantity && (
                    <span className="text-[10px] text-red-500 font-medium">Cannot exceed {returnRow.issuedQuantity}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100" disabled value={returnRow.unit}>
                    <option>{returnRow.unit}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Return Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="returnType" value="Excess" checked={returnType === 'Excess'} onChange={e => setReturnType(e.target.value)} className="accent-amber-600" />
                    <span className="text-slate-700">Excess Material</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="returnType" value="Defect" checked={returnType === 'Defect'} onChange={e => setReturnType(e.target.value)} className="accent-red-600" />
                    <span className="text-slate-700">Defect / Scrap</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Reason for Return</label>
                <Input
                  type="text"
                  placeholder="e.g. Excess material, Defective"
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnModalOpen(false); setReturnRow(null); setReturnQty(''); setReturnReason(''); setReturnType('Excess'); }}>Cancel</Button>
            <Button
              onClick={handleReturnMaterial}
              disabled={!returnQty || Number(returnQty) <= 0 || Number(returnQty) > (returnRow?.issuedQuantity || 0)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Submit Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── STRICT MATERIAL RECEIVE MODAL ─── */}
      <Dialog open={issueModalOpen} onOpenChange={(o) => { setIssueModalOpen(o); if (!o) { setIssueRow(null); setIssueQty(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowDownToLine className="h-5 w-5" /> Receive Material
            </DialogTitle>
          </DialogHeader>
          {issueRow && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Confirm exactly how much material you are taking from the store shelf. This will automatically deduct from master inventory.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Code</span><span className="font-mono text-blue-700 text-xs font-semibold">{issueRow.materialCode}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500 font-semibold">Material</span><span className="text-slate-800 text-xs font-medium truncate ml-2">{issueRow.materialName}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-xs text-slate-500 font-semibold">Remaining Required</span><span className="text-emerald-700 text-xs font-bold">{issueRow.remainingQty} {issueRow.unit}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Quantity Received *</label>
                  <Input
                    type="number"
                    min="0"
                    max={issueRow.remainingQty}
                    value={issueQty}
                    onChange={e => setIssueQty(e.target.value)}
                    className={Number(issueQty) > issueRow.remainingQty ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {Number(issueQty) > issueRow.remainingQty && (
                    <span className="text-[10px] text-red-500 font-medium">Cannot exceed {issueRow.remainingQty}</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Unit</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100" disabled value={issueRow.unit}>
                    <option>{issueRow.unit}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIssueModalOpen(false); setIssueRow(null); setIssueQty(''); }}>Cancel</Button>
            <Button
              onClick={handleIssueMaterial}
              disabled={!issueQty || Number(issueQty) <= 0 || Number(issueQty) > (issueRow?.remainingQty || 0)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View BOM Entry Dialog (from R&D BOM Management) */}
      <Dialog open={!!viewMat} onOpenChange={() => setViewMat(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-blue-600 text-base">{viewMat?.code}</span>
              {viewMat?.found && <span>{viewMat.item}</span>}
            </DialogTitle>
          </DialogHeader>

          {bomView.loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading BOM data from R&D…</p>
          ) : viewMat && !viewMat.found ? (
            <p className="text-sm text-slate-500 py-4 leading-relaxed">
              No matching entry found in R&D's Bill of Materials for code <strong>{viewMat.code}</strong>.
              This was likely added as an out-of-BOM material demand rather than sourced from the Master BOM.
            </p>
          ) : viewMat && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Material Type</p>
                  <p className="text-sm font-medium text-slate-800">{viewMat.itemType || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">BOM Quantity</p>
                  <p className="text-sm font-medium text-slate-800">{viewMat.quantity} {viewMat.unit}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Hierarchy</p>
                  <p className="text-sm font-medium text-slate-800">{[viewMat.childPart, viewMat.subChildPart].filter(Boolean).join(' > ') || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${viewMat.isDiscontinued ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                    {viewMat.isDiscontinued ? 'Discontinued' : 'Active'}
                  </span>
                </div>
              </div>

              {(viewMat.category || viewMat.pSourceType || viewMat.brand || viewMat.metrology || viewMat.description) && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Product Master Snapshot</p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewMat.category && <div><p className="text-[11px] text-slate-400">Category</p><p className="text-sm text-slate-800">{viewMat.category}</p></div>}
                    {viewMat.pSourceType && <div><p className="text-[11px] text-slate-400">P-Source Type</p><p className="text-sm text-slate-800">{viewMat.pSourceType}</p></div>}
                    {viewMat.brand && <div><p className="text-[11px] text-slate-400">Brand</p><p className="text-sm text-slate-800">{viewMat.brand}</p></div>}
                    {viewMat.metrology && <div><p className="text-[11px] text-slate-400">Metrology</p><p className="text-sm text-slate-800">{viewMat.metrology}</p></div>}
                  </div>
                  {viewMat.description && (
                    <div className="mt-2">
                      <p className="text-[11px] text-slate-400">Description</p>
                      <p className="text-sm text-slate-700">{viewMat.description}</p>
                    </div>
                  )}
                </div>
              )}

              {Array.isArray(viewMat.specifications) && viewMat.specifications.filter(s => s.key).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Specifications</p>
                  <div className="divide-y divide-slate-100">
                    {viewMat.specifications.filter(s => s.key).map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs font-semibold text-slate-500 w-2/5">{s.key}</span>
                        <span className="text-sm text-slate-800 font-medium">{s.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(viewMat.customFields) && viewMat.customFields.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">Custom Fields</p>
                  <div className="space-y-3">
                    {Object.entries(groupByLabel(viewMat.customFields)).map(([groupLabel, fields]) => (
                      <div key={groupLabel}>
                        <p className="text-xs font-bold text-slate-600 mb-1">{groupLabel}</p>
                        <div className="divide-y divide-slate-100">
                          {fields.map((cf, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5">
                              <span className="text-xs font-semibold text-slate-500 w-2/5">{cf.fieldName}</span>
                              <span className="text-sm text-slate-800 font-medium">{cf.value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMat(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
