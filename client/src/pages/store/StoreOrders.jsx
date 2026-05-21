import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Search,
  Eye,
  Printer,
  RefreshCw,
  CheckCircle2
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

  const { data: trackingData, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders/get-tracking'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/get-tracking');
      return response.data;
    }
  });

  const orders = Array.isArray(trackingData) ? trackingData : (trackingData?.data || []);

  // Filter for orders that are approved (Store Orders)
  const storeOrders = orders.filter(item => {
    const isApproved = item.orderStatus === 'approved' || item.paymentStatus === 'Paid';
    const matchesSearch =
      (item.orderCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return isApproved && matchesSearch;
  });

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

  const handleUpdateStoreInfo = async (saleId, updates) => {
    if (!updates) return;
    setStoreInfoLoading(saleId);
    try {
      const response = await apiRequest('PATCH', `/api/orders/sale/${saleId}/store-info`, updates);
      setLocalStoreInfo(prev => ({ 
        ...prev, 
        [saleId]: { 
          ...(prev[saleId] || {}), 
          ...updates 
        } 
      }));
      
      if (updates.isAvailableInInventory === 'Available') {
        toast({ title: "Sent to QC", description: "Order has been successfully sent to QC department." });
      } else if (updates.isAvailableInInventory === 'Not Available' || updates.productType === 'In-house Manufactured') {
        // If the combined condition is met (taking local state into account)
        const currentAvailability = updates.isAvailableInInventory || localStoreInfo[saleId]?.isAvailableInInventory || orders.find(o => o._id === saleId)?.isAvailableInInventory;
        const currentType = updates.productType || localStoreInfo[saleId]?.productType || orders.find(o => o._id === saleId)?.productType;
        
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
      toast({ title: "Error", description: "Failed to update store info", variant: "destructive" });
    } finally {
      setStoreInfoLoading(null);
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
                <TableHead>Customer Details</TableHead>
                <TableHead className="w-[180px]">Product Type</TableHead>
                <TableHead className="w-[180px]">Inventory Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-slate-500 text-sm">Loading orders...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : storeOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    No approved orders found in store
                  </TableCell>
                </TableRow>
              ) : storeOrders.map((item) => (
                <TableRow key={item._id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.orderCode}</div>
                    <div className="text-xs text-slate-500">{new Date(item.orderDate).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{item.customerName}</div>
                    <div className="text-xs text-slate-500">{item.customerMobile}</div>
                  </TableCell>
                  {/* Product Type Column */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={localStoreInfo[item._id]?.productType ?? (item.productType || '')}
                        onValueChange={(val) => handleUpdateStoreInfo(item._id, { productType: val })}
                        disabled={storeInfoLoading === item._id}
                      >
                        <SelectTrigger className="h-8 text-xs w-[160px]">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="In-house Manufactured">In-house Manufactured</SelectItem>
                          <SelectItem value="Purchased (Trading Product)">Purchased (Trading Product)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  {/* Inventory Availability Column */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={localStoreInfo[item._id]?.isAvailableInInventory ?? (item.isAvailableInInventory || '')}
                        onValueChange={(val) => handleUpdateStoreInfo(item._id, { isAvailableInInventory: val })}
                        disabled={storeInfoLoading === item._id}
                      >
                        <SelectTrigger className={`h-8 text-xs w-[150px] ${
                          (localStoreInfo[item._id]?.isAvailableInInventory ?? item.isAvailableInInventory) === 'Available' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : (localStoreInfo[item._id]?.isAvailableInInventory ?? item.isAvailableInInventory) === 'Not Available'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : ''
                        }`}>
                          <SelectValue placeholder="Availability..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Not Available">Not Available</SelectItem>
                        </SelectContent>
                      </Select>
                      {storeInfoLoading === item._id && (
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-500 shrink-0" />
                      )}
                      {(localStoreInfo[item._id]?.isAvailableInInventory || item.isAvailableInInventory) && storeInfoLoading !== item._id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold text-slate-900">₹{item.totalAmount.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">{item.paymentStatus}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
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
            {/* Customer & Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Customer</p>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-1">
                  <div className="font-semibold text-slate-900">{selectedOrderDetails?.customer?.name}</div>
                  <div className="text-sm text-slate-500">{selectedOrderDetails?.customer?.mobile}</div>
                  <div className="text-xs text-slate-400">{selectedOrderDetails?.customer?.address}{selectedOrderDetails?.customer?.city ? `, ${selectedOrderDetails.customer.city}` : ''}</div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Order Info</p>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Total Amount</span>
                    <span className="text-lg font-bold text-slate-900">₹{selectedOrderDetails?.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div className="text-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md py-1.5 uppercase tracking-wide">
                    Ready for Dispatch
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Items</p>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500">Product</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-500">Qty</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {selectedOrderDetails?.products?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.product?.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
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

