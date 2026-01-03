import React, { useState, useEffect } from 'react';
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
  Truck,
  Edit,
  Settings,
  FilterX,
  CalendarIcon,
  Users,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  in_production: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  in_production: Package,
  completed: Truck,
  cancelled: XCircle
};

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-800' },
  { value: 'in_production', label: 'Move to Production', icon: Package, color: 'bg-blue-100 text-blue-800' }
];

export default function SalesOrderList() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: 'all',
    search: '',
    customerId: '',
    salesPersonId: '',
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
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: ordersResponse, isLoading, error } = useQuery({
    queryKey: ['/api/unit-manager/all-orders', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') params.append(key, value);
      });
      return apiRequest('GET', `/api/unit-manager/all-orders?${params.toString()}`);
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
      setIsDetailsOpen(false);
      setIsStatusUpdateOpen(false);
      setSelectedOrder(null);
      setStatusUpdateForm({ orderId: null, newStatus: '', notes: '' });
    },
    onError: (error) => {
      showSmartToast(error, 'Failed to update order status');
    }
  });

  const orders = ordersResponse?.data?.orders || [];
  const pagination = ordersResponse?.data?.pagination || {};
  const summary = ordersResponse?.data?.summary || {};
  const orderDetails = orderDetailsResponse?.data || null;
  const customers = customersResponse?.data || [];
  const salespersons = salespersonsResponse?.data || [];

  const handleViewOrder = (orderId) => {
    setSelectedOrder(orderId);
    setIsDetailsOpen(true);
  };

  const handleOpenStatusUpdate = (orderId, currentStatus) => {
    setStatusUpdateForm({
      orderId: orderId,
      newStatus: currentStatus,
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

  const handleStatusUpdate = (newStatus, notes = '') => {
    if (selectedOrder) {
      updateStatusMutation.mutate({
        orderId: selectedOrder,
        status: newStatus,
        notes
      });
    }
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value, page: 1 }));
  };

  const handleStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handleCustomerFilter = (customerId) => {
    const apiValue = customerId === 'all' ? '' : customerId;
    setFilters(prev => ({ ...prev, customerId: apiValue, page: 1 }));
  };

  const handleSalespersonFilter = (salesPersonId) => {
    const apiValue = salesPersonId === 'all' ? '' : salesPersonId;
    setFilters(prev => ({ ...prev, salesPersonId: apiValue, page: 1 }));
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
      customerId: '',
      salesPersonId: '',
      dateFrom: '',
      dateTo: ''
    });
    setDateFrom(null);
    setDateTo(null);
  };

  const activeFiltersCount = Object.values({
    status: filters.status !== 'all',
    search: filters.search !== '',
    customerId: filters.customerId !== '',
    salesPersonId: filters.salesPersonId !== '',
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
            Manage and track all sales orders
          </p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/unit-manager/all-orders'] })}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{summary.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{summary.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{summary.approved || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Production</p>
                <p className="text-2xl font-bold">{summary.in_production || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{summary.completed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Disapproved</p>
                <p className="text-2xl font-bold">{summary.disapproved || 0}</p>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
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
        <CardContent>
          {/* Quick Search - Always visible */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by order code, customer name, email, or salesperson..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Advanced Filters - Collapsible */}
          {showFilters && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={filters.status} onValueChange={handleStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="in_production">In Production</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customer
                  </Label>
                  <Select value={filters.customerId || 'all'} onValueChange={handleCustomerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Salesperson Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Salesperson
                  </Label>
                  <Select value={filters.salesPersonId || 'all'} onValueChange={handleSalespersonFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Salespersons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Salespersons</SelectItem>
                      {salespersons.map((person) => (
                        <SelectItem key={person._id} value={person._id}>
                          {person.fullName || person.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Page Size */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Items per page</Label>
                  <Select 
                    value={filters.limit.toString()} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value), page: 1 }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 per page</SelectItem>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date Range
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : "From date"}
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
                  <div className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : "To date"}
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
                  <Button onClick={handleDateFilter} className="shrink-0">
                    Apply Dates
                  </Button>
                </div>
              </div>

              {/* Active Filters Summary */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                  <span className="text-sm font-medium text-gray-600">Active filters:</span>
                  {filters.status !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Status: {filters.status}
                      <button 
                        onClick={() => handleStatusFilter('all')}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.customerId && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Customer: {customers.find(c => c._id === filters.customerId)?.name || 'Selected'}
                      <button 
                        onClick={() => handleCustomerFilter('all')}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.salesPersonId && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Salesperson: {salespersons.find(s => s._id === filters.salesPersonId)?.fullName || 'Selected'}
                      <button 
                        onClick={() => handleSalespersonFilter('all')}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {(filters.dateFrom || filters.dateTo) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Date Range: {filters.dateFrom || '...'} to {filters.dateTo || '...'}
                      <button 
                        onClick={() => {
                          setDateFrom(null);
                          setDateTo(null);
                          setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '', page: 1 }));
                        }}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
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
            {/* Responsive Pagination Controls */}
            <div className="flex items-center gap-2">
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
                      <TableHead className="min-w-[100px]">Order #</TableHead>
                      <TableHead className="min-w-[120px]">Customer</TableHead>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[80px]">Amount</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Salesperson</TableHead>
                      <TableHead className="min-w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const StatusIcon = statusIcons[order.status] || Clock;
                      return (
                        <TableRow key={order._id}>
                          <TableCell className="font-medium">
                            {order.orderCode || order._id.slice(-6)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.customer?.name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{order.customer?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>{formatCurrency(order.totalAmount || 0)}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[order.status]} flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {order.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.salesPerson?.fullName || 'N/A'}</TableCell>
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
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">Customer</p>
                              <p className="font-medium">{order.customer?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Amount</p>
                              <p className="font-medium">{formatCurrency(order.totalAmount || 0)}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-gray-600">Salesperson</p>
                              <p className="font-medium">{order.salesPerson?.fullName || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order._id)}
                              className="flex-1 flex items-center justify-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStatusUpdate(order._id, order.status)}
                              className="flex-1 flex items-center justify-center gap-1"
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