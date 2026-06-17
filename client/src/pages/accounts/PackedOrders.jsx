import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import {
  Search,
  Phone,
  MessageCircle,
  Mail,
  Upload,
  FileText,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  SelectValue,
} from "@/components/ui/select";

const PackedOrders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const { user } = useAuthContext();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload Proof Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Add Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentSaleId, setPaymentSaleId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // View Order Detail Modal State
  const [viewDetailOpen, setViewDetailOpen] = useState(false);
  const [viewDetailItem, setViewDetailItem] = useState(null);

  // Company info
  const userCompany = user?.company || {};
  const displayCompanyName = userCompany.name || settings?.company?.name || 'SAMTEK MACHINERY';

  // Fetch packed orders
  const { data: packedOrdersResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/accounts/packed-orders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounts/packed-orders');
      return response.data;
    }
  });

  // Fetch bank accounts for payment receipt
  const { data: bankAccountsResponse } = useQuery({
    queryKey: ['/api/accounts/bank-cash/summary'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounts/bank-cash/summary');
      return response.data;
    }
  });
  const bankAccounts = bankAccountsResponse?.accounts || [];

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Packed orders list has been updated.",
      duration: 2000
    });
  };

  // Upload mutation
  const uploadProofMutation = useMutation({
    mutationFn: async ({ saleId, file }) => {
      const formData = new FormData();
      formData.append('paymentProof', file);
      return await apiRequest('POST', `/api/accounts/sales/invoices/${saleId}/payment-proof`, formData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment proof uploaded successfully!",
        className: "bg-green-50 border-green-200 text-green-900"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/packed-orders'] });
      setUploadModalOpen(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload payment proof",
        variant: "destructive"
      });
    }
  });

  // Payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      return await apiRequest('POST', '/api/accounts/sales/payments', paymentData);
    },
    onSuccess: () => {
      toast({
        title: "Payment Recorded",
        description: "Customer payment added and allocated successfully.",
        className: "bg-green-50 border-green-200 text-green-900"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts/packed-orders'] });
      setPaymentModalOpen(false);
      // Reset
      setPaymentAmount('');
      setReferenceNo('');
      setNotes('');
      setAccountId('');
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to record payment",
        variant: "destructive"
      });
    }
  });

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedSaleId) {
      toast({
        title: "Validation Error",
        description: "Please select a payment proof file to upload",
        variant: "destructive"
      });
      return;
    }
    uploadProofMutation.mutate({ saleId: selectedSaleId, file: selectedFile });
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }
    if (!accountId) {
      toast({
        title: "Validation Error",
        description: "Please select a bank or cash account",
        variant: "destructive"
      });
      return;
    }

    recordPaymentMutation.mutate({
      customerId: paymentCustomer.id,
      amount: parseFloat(paymentAmount),
      paymentMode,
      referenceNo,
      notes: notes || `Recorded against packed order payment request`,
      accountId,
      paymentDate: new Date(paymentDate)
    });
  };

  const openUploadModal = (saleId) => {
    setSelectedSaleId(saleId);
    setSelectedFile(null);
    setUploadModalOpen(true);
  };

  const openPaymentModal = (item) => {
    setPaymentCustomer(item.customer);
    setPaymentSaleId(item.saleId);
    setPaymentAmount(item.balanceAmount.toString());
    setPaymentModalOpen(true);
  };

  const openViewDetail = (item) => {
    setViewDetailItem(item);
    setViewDetailOpen(true);
  };

  const handleCall = (mobile) => {
    if (!mobile || mobile === 'N/A') {
      toast({ title: "Error", description: "Mobile number not found", variant: "destructive" });
      return;
    }
    window.open(`tel:${mobile}`, '_self');
  };

  const handleWhatsApp = (item) => {
    if (!item.customer.mobile || item.customer.mobile === 'N/A') {
      toast({ title: "Error", description: "Mobile number not found", variant: "destructive" });
      return;
    }
    const cleanMobile = item.customer.mobile.replace(/\D/g, '');
    const message = `Dear ${item.customer.name},\n\nYour order *${item.orderCode}* for *${item.machineName || 'machinery'}* has been packed and is ready for dispatch.\n\n*Total Amount:* ₹${item.totalAmount.toLocaleString('en-IN')}\n*Amount Paid:* ₹${item.paidAmount.toLocaleString('en-IN')}\n*Balance Due:* ₹${item.balanceAmount.toLocaleString('en-IN')}\n\nKindly clear the final payment and share the payment receipt/proof so we can initiate dispatch.\n\nThank you,\nAccounts Team\n${displayCompanyName}`;
    const url = `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSMS = (item) => {
    if (!item.customer.mobile || item.customer.mobile === 'N/A') {
      toast({ title: "Error", description: "Mobile number not found", variant: "destructive" });
      return;
    }
    const message = `Dear ${item.customer.name}, your order ${item.orderCode} is packed. Balance due: Rs.${item.balanceAmount.toLocaleString('en-IN')}. Please clear payment. - Accounts, ${displayCompanyName}`;
    window.open(`sms:${item.customer.mobile}?body=${encodeURIComponent(message)}`, '_self');
  };

  const handleEmail = (item) => {
    if (!item.customer.email || item.customer.email === 'N/A') {
      toast({ title: "Error", description: "Email address not found", variant: "destructive" });
      return;
    }
    const subject = `Payment Request: Order ${item.orderCode} Packed & Ready | ${displayCompanyName}`;
    const body = `Dear ${item.customer.name},\n\nWe are pleased to inform you that your order ${item.orderCode} has been successfully packed and is ready for dispatch.\n\nSummary:\n- Order: ${item.orderCode}\n- Packed Items: ${item.machineName || 'Machinery'} (Serial: ${item.serialNumber || 'N/A'})\n- Total Amount: Rs. ${item.totalAmount.toLocaleString('en-IN')}\n- Paid Amount: Rs. ${item.paidAmount.toLocaleString('en-IN')}\n- Balance Amount: Rs. ${item.balanceAmount.toLocaleString('en-IN')}\n\nPlease transfer the balance amount and send us the transaction receipt.\n\nBest regards,\nAccounts Department\n${displayCompanyName}`;
    window.open(`mailto:${item.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
  };

  const filteredOrders = (packedOrdersResponse || []).filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.orderCode || '').toLowerCase().includes(term) ||
      (item.customer?.name || '').toLowerCase().includes(term) ||
      (item.customer?.mobile || '').toLowerCase().includes(term) ||
      (item.machineName || '').toLowerCase().includes(term) ||
      (item.serialNumber || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Packed Orders & Final Payments</h1>
          <p className="text-slate-500 mt-1">Request final payments for packed items, verify payment proofs, and record collections.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-full h-11 px-4 border-slate-200 hover:bg-white hover:text-blue-600 transition-colors"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh List
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800">Packed Orders List</CardTitle>
              <CardDescription>Orders packed in the warehouse awaiting final payment before dispatch</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search code, customer, machine..."
                className="pl-9 bg-white border-slate-200 rounded-lg h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p>Loading packed orders details...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-medium text-slate-600">No Packed Orders Found</p>
              <p className="text-sm mt-1 max-w-sm">There are no orders with packed status in this company currently or matching your search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Order Code</TableHead>
                    <TableHead className="font-semibold text-slate-700">Customer Details</TableHead>
                    <TableHead className="font-semibold text-slate-700">Packed Date</TableHead>
                    <TableHead className="font-semibold text-slate-700">Packed Items / Serial No.</TableHead>
                    <TableHead className="font-semibold text-slate-700">Finance Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Payment Proof</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Contact Customer</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((item) => {
                    const isPaid = item.paymentStatus === 'Paid';
                    const hasBalance = item.balanceAmount > 0;
                    
                    return (
                      <TableRow key={item.jobId} className="hover:bg-slate-50/30">
                        {/* Order Code */}
                        <TableCell className="font-medium text-slate-900">
                          {item.orderCode}
                        </TableCell>

                        {/* Customer Details */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800">{item.customer.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <span>M: {item.customer.mobile}</span>
                              {item.customer.email && item.customer.email !== 'N/A' && (
                                <span className="text-slate-300">|</span>
                              )}
                              {item.customer.email && item.customer.email !== 'N/A' && (
                                <span className="truncate max-w-[120px]">{item.customer.email}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {item.customer.address}, {item.customer.city}
                            </div>
                          </div>
                        </TableCell>

                        {/* Packed Date */}
                        <TableCell className="text-slate-600 text-sm">
                          {item.packedDate ? new Date(item.packedDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </TableCell>

                        {/* Items Packed */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-slate-800 text-sm">
                              {item.machineName}
                            </div>
                            {item.itemsPacked && item.itemsPacked.length > 0 && (
                              <div className="text-[10px] text-slate-400 bg-slate-100/60 p-1 rounded border border-slate-100 max-w-[180px]">
                                {/* <span className="font-semibold">Items: </span>
                                {item.itemsPacked.map((p, idx) => (
                                  <span key={idx}>
                                    {p.productName} (x{p.quantity})
                                    {idx < item.itemsPacked.length - 1 ? ', ' : ''}
                                  </span>
                                ))} */}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Finance Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                className={
                                  item.paymentStatus === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                    : item.paymentStatus === 'Partially Paid' || item.paymentStatus === 'Partial'
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200'
                                }
                                variant="outline"
                              >
                                {item.paymentStatus}
                              </Badge>
                            </div>
                            <div className="text-xs space-y-0.5 font-medium">
                              <div className="text-slate-500 flex justify-between gap-2">
                                <span>Total:</span>
                                <span className="text-slate-800">₹{item.totalAmount.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="text-emerald-600 flex justify-between gap-2">
                                <span>Paid:</span>
                                <span>₹{item.paidAmount.toLocaleString('en-IN')}</span>
                              </div>
                              {hasBalance && (
                                <div className="text-rose-600 font-semibold flex justify-between gap-2 border-t border-slate-100 pt-0.5">
                                  <span>Due:</span>
                                  <span>₹{item.balanceAmount.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Payment Proof */}
                        <TableCell>
                          {item.paymentProofUrl ? (
                            <a
                              href={item.paymentProofUrl.startsWith('http') ? item.paymentProofUrl : `${window.location.origin}${item.paymentProofUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline gap-1 bg-blue-50/50 p-1.5 rounded border border-blue-100 font-medium"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Proof
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No proof uploaded</span>
                          )}
                        </TableCell>

                        {/* Communication */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                              onClick={() => handleCall(item.customer.mobile)}
                              title="Call Customer"
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                              onClick={() => handleWhatsApp(item)}
                              title="Send WhatsApp Request"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-full"
                              onClick={() => handleSMS(item)}
                              title="Send SMS Request"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full"
                              onClick={() => handleEmail(item)}
                              title="Send Email Request"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.saleId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md"
                                onClick={() => openUploadModal(item.saleId)}
                              >
                                <Upload className="w-3.5 h-3.5 mr-1" /> Upload Proof
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 opacity-50 cursor-not-allowed rounded-md"
                                disabled
                                title="Temporary Invoice missing. Generate Invoice first."
                              >
                                <Upload className="w-3.5 h-3.5 mr-1" /> Upload Proof
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600 rounded-md"
                              onClick={() => openViewDetail(item)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Order Detail Modal */}
      <Dialog open={viewDetailOpen} onOpenChange={setViewDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border-none max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Order Details</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1">
                Full breakdown of customer, order, and payment info
              </DialogDescription>
            </div>
            {viewDetailItem && (
              <div className="text-right">
                <div className="text-blue-600 font-bold text-lg">{viewDetailItem.orderCode}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {viewDetailItem.packedDate
                    ? new Date(viewDetailItem.packedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A'}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {viewDetailItem && (
              <>
                {/* Customer Details */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px]">C</span>
                    Customer Information
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Name</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{viewDetailItem.customer?.name || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Mobile</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{viewDetailItem.customer?.mobile || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Email</div>
                      <div className="text-sm font-medium text-slate-600 mt-0.5">{viewDetailItem.customer?.email || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">City</div>
                      <div className="text-sm font-medium text-slate-600 mt-0.5">{viewDetailItem.customer?.city || '—'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Address</div>
                      <div className="text-sm font-medium text-slate-600 mt-0.5">{viewDetailItem.customer?.address || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">O</span>
                    Order Details
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Order Code</div>
                      <div className="text-sm font-bold text-blue-600 mt-0.5">{viewDetailItem.orderCode || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Packed Date</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {viewDetailItem.packedDate
                          ? new Date(viewDetailItem.packedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Machine</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{viewDetailItem.machineName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Machine Code</div>
                      <div className="text-sm font-mono font-medium text-slate-600 mt-0.5">{viewDetailItem.machineCode || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Serial Number</div>
                      <div className="text-sm font-mono font-medium text-slate-600 mt-0.5">{viewDetailItem.serialNumber || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Payment Status</div>
                      <div className="mt-0.5">
                        <Badge
                          className={
                            viewDetailItem.paymentStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : viewDetailItem.paymentStatus === 'Partially Paid' || viewDetailItem.paymentStatus === 'Partial'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }
                          variant="outline"
                        >
                          {viewDetailItem.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                    {viewDetailItem.itemsPacked && viewDetailItem.itemsPacked.length > 0 && (
                      <div className="col-span-2">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Packed Items</div>
                        <div className="flex flex-wrap gap-1.5">
                          {viewDetailItem.itemsPacked.map((p, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-0.5 border border-slate-200 font-medium"
                            >
                              {p.productName} <span className="text-slate-400">×{p.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px]">₹</span>
                    Payment Details
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 font-medium">Total Amount</span>
                      <span className="text-base font-bold text-slate-900">₹{viewDetailItem.totalAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-emerald-600 font-medium">Amount Paid</span>
                      <span className="text-base font-bold text-emerald-600">₹{viewDetailItem.paidAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    {viewDetailItem.balanceAmount > 0 && (
                      <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                        <span className="text-sm text-rose-600 font-semibold">Balance Due</span>
                        <span className="text-base font-bold text-rose-600">₹{viewDetailItem.balanceAmount?.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {viewDetailItem.paymentProofUrl && (
                      <div className="pt-2">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Payment Proof</div>
                        <a
                          href={viewDetailItem.paymentProofUrl.startsWith('http') ? viewDetailItem.paymentProofUrl : `${window.location.origin}${viewDetailItem.paymentProofUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline gap-1 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100 font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Uploaded Proof
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-8 py-5 bg-slate-50 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setViewDetailOpen(false)}
              className="rounded-xl px-8 h-10 font-semibold border-slate-200"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Payment Proof Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Payment Receipt / Proof</DialogTitle>
            <DialogDescription>
              Upload transaction screenshot, bank receipt image or PDF file to verify payment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentProof">Choose Document / Image File</Label>
              <Input
                id="paymentProof"
                type="file"
                accept="image/*,application/pdf"
                className="cursor-pointer border-slate-200"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
              />
              <p className="text-[11px] text-slate-400">Supported formats: PDF, PNG, JPG, JPEG, WEBP. Max size: 10MB.</p>
            </div>
            
            {selectedFile && (
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-slate-700">File Selected:</div>
                <div className="text-slate-600">{selectedFile.name}</div>
                <div className="text-slate-400">Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
            )}

            <DialogFooter className="sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploadProofMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-750 text-white"
                disabled={uploadProofMutation.isPending || !selectedFile}
              >
                {uploadProofMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...
                  </>
                ) : (
                  'Upload Proof'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Customer Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Customer Payment (Receipt)</DialogTitle>
            <DialogDescription>
              Record customer's payment amount. This will automatically allocate to outstanding invoices via FIFO.
            </DialogDescription>
          </DialogHeader>
          {paymentCustomer && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Customer Name</Label>
                  <Input value={paymentCustomer.name} disabled className="bg-slate-50" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentAmount">Amount Paid (₹)</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger id="paymentMode" className="border-slate-200">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="referenceNo">Reference / Txn No.</Label>
                  <Input
                    id="referenceNo"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="Ref or Transaction ID"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="accountId">Deposit To Account (Bank/Cash)</Label>
                  <Select value={accountId} onValueChange={setAccountId} required>
                    <SelectTrigger id="accountId" className="border-slate-200">
                      <SelectValue placeholder="Select bank/cash ledger account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.length === 0 ? (
                        <SelectItem value="_empty" disabled>No Bank/Cash accounts found</SelectItem>
                      ) : (
                        bankAccounts.map((acc) => (
                          <SelectItem key={acc._id} value={acc._id}>
                            {acc.accountName} (₹{acc.balance.toLocaleString('en-IN')})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="notes">Notes / Remarks</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment verification notes"
                  />
                </div>
              </div>

              <DialogFooter className="sm:justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={recordPaymentMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={recordPaymentMutation.isPending}
                >
                  {recordPaymentMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Recording...
                    </>
                  ) : (
                    'Record Payment'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackedOrders;
