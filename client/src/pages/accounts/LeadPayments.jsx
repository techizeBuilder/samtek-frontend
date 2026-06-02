import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/api/index';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LeadPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [isViewPaymentModalOpen, setIsViewPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
  const [paymentFormData, setPaymentFormData] = useState({
    leadId: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    bankAccount: '',
    transactionId: '',
    remarks: ''
  });

  // API Functions
  const leadPaymentApi = {
    getLeadsForPayment: () => {
      const token = localStorage.getItem('token');
      return apiRequest('/lead-payments/leads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    },

    getBankAccounts: () => {
      const token = localStorage.getItem('token');
      return apiRequest('/lead-payments/bank-accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    },

    getLeadPayments: () => {
      const token = localStorage.getItem('token');
      return apiRequest('/lead-payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    },

    addLeadPayment: (paymentData) => {
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

    updatePaymentStatus: (id, statusData) => {
      const token = localStorage.getItem('token');
      return apiRequest(`/lead-payments/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(statusData)
      });
    }
  };

  // Fetch bank accounts
  const { data: bankAccountsData, isLoading: bankAccountsLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: leadPaymentApi.getBankAccounts,
  });

  // Fetch leads sent to account
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-for-payment'],
    queryFn: leadPaymentApi.getLeadsForPayment,
  });

  // Fetch all lead payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['lead-payments'],
    queryFn: leadPaymentApi.getLeadPayments,
  });

  const leads = leadsData?.leads || [];
  const payments = paymentsData?.payments || [];
  const bankAccounts = bankAccountsData?.bankAccounts || [];

  // Mutations
  const addPaymentMutation = useMutation({
    mutationFn: leadPaymentApi.addLeadPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-for-payment'] });
      queryClient.invalidateQueries({ queryKey: ['lead-payments'] });
      toast({ title: "Success", description: "Advanced payment added successfully" });
      setIsAddPaymentModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add payment",
        variant: "destructive"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, statusData }) => leadPaymentApi.updatePaymentStatus(id, statusData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-payments'] });
      toast({ title: "Success", description: "Payment status updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update payment status",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setPaymentFormData({
      leadId: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      bankAccount: '',
      transactionId: '',
      remarks: ''
    });
  };

  const handleAddPayment = () => {
    if (!paymentFormData.leadId || !paymentFormData.amount) {
      toast({
        title: "Required",
        description: "Please select lead and enter amount",
        variant: "destructive"
      });
      return;
    }

    addPaymentMutation.mutate({
      ...paymentFormData,
      amount: parseFloat(paymentFormData.amount)
    });
  };

  const handleStatusUpdate = (paymentId, status, remarks = '') => {
    updateStatusMutation.mutate({
      id: paymentId,
      statusData: { status, remarks }
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'Verified': { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      'Rejected': { color: 'bg-red-100 text-red-800', icon: XCircle }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Lead Payments</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddPaymentModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-4">
          <button
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              activeTab === 'leads' 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-600 hover:bg-gray-100"
            )}
            onClick={() => setActiveTab('leads')}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Leads Queue ({leads.length})
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              activeTab === 'payments' 
                ? "bg-blue-100 text-blue-700" 
                : "text-gray-600 hover:bg-gray-100"
            )}
            onClick={() => setActiveTab('payments')}
          >
            <CreditCard className="h-4 w-4 inline mr-2" />
            All Payments ({payments.length})
          </button>
        </div>
      </div>

      {/* Content will be added in next part */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'leads' ? 'Leads Sent to Account' : 'All Lead Payments'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'leads' ? (
            leadsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No leads sent to account yet
              </div>
            ) : (
              <div className="space-y-4">
                {leads.map((lead) => (
                  <div key={lead._id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{lead.companyName}</h3>
                        <p className="text-gray-600">{lead.contactPerson}</p>
                        <p className="text-sm text-gray-500">Lead ID: {lead.leadCode}</p>
                        <p className="text-sm text-gray-500">
                          Advanced Payment: {formatCurrency(lead.advancedPaymentAmount || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Sent: {formatDate(lead.sentToAccountDate)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            setPaymentFormData(prev => ({ ...prev, leadId: lead._id }));
                            setIsAddPaymentModalOpen(true);
                          }}
                        >
                          Add Payment
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            paymentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payments recorded yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Details</TableHead>
                    <TableHead>Customer & Company</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-blue-600">{payment.leadCode}</p>
                          <p className="text-xs text-gray-500">
                            Added: {formatDate(payment.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.companyName}</p>
                          <p className="text-sm text-gray-500">{payment.contactPerson}</p>
                          {payment.mobile && (
                            <p className="text-xs text-gray-400">{payment.mobile}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {payment.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-mono">{payment.transactionId || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {payment.bankAccountName ? (
                            <p className="text-xs text-gray-600">{payment.bankAccountName}</p>
                          ) : payment.bankAccount ? (
                            <p className="text-xs text-gray-600">Bank Transfer</p>
                          ) : (
                            <p className="text-xs text-gray-400">Cash Payment</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 hover:bg-slate-100 text-blue-600 border-blue-200"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setIsViewPaymentModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      {/* Add Payment Modal */}
      <Dialog open={isAddPaymentModalOpen} onOpenChange={setIsAddPaymentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">Add Advanced Payment</DialogTitle>
            <DialogDescription className="text-gray-600">
              Add advanced payment for a lead that has been sent to account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="leadId" className="text-sm font-medium">Select Lead *</Label>
              <Select 
                value={paymentFormData.leadId} 
                onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, leadId: value }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead._id} value={lead._id}>
                      {lead.leadCode} - {lead.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Amount *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                className="h-10"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate" className="text-sm font-medium">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                className="h-10"
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method</Label>
              <Select 
                value={paymentFormData.paymentMethod} 
                onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger className="h-10">
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

            {paymentFormData.paymentMethod !== 'Cash' && (
              <div className="space-y-2">
                <Label htmlFor="bankAccount" className="text-sm font-medium">Bank Account *</Label>
                <Select 
                  value={paymentFormData.bankAccount} 
                  onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, bankAccount: value }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsLoading ? (
                      <SelectItem value="loading" disabled>Loading bank accounts...</SelectItem>
                    ) : bankAccounts.length === 0 ? (
                      <SelectItem value="no-accounts" disabled>No bank accounts found</SelectItem>
                    ) : (
                      bankAccounts.map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.bankName} - {account.accountName} ({account.accountNumber})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="transactionId" className="text-sm font-medium">Transaction ID / Reference</Label>
              <Input
                id="transactionId"
                placeholder="Enter transaction ID or reference"
                className="h-10"
                value={paymentFormData.transactionId}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks" className="text-sm font-medium">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Enter any remarks"
                className="min-h-[80px] resize-none"
                value={paymentFormData.remarks}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              className="px-6"
              onClick={() => {
                setIsAddPaymentModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              className="px-6 bg-blue-600 hover:bg-blue-700"
              onClick={handleAddPayment}
              disabled={addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending ? 'Adding...' : 'Add Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Payment Details Modal */}
      <Dialog open={isViewPaymentModalOpen} onOpenChange={setIsViewPaymentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Advanced Payment Details
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Payment record details for Lead {selectedPayment?.leadCode}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="py-6 space-y-6">
              {/* Status Header */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Amount</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(selectedPayment.amount)}</p>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Details Card */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800 border-b pb-1">Lead Details</h4>
                  <div>
                    <Label className="text-xs text-slate-400">Lead Code</Label>
                    <p className="text-sm font-medium text-blue-600">{selectedPayment.leadCode}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Company Name</Label>
                    <p className="text-sm font-medium text-slate-800">{selectedPayment.companyName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Contact Person</Label>
                    <p className="text-sm font-medium text-slate-800">{selectedPayment.contactPerson}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Contact Number</Label>
                    <p className="text-sm text-slate-800">{selectedPayment.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Email Address</Label>
                    <p className="text-sm text-slate-800">{selectedPayment.email || 'N/A'}</p>
                  </div>
                </div>

                {/* Transaction details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800 border-b pb-1">Transaction Details</h4>
                  <div>
                    <Label className="text-xs text-slate-400">Payment Date</Label>
                    <p className="text-sm font-medium text-slate-800">{formatDate(selectedPayment.paymentDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Payment Method</Label>
                    <p className="text-sm font-medium text-slate-800">{selectedPayment.paymentMethod}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Transaction / Reference ID</Label>
                    <p className="text-sm font-mono text-slate-800">{selectedPayment.transactionId || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Selected Bank Account</Label>
                    <p className="text-sm text-slate-800">
                      {selectedPayment.bankAccountName
                        ? selectedPayment.bankAccountName
                        : selectedPayment.bankAccount
                          ? 'Bank Transfer'
                          : 'Cash Payment'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Added By</Label>
                    <p className="text-sm text-slate-800">{selectedPayment.addedBy?.fullName || selectedPayment.addedBy?.username || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              {selectedPayment.remarks && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <Label className="text-xs text-slate-400">Remarks</Label>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedPayment.remarks}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button 
              variant="outline" 
              className="px-6"
              onClick={() => {
                setIsViewPaymentModalOpen(false);
                setSelectedPayment(null);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadPayments;