import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadApi } from '@/api/leadService';
import { apiRequest } from '@/api/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  Clock,
  Search,
  Eye,
  FileText,
  TrendingUp,
  XCircle,
  RefreshCw,
  ExternalLink,
  Download,
  Plus,
  CreditCard,
  Calendar,
  DollarSign
} from 'lucide-react';
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
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const PaymentVerifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog State for Status Update
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [remarks, setRemarks] = useState('');

  // Dialog State for Quotation PDF Viewer
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfLeadCode, setPdfLeadCode] = useState('');

  // Add Payment Modal State
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [addPaymentLeadId, setAddPaymentLeadId] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    bankAccount: '',
    transactionId: '',
    remarks: ''
  });

  // Fetch leads that have payment check requested
  const { data: leadsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['accounts-payment-verifications'],
    queryFn: () => leadApi.getAll({ paymentCheckRequested: 'true' }),
  });

  // Fetch lead payments
  const { data: leadPaymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['lead-payments-verification'],
    queryFn: () => {
      const token = localStorage.getItem('token');
      return apiRequest('/lead-payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    },
  });

  // Fetch bank accounts for Add Payment modal
  const { data: bankAccountsData } = useQuery({
    queryKey: ['bank-accounts-verification'],
    queryFn: () => {
      const token = localStorage.getItem('token');
      return apiRequest('/lead-payments/bank-accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    },
    enabled: addPaymentOpen
  });

  const leads = leadsData?.leads || [];
  const leadPayments = leadPaymentsData?.payments || [];
  const bankAccounts = bankAccountsData?.bankAccounts || [];

  // Combine leads with their advanced payments
  const leadsWithPayments = leads.map(lead => {
    const leadAdvancedPayments = leadPayments.filter(payment => {
      const pLeadId = payment.leadId?._id ? payment.leadId._id.toString() : payment.leadId?.toString();
      const lId = lead._id?.toString();
      return pLeadId === lId;
    });
    const totalAdvancedAmount = leadAdvancedPayments.reduce((sum, payment) => {
      return payment.status === 'Verified' ? sum + payment.amount : sum;
    }, 0);

    return {
      ...lead,
      advancedPayments: leadAdvancedPayments,
      totalAdvancedAmount,
      latestPayment: leadAdvancedPayments.length > 0 ? leadAdvancedPayments[leadAdvancedPayments.length - 1] : null
    };
  });

  // Lead Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, remarks }) => leadApi.updatePaymentCheckStatus(id, { status, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts-payment-verifications'] });
      toast({
        title: "Status Updated",
        description: "Payment check status has been successfully updated.",
        variant: "default"
      });
      setUpdateOpen(false);
      setSelectedItem(null);
      setNewStatus('');
      setRemarks('');
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update payment status.",
        variant: "destructive"
      });
    }
  });

  // Add Advanced Payment Mutation
  const addPaymentMutation = useMutation({
    mutationFn: (paymentData) => {
      const token = localStorage.getItem('token');
      return apiRequest('/lead-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-payments-verification'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-payment-verifications'] });
      toast({ title: "Success", description: "Advanced payment added successfully" });
      setAddPaymentOpen(false);
      setAddPaymentLeadId('');
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bank Transfer',
        bankAccount: '',
        transactionId: '',
        remarks: ''
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add payment",
        variant: "destructive"
      });
    }
  });

  const handleUpdateClick = (lead) => {
    setSelectedItem(lead);
    setNewStatus(lead.paymentCheckStatus || 'Paid');
    setRemarks('');
    setUpdateOpen(true);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    updateStatusMutation.mutate({
      id: selectedItem._id,
      status: newStatus,
      remarks: remarks
    });
  };

  const handleAddPaymentClick = (leadId) => {
    setAddPaymentLeadId(leadId);
    setAddPaymentOpen(true);
  };

  const handleAddPaymentSubmit = () => {
    if (!addPaymentLeadId || !paymentForm.amount) {
      toast({ title: "Required", description: "Please select lead and enter amount", variant: "destructive" });
      return;
    }
    const txnNotRequired = ['Cash', 'Cheque'];
    if (!txnNotRequired.includes(paymentForm.paymentMethod) && !paymentForm.transactionId.trim()) {
      toast({
        title: "Required",
        description: `Transaction ID is required for ${paymentForm.paymentMethod} payments`,
        variant: "destructive"
      });
      return;
    }
    addPaymentMutation.mutate({
      ...paymentForm,
      leadId: addPaymentLeadId,
      amount: parseFloat(paymentForm.amount)
    });
  };

  // Filter and search logic for leads
  const filteredLeads = leadsWithPayments
    .filter(lead => {
      const matchesSearch =
        (lead.leadCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' ||
        (lead.paymentCheckStatus || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const getRequestDate = (lead) => {
        if (lead.paymentCheckRequestedAt) return new Date(lead.paymentCheckRequestedAt);
        const reqEntry = (lead.history || []).find(h => 
          h.action === 'Payment Check Requested' || h.action === 'Sent to Account'
        );
        return reqEntry && reqEntry.timestamp ? new Date(reqEntry.timestamp) : new Date(lead.createdAt);
      };

      const dateA = getRequestDate(a);
      const dateB = getRequestDate(b);
      
      if (dateA.getTime() === dateB.getTime()) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return dateB - dateA;
    });

  // Calculate Metrics
  const totalRequests = leads.length;
  const pendingRequests = leads.filter(l => l.paymentCheckStatus === 'Pending').length;
  const verifiedRequests = leads.filter(l => l.paymentCheckStatus === 'Paid' || l.paymentCheckStatus === 'Partially Paid').length;
  const rejectedRequests = leads.filter(l => l.paymentCheckStatus === 'Rejected').length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'Verified': { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      'Rejected': { color: 'bg-red-100 text-red-800', icon: XCircle },
      'Paid': { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      'Partially Paid': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 }
    };
    const config = statusConfig[status] || statusConfig['Pending'];
    const Icon = config.icon;
    return (
      <Badge className={cn("flex items-center gap-1", config.color)}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };
  console.log("Lead",filteredLeads.leadDocuments);

  const docColorMap = {
    'Purchase Order': 'bg-blue-50 text-blue-700 border-blue-200',
    'Payment Proof': 'bg-green-50 text-green-700 border-green-200',
    'Quotation': 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payment Verifications</h1>
          <p className="text-slate-500 mt-1">Review payment check requests, uploaded documents, and add advance payments.</p>
        </div>
        <Button
          onClick={() => { refetch(); refetchPayments(); }}
          variant="outline"
          className="gap-2 bg-white hover:bg-slate-100 border-slate-200"
          disabled={isLoading || isFetching || paymentsLoading}
        >
          <RefreshCw className={`w-4 h-4 ${(isFetching || paymentsLoading) ? 'animate-spin' : ''}`} />
          {(isFetching || paymentsLoading) ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-950">{totalRequests}</div>
            <p className="text-xs text-slate-400 mt-1">Payment check requests</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingRequests}</div>
            <p className="text-xs text-amber-400 mt-1">Awaiting verification</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{verifiedRequests}</div>
            <p className="text-xs text-emerald-400 mt-1">Paid / Partially Paid</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500" />Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{rejectedRequests}</div>
            <p className="text-xs text-rose-400 mt-1">Returned to sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by lead ID, company, or customer..."
                className="pl-10 border-slate-200 focus-visible:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] border-slate-200">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader>
          <CardTitle>Payment Check Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Lead Details</TableHead>
                  <TableHead>Request Time</TableHead>
                  <TableHead>Customer & Company</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Deal Value</TableHead>
                  <TableHead className="text-right">Advance Paid</TableHead>
                  <TableHead>Uploaded Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || paymentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No payment check requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Lead Details */}
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900">{lead.leadCode}</p>
                          <p className="text-xs text-slate-400">{formatDate(lead.createdAt)}</p>
                        </div>
                      </TableCell>
                      {/* Request Time */}
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium text-slate-700">
                            {lead.paymentCheckRequestedAt ? formatDate(lead.paymentCheckRequestedAt) : '—'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {lead.paymentCheckRequestedAt
                              ? new Date(lead.paymentCheckRequestedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </p>
                        </div>
                      </TableCell>
                      {/* Customer */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{lead.companyName}</p>
                          <p className="text-xs text-slate-500">{lead.contactPerson}</p>
                        </div>
                      </TableCell>
                      {/* Product */}
                      <TableCell>
                        <p className="text-sm text-slate-700 max-w-[120px] truncate" title={lead.productRequired}>
                          {lead.productRequired}
                        </p>
                      </TableCell>
                      {/* Deal Value */}
                      <TableCell className="text-right">
                        <span className="font-semibold text-slate-800">{formatCurrency(lead.dealValue || 0)}</span>
                      </TableCell>
                      {/* Advance Paid */}
                      <TableCell className="text-right">
                        <div>
                          <p className={cn("font-semibold", lead.totalAdvancedAmount > 0 ? "text-emerald-600" : "text-slate-400")}>
                            {formatCurrency(lead.totalAdvancedAmount)}
                          </p>
                          {lead.advancedPayments.length > 0 && (
                            <p className="text-xs text-slate-400">{lead.advancedPayments.length} payment{lead.advancedPayments.length > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </TableCell>
                      {/* Uploaded Documents — only show docs that were actually uploaded at payment check */}
                      <TableCell>
                        {(() => {
                          const allDocs = (lead.leadDocuments || []).filter(doc => doc.url);
                          if (allDocs.length === 0) {
                            return <span className="text-xs text-slate-400 italic">No documents</span>;
                          }
                          return (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {allDocs.map((doc, idx) => {
                                const colorClass = docColorMap[doc.docType] || 'bg-gray-50 text-gray-700 border-gray-200';
                                return (
                                  <div key={idx} className={`flex items-center gap-1 text-xs border rounded-md px-1.5 py-0.5 ${colorClass}`}>
                                    <FileText className="h-3 w-3 flex-shrink-0" />
                                    <span className="font-medium max-w-[60px] truncate" title={doc.docType}>{doc.docType}</span>
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                      className="hover:opacity-70 transition-opacity" title="View">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </TableCell>
                      {/* Status */}
                      <TableCell>{getStatusBadge(lead.paymentCheckStatus)}</TableCell>
                      {/* Actions */}
                      <TableCell>
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7 gap-1 border-slate-300 hover:bg-slate-100"
                            onClick={() => handleUpdateClick(lead)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7 gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            onClick={() => handleAddPaymentClick(lead._id)}
                          >
                            <Plus className="h-3 w-3" />
                            Add Payment
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Update Status Modal */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verify Payment Status</DialogTitle>
            <DialogDescription>
              Update payment status for <strong>{selectedItem?.companyName}</strong> ({selectedItem?.leadCode})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Enter verification remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="mt-1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpdateOpen(false)} disabled={updateStatusMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />Updating...
                  </span>
                ) : 'Update Status'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Advanced Payment Modal */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Add Advanced Payment
            </DialogTitle>
            <DialogDescription>
              Add an advance payment entry for the selected lead.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select Lead *</Label>
              <Select value={addPaymentLeadId} onValueChange={setAddPaymentLeadId} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLeads.map((lead) => (
                    <SelectItem key={lead._id} value={lead._id}>
                      {lead.leadCode} — {lead.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Calendar className="h-4 w-4" />Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm(p => ({ ...p, paymentDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><CreditCard className="h-4 w-4" />Payment Method</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm(p => ({ ...p, paymentMethod: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentForm.paymentMethod !== 'Cash' && (
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Select value={paymentForm.bankAccount} onValueChange={(v) => setPaymentForm(p => ({ ...p, bankAccount: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.length === 0 ? (
                      <SelectItem value="no-accounts" disabled>No bank accounts found</SelectItem>
                    ) : (
                      bankAccounts.map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.bankName} — {account.accountName} ({account.accountNumber})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Transaction ID / Reference
                {!['Cash', 'Cheque'].includes(paymentForm.paymentMethod) && <span className="text-red-500 ml-1">*</span>}
                {['Cash', 'Cheque'].includes(paymentForm.paymentMethod) && <span className="text-slate-400 text-xs ml-1">(Optional)</span>}
              </Label>
              <Input
                placeholder={['Cash', 'Cheque'].includes(paymentForm.paymentMethod) ? 'Enter reference (optional)' : `Enter ${paymentForm.paymentMethod} transaction ID`}
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm(p => ({ ...p, transactionId: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                placeholder="Enter any remarks"
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm(p => ({ ...p, remarks: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setAddPaymentOpen(false)} disabled={addPaymentMutation.isPending}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddPaymentSubmit} disabled={addPaymentMutation.isPending}>
              {addPaymentMutation.isPending ? (
                <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Adding...</span>
              ) : 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Modal */}
      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="sm:max-w-[850px] h-[85vh] bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border-none flex flex-col">
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Quotation Preview</h3>
              <p className="text-sm text-slate-500">Lead: {pdfLeadCode}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPdfOpen(false)} className="text-slate-500 hover:text-slate-700">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 p-4">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0 rounded-lg"
                title={`Quotation for ${pdfLeadCode}`}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No quotation available</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentVerifications;