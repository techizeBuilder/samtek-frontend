import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Eye,
  Filter,
  RefreshCw,
  Package,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  List,
  Edit,
  Settings,
  FilterX,
  CalendarIcon,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  disapproved: 'bg-red-100 text-red-800'
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  disapproved: XCircle
};

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-800' }
];

export default function SalesOrderList() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: 'all',
    search: '',
    customerId: 'all',
    salesPersonId: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    orderId: null,
    newStatus: '',
    notes: ''
  });
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['/api/unit-manager/sales-order-list', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') params.append(key, value);
      });
      return apiRequest('GET', `/api/unit-manager/sales-order-list?${params.toString()}`);
    },
    retry: 1
  });

  // Fetch customers for dropdown
  const { data: customersResponse } = useQuery({
    queryKey: ['/api/unit-manager/customers'],
    queryFn: () => apiRequest('GET', '/api/unit-manager/customers'),
    retry: 1
  });

  // Fetch salespersons for dropdown
  const { data: salespersonsResponse } = useQuery({
    queryKey: ['/api/unit-manager/salespersons'],
    queryFn: () => apiRequest('GET', '/api/unit-manager/salespersons'),
    retry: 1
  });

  // Fetch single order details
  const { data: orderDetailsResponse, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['/api/unit-manager/orders', selectedOrder],
    queryFn: () => apiRequest('GET', `/api/unit-manager/orders/${selectedOrder}`),
    enabled: !!selectedOrder
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status, notes }) =>
      apiRequest('PUT', `/api/unit-manager/orders/${orderId}/status`, { status, notes }),
    onSuccess: () => {
      showSuccessToast('Success', 'Order status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/unit-manager/all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unit-manager/sales-order-list'] });
      setIsDetailsOpen(false);
      setIsStatusUpdateOpen(false);
      setSelectedOrder(null);
      setStatusUpdateForm({ orderId: null, newStatus: '', notes: '' });
    },
    onError: (error) => {
      showSmartToast(error, 'Failed to update order status');
    }
  });

  // Bulk approve orders mutation (using same API with bulkApprove flag)
  const bulkApproveMutation = useMutation({
    mutationFn: () =>
      apiRequest('PUT', '/api/unit-manager/orders/bulk-approve/status', { bulkApprove: true }),
    onSuccess: () => {
      showSuccessToast('Success', 'All orders approved successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/unit-manager/sales-order-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unit-manager/all-orders'] });
      setIsBulkApproveOpen(false);
    },
    onError: (error) => {
      showSmartToast(error, 'Failed to approve orders');
    }
  });

  const orders = ordersResponse?.data?.orders || [];
  const pagination = ordersResponse?.data?.pagination || {};
  const summary = ordersResponse?.data?.summary || {};
  const orderDetails = orderDetailsResponse?.data || null;
  const customers = customersResponse?.data || [];
  const salespersons = salespersonsResponse?.data || [];

  // Helper function to generate unique salesperson display names
  const getSalespersonDisplayName = (salesPerson) => {
    if (!salesPerson) return 'N/A';

    // Check if there are multiple people with the same fullName
    const duplicateNames = salespersons.filter(p => p.fullName === salesPerson.fullName);

    if (duplicateNames.length > 1) {
      return `${salesPerson.fullName || salesPerson.username} (${salesPerson.username})`;
    }

    return salesPerson.fullName || salesPerson.username || salesPerson.email || 'Unknown';
  };

  const handleViewOrder = (orderId) => {
    setSelectedOrder(orderId);
    setIsDetailsOpen(true);
  };

  const handleOpenStatusUpdate = (orderId, currentStatus) => {
    // Ensure the current status is valid, default to pending if not
    const validStatus = ['pending', 'approved', 'rejected'].includes(currentStatus) ? currentStatus : 'pending';
    setStatusUpdateForm({
      orderId: orderId,
      newStatus: validStatus,
      notes: ''
    });
    setIsStatusUpdateOpen(true);
  };

  const handleStatusUpdateSubmit = () => {
    if (statusUpdateForm.orderId && statusUpdateForm.newStatus) {
      updateStatusMutation.mutate({
        orderId: statusUpdateForm.orderId,
        status: statusUpdateForm.newStatus,
        notes: statusUpdateForm.notes
      });
    }
  };

  const handleBulkApprove = () => {
    bulkApproveMutation.mutate();
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handleCustomerFilter = (customerId) => {
    setFilters(prev => ({ ...prev, customerId, page: 1 }));
  };

  const handleSalespersonFilter = (salesPersonId) => {
    setFilters(prev => ({ ...prev, salesPersonId, page: 1 }));
  };

  const handleDateFilter = () => {
    setFilters(prev => ({
      ...prev,
      dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : '',
      dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : '',
      page: 1
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      status: 'all',
      search: '',
      customerId: 'all',
      salesPersonId: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setDateFrom(null);
    setDateTo(null);
  };

  const activeFiltersCount = Object.values({
    status: filters.status !== 'all',
    search: filters.search !== '',
    customerId: filters.customerId !== 'all',
    salesPersonId: filters.salesPersonId !== 'all',
    dateRange: filters.dateFrom !== '' || filters.dateTo !== ''
  }).filter(Boolean).length;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error loading orders: {error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/unit-manager/all-orders'] })}
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Sales Order List
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and track all sales orders with advanced filtering
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-10 w-10 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-3xl font-bold">{summary.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-10 w-10 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold">{summary.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-3xl font-bold">{summary.approved || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-10 w-10 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-3xl font-bold">{summary.rejected || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFiltersCount} active
                  </Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <FilterX className="h-4 w-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by order code, customer name, email, or salesperson..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
            {/* Status Filter */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-gray-600 mb-1 block">Status</Label>
              <Select value={filters.status} onValueChange={handleStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Filter */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Customer
              </Label>
              <Select value={filters.customerId} onValueChange={handleCustomerFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.filter(customer => customer._id).map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salesperson Filter */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Salesperson
              </Label>
              <Select value={filters.salesPersonId} onValueChange={handleSalespersonFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All Salespersons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salespersons</SelectItem>
                  {salespersons.length > 0 ? (
                    salespersons.filter(person => person._id).map((person) => {
                      // Check if there are multiple people with the same fullName
                      const duplicateNames = salespersons.filter(p => p.fullName === person.fullName);
                      const displayName = duplicateNames.length > 1
                        ? `${person.fullName || person.username} (${person.username})`
                        : person.fullName || person.username || person.email || 'Unknown';

                      return (
                        <SelectItem key={person._id} value={person._id}>
                          {displayName}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="no-salespersons" disabled>
                      No salespersons found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                From Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-start text-left font-normal text-sm"
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateFrom ? format(dateFrom, "MMM dd") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                To Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 justify-start text-left font-normal text-sm"
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateTo ? format(dateTo, "MMM dd") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons */}
            <div className="lg:col-span-2 flex gap-1">
              <Button onClick={handleDateFilter} size="sm" className="h-9 text-sm px-4 flex-1">
                Apply
              </Button>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateFrom(null);
                    setDateTo(null);
                    setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '', page: 1 }));
                  }}
                  className="h-9 px-2"
                  title="Clear dates"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                {pagination.totalItems || 0} orders found
                {filters.search && ` (filtered by "${filters.search}")`}
              </CardDescription>
            </div>
            {/* Bulk Actions and Pagination Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsBulkApproveOpen(true)}
                disabled={isLoading || orders.length === 0}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Approve All Orders</span>
                <span className="sm:hidden">Approve All</span>
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={!pagination.hasPrev || isLoading}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="text-sm text-gray-600 px-2">
                Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={!pagination.hasNext || isLoading}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No orders found</h3>
              <p className="text-gray-500">
                {activeFiltersCount > 0
                  ? 'Try adjusting your filters to see more results.'
                  : 'No orders have been placed yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[150px]">Customer Name</TableHead>
                      <TableHead className="min-w-[120px]">Salesperson</TableHead>
                      <TableHead className="min-w-[120px]">Total Qtys Indent</TableHead>
                      <TableHead className="min-w-[100px]">Order No.</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const StatusIcon = statusIcons[order.status] || Clock;
                      return (
                        <TableRow key={order._id}>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="font-medium">{order.customer?.name || 'N/A'}</TableCell>
                          <TableCell>{getSalespersonDisplayName(order.salesPerson)}</TableCell>
                          <TableCell>
                            {order.products ? order.products.reduce((total, product) => total + (product.quantity || 0), 0) : 0}
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.orderCode || order._id.slice(-6)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[order.status]} flex items-center gap-1 w-fit`}>
                              <StatusIcon className="h-3 w-3" />
                              {order.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewOrder(order._id)}
                                className="flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                              {order.status !== 'approved' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({
                                    orderId: order._id,
                                    status: 'approved',
                                    notes: 'Direct approved from order list'
                                  })}
                                  disabled={updateStatusMutation.isPending}
                                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  Approve
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusUpdate(order._id, order.status)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Update
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {orders.map((order) => {
                  const StatusIcon = statusIcons[order.status] || Clock;
                  return (
                    <Card key={order._id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">
                                #{order.orderCode || order._id.slice(-6)}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <Badge className={`${statusColors[order.status]} flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {order.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-sm border-t pt-3">
                            <div>
                              <p className="text-gray-600">Customer Name</p>
                              <p className="font-medium">{order.customer?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Salesperson</p>
                              <p className="font-medium">{getSalespersonDisplayName(order.salesPerson)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Total Qtys Indent</p>
                              <p className="font-medium">
                                {order.products ? order.products.reduce((total, product) => total + (product.quantity || 0), 0) : 0}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order._id)}
                              className="flex-1 min-w-[70px] flex items-center justify-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            {order.status !== 'approved' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({
                                  orderId: order._id,
                                  status: 'approved',
                                  notes: 'Direct approved from order list'
                                })}
                                disabled={updateStatusMutation.isPending}
                                className="flex-1 min-w-[70px] flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStatusUpdate(order._id, order.status)}
                              className="flex-1 min-w-[70px] flex items-center justify-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Update
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Bottom Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {Math.min((pagination.currentPage - 1) * pagination.itemsPerPage + 1, pagination.totalItems)} to{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                  {pagination.totalItems} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: 1 }))}
                    disabled={pagination.currentPage === 1 || isLoading}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={!pagination.hasPrev || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 py-1 text-sm bg-gray-100 rounded">
                    {pagination.currentPage}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={!pagination.hasNext || isLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: pagination.totalPages }))}
                    disabled={pagination.currentPage === pagination.totalPages || isLoading}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View and manage order information
            </DialogDescription>
          </DialogHeader>

          {isDetailsLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : orderDetails ? (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Number</label>
                  <p className="font-medium">{orderDetails.orderCode || orderDetails._id.slice(-6)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="font-medium">{formatDate(orderDetails.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Amount</label>
                  <p className="font-medium">{formatCurrency(orderDetails.totalAmount || 0)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Status</label>
                  <div className="mt-1">
                    <Badge className={statusColors[orderDetails.status]}>
                      {orderDetails.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p>{orderDetails.customer?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p>{orderDetails.customer?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p>{orderDetails.customer?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p>{orderDetails.customer?.address || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Salesperson Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Salesperson Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p>{orderDetails.salesPerson?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p>{orderDetails.salesPerson?.email || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              {orderDetails.products && orderDetails.products.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails.products.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.product?.name || item.productName || 'N/A'}</p>
                                  <p className="text-sm text-gray-500">{item.product?.code}</p>
                                </div>
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.price || 0)}</TableCell>
                              <TableCell>{formatCurrency((item.quantity * item.price) || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Confirmation Dialog */}
      <Dialog open={isBulkApproveOpen} onOpenChange={setIsBulkApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <CheckCircle className="h-5 w-5" />
              Approve All Orders?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve all orders? This action will approve every order in the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-yellow-100 rounded-full p-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800 mb-1">Warning</h4>
                  <p className="text-sm text-yellow-700">
                    This will approve all pending orders across all customers and salespersons. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-blue-800">Summary</span>
              </div>
              <div className="space-y-1 text-sm text-blue-700">
                <p>• Total Orders: <strong>{summary.total || 0}</strong></p>
                <p>• Pending Orders: <strong>{summary.pending || 0}</strong></p>
                <p>• Will be Approved: <strong>{summary.pending || 0}</strong></p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkApproveOpen(false)}
              disabled={bulkApproveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkApprove}
              disabled={bulkApproveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {bulkApproveMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Yes, Approve All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Select a new status for the order and add optional notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select
                value={statusUpdateForm.newStatus}
                onValueChange={(value) => setStatusUpdateForm(prev => ({ ...prev, newStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => {
                    const IconComponent = status.icon;
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{status.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this status change..."
                value={statusUpdateForm.notes}
                onChange={(e) => setStatusUpdateForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusUpdateOpen(false)}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdateSubmit}
              disabled={updateStatusMutation.isPending || !statusUpdateForm.newStatus}
            >
              {updateStatusMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}