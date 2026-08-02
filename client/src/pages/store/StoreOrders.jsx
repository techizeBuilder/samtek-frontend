import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Search,
  Eye,
  Printer,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  Clock,
  ScanSearch,
  CheckCheck,
  XCircle,
  ArrowRightCircle,
  ShoppingCart,
  Factory,
  Wrench,
  ListChecks
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

// Status chip config shared by the per-item status column
const STATUS_CONFIG = {
  'Goes to QC': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <ArrowRightCircle className="w-3 h-3" /> },
  'Approved from QC': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCheck className="w-3 h-3" /> },
  'Rejected from QC': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <XCircle className="w-3 h-3" /> },
  'Goes to Purchase': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <ShoppingCart className="w-3 h-3" /> },
  'Purchase Completed': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  'Goes to Production': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: <Factory className="w-3 h-3" /> },
  'Production Completed': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: <Wrench className="w-3 h-3" /> },
};

const StatusChip = ({ status }) => {
  if (!status) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
      —
    </span>
  );
  const cfg = STATUS_CONFIG[status] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      {cfg.icon}{status}
    </span>
  );
};

// When can an item be (re-)checked? Same rules as the old single-item flow.
const itemCheckState = (qcStatus, lastRejectionSource) => {
  if (qcStatus === 'Goes to QC') return { disabled: true, reason: 'Item is in QC' };
  if (qcStatus === 'Approved from QC') return { disabled: true, reason: 'QC Approved' };
  if (qcStatus === 'Goes to Production') return { disabled: true, reason: 'In Production' };
  if (qcStatus === 'Production Completed') return { disabled: true, reason: 'Production Done' };
  if (qcStatus === 'Goes to Purchase') return { disabled: true, reason: 'Purchase Pending' };
  if (qcStatus === 'Rejected from QC') {
    // Store sent this item to QC directly (e.g. a Purchase/Manufacturing
    // Machine already sitting in stock) — the rejected qty is back in
    // Store's inventory, so Store must be able to re-check/re-route it.
    if (lastRejectionSource === 'Store') return { disabled: false, reason: '' };
    // Production-origin (or a rework-cycle) rejection instead flows through
    // the Production Rework/Repair module — Store has nothing to do here.
    return { disabled: true, reason: 'Sent to Production Rework/Repair' };
  }
  // null / 'Purchase Completed' → allowed
  return { disabled: false, reason: '' };
};

const StoreOrders = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [viewOrderOpen, setViewOrderOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState(null);
  const [checkingKey, setCheckingKey] = useState(null); // `${orderRowId}` (all) or `${orderRowId}:${itemKey}`

  // Reset to page 1 whenever the search changes so the user doesn't land on
  // a now-out-of-range page.
  useEffect(() => { setPage(1); }, [searchTerm]);

  const { data: trackingResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders/get-tracking', 'store-orders', page, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchTerm) params.set('search', searchTerm);
      return apiRequest('GET', `/api/orders/get-tracking?${params.toString()}`);
    },
    keepPreviousData: true,
  });

  // Visibility filter (service-verified/approved/paid) and sort are now
  // applied server-side, so this is already the correctly-scoped page.
  const storeOrders = trackingResponse?.data || [];
  const pagination = trackingResponse?.pagination || { page: 1, pages: 1, total: 0 };

  // Build a uniform per-item row list for an order:
  //  - saleItems (multi-item scoreboard) when the Sale exists
  //  - order.products as fallback (Store hasn't touched the order yet)
  const getRowItems = (item) => {
    const saleItems = (item.saleItems || []).filter(si => (si.quantity || 0) > 0);
    if (saleItems.length > 0) {
      const hasPerItemFlow = saleItems.some(si => si.storeQCStatus || si.isAvailableInInventory || si.productType);
      return saleItems.map(si => ({
        key: si._id,
        saleItemId: si._id,
        name: si.productName,
        qty: si.quantity,
        spec: '',
        productType: si.productType || (!hasPerItemFlow ? item.productType : null),
        availability: si.isAvailableInInventory || (!hasPerItemFlow ? item.isAvailableInInventory : null),
        qcStatus: si.storeQCStatus || (!hasPerItemFlow ? item.storeQCStatus : null),
        lastRejectionSource: si.lastRejectionSource || null,
      }));
    }
    return (item.products || []).map((p, idx) => ({
      key: `${item._id}-p${idx}`,
      saleItemId: null,
      name: p.product?.name || '—',
      qty: p.quantity,
      spec: p.product?.specification || '',
      productType: null,
      availability: null,
      qcStatus: null,
    }));
  };

  const storeInfoEndpoint = (item) =>
    item.source === 'sale'
      ? `/api/orders/sale/${item._id}/store-info`
      : `/api/orders/order/${item.orderId}/store-info`;

  const summarizeResults = (items) => {
    if (!Array.isArray(items) || !items.length) return '';
    return items
      .map(r => `${r.productName}: ${r.storeQCStatus || r.error || '—'}`)
      .join(' | ');
  };

  // Check + auto-route ONE item of the order
  const handleCheckItem = async (item, row) => {
    setCheckingKey(`${item._id}:${row.key}`);
    try {
      const decision = row.saleItemId
        ? { saleItemId: row.saleItemId, autoCheck: true }
        : { productName: row.name, autoCheck: true };
      const response = await apiRequest('PATCH', storeInfoEndpoint(item), { items: [decision] });
      const results = response?.data?.items || [];
      toast({
        title: 'Item Checked',
        description: summarizeResults(results) || `${row.name} processed.`,
      });
      await refetch();
    } catch (error) {
      console.error('Item check error:', error);
      toast({
        title: 'Check Failed',
        description: error.response?.data?.message || 'Could not check this item.',
        variant: 'destructive'
      });
    } finally {
      setCheckingKey(null);
    }
  };

  // Check + auto-route ALL items of the order in one shot
  const handleCheckAll = async (item) => {
    setCheckingKey(item._id);
    try {
      const response = await apiRequest('PATCH', storeInfoEndpoint(item), { autoCheck: true });
      const results = response?.data?.items || [];
      toast({
        title: 'All Items Checked',
        description: summarizeResults(results) || 'All items processed.',
      });
      await refetch();
    } catch (error) {
      console.error('Check-all error:', error);
      toast({
        title: 'Check Failed',
        description: error.response?.data?.message || 'Could not check items.',
        variant: 'destructive'
      });
    } finally {
      setCheckingKey(null);
    }
  };

  const handleViewOrder = async (item) => {
    if (!item.orderId) {
      toast({ title: "Error", description: "No order ID associated with this record", variant: "destructive" });
      return;
    }

    setLoadingItemId(item._id);
    setIsLoadingOrderDetails(true);
    try {
      const response = await apiRequest('GET', `/api/orders/${item.orderId}`);
      setSelectedOrderDetails(response.order);
      setViewOrderOpen(true);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch order details", variant: "destructive" });
    } finally {
      setIsLoadingOrderDetails(false);
      setLoadingItemId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Store Orders
          </h1>
          <p className="text-slate-500">Each item of an order is checked and routed separately (QC / Production / Purchase).</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh List
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-6 bg-white border-b border-slate-100">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search orders..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
              Total: {pagination.total}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[150px]">Order & Date</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead>Items (per-item flow)</TableHead>
                <TableHead className="w-[130px]">Delivery Date</TableHead>
                <TableHead className="text-center w-[170px]">Order Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-slate-500 text-sm">Loading orders...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : storeOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    No approved orders found in store
                  </TableCell>
                </TableRow>
              ) : storeOrders.map((item) => {
                const rowItems = getRowItems(item);
                const readyCount = rowItems.filter(r => r.qcStatus === 'Approved from QC').length;
                const isCheckingAll = checkingKey === item._id;

                return (
                  <TableRow key={item._id} className="hover:bg-slate-50/50 align-top">
                    {/* Order & Date */}
                    <TableCell>
                      <div className="font-semibold text-slate-900">{item.orderCode}</div>
                      <div className="text-xs text-slate-500">{new Date(item.orderDate).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-400 mt-1">{item.customerName}</div>
                      {rowItems.length > 1 && (
                        <span className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          readyCount === rowItems.length
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {readyCount}/{rowItems.length} ready
                        </span>
                      )}
                    </TableCell>
                    {/* Status Column */}
                    <TableCell>
                      {item.orderStatus === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <PackageCheck className="w-3 h-3" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Service Verified
                        </span>
                      )}
                    </TableCell>
                    {/* Per-item table */}
                    <TableCell className="p-2">
                      <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100">
                        {rowItems.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-400">No items</div>
                        ) : rowItems.map((row) => {
                          const chk = itemCheckState(row.qcStatus, row.lastRejectionSource);
                          const isCheckingThis = checkingKey === `${item._id}:${row.key}`;
                          const busy = isCheckingThis || isCheckingAll;
                          return (
                            <div key={row.key} className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white">
                              <div className="min-w-[140px] flex-1">
                                <div className="text-sm font-medium text-slate-800">{row.name}</div>
                                {row.spec && <div className="text-[11px] text-slate-400">{row.spec}</div>}
                              </div>
                              <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">
                                Qty: {row.qty ?? '—'}
                              </span>
                              {/* Product type chip */}
                              {row.productType ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  row.productType === 'In-house Manufactured'
                                    ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {row.productType === 'In-house Manufactured' ? '🏭 In-house' : '🛒 Purchased'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                  Not Checked
                                </span>
                              )}
                              {/* Availability chip */}
                              {row.availability && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  row.availability === 'Available'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {row.availability === 'Available'
                                    ? <><CheckCheck className="w-3.5 h-3.5" /> Available</>
                                    : <><XCircle className="w-3.5 h-3.5" /> Not Available</>}
                                </span>
                              )}
                              {/* Store status chip */}
                              <StatusChip status={row.qcStatus} />
                              {/* Per-item Check button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 px-2 text-xs gap-1 ml-auto transition-colors ${
                                  busy
                                    ? 'text-blue-500 border-blue-300'
                                    : chk.disabled
                                      ? 'text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                      : row.qcStatus === 'Rejected from QC'
                                        ? 'text-rose-600 border-rose-300 hover:bg-rose-50'
                                        : row.qcStatus === 'Purchase Completed'
                                          ? 'text-teal-600 border-teal-300 hover:bg-teal-50'
                                          : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                                }`}
                                onClick={() => !chk.disabled && !busy && handleCheckItem(item, row)}
                                disabled={chk.disabled || busy}
                                title={chk.disabled ? chk.reason : `Check inventory & route "${row.name}"`}
                              >
                                {busy
                                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  : <ScanSearch className="w-3.5 h-3.5" />}
                                {busy ? '...' : 'Check'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    {/* Delivery Date Column */}
                    <TableCell>
                      {item.requestedDeliveryDate ? (
                        <span className="text-sm text-slate-700">
                          {new Date(item.requestedDeliveryDate).toLocaleDateString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </TableCell>
                    {/* Order actions */}
                    <TableCell>
                      <div className="flex flex-col items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 px-2 text-xs gap-1 w-full ${
                            isCheckingAll
                              ? 'text-blue-500 border-blue-300'
                              : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                          }`}
                          onClick={() => !isCheckingAll && handleCheckAll(item)}
                          disabled={isCheckingAll || rowItems.every(r => itemCheckState(r.qcStatus, r.lastRejectionSource).disabled)}
                          title="Check inventory & route every unprocessed item"
                        >
                          {isCheckingAll
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <ListChecks className="w-3.5 h-3.5" />}
                          {isCheckingAll ? 'Checking...' : 'Check All Items'}
                        </Button>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 transition-colors ${loadingItemId === item._id ? 'text-blue-500' : 'text-slate-400 hover:text-blue-600'}`}
                            onClick={() => handleViewOrder(item)}
                            disabled={loadingItemId === item._id}
                          >
                            {loadingItemId === item._id
                              ? <RefreshCw className="w-4 h-4 animate-spin" />
                              : <Eye className="w-4 h-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                            onClick={() => window.print()}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
        </div>
      )}

      {/* View Order Details Modal */}
      <Dialog open={viewOrderOpen} onOpenChange={setViewOrderOpen}>
        <DialogContent
          className="sm:max-w-[680px] w-[95vw] p-0 overflow-hidden rounded-xl border border-slate-200 shadow-lg flex flex-col"
          style={{
            top: '5vh',
            transform: 'translateX(-50%)',
            maxHeight: '90vh'
          }}
        >
          {/* Header */}
          <DialogHeader className="bg-white px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Order Summary</DialogTitle>
                <DialogDescription className="text-slate-500 text-sm mt-1">
                  Details for dispatch verification
                </DialogDescription>
              </div>
              <div className="text-right">
                <div className="text-blue-600 font-bold text-base">{selectedOrderDetails?.orderCode}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {selectedOrderDetails?.orderDate ? new Date(selectedOrderDetails.orderDate).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="bg-white px-8 py-6 space-y-6 flex-1 overflow-y-auto">

            {/* Order Details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Order Details</p>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <span className="text-xs text-slate-400">Order Code</span>
                  <div className="text-sm font-semibold text-slate-800">{selectedOrderDetails?.orderCode || '—'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Order Date</span>
                  <div className="text-sm font-medium text-slate-700">
                    {selectedOrderDetails?.orderDate ? new Date(selectedOrderDetails.orderDate).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Delivery Date</span>
                  <div className="text-sm font-medium text-slate-700">
                    {selectedOrderDetails?.requestedDeliveryDate
                      ? new Date(selectedOrderDetails.requestedDeliveryDate).toLocaleDateString('en-IN')
                      : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Priority</span>
                  <div className="text-sm font-medium text-slate-700">{selectedOrderDetails?.priority || '—'}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Status</span>
                  <div className="text-sm font-medium text-slate-700 capitalize">{selectedOrderDetails?.status || '—'}</div>
                </div>
              </div>
            </div>

            {/* Product Details Table */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Product Details</p>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500">Product Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500">Specification</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {selectedOrderDetails?.products?.length > 0 ? (
                      selectedOrderDetails.products.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{p.product?.name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{p.product?.specification || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">{p.quantity}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">No products found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {selectedOrderDetails?.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest mb-1">Notes</p>
                <p className="text-sm text-amber-900 italic">"{selectedOrderDetails.notes}"</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="bg-slate-50 border-t border-slate-100 px-8 pt-5 pb-8 flex gap-3">
            <Button variant="outline" onClick={() => setViewOrderOpen(false)} className="px-6 h-10">
              Close
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-10 shadow-sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default StoreOrders;
