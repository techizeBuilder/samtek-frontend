import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  Search,
  Filter,
  IndianRupee,
  Receipt,
  User,
  Eye,
  Loader2
} from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';

export default function SuperAdminSales() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'totalOrders',
    sortOrder: 'desc'
  });
  
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Query for sales persons list
  const { data: salesData, isLoading, error, refetch } = useQuery({
    queryKey: ['super-admin-sales-persons', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value.toString());
        }
      });
      const url = `/api/super-admin/sales?${params.toString()}`;
      console.log('🔍 Making API call to:', url);
      return apiRequest('GET', url);
    },
    retry: 1,
    onSuccess: (data) => {
      console.log('✅ API Success:', data);
    },
    onError: (error) => {
      console.log('❌ API Error:', error);
      showSmartToast('error', `Failed to fetch sales persons: ${error?.message || 'Unknown error'}`);
    }
  });

  // Query for sales person details
  const { data: salesPersonDetailData, isLoading: isDetailLoading, error: detailError } = useQuery({
    queryKey: ['super-admin-salesperson-detail', selectedSalesPerson],
    queryFn: () => {
      const url = `/api/super-admin/sales-person/${selectedSalesPerson}`;
      console.log('🔍 Fetching sales person details for ID:', selectedSalesPerson);
      console.log('🔍 API URL:', url);
      return apiRequest('GET', url);
    },
    enabled: !!selectedSalesPerson,
    retry: 1,
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
    onSuccess: (data) => {
      console.log('✅ Sales Person Details Success:', data);
    },
    onError: (error) => {
      console.log('❌ Sales Person Details Error:', error);
      showSmartToast('error', `Failed to load sales person details: ${error?.message || 'Unknown error'}`);
    }
  });

  // Add debugging for selectedSalesPerson changes
  console.log('🔍 Current selectedSalesPerson:', selectedSalesPerson);
  console.log('🔍 Query enabled:', !!selectedSalesPerson);

  // Monitor selectedSalesPerson changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - selectedSalesPerson changed to:', selectedSalesPerson);
    if (selectedSalesPerson) {
      console.log('✅ selectedSalesPerson is truthy, query should be enabled');
    } else {
      console.log('❌ selectedSalesPerson is falsy, query should be disabled');
    }
  }, [selectedSalesPerson]);
  console.log('🔍 isDetailLoading:', isDetailLoading);
  console.log('🔍 isDetailModalOpen:', isDetailModalOpen);

  const salesPersons = salesData?.data?.sales || [];  // Changed from salesPersons to sales
  const pagination = salesData?.data?.pagination || {};
  const summary = salesData?.data?.summary || {};

  // Debug logging
  console.log('🔍 Debug - salesData:', salesData);
  console.log('🔍 Debug - salesPersons:', salesPersons);
  console.log('🔍 Debug - summary:', summary);
  console.log('🔍 Debug - isLoading:', isLoading);
  console.log('🔍 Debug - error:', error);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const handlePageChange = (newPage) => {
    handleFilterChange('page', newPage);
  };

  const handleViewSale = (salesPersonId) => {
    console.log('🔍 handleViewSale called with ID:', salesPersonId);
    console.log('🔍 Setting selectedSalesPerson to:', salesPersonId);
    setSelectedSalesPerson(salesPersonId);
    setIsDetailModalOpen(true);
    console.log('✅ Modal opened, selectedSalesPerson set to:', salesPersonId);
    
    // Force trigger the API call manually as a test
    console.log('🔍 Manual API test call...');
    apiRequest('GET', `/api/super-admin/sales-person/${salesPersonId}`)
      .then(data => {
        console.log('✅ Manual API Success:', data);
      })
      .catch(error => {
        console.log('❌ Manual API Error:', error);
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading sales...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">Error loading sales data</p>
          <p className="text-gray-600 mb-4">{error?.message || 'Unknown error'}</p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Persons List</h1>
          <p className="text-muted-foreground">Showing {salesPersons.length} to {Math.min((pagination.page || 1) * (pagination.limit || 20), pagination.total || salesPersons.length)} of {pagination.total || salesPersons.length} sales persons</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalSalesPersons || 0}</p>
                <p className="text-sm text-muted-foreground">Total Sales People</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Receipt className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalSales || 0}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalSalesPersons || 0}</p>
                <p className="text-sm text-muted-foreground">Active Sales People</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Sales Person</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Name, username, email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalOrders">Total Orders</SelectItem>
                  <SelectItem value="totalRevenue">Total Revenue</SelectItem>
                  <SelectItem value="fullName">Name</SelectItem>
                  <SelectItem value="createdAt">Date Joined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Person Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Total Orders</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesPersons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No sales persons found
                    </TableCell>
                  </TableRow>
                ) : (
                  salesPersons.map((person) => (
                    <TableRow key={person._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-medium">{person.fullName || person.username}</p>
                          <p className="text-sm text-muted-foreground">ID: {person._id.slice(-6)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {person.companyId?.name || person.companyId?.unitName || '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{person.email}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={person.isActive ? "default" : "secondary"}>
                          {person.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{person.orderStats?.totalOrders || 0}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(person.orderStats?.totalAmount || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewSale(person._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Person Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sales Person Details</DialogTitle>
            <DialogDescription>
              Complete information about the sales person and their orders
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading sales person details...
            </div>
          ) : salesPersonDetailData?.data ? (
            <div className="space-y-6">
              {/* Sales Person Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Sales Person Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {salesPersonDetailData.data.salesPerson?.fullName || salesPersonDetailData.data.salesPerson?.username || 'N/A'}</p>
                    <p><strong>Username:</strong> @{salesPersonDetailData.data.salesPerson?.username || 'N/A'}</p>
                    <p><strong>Email:</strong> {salesPersonDetailData.data.salesPerson?.email || 'N/A'}</p>
                    <p><strong>Status:</strong> 
                      <Badge className={`ml-2 ${salesPersonDetailData.data.salesPerson?.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {salesPersonDetailData.data.salesPerson?.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                    <p><strong>Joined Date:</strong> {formatDate(salesPersonDetailData.data.salesPerson?.createdAt)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Performance Statistics</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Total Orders:</strong> {salesPersonDetailData.data.statistics?.totalOrders || 0}</p>
                    <p><strong>Total Revenue:</strong> {formatCurrency(salesPersonDetailData.data.statistics?.totalAmount)}</p>
                    <p><strong>Completed Orders:</strong> {salesPersonDetailData.data.statistics?.completedOrders || 0}</p>
                    <p><strong>Pending Orders:</strong> {salesPersonDetailData.data.statistics?.pendingOrders || 0}</p>
                    <p><strong>Cancelled Orders:</strong> {salesPersonDetailData.data.statistics?.cancelledOrders || 0}</p>
                    <p><strong>Average Order Value:</strong> {formatCurrency(salesPersonDetailData.data.statistics?.avgOrderValue)}</p>
                  </div>
                </div>
              </div>

              {/* All Orders */}
              {salesPersonDetailData.data.orders && salesPersonDetailData.data.orders.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">All Orders ({salesPersonDetailData.data.orders.length})</h3>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order Code</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesPersonDetailData.data.orders.map((order) => (
                          <TableRow key={order._id}>
                            <TableCell className="font-medium">
                              {order.orderCode || order.orderNumber || `#${order._id.slice(-6)}`}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.customer?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.customer?.email || ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{order.customer?.contactPerson || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.customer?.mobile || ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                order.status === 'completed' ? 'default' : 
                                order.status === 'pending' ? 'secondary' : 
                                order.status === 'cancelled' ? 'destructive' : 'outline'
                              }>
                                {order.status?.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded">
                  <p className="text-muted-foreground">No orders found for this sales person</p>
                </div>
              )}
            </div>
          ) : salesPersonDetailData?.success === false ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-lg mb-2">Error loading sales person details</p>
              <p className="text-gray-600 mb-4">{salesPersonDetailData.message || 'Unknown error'}</p>
              <Button onClick={() => {
                setSelectedSalesPerson(null);
                setIsDetailModalOpen(false);
              }} variant="outline">
                Close
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-600 text-lg mb-2">Failed to load sales person details</p>
              <p className="text-gray-600 mb-4">No data received from server</p>
              <div className="space-x-2">
                <Button onClick={() => {
                  // Retry the query by clearing and resetting selectedSalesPerson
                  const currentId = selectedSalesPerson;
                  setSelectedSalesPerson(null);
                  setTimeout(() => setSelectedSalesPerson(currentId), 100);
                }} variant="outline">
                  Retry
                </Button>
                <Button onClick={() => {
                  setSelectedSalesPerson(null);
                  setIsDetailModalOpen(false);
                }} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}