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
  FileText,
  DollarSign,
  TrendingUp,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useSettings } from '@/hooks/useSettings';

const SalesOrderTracking = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // State for Gate Pass Modal
  const [gatePassModalOpen, setGatePassModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // State for View Gate Pass
  const [viewGatePassOpen, setViewGatePassOpen] = useState(false);
  const [gatePassData, setGatePassData] = useState(null);

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

  // Mutation for generating Gate Pass
  const generateGatePassMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiRequest('POST', `/api/orders/gate-pass/${payload.saleId}`, payload.data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Gate Pass generated successfully!",
      });
      setGatePassModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/orders/get-tracking'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate Gate Pass",
        variant: "destructive"
      });
    }
  });

  const handleApproveClick = (sale) => {
    setSelectedSale(sale);
    setGatePassModalOpen(true);
  };

  const handleGenerateGatePass = () => {
    if (!vehicleNumber || !driverName) {
      toast({
        title: "Validation Error",
        description: "Please enter vehicle number and driver name",
        variant: "destructive"
      });
      return;
    }

    generateGatePassMutation.mutate({
      saleId: selectedSale._id,
      data: {
        vehicleNumber,
        driverName,
        contactNumber
      }
    });
  };

  const handleViewGatePass = (item) => {
    setGatePassData(item);
    setViewGatePassOpen(true);
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

  const downloadGatePassPDF = (data) => {
    const doc = new jsPDF();
    const company = settings?.company || {};
    
    // Helper for borders
    const addBorder = (x, y, w, h) => {
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, w, h);
    };

    // Header Section - BRANDING (Left)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(company.name || 'SAMTEK MACHINERY', 20, 20);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(company.address || 'Industrial Area, Phase-1', 20, 25);
    doc.text(`GST : ${company.gstNumber || '27ABCDE1234F1Z5'}`, 20, 29);
    doc.text(`Phone : ${company.phone || '+91 98765 43210'}`, 20, 33);
    doc.text(`Email : ${company.email || 'info@samtek.com'}`, 20, 37);

    // Header Section - METADATA (Right)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Gate Pass No. : ${data.gatePass.gatePassNumber}`, 190, 25, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${new Date(data.gatePass.generatedAt).toLocaleDateString()}`, 190, 30, { align: 'right' });
    doc.text(`Ref. : ${data.orderCode}`, 190, 35, { align: 'right' });

    // Centered Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GATE PASS', 105, 50, { align: 'center' });

    // Address & Logistics Block (Bordered)
    addBorder(20, 60, 85, 45); // Left Box (Consignee)
    addBorder(105, 60, 85, 45); // Right Box (Logistics)

    // Labels
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Consignee Details', 22, 65);
    doc.text('Logistics & Vehicle Details', 107, 65);
    
    doc.setDrawColor(230, 230, 230);
    doc.line(22, 67, 102, 67); // Left line
    doc.line(107, 67, 187, 67); // Right line

    // Consignee Content
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(data.customerName, 22, 73);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mobile: ${data.customerMobile}`, 22, 78);
    doc.text(`Invoice: ${data.invoiceNumber}`, 22, 83);
    
    // Logistics Content
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Vehicle No: ${data.gatePass.vehicleNumber}`, 107, 73);
    doc.setFont('helvetica', 'normal');
    doc.text(`Driver Name: ${data.gatePass.driverName}`, 107, 78);
    doc.text(`Contact: ${data.gatePass.contactNumber}`, 107, 83);
    doc.text(`Status: Verified for Dispatch`, 107, 88);

    // Items Table
    doc.autoTable({
      startY: 115,
      head: [['Sr.', 'Description of Goods', 'Qty', 'Unit', 'Status']],
      body: [
        ['1', `Items against Order ${data.orderCode}`, '1', 'Lot', 'Dispatched'],
        ['', 'Invoiced Value', '', '', `INR ${data.totalAmount.toLocaleString()}`],
        ['', 'Payment Status', '', '', data.paymentStatus]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [248, 250, 252], 
        textColor: [30, 41, 59], 
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 4, 
        textColor: [51, 65, 85],
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      columnStyles: {
        0: { halign: 'center', width: 10 },
        2: { halign: 'center', width: 15 },
        3: { halign: 'center', width: 15 },
        4: { halign: 'right' }
      }
    });

    // Signature Block
    const finalY = doc.lastAutoTable.finalY + 30;
    
    // Signature Border Box
    addBorder(20, finalY - 5, 170, 30);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`For, ${company.name || 'SAMTEK MACHINERY'}`, 185, finalY + 5, { align: 'right' });
    
    doc.text('Authorised Signatory', 185, finalY + 20, { align: 'right' });

    // Footer Text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated gate pass and does not require physical signature. E. & O. E.', 105, 285, { align: 'center' });
    
    doc.save(`GatePass_${data.gatePass.gatePassNumber}.pdf`);
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
                    {item.gatePass?.status === 'Generated' ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        onClick={() => handleViewGatePass(item)}
                      >
                        <FileText className="w-3.5 h-3.5" /> Gate Pass
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-8 bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleApproveClick(item)}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Gate Pass Generation Modal */}
      <Dialog open={gatePassModalOpen} onOpenChange={setGatePassModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl my-auto">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
            <DialogTitle className="text-2xl font-black italic tracking-tight">GENERATE GATE PASS</DialogTitle>
            <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
              Logistics & Dispatch Verification
            </DialogDescription>
          </div>
          
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="vehicle" className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Vehicle Number</Label>
                <div className="relative">
                  <Input 
                    id="vehicle" 
                    placeholder="e.g. HR-55-XY-1234" 
                    className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold text-slate-900 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500 transition-all pl-4"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="driver" className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Driver Full Name</Label>
                <Input 
                  id="driver" 
                  placeholder="Enter Name" 
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold text-slate-900 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500 transition-all pl-4"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contact" className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Driver Contact No.</Label>
                <Input 
                  id="contact" 
                  placeholder="10 Digit Mobile" 
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold text-slate-900 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500 transition-all pl-4"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setGatePassModalOpen(false)} 
              className="font-bold text-slate-500 uppercase tracking-widest text-[10px] hover:bg-slate-200/50 rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-10 h-14 font-black italic shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex-1"
              onClick={handleGenerateGatePass}
              disabled={generateGatePassMutation.isPending}
            >
              {generateGatePassMutation.isPending ? "PROCESSING..." : "APPROVE & DISPATCH"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Gate Pass Modal */}
      <Dialog open={viewGatePassOpen} onOpenChange={setViewGatePassOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white p-0 overflow-hidden rounded-[1.5rem] shadow-2xl border-none max-h-[90vh] flex flex-col">
          <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar" id="gate-pass-content">
            <div className="flex justify-between items-start border-b border-slate-100 pb-10">
              <div className="flex gap-4 items-center">
                <img src="/logo Semtek.webp" alt="Logo" className="w-16 h-16 object-contain" onError={(e) => e.target.style.display = 'none'} />
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter text-slate-900">SUNRISE</h2>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-600">Dispatch Gate Pass</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-900">{gatePassData?.gatePass?.gatePassNumber}</div>
                <div className="text-xs text-slate-400">{gatePassData?.gatePass?.generatedAt && new Date(gatePassData.gatePass.generatedAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Consignee Details</Label>
                <div className="font-semibold text-slate-900">{gatePassData?.customerName}</div>
                <div className="text-sm text-slate-500">{gatePassData?.customerMobile}</div>
              </div>
              <div className="space-y-1 text-right">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Order Details</Label>
                <div className="font-semibold text-slate-900">ID: {gatePassData?.orderCode}</div>
                <div className="text-sm text-slate-500">Invoice: {gatePassData?.invoiceNumber}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Vehicle Number</Label>
                <div className="text-sm font-semibold">{gatePassData?.gatePass?.vehicleNumber}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Driver Name</Label>
                <div className="text-sm font-semibold">{gatePassData?.gatePass?.driverName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-slate-400 font-bold">Contact No.</Label>
                <div className="text-sm font-semibold">{gatePassData?.gatePass?.contactNumber}</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-600">Description</th>
                    <th className="text-right p-3 font-semibold text-slate-600">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-3">Order Total Amount</td>
                    <td className="p-3 text-right">₹{gatePassData?.totalAmount?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-3">Payment Status</td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        {gatePassData?.paymentStatus}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-12 flex justify-between">
              <div className="text-center">
                <div className="w-32 border-b border-slate-300 mb-2"></div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Authorized Signatory</div>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-slate-300 mb-2"></div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Receiver's Signature</div>
              </div>
            </div>

            <div className="text-center pt-6">
              <p className="text-[10px] text-slate-400 italic">This is a computer generated document and does not require physical signature.</p>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t flex justify-end items-center gap-6">
            <Button variant="ghost" onClick={() => setViewGatePassOpen(false)} className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Close</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-xl h-12 px-8 font-bold shadow-lg shadow-emerald-500/20"
              onClick={() => downloadGatePassPDF(gatePassData)}
            >
              <FileText className="w-4 h-4" /> DOWNLOAD PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
