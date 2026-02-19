import { useAuth } from '@/hooks/useAuth';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { accountsSalesPersonsApi } from '@/api/customerService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Users,
  ShoppingCart,
  Eye,
  X,
} from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'totalOrders', label: 'Total Orders' }
];

export default function SalesmanSettlement() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [ordersFilters, setOrdersFilters] = useState({
    page: 1,
    limit: 10,
    status: 'All',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Query for sales persons list
  const { data: salesPersonsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/accounts/sales-persons', filters],
    queryFn: () => accountsSalesPersonsApi.getAll(filters),
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error) => {
      showSmartToast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to fetch sales persons: ${error.message}`
      });
    }
  });

  // Query for sales person details
  const { data: detailsData } = useQuery({
    queryKey: ['/accounts/sales-persons', selectedSalesPerson?._id],
    queryFn: () => accountsSalesPersonsApi.getById(selectedSalesPerson._id),
    enabled: !!selectedSalesPerson && isDetailsOpen,
    retry: 1
  });

  // Query for sales person orders
  const { data: ordersData } = useQuery({
    queryKey: ['/accounts/sales-persons', selectedSalesPerson?._id, 'orders', ordersFilters],
    queryFn: () => accountsSalesPersonsApi.getOrders(selectedSalesPerson._id, ordersFilters),
    enabled: !!selectedSalesPerson && isOrdersOpen,
    retry: 1
  });

  const salesPersons = salesPersonsData?.data?.salesPersons || [];
  const pagination = salesPersonsData?.data?.pagination || {};
  const summary = salesPersonsData?.data?.summary || {};
  const salesPersonDetails = detailsData?.data;
  const ordersData_list = ordersData?.data?.orders || [];
  const ordersPagination = ordersData?.data?.pagination || {};
  const ordersStats = ordersData?.data?.statistics || {};

  // Handler Functions
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const handleOrdersFilterChange = (key, value) => {
    setOrdersFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const handleViewDetails = (salesPerson) => {
    setSelectedSalesPerson(salesPerson);
    setIsDetailsOpen(true);
  };

  const handleViewOrders = (salesPerson) => {
    setSelectedSalesPerson(salesPerson);
    setOrdersFilters({
      page: 1,
      limit: 10,
      status: 'All',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setIsOrdersOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedSalesPerson(null);
  };

  const handleCloseOrders = () => {
    setIsOrdersOpen(false);
    setSelectedSalesPerson(null);
  };

  // Utility Functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading sales persons: {String(error?.message || 'Unknown error')}</p>
              <Button onClick={refetch} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Team</h1>
          <p className="text-muted-foreground">
            View and manage sales persons for your company
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Persons</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSalesPersons || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sales team members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              All sales orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Overall revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageOrderValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, username, or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select 
              value={filters.sortBy} 
              onValueChange={(value) => handleFilterChange('sortBy', value)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={filters.sortOrder} 
              onValueChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Persons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Team</CardTitle>
          <CardDescription>
            View and manage sales team performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesPersons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sales persons found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Avg Order Value</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesPersons.map((salesPerson) => (
                      <TableRow key={salesPerson._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {salesPerson.fullName || salesPerson.username}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {salesPerson.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {salesPerson.totalOrders || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(salesPerson.totalRevenue)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(salesPerson.averageOrderValue)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="text-sm font-medium">
                              {salesPerson.successRate || 0}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {salesPerson.lastOrderDate ? formatDate(salesPerson.lastOrderDate) : 'No orders'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                            onClick={() => handleViewOrders(salesPerson)}
                            title="View Orders"
                          >
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(salesPerson)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-green-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.pages} 
                    ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={filters.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={filters.page === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sales Person Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={handleCloseDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sales Person Details</DialogTitle>
            <DialogDescription>
              {salesPersonDetails?.fullName || salesPersonDetails?.username}
            </DialogDescription>
          </DialogHeader>

          {salesPersonDetails && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">{salesPersonDetails.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{salesPersonDetails.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{salesPersonDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{salesPersonDetails.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={salesPersonDetails.isActive ? 'default' : 'secondary'}>
                      {salesPersonDetails.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">{formatDate(salesPersonDetails.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{salesPersonDetails.totalOrders}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesPersonDetails.totalRevenue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Avg Order Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesPersonDetails.averageOrderValue)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">{salesPersonDetails.successRate}%</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Orders Status Breakdown */}
              {salesPersonDetails.ordersByStatus && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Orders by Status</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="font-bold">{salesPersonDetails.ordersByStatus.pending}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Approved</p>
                      <p className="font-bold">{salesPersonDetails.ordersByStatus.approved}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">In Production</p>
                      <p className="font-bold">{salesPersonDetails.ordersByStatus.inProduction}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Shipped</p>
                      <p className="font-bold">{salesPersonDetails.ordersByStatus.shipped}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Delivered</p>
                      <p className="font-bold">{salesPersonDetails.ordersByStatus.delivered}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Cancelled</p>
                      <p className="font-bold">{salesPersonDetails.ordersByStatus.cancelled}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Orders */}
              {salesPersonDetails.recentOrders && salesPersonDetails.recentOrders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Recent Orders</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {salesPersonDetails.recentOrders.map(order => (
                      <div key={order._id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{order.orderCode}</p>
                          <p className="text-sm text-muted-foreground">{order.customer?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sales Person Orders Modal */}
      <Dialog open={isOrdersOpen} onOpenChange={handleCloseOrders}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orders - {salesPersonDetails?.fullName || salesPersonDetails?.username}
            </DialogTitle>
            <DialogDescription>
              View all orders for this sales person
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Search orders..."
                value={ordersFilters.search}
                onChange={(e) => handleOrdersFilterChange('search', e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <Select 
                value={ordersFilters.status} 
                onValueChange={(value) => handleOrdersFilterChange('status', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="In Production">In Production</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orders Stats */}
            {ordersStats && (
              <div className="grid grid-cols-4 gap-2">
                <Card>
                  <CardContent className="pt-3">
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="font-bold text-lg">{ordersStats.totalOrders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="font-bold text-sm">{formatCurrency(ordersStats.totalAmount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3">
                    <p className="text-xs text-muted-foreground">Avg Order</p>
                    <p className="font-bold text-sm">{formatCurrency(ordersStats.averageOrderValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3">
                    <p className="text-xs text-muted-foreground">Final Amount</p>
                    <p className="font-bold text-sm">{formatCurrency(ordersStats.totalFinal)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Code</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersData_list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="6" className="text-center py-4">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    ordersData_list.map(order => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">{order.orderCode}</TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>{formatCurrency(order.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'}>
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(order.date)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {ordersPagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {ordersPagination.currentPage} of {ordersPagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOrdersFilterChange('page', ordersFilters.page - 1)}
                    disabled={ordersFilters.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOrdersFilterChange('page', ordersFilters.page + 1)}
                    disabled={ordersFilters.page === ordersPagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
