import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Edit2, Eye, TrendingUp, RotateCw, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Sales = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ amount: 0, discount: 0, gst: 0 });
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sales invoices from API
  const { data: salesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/accounts/sales/invoices', currentPage, filterStatus, searchTerm],
    queryFn: () => apiRequest('GET', `/api/accounts/sales/invoices?page=${currentPage}&limit=20&status=${filterStatus}&search=${searchTerm}`),
    retry: 1,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch sales invoices",
        variant: "destructive"
      });
    }
  });

  // Mutation for updating invoice
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest('PUT', `/api/accounts/sales/invoices/${data.invoiceId}`, {
        amount: data.amount,
        discount: data.discount,
        gst: data.gst
      });
      return response;
    },
    onSuccess: async (response) => {
      console.log('✅ Update successful:', response);
      
      toast({
        title: "✓ Success",
        description: "Invoice updated successfully",
        variant: "default"
      });

      // Invalidate all sales invoice queries
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/accounts/sales/invoices'],
        exact: false
      });

      // Refetch to get updated data
      setTimeout(() => {
        refetch();
      }, 500);

      // Close modal and reset state
      setShowEditModal(false);
      setSelectedInvoice(null);
      setEditData({ amount: 0, discount: 0, gst: 0 });
    },
    onError: (error) => {
      console.error('❌ Update failed:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive"
      });
    }
  });

  const salesData = salesResponse?.data?.invoices || [];
  const pagination = salesResponse?.data?.pagination || {};
  const summary = salesResponse?.data?.summary || {};

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (salesData.length === 0) {
      toast({
        title: "No data",
        description: "No invoices to export",
        variant: "destructive"
      });
      return;
    }

    const headers = ['Invoice No', 'Customer', 'Sales Person', 'Date', 'Amount', 'Discount', 'GST', 'Total', 'Status', 'Payment Method'];
    const rows = salesData.map(sale => [
      sale.invoiceNo,
      sale.customerName,
      sale.salesPerson,
      new Date(sale.date).toLocaleDateString('en-IN'),
      sale.amount,
      sale.discount,
      sale.gst || 0,
      sale.finalAmount,
      sale.status,
      sale.paymentMethod
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: `Exported ${salesData.length} invoices`,
      variant: "default"
    });
  };

  // Handle View
  const handleView = (sale) => {
    setSelectedInvoice(sale);
    setShowViewModal(true);
  };

  // Handle Edit
  const handleEdit = (sale) => {
    setSelectedInvoice(sale);
    setEditData({
      amount: sale.amount || 0,
      discount: sale.discount || 0,
      gst: sale.gst || 0
    });
    setShowEditModal(true);
  };

  // Handle Update
  const handleUpdate = async () => {
    if (!selectedInvoice) return;
    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync({
        invoiceId: selectedInvoice._id,
        amount: editData.amount,
        discount: editData.discount,
        gst: editData.gst
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const statuses = ['All', 'Paid', 'Pending', 'Overdue'];

  const totalRevenue = summary.totalAmount || 0;
  const totalDiscount = summary.totalDiscount || 0;
  const netAmount = summary.totalFinalAmount || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="shadow-lg border-0">
          <CardContent className="p-8 text-center">
            <div className="animate-spin inline-block mb-4">
              <RotateCw className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-gray-600">Loading sales invoices...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="shadow-lg border-0 bg-red-50">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">❌ Failed to load sales invoices</p>
            <p className="text-gray-600 text-sm mb-4">{error.message}</p>
            <Button onClick={() => refetch()} className="bg-red-600 hover:bg-red-700">
              <RotateCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Sales Invoices</h1>
            <p className="text-gray-600 mt-2">Manage and track all sales invoices and payments ({summary.totalInvoices || 0} total)</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalRevenue / 100000).toFixed(2)} L</p>
                  <p className="text-xs text-gray-500 mt-1">{summary.totalInvoices || 0} invoices</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Discount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(totalDiscount / 1000).toFixed(1)} K</p>
                  <p className="text-xs text-gray-500 mt-1">{((totalDiscount / totalRevenue) * 100).toFixed(1)}% of revenue</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Net Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(netAmount / 100000).toFixed(2)} L</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <Badge className="bg-green-100 text-green-800">Paid: {summary.paidCount || 0}</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">Pending: {summary.pendingCount || 0}</Badge>
                  </div>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by invoice number or customer..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                {statuses.map(status => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFilterStatus(status);
                      setCurrentPage(1);
                    }}
                    className={filterStatus === status ? "bg-gradient-to-r from-green-600 to-emerald-600" : ""}
                  >
                    {status}
                  </Button>
                ))}
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                  onClick={exportToCSV}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="ml-auto md:ml-0"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card className="shadow-lg border-0">
          <CardHeader className="border-b">
            <CardTitle>Sales Invoices ({pagination.total || 0})</CardTitle>
            <CardDescription>Page {pagination.page || 1} of {pagination.pages || 1}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {salesData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No sales invoices found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 hover:bg-slate-100">
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Invoice No</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Customer</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Sales Person</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">Discount</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Method</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map((sale) => (
                        <tr key={sale._id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-semibold text-gray-900">{sale.invoiceNo}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{sale.customerName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{sale.salesPerson}</td>
                          <td className="px-6 py-4 text-gray-600">{new Date(sale.date).toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900">
                            ₹{sale.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-right text-orange-600">-₹{sale.discount.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4">
                            <Badge className={getStatusColor(sale.status)}>{sale.status}</Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-600 text-sm">{sale.paymentMethod}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-600 hover:bg-blue-50"
                                onClick={() => handleView(sale)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-gray-600 hover:bg-gray-100"
                                onClick={() => handleEdit(sale)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="border-t p-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} invoices
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasMore}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* View Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Details #{selectedInvoice?.invoiceNo}</DialogTitle>
              <DialogDescription>
                Order Code: {selectedInvoice?.orderCode || 'N/A'}
              </DialogDescription>
            </DialogHeader>

            {selectedInvoice && (
              <div className="space-y-6">
                {/* Invoice Info */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600">Invoice #</p>
                    <p className="font-mono font-bold text-gray-900">{selectedInvoice.invoiceNo}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600">DATE</p>
                    <p className="font-bold text-gray-900">{new Date(selectedInvoice.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600">STATUS</p>
                    <Badge className={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-blue-900 mb-4">CUSTOMER INFORMATION</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-blue-700">Customer Name</p>
                      <p className="text-blue-900 font-semibold mt-1">{selectedInvoice.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-700">Sales Person</p>
                      <p className="text-blue-900 font-semibold mt-1">{selectedInvoice.salesPerson}</p>
                    </div>
                    {selectedInvoice.customerEmail && (
                      <div>
                        <p className="text-xs font-semibold text-blue-700">Email</p>
                        <p className="text-blue-900 text-xs truncate mt-1">{selectedInvoice.customerEmail}</p>
                      </div>
                    )}
                    {selectedInvoice.customerPhone && (
                      <div>
                        <p className="text-xs font-semibold text-blue-700">Phone</p>
                        <p className="text-blue-900 font-semibold mt-1">{selectedInvoice.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-green-900 mb-4">FINANCIAL SUMMARY</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Amount</span>
                      <span className="font-semibold text-gray-900">₹{selectedInvoice.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Discount</span>
                      <span className="font-semibold text-orange-600">-₹{selectedInvoice.discount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">GST</span>
                      <span className="font-semibold text-gray-900">+₹{(selectedInvoice.gst || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-green-300 pt-3 flex justify-between">
                      <span className="font-bold text-green-900">Final Amount</span>
                      <span className="text-lg font-bold text-green-700">₹{selectedInvoice.finalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Payment & Items Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600">Payment Method</p>
                    <p className="font-semibold text-gray-900 mt-1">{selectedInvoice.paymentMethod}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded">
                    <p className="text-xs font-semibold text-gray-600">Items Count</p>
                    <p className="font-semibold text-gray-900 mt-1">{selectedInvoice.itemsCount || selectedInvoice.items || 0} items</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 border-t pt-4">
                  <Button 
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      handleEdit(selectedInvoice);
                      setShowViewModal(false);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Invoice
                  </Button>
                  <Button 
                    className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        {showEditModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md shadow-xl">
              <CardHeader className="flex justify-between items-center border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <div>
                  <CardTitle className="text-lg">Edit Invoice #{selectedInvoice.invoiceNo}</CardTitle>
                  <CardDescription className="mt-1">Update Amount, Discount & GST</CardDescription>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  disabled={isUpdating}
                  className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Current vs New Comparison */}
                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-blue-900">
                    <span>Current Amount:</span>
                    <span>₹{selectedInvoice.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Edit Fields */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                  <Input
                    type="number"
                    value={editData.amount}
                    onChange={(e) => setEditData({...editData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    disabled={isUpdating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Discount (₹)</label>
                  <Input
                    type="number"
                    value={editData.discount}
                    onChange={(e) => setEditData({...editData, discount: parseFloat(e.target.value) || 0})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-orange-500"
                    min="0"
                    step="0.01"
                    disabled={isUpdating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">GST (₹)</label>
                  <Input
                    type="number"
                    value={editData.gst}
                    onChange={(e) => setEditData({...editData, gst: parseFloat(e.target.value) || 0})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-green-500"
                    min="0"
                    step="0.01"
                    disabled={isUpdating}
                  />
                </div>

                {/* Detailed Calculation Display */}
                <div className="border-2 border-green-300 bg-green-50 p-4 rounded-lg space-y-2">
                  <h4 className="text-sm font-bold text-green-900">FINAL CALCULATION</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>Amount:</span>
                      <span className="font-semibold">₹{editData.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-orange-700">
                      <span>Less: Discount</span>
                      <span className="font-semibold">-₹{editData.discount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>Add: GST</span>
                      <span className="font-semibold">+₹{editData.gst.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-green-300 pt-2 flex justify-between text-lg font-bold text-green-700">
                      <span>TOTAL</span>
                      <span>₹{(editData.amount - editData.discount + editData.gst).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t pt-4 flex gap-2">
                  <Button 
                    className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedInvoice(null);
                    }}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                  >
                    {isUpdating ? '⏳ Updating...' : '✓ Update Invoice'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sales;
