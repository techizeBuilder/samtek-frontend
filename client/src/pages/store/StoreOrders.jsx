import React, { useState } from 'react';
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
  Wrench
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const StoreOrders = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewOrderOpen, setViewOrderOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState(null);
  const [storeInfoLoading, setStoreInfoLoading] = useState(null); // saleId of the one being saved
  const [localStoreInfo, setLocalStoreInfo] = useState({}); // saleId -> { productType, isAvailableInInventory }
  const [checkingInventory, setCheckingInventory] = useState(null); // itemId being auto-checked

  const { data: trackingData, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders/get-tracking'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/get-tracking');
      return response.data;
    }
  });

  const orders = Array.isArray(trackingData) ? trackingData : (trackingData?.data || []);

  // Filter for orders that are service-verified (pending) or fully approved
  const storeOrders = orders
  .filter(item => {
    const isVisible =
      item.orderStatus === 'approved' ||
      item.orderStatus === 'pending' ||
      item.paymentStatus === 'Paid';

    const matchesSearch =
      (item.orderCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());

    return isVisible && matchesSearch;
  })
  .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

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

  const handleUpdateStoreInfo = async (itemId, updates) => {
    if (!updates) return;
    setStoreInfoLoading(itemId);
    try {
      // Find the item to determine if it's a Sale or Order
      const item = orders.find(o => o._id === itemId);
      
      let response;
      if (item.source === 'sale') {
        // This is a Sale record, use the sale endpoint
        response = await apiRequest('PATCH', `/api/orders/sale/${itemId}/store-info`, updates);
      } else {
        // This is an Order record, use the order endpoint
        response = await apiRequest('PATCH', `/api/orders/order/${item.orderId}/store-info`, updates);
      }
      
      setLocalStoreInfo(prev => ({
        ...prev,
        [itemId]: {
          ...(prev[itemId] || {}),
          ...updates,
          // Carry forward storeQCStatus from server response if available
          storeQCStatus: response?.data?.storeQCStatus ?? prev[itemId]?.storeQCStatus
        }
      }));

      // Refetch data to get updated values from backend
      await refetch();

      if (updates.isAvailableInInventory === 'Available') {
        toast({ title: "Sent to QC", description: "Order has been successfully sent to QC department." });
      } else if (updates.isAvailableInInventory === 'Not Available' || updates.productType === 'In-house Manufactured') {
        // If the combined condition is met (taking local state into account)
        const currentAvailability = updates.isAvailableInInventory || localStoreInfo[itemId]?.isAvailableInInventory || orders.find(o => o._id === itemId)?.isAvailableInInventory;
        const currentType = updates.productType || localStoreInfo[itemId]?.productType || orders.find(o => o._id === itemId)?.productType;

        if (currentAvailability === 'Not Available' && currentType === 'In-house Manufactured') {
          toast({
            title: "Production Triggered",
            description: "Product is not available and in-house manufactured. A Production Order has been created.",
            variant: "default"
          });
        } else {
          toast({ title: "Saved", description: "Store information updated successfully" });
        }
      } else {
        toast({ title: "Saved", description: "Store information updated successfully" });
      }
    } catch (error) {
      console.error('Store info update error:', error);
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to update store info", 
        variant: "destructive" 
      });
    } finally {
      setStoreInfoLoading(null);
    }
  };

  // Auto-fetch productType and inventory status from Inventory for a row
  const handleCheckInventory = async (item) => {
    if (!item.products || item.products.length === 0) {
      toast({ title: 'No Products', description: 'This order has no products linked to inventory.', variant: 'destructive' });
      return;
    }

    setCheckingInventory(item._id);
    try {
      let overallAvailable = true;
      let resolvedProductType = null;

      for (const p of item.products) {
        const productId = p.product?._id || p.product;
        if (!productId) continue;

        const requiredQty = p.quantity || 1;
        const response = await apiRequest('GET', `/api/orders/check-inventory?itemId=${productId}&requiredQty=${requiredQty}`);
        const data = response.data || response;

        // If any product is not available → overall Not Available
        if (data.isAvailableInInventory === 'Not Available') {
          overallAvailable = false;
        }

        // Use the productType of the first product
        if (!resolvedProductType) {
          resolvedProductType = data.productType;
        }
      }

      const finalAvailability = overallAvailable ? 'Available' : 'Not Available';
      const updates = {
        productType: resolvedProductType,
        isAvailableInInventory: finalAvailability
      };

      // Update local state immediately so UI reflects it
      setLocalStoreInfo(prev => ({
        ...prev,
        [item._id]: { ...(prev[item._id] || {}), ...updates }
      }));

      // Save to backend — triggers QC / Production / Purchase flow
      await handleUpdateStoreInfo(item._id, updates);
    } catch (error) {
      console.error('Inventory check error:', error);
      toast({
        title: 'Check Failed',
        description: error.response?.data?.message || 'Could not fetch inventory data.',
        variant: 'destructive'
      });
    } finally {
      setCheckingInventory(null);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Store Orders
          </h1>
          <p className="text-slate-500">Manage and track orders ready for final dispatch.</p>
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
              Total: {storeOrders.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[160px]">Order & Date</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="w-[80px] text-center">Qty</TableHead>
                <TableHead>Specification</TableHead>
                <TableHead className="w-[130px]">Delivery Date</TableHead>
                <TableHead className="w-[180px]">Product Type</TableHead>
                <TableHead className="w-[180px]">Inventory Status</TableHead>
                <TableHead className="w-[180px]">Store Status</TableHead>
                <TableHead className="text-center w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-slate-500 text-sm">Loading orders...</p>
                    </div>
                  </TableCell>                </TableRow>
              ) : storeOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                    No approved orders found in store
                  </TableCell>
                </TableRow>
              ) : storeOrders.map((item) => (
                <TableRow key={item._id} className="hover:bg-slate-50/50">
                  {/* Order & Date */}
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.orderCode}</div>
                    <div className="text-xs text-slate-500">{new Date(item.orderDate).toLocaleDateString()}</div>
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
                  {/* Product Name Column */}
                  <TableCell>
                    {item.products && item.products.length > 0 ? (
                      <div className="space-y-0.5">
                        {item.products.map((p, idx) => (
                          <div key={idx} className="text-sm font-medium text-slate-800">
                            {p.product?.name || '—'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  {/* Qty Column */}
                  <TableCell className="text-center">
                    {item.products && item.products.length > 0 ? (
                      <div className="space-y-0.5">
                        {item.products.map((p, idx) => (
                          <div key={idx}>
                            <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">
                              {p.quantity ?? '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  {/* Specification Column */}
                  <TableCell>
                    {item.products && item.products.length > 0 ? (
                      <div className="space-y-0.5">
                        {item.products.map((p, idx) => (
                          <div key={idx} className="text-xs text-slate-500">
                            {p.product?.specification || '—'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
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
                  {/* Product Type Column */}
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {!(localStoreInfo[item._id]?.isAvailableInInventory ?? item.isAvailableInInventory) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit bg-slate-100 text-slate-600 border border-slate-200">
                          Not Checked
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${
                          (localStoreInfo[item._id]?.productType ?? item.productType) === 'In-house Manufactured'
                            ? 'bg-violet-50 text-violet-700 border border-violet-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {(localStoreInfo[item._id]?.productType ?? item.productType) === 'In-house Manufactured'
                            ? '🏭 In-house'
                            : '🛒 Purchased'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {/* Inventory Availability Column */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {!(localStoreInfo[item._id]?.isAvailableInInventory ?? item.isAvailableInInventory) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit bg-slate-100 text-slate-600 border border-slate-200">
                          Not Checked
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${
                          (localStoreInfo[item._id]?.isAvailableInInventory ?? item.isAvailableInInventory) === 'Available'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {(localStoreInfo[item._id]?.isAvailableInInventory ?? item.isAvailableInInventory) === 'Available'
                            ? <><CheckCheck className="w-3.5 h-3.5" /> Available</>
                            : <><XCircle className="w-3.5 h-3.5" /> Not Available</>}
                        </span>
                      )}
                      {(storeInfoLoading === item._id || checkingInventory === item._id) && (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  {/* Store Status Column */}
                  <TableCell>
                    {(() => {
                      const qcStatus = localStoreInfo[item._id]?.storeQCStatus ?? item.storeQCStatus;
                      if (!qcStatus) return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          —
                        </span>
                      );
                      const statusConfig = {
                        'Goes to QC': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <ArrowRightCircle className="w-3 h-3" /> },
                        'Approved from QC': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCheck className="w-3 h-3" /> },
                        'Rejected from QC': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <XCircle className="w-3 h-3" /> },
                        'Goes to Purchase': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <ShoppingCart className="w-3 h-3" /> },
                        'Purchase Completed': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: <CheckCircle2 className="w-3 h-3" /> },
                        'Goes to Production': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', icon: <Factory className="w-3 h-3" /> },
                        'Production Completed': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: <Wrench className="w-3 h-3" /> },
                      };
                      const cfg = statusConfig[qcStatus] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: null };
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium w-fit ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {cfg.icon}{qcStatus}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      {/* Check Inventory Button - smart enable/disable logic */}
                      {(() => {
                        const qcStatus = localStoreInfo[item._id]?.storeQCStatus ?? item.storeQCStatus;
                        const productType = localStoreInfo[item._id]?.productType ?? item.productType;
                        // Disable cases:
                        // 1. Currently loading
                        // 2. Goes to QC / In QC (not rejected yet)
                        // 3. Approved from QC (done)
                        // 4. Goes to Production (only status shown, no re-check)
                        // 5. Production Completed (only status shown)
                        // Enable cases:
                        // 1. Not checked yet (no qcStatus)
                        // 2. Rejected from QC (re-check for retry)
                        // 3. Purchase Completed (item now in inventory, can go to QC)
                        const isLoading_ = checkingInventory === item._id || storeInfoLoading === item._id;
                        const isProductionPath = productType === 'In-house Manufactured' || qcStatus === 'Goes to Production' || qcStatus === 'Production Completed';
                        const isPurchasePath = productType === 'Purchased (Trading Product)' || qcStatus === 'Goes to Purchase';
                        
                        let isDisabled = isLoading_;
                        let disabledReason = '';

                        if (!isLoading_) {
                          if (qcStatus === 'Goes to QC') { isDisabled = true; disabledReason = 'Item is in QC'; }
                          else if (qcStatus === 'Approved from QC') { isDisabled = true; disabledReason = 'QC Approved'; }
                          else if (qcStatus === 'Goes to Production') { isDisabled = true; disabledReason = 'In Production'; }
                          else if (qcStatus === 'Production Completed') { isDisabled = true; disabledReason = 'Production Done'; }
                          else if (qcStatus === 'Goes to Purchase') { isDisabled = true; disabledReason = 'Purchase Pending'; }
                          // 'Rejected from QC' → enabled (retry)
                          // 'Purchase Completed' → enabled (item in inventory, re-check to go to QC)
                          // null / no status → enabled
                        }

                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 px-2 text-xs gap-1 transition-colors ${
                              isLoading_
                                ? 'text-blue-500 border-blue-300'
                                : isDisabled
                                  ? 'text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                  : qcStatus === 'Rejected from QC'
                                    ? 'text-rose-600 border-rose-300 hover:bg-rose-50'
                                    : qcStatus === 'Purchase Completed'
                                      ? 'text-teal-600 border-teal-300 hover:bg-teal-50'
                                      : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                            }`}
                            onClick={() => !isDisabled && handleCheckInventory(item)}
                            disabled={isDisabled}
                            title={
                              isDisabled
                                ? disabledReason
                                : qcStatus === 'Rejected from QC'
                                  ? 'Re-check Inventory (QC Rejected)'
                                  : qcStatus === 'Purchase Completed'
                                    ? 'Check Inventory (Purchase Received)'
                                    : 'Check Inventory'
                            }
                          >
                            {isLoading_
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <ScanSearch className="w-3.5 h-3.5" />}
                            {isLoading_ ? 'Checking...' : 'Check Inv.'}
                          </Button>
                        );
                      })()}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

