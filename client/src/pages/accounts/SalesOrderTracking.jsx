import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Search,
  Filter,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  DollarSign,
  TrendingUp,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const SalesOrderTracking = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // State for View Order
  const [viewOrderOpen, setViewOrderOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isLoadingOrderDetails, setIsLoadingOrderDetails] = useState(false);

  // Fetch tracking data using the standard apiRequest to ensure token is sent
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders/get-tracking'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/get-tracking');
      return response.data; // Extract the array of tracking items
    }
  });

  // Mutation for Approving Order
  const approveOrderMutation = useMutation({
    mutationFn: async (saleId) => {
      const response = await apiRequest('POST', `/api/orders/approve-sale/${saleId}`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order approved successfully and sent to store!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/get-tracking'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve order",
        variant: "destructive"
      });
    }
  });

  const handleApproveClick = (sale) => {
    approveOrderMutation.mutate(sale._id);
  };

  const handleViewOrder = async (orderId) => {
    if (!orderId) {
      toast({ title: "Error", description: "No order ID associated with this record", variant: "destructive" });
      return;
    }

    setIsLoadingOrderDetails(true);
    try {
      const response = await apiRequest('GET', `/api/orders/${orderId}`);
      setSelectedOrderDetails(response.order);
      setViewOrderOpen(true);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch order details", variant: "destructive" });
    } finally {
      setIsLoadingOrderDetails(false);
    }
  };



  // Ensure data is an array before filtering to prevent crashes
  const trackingItems = Array.isArray(data) ? data : (data?.data || []);

  const filteredData = trackingItems.filter(item => {
    const matchesSearch =
      (item.orderCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || (item.paymentStatus || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalOutstanding = trackingItems.reduce((acc, curr) => acc + (curr.balanceAmount || 0), 0) || 0;
  const totalReceived = trackingItems.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0) || 0;
  const pendingOrders = trackingItems.filter(i => i.paymentStatus !== 'Paid').length || 0;


  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Order Tracking</h1>
          <p className="text-slate-500 mt-1">Monitor payments, invoices, and customer outstandings.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <Clock className="w-4 h-4" /> Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Total Amount Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">₹{(totalOutstanding + totalReceived).toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Across all generated invoices</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Total Payments Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">₹{totalReceived.toLocaleString()}</div>
            <p className="text-xs text-emerald-400 mt-1">Directly credited to accounts</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">₹{totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-amber-400 mt-1">{pendingOrders} orders with pending payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by Customer, Order ID or Invoice..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partially Paid">Partial</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Order Details</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice Info</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-400">Loading tracking data...</TableCell>
              </TableRow>
            ) : filteredData?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-400">No orders found matching your criteria.</TableCell>
              </TableRow>
            ) : filteredData?.map((item) => (
              <TableRow key={item._id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="font-medium text-slate-900">{item.orderCode}</div>
                  <div className="text-xs text-slate-400">{new Date(item.orderDate).toLocaleDateString()}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{item.customerName}</div>
                      <div className="text-xs text-slate-400">Prev. Bal: ₹{item.customerOutstanding}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <FileText className="w-3 h-3" />
                    {item.invoiceNumber}
                  </div>
                  <Badge variant="outline" className="text-[10px] h-4 mt-1">
                    {item.invoiceType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">₹{item.totalAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">₹{item.paidAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right text-amber-600 font-medium">₹{item.balanceAmount.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={
                    item.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                      item.paymentStatus === 'Partially Paid' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                        'bg-amber-100 text-amber-700 hover:bg-amber-100'
                  }>
                    {item.paymentStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 hover:text-blue-600"
                      onClick={() => handleViewOrder(item.orderId)}
                      disabled={isLoadingOrderDetails}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {item.orderStatus === 'approved' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                        disabled
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleApproveClick(item)}
                        disabled={approveOrderMutation.isPending}
                      >
                        {approveOrderMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>



      {/* View Order Details Modal */}
      <Dialog open={viewOrderOpen} onOpenChange={setViewOrderOpen}>
        <DialogContent className="sm:max-w-[800px] bg-white p-0 overflow-hidden rounded-[1.5rem] shadow-2xl border-none max-h-[90vh] flex flex-col">
          <div className="bg-slate-50 p-8 border-b border-slate-100 flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">Order Summary</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-1">
                Details for shipment tracking and item breakdown
              </DialogDescription>
            </div>
            <div className="text-right">
              <div className="text-blue-600 font-bold text-xl">{selectedOrderDetails?.orderCode}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(selectedOrderDetails?.orderDate).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Customer Info</span>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="text-lg font-black text-slate-900">{selectedOrderDetails?.customer?.name}</div>
                  <div className="text-sm font-bold text-slate-500 mt-1">{selectedOrderDetails?.customer?.mobile}</div>
                  <div className="text-xs text-slate-400 mt-4 leading-relaxed">
                    {selectedOrderDetails?.customer?.address}, {selectedOrderDetails?.customer?.city}, {selectedOrderDetails?.customer?.state}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Financial Summary</span>
                </div>
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-blue-600">Total Amount</span>
                    <span className="text-xl font-black text-blue-900">₹{selectedOrderDetails?.totalAmount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Current Status</span>
                    <Badge className="bg-blue-600 text-white font-bold italic uppercase text-[10px] px-3">{selectedOrderDetails?.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-400">
                <FileText className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ordered Products</span>
              </div>

              <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left p-4 font-black uppercase text-[10px] text-slate-500">Item Name</th>
                      <th className="text-center p-4 font-black uppercase text-[10px] text-slate-500">Qty</th>
                      <th className="text-right p-4 font-black uppercase text-[10px] text-slate-500">Price</th>
                      <th className="text-right p-4 font-black uppercase text-[10px] text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrderDetails?.products?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{item.product?.name}</td>
                        <td className="p-4 text-center font-black text-slate-500">{item.quantity}</td>
                        <td className="p-4 text-right font-bold text-slate-500">₹{item.price?.toLocaleString()}</td>
                        <td className="p-4 text-right font-black text-slate-900">₹{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedOrderDetails?.notes && (
              <div className="mt-10 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Order Notes / Instructions</div>
                <p className="text-sm font-medium text-slate-600 italic">"{selectedOrderDetails.notes}"</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button
              variant="outline"
              onClick={() => setViewOrderOpen(false)}
              className="rounded-xl px-10 h-11 font-bold border-slate-200"
            >
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrderTracking;
