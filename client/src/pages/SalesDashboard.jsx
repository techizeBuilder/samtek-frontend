import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { salesApi } from '@/api/salesService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  User, 
  Calendar, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useLocation } from 'wouter';

const SalesDashboard = () => {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'green';
      case 'approved':
      case 'processing':
      case 'in progress':
        return 'yellow';
      case 'pending':
      case 'created':
        return 'blue';
      case 'cancelled':
      case 'rejected':
        return 'red';
      case 'out for delivery':
        return 'green';
      default:
        return 'blue';
    }
  };

  const getStatusBadgeVariant = (color) => {
    switch (color) {
      case 'green': return 'default';
      case 'blue': return 'secondary';
      case 'yellow': return 'outline';
      case 'red': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'out for delivery':
        return <CheckCircle className="h-3 w-3" />;
      case 'processing':
      case 'created':
        return <Clock className="h-3 w-3" />;
      case 'cancelled':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  // Mock salesman data
  const salesmanData = {
    name: user?.fullName || 'Sales Person',
    salesmanNumber: 'TPT-Sales-8489',
    lastLogin: '11:23 AM IST',
    profileStatus: 'Active'
  };

  // API queries for dynamic data
  const { data: salesSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/sales/summary'],
    queryFn: () => salesApi.getDashboardSummary(),
    staleTime: 30000, // 30 seconds
    onSuccess: (data) => {
      console.log('📊 Sales Summary API Response:', data);
    }
  });

  const { data: recentOrdersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/sales/recent-orders'],
    queryFn: () => salesApi.getRecentOrders(5),
    staleTime: 30000, // 30 seconds
    onSuccess: (data) => {
      console.log('📦 Recent Orders API Response:', data);
    }
  });

  // Transform API data to match UI expectations
  const orderSummary = summaryLoading ? {
    totalOrders: 0,
    delivered: 0,
    inProgress: 0,
    preparation: 0
  } : {
    totalOrders: salesSummary?.data?.totalOrders || 0,
    delivered: salesSummary?.data?.completedOrders || 0,
    inProgress: (salesSummary?.data?.inProgressOrders || 0) + (salesSummary?.data?.approvedOrders || 0),
    preparation: salesSummary?.data?.pendingOrders || 0
  };

  const recentOrders = ordersLoading ? [] : (recentOrdersData?.orders || []).map(order => ({
    id: order.orderCode || order._id,
    orderDate: order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : 'N/A',
    status: order.status || 'Created',
    statusColor: getStatusColor(order.status),
    customer: order.customerName || 'Unknown Customer',
    salesperson: order.salesPerson?.fullName || order.salesPerson?.username || 'N/A',
    items: Array.isArray(order.products) ? order.products.length : (order.totalItems || 0),
    totalQuantity: order.totalQuantity || 0,
    amount: order.totalAmount || order.amount || 0
  }));

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleNewOrder = () => {
    setLocation('/sales/orders');
  };

  const handleViewAll = () => {
    setLocation('/sales/orders');
  };

  // Loading state for better UX
  const isLoading = summaryLoading || ordersLoading;

  return (
    <div className="p-4 space-y-6 w-full">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Salesman: {salesmanData.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Last logged in at {salesmanData.lastLogin}</span>
              </div>
            </div>
          </div>
          <Button 
            onClick={handleNewOrder}
            className="bg-white text-blue-600 hover:bg-gray-100 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      {/* Order Summary Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-gray-600">
                  {isLoading ? '...' : orderSummary.totalOrders}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-green-600">
                  {isLoading ? '...' : orderSummary.delivered}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-orange-600">
                  {isLoading ? '...' : orderSummary.inProgress}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold text-red-600">
                  {isLoading ? '...' : orderSummary.preparation}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">Preparation</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-red-500" />
              <CardTitle>Recent Orders</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewAll}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Salesperson</TableHead>
                <TableHead>Total Qtys Indent</TableHead>
                <TableHead>Order No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2">Loading orders...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell className="font-medium">{order.salesperson || 'N/A'}</TableCell>
                    <TableCell>{order.totalQuantity || 0}</TableCell>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(order.statusColor)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getStatusIcon(order.status)}
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        VIEW
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>



      {/* View Order Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Number</label>
                  <p className="text-sm font-medium">{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Date</label>
                  <p className="text-sm font-medium">{selectedOrder.orderDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <p className="text-sm font-medium">{selectedOrder.customer}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge 
                    variant={getStatusBadgeVariant(selectedOrder.statusColor)}
                    className="flex items-center gap-1 w-fit"
                  >
                    {getStatusIcon(selectedOrder.status)}
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Items</label>
                  <p className="text-sm font-medium">{selectedOrder.items} items</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Quantity</label>
                  <p className="text-sm font-medium">{selectedOrder.totalQuantity} units</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-2">Order Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Order created on {selectedOrder.orderDate}</span>
                  </div>
                  {selectedOrder.status !== 'Created' && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Status updated to {selectedOrder.status}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesDashboard;