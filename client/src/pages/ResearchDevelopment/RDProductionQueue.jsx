import React, { useState } from 'react';
import { useRD } from '@/contexts/RDContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    FileCheck, FileText, CheckCircle, XCircle, AlertTriangle,
    Search, Clock, ChevronRight, Eye, ChevronLeft, Package
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

const statusStyles = {
    'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Rejected': 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons = {
    'Pending': <AlertTriangle className="h-3.5 w-3.5 mr-1" />,
    'Approved': <CheckCircle className="h-3.5 w-3.5 mr-1" />,
    'Rejected': <XCircle className="h-3.5 w-3.5 mr-1" />,
};

// Fabrication Master materials only (mat.fabricationCategory set) — compact
// "key:value" summary of this BOM line's own cut dimensions, so an approver
// can sanity-check what they're about to push into Production. Read-only,
// same underlying data BOMCreationTab.jsx's live preview already computed.
const summarizeBomDimensions = (mat) => {
    if (!mat.fabricationCategory) return null;
    const dims = Object.entries(mat.bomDimensions || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
    const weight = mat.computedWeightPerPieceKg != null ? `${mat.computedWeightPerPieceKg.toFixed(2)} kg/pc` : null;
    return [dims, weight].filter(Boolean).join(' · ') || null;
};

export default function RDProductionQueue() {
    const {
        productionRequests,
        productionRequestsPagination,
        reqFilters,
        setReqFilters,
        processProductionRequest,
        fetchProductionRequestReviewData,
        documents // Pulling this from context to display associated design files
    } = useRD();

    const [rejectModal, setRejectModal] = useState({ open: false, requestId: null, requestType: 'Initial BOM', reason: '' });
    const [reviewModal, setReviewModal] = useState({ open: false, data: null, isLoading: false, meta: null });
    const [searchTerm, setSearchTerm] = useState(reqFilters.search || '');
    const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'Initial BOM' | 'Material Change'

    // Production Orders carry two IDs — the real sales order code (e.g. "ORD-0094")
    // and their own internal orderId (e.g. "PROD-2026-682637"). Mirrors the same
    // fallback logic Order Management uses so both screens agree on which is "real".
    const getRealOrderId = (o) => {
        if (!o) return null;
        if (o.orderCode) return o.orderCode;
        if (o.source === 'QC_Rejected') return o.rejectionDetails?.originalOrderId || o.machineCode || null;
        if (!o.source || o.source === 'Store') return o.machineCode || null;
        return null; // 'Stock'
    };

    const handleTabChange = (tab) => {
        setReqFilters(prev => ({ ...prev, tab, page: 1 }));
    };

    const handleSearch = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (window.searchTimeout) clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            setReqFilters(prev => ({ ...prev, search: value, page: 1 }));
        }, 300);
    };

    const handleTypeFilter = (type) => {
        setTypeFilter(type);
        setReqFilters(prev => ({ ...prev, requestType: type, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= (productionRequestsPagination?.pages || 1)) {
            setReqFilters(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleApprove = async (id, requestType) => {
        const msg = requestType === 'Material Change'
            ? 'Approve this material change? The extra material will be unlocked for Production to raise a purchase request.'
            : 'Approve this request? This will push the BOM and Design Documents to the Production Order.';
        if (window.confirm(msg)) {
            try {
                await processProductionRequest(id, 'Approve');
                const successMsg = requestType === 'Material Change'
                    ? 'Material change approved. Production can now raise a purchase request.'
                    : 'BOM and Designs successfully sent to Production.';
                showSuccessToast('Request Approved', successMsg);
            } catch (err) {
                showSmartToast(err, 'Approval Failed');
            }
        }
    };

    const handleRejectSubmit = async () => {
        if (!rejectModal.reason.trim()) return;
        try {
            await processProductionRequest(rejectModal.requestId, 'Reject', rejectModal.reason);
            const msg = rejectModal.requestType === 'Material Change'
                ? 'Material change rejected. The item has been marked R&D Rejected.'
                : 'The request has been sent back to Production.';
            showSuccessToast('Request Rejected', msg);
            setRejectModal({ open: false, requestId: null, requestType: 'Initial BOM', reason: '' });
        } catch (err) {
            showSmartToast(err, 'Rejection Failed');
        }
    };

    const handleReview = async (req) => {
        setReviewModal({ open: true, data: null, isLoading: true, meta: req });
        try {
            const res = await fetchProductionRequestReviewData(req._id);
            setReviewModal({ open: true, data: res.data, isLoading: false, meta: req });
        } catch (err) {
            showSmartToast(err, 'Failed to fetch review data');
            setReviewModal({ open: false, data: null, isLoading: false, meta: null });
        }
    };

    // Helper to get documents for a specific machine code to display in the table
    const getDocsForMachine = (machineCode) => {
        return documents.filter(d => d.machineCode === machineCode && d.type === 'Design Files');
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileCheck className="h-6 w-6 text-blue-600" /> R&D Document Verification
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Review and approve production requests for machine designs and BOMs.</p>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardContent className="p-4 space-y-4">

                    {/* Controls: Tabs, Type Filter & Search */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">

                            {/* Custom Pill Tabs */}
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-fit">
                                <button
                                    onClick={() => handleTabChange('fresh')}
                                    className={`flex-1 sm:flex-none px-5 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${reqFilters.tab === 'fresh' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Fresh Requests
                                </button>
                                <button
                                    onClick={() => handleTabChange('history')}
                                    className={`flex-1 sm:flex-none px-5 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${reqFilters.tab === 'history' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Approved / History
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search machine, material code, order ID..."
                                    className="pl-9 bg-white"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>
                        </div>

                        {/* Request Type Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">Type:</span>
                            {['All', 'Initial BOM', 'Material Change'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => handleTypeFilter(t)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${typeFilter === t
                                            ? t === 'Material Change'
                                                ? 'bg-violet-600 text-white border-violet-600'
                                                : t === 'Initial BOM'
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-slate-700 text-white border-slate-700'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Type</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Order</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Machine</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Details</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                                    {reqFilters.tab === 'fresh' && <th className="px-5 py-3 font-semibold text-slate-600 text-center">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {productionRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            No requests found for the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    productionRequests.map((req) => {
                                        const machineDocs = getDocsForMachine(req.machineCode);
                                        const isMaterialChange = req.requestType === 'Material Change';

                                        return (
                                            <tr key={req._id} className={`hover:bg-slate-50 transition-colors ${isMaterialChange ? 'bg-violet-50/40' : ''}`}>
                                                {/* Type Badge */}
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${isMaterialChange
                                                            ? 'bg-violet-100 text-violet-700 border-violet-200'
                                                            : 'bg-blue-100 text-blue-700 border-blue-200'
                                                        }`}>
                                                        {isMaterialChange ? <Package className="h-3 w-3" /> : <FileCheck className="h-3 w-3" />}
                                                        {isMaterialChange ? 'Material Change' : 'Initial BOM'}
                                                    </span>
                                                </td>

                                                {/* Order — both Production IDs (real order code + internal orderId), so history is traceable back to it */}
                                                <td className="px-5 py-4">
                                                    {req.productionOrderId ? (
                                                        (() => {
                                                            const realOrderId = getRealOrderId(req.productionOrderId);
                                                            return realOrderId ? (
                                                                <>
                                                                    <div className="font-mono font-bold text-blue-700 text-sm">{realOrderId}</div>
                                                                    <div className="text-[10px] text-slate-400 mt-0.5">{req.productionOrderId.orderId}</div>
                                                                </>
                                                            ) : (
                                                                <div className="font-mono font-bold text-blue-700 text-sm">{req.productionOrderId.orderId}</div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Order deleted</span>
                                                    )}
                                                </td>

                                                {/* Machine */}
                                                <td className="px-5 py-4">
                                                    <div className="font-mono font-bold text-blue-700 text-sm">{req.machineCode}</div>
                                                    <div className="font-medium text-slate-700 text-sm">{req.machineName}</div>
                                                </td>

                                                {/* Details column — adaptive */}
                                                <td className="px-5 py-4">
                                                    {isMaterialChange ? (
                                                        // Material Change: show the specific material requested with smart quantity UI
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                                    {req.materialChangeDetails?.materialCode || '—'}
                                                                </span>
                                                                <span className="text-sm font-medium text-slate-800">{req.materialChangeDetails?.materialName || '—'}</span>
                                                            </div>

                                                            <div className="flex items-center gap-3 bg-white border border-slate-100 p-1.5 rounded-md w-fit shadow-sm">
                                                                {req.materialChangeDetails?.bomQuantity !== null && req.materialChangeDetails?.bomQuantity !== undefined ? (
                                                                    <>
                                                                        <div className="px-2 border-r border-slate-200">
                                                                            <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-1">BOM Qty</span>
                                                                            <span className="text-xs font-semibold text-slate-700 leading-none block">{req.materialChangeDetails.bomQuantity} {req.materialChangeDetails.unit}</span>
                                                                        </div>
                                                                        <div className="px-2">
                                                                            <span className="text-[9px] font-bold text-amber-500 uppercase block leading-none mb-1">Requested</span>
                                                                            <span className="text-xs font-bold text-amber-600 leading-none block">{req.materialChangeDetails.requestedQuantity} {req.materialChangeDetails.unit}</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="px-2 flex items-center gap-2">
                                                                        <div>
                                                                            <span className="text-[9px] font-bold text-purple-500 uppercase block leading-none mb-1">Requested</span>
                                                                            <span className="text-xs font-bold text-purple-700 leading-none block">{req.materialChangeDetails?.requestedQuantity} {req.materialChangeDetails?.unit}</span>
                                                                        </div>
                                                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold uppercase rounded border border-purple-200">
                                                                            Out of BOM
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Initial BOM: show design doc chips
                                                        <div className="flex flex-wrap gap-2">
                                                            {machineDocs.length > 0 ? (
                                                                machineDocs.map((doc, idx) => (
                                                                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
                                                                        <FileText className="h-3 w-3" />
                                                                        {doc.name}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">No files uploaded</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyles[req.status] || statusStyles['Pending']}`}>
                                                        {statusIcons[req.status]}
                                                        {req.status}
                                                    </span>
                                                    {req.processedBy && (
                                                        <div className="text-[10px] text-slate-400 mt-1">
                                                            by {req.processedBy.fullName || req.processedBy.username}
                                                            {req.processedAt && ` · ${new Date(req.processedAt).toLocaleDateString()}`}
                                                        </div>
                                                    )}
                                                    {req.status === 'Rejected' && req.rejectReason && (
                                                        <div className="text-[10px] text-red-500 mt-0.5 max-w-[160px] truncate" title={req.rejectReason}>
                                                            "{req.rejectReason}"
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Actions — only for fresh tab */}
                                                {reqFilters.tab === 'fresh' && (
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                                                                onClick={() => handleApprove(req._id, req.requestType)}
                                                            >
                                                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                                            </Button>
                                                            {/* Review only makes sense for Initial BOM (has BOM + docs to preview) */}
                                                            {!isMaterialChange && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                                                                    onClick={() => handleReview(req)}
                                                                >
                                                                    <Eye className="h-3.5 w-3.5 mr-1" /> Review
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800"
                                                                onClick={() => setRejectModal({ open: true, requestId: req._id, requestType: req.requestType || 'Initial BOM', reason: '' })}
                                                            >
                                                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {productionRequestsPagination && productionRequestsPagination.total > 0 && (
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4">
                            <div className="text-sm text-slate-500">
                                Showing <span className="font-medium text-slate-900">{((productionRequestsPagination.page - 1) * productionRequestsPagination.limit) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(productionRequestsPagination.page * productionRequestsPagination.limit, productionRequestsPagination.total)}</span> of <span className="font-medium text-slate-900">{productionRequestsPagination.total}</span> results
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(productionRequestsPagination.page - 1)}
                                    disabled={productionRequestsPagination.page <= 1}
                                    className="h-8 px-2"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: productionRequestsPagination.pages }, (_, i) => i + 1).map(pageNum => (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === productionRequestsPagination.page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`h-8 w-8 p-0 ${pageNum === productionRequestsPagination.page ? 'bg-blue-600 text-white' : ''}`}
                                        >
                                            {pageNum}
                                        </Button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePageChange(productionRequestsPagination.page + 1)}
                                    disabled={productionRequestsPagination.page >= productionRequestsPagination.pages}
                                    className="h-8 px-2"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reject Reason Modal */}
            <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, requestId: null, reason: '' })}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" /> Reject Production Request
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-semibold text-slate-700 block mb-2">
                            Reason for Rejection *
                        </label>
                        <textarea
                            className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                            placeholder="e.g. Incomplete requirements, design not yet finalized..."
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            {rejectModal.requestType === 'Material Change'
                                ? 'The extra material demand will be marked R&D Rejected on the Production Order.'
                                : 'This note will be sent directly back to the Production Order.'}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectModal({ open: false, requestId: null, requestType: 'Initial BOM', reason: '' })}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleRejectSubmit}
                            disabled={!rejectModal.reason.trim()}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Review Modal */}
            <Dialog open={reviewModal.open} onOpenChange={(open) => !open && setReviewModal({ open: false, data: null, isLoading: false, meta: null })}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <Eye className="h-5 w-5 text-blue-600" /> Review Request Details
                            {reviewModal.meta?.productionOrderId && (() => {
                                const order = reviewModal.meta.productionOrderId;
                                const realOrderId = getRealOrderId(order);
                                return (
                                    <span className="font-mono text-sm font-normal text-slate-500">
                                        — {realOrderId || order.orderId}
                                        {realOrderId && ` (${order.orderId})`}
                                    </span>
                                );
                            })()}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {reviewModal.isLoading ? (
                            <div className="flex justify-center items-center py-12 text-slate-500">
                                <Clock className="h-6 w-6 animate-spin mr-2" /> Loading...
                            </div>
                        ) : reviewModal.data ? (
                            <div className="space-y-6">
                                {/* Machine Info */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Machine Profile</h3>
                                    {reviewModal.data.machine ? (
                                        <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded border">
                                            <div><span className="text-slate-500 block text-xs">Code</span> <span className="font-medium">{reviewModal.data.machine.code}</span></div>
                                            <div><span className="text-slate-500 block text-xs">Name</span> <span className="font-medium">{reviewModal.data.machine.name}</span></div>
                                            <div><span className="text-slate-500 block text-xs">Release Status</span> <span className="font-medium">{reviewModal.data.machine.releaseStatus}</span></div>
                                            <div><span className="text-slate-500 block text-xs">Design Status</span> <span className="font-medium">{reviewModal.data.machine.designStatus}</span></div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-500">Machine profile not found.</p>
                                    )}
                                </div>

                                {/* BOM */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Master BOM ({reviewModal.data.bom?.materials?.length || 0} items)</h3>
                                    {reviewModal.data.bom?.materials?.length > 0 ? (
                                        <div className="max-h-40 overflow-y-auto border rounded text-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 font-semibold">Code</th>
                                                        <th className="px-3 py-2 font-semibold">Name</th>
                                                        <th className="px-3 py-2 font-semibold">Dimensions</th>
                                                        <th className="px-3 py-2 font-semibold text-right">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {reviewModal.data.bom.materials.map((mat, i) => (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="px-3 py-1 font-mono text-xs">{mat.code}</td>
                                                            <td className="px-3 py-1">{mat.item}</td>
                                                            <td className="px-3 py-1 text-xs text-slate-500">{summarizeBomDimensions(mat) || '—'}</td>
                                                            <td className="px-3 py-1 text-right">{mat.quantity} {mat.unit}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No BOM items found.</p>
                                    )}
                                </div>

                                {/* Documents */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Design Documents ({reviewModal.data.documents?.length || 0})</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {reviewModal.data.documents?.length > 0 ? (
                                            reviewModal.data.documents.map((doc, idx) => (
                                                <a key={idx} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
                                                    <FileText className="h-4 w-4" />
                                                    {doc.name} <span className="text-xs opacity-70">({doc.version})</span>
                                                </a>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500">No design documents found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-6">Could not load review data.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewModal({ open: false, data: null, isLoading: false, meta: null })}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}