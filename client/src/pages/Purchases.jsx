import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { Plus, Search, Edit, Trash2, Eye, Receipt, CheckCircle } from 'lucide-react';

export default function Purchases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: [`/api/purchases?page=${page}&limit=10&search=${search}&status=${status}&paymentStatus=${paymentStatus}`],
    enabled: true
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: (purchaseId) => api.delete(`/purchases/${purchaseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  const approvePurchaseMutation = useMutation({
    mutationFn: (purchaseId) => api.put(`/purchases/${purchaseId}`, { approvedBy: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
      toast({
        title: "Success",
        description: "Purchase order approved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to approve purchase order",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Sent':
        return 'bg-blue-100 text-blue-800';
      case 'Acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'Partially Received':
        return 'bg-orange-100 text-orange-800';
      case 'Received':
        return 'status-completed';
      case 'Cancelled':
        return 'status-cancelled';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'status-paid';
      case 'Pending':
        return 'status-pending';
      case 'Overdue':
        return 'status-overdue';
      case 'Cancelled':
        return 'status-cancelled';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeletePurchase = (purchaseId) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      deletePurchaseMutation.mutate(purchaseId);
    }
  };

  const handleApprovePurchase = (purchaseId) => {
    if (window.confirm('Are you sure you want to approve this purchase order?')) {
      approvePurchaseMutation.mutate(purchaseId);
    }
  };

  const purchases = purchasesData?.purchases || [];
  const pagination = purchasesData?.pagination || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Receipt className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-semibold">Purchases</h1>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Purchase Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search purchase orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">All Payment Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No purchase orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">PO Number</th>
                    <th className="text-left py-3 px-4 font-medium">Supplier</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Payment Status</th>
                    <th className="text-left py-3 px-4 font-medium">Total Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Order Date</th>
                    <th className="text-left py-3 px-4 font-medium">Approved</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase._id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{purchase.purchaseOrderNumber}</td>
                      <td className="py-3 px-4">{purchase.supplier?.supplierName}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(purchase.status)}>
                          {purchase.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getPaymentStatusColor(purchase.paymentStatus)}>
                          {purchase.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">${purchase.grandTotal.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {new Date(purchase.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {purchase.isApproved ? (
                          <Badge variant="default">Approved</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!purchase.isApproved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApprovePurchase(purchase._id)}
                              disabled={approvePurchaseMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePurchase(purchase._id)}
                            disabled={deletePurchaseMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} purchase orders
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
