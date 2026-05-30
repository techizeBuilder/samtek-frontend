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
  AlertCircle, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  XCircle,
  RefreshCw,
  ExternalLink
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

  const leads = leadsData?.leads || [];
  const leadPayments = leadPaymentsData?.payments || [];

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

  const handleOpenPdfViewer = (lead) => {
    setPdfUrl(lead.quotation);
    setPdfLeadCode(lead.leadCode);
    setPdfOpen(true);
  };

  // Filter and search logic for leads
  const filteredLeads = leadsWithPayments.filter(lead => {
    const matchesSearch = 
      (lead.leadCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (lead.paymentCheckStatus || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalRequests = leads.length;
  const pendingRequests = leads.filter(l => l.paymentCheckStatus === 'Pending').length;
  const verifiedRequests = leads.filter(l => l.paymentCheckStatus === 'Paid' || l.paymentCheckStatus === 'Partially Paid').length;
  const rejectedRequests = leads.filter(l => l.paymentCheckStatus === 'Rejected').length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payment Verifications</h1>
          <p className="text-slate-500 mt-1">Review payment check requests with advanced payment details and quotations.</p>
        </div>
        <Button 
          onClick={() => {
            refetch();
            refetchPayments();
          }} 
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
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Total Requests
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
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Verifications
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
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Verified & Approved
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
              <XCircle className="w-4 h-4 text-rose-500" />
              Rejected
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

      {/* Main Content */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader>
          <CardTitle>Payment Check Requests with Advanced Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Details</TableHead>
                  <TableHead>Customer & Company</TableHead>
                  <TableHead>Product Required</TableHead>
                  <TableHead className="text-right">Deal Value</TableHead>
                  <TableHead className="text-right">Advanced Payment</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Actions</TableHead>
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
                    <TableRow key={lead._id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{lead.leadCode}</p>
                          <p className="text-sm text-gray-500">{formatDate(lead.createdAt)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.companyName}</p>
                          <p className="text-sm text-gray-500">{lead.contactPerson}</p>
                        </div>
                      </TableCell>
                      <TableCell>{lead.productRequired}</TableCell>
                      <TableCell className="text-right">{formatCurrency(lead.dealValue || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-medium text-green-600">
                            {lead.totalAdvancedAmount > 0 ? formatCurrency(lead.totalAdvancedAmount) : '₹0'}
                          </p>
                          {lead.advancedPayments.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {lead.advancedPayments.length} payment{lead.advancedPayments.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.latestPayment ? (
                          <div>
                            <p className="text-sm font-medium">{lead.latestPayment.transactionId || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{lead.latestPayment.paymentMethod}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">No payment</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.paymentCheckStatus)}</TableCell>
                      <TableCell>
                        {lead.quotation ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPdfViewer(lead)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">No quotation</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateClick(lead)}
                        >
                          Verify
                        </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify Payment Status</DialogTitle>
            <DialogDescription>
              Verify payment details for {selectedItem?.companyName} ({selectedItem?.leadCode})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
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
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpdateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Status
              </Button>
            </DialogFooter>
          </form>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPdfOpen(false)}
              className="text-slate-500 hover:text-slate-700"
            >
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