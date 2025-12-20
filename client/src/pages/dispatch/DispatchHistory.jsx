import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Download,
  FileText,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  Truck,
  Users,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function DispatchHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    startDate: '',
    endDate: '',
    status: 'all',
    vehicleId: '',
    customerId: ''
  });

  // Fetch dispatch history data
  const {
    data: historyData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dispatchHistory', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          queryParams.append(key, value);
        }
      });
      const response = await apiRequest('GET', `/api/dispatches/history?${queryParams}`);
      return response;
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
    refetchOnWindowFocus: false
  });

  const reports = historyData?.data?.reports || [];
  const pagination = historyData?.data?.pagination || {};
  const summary = historyData?.data?.summary || {};

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      'delivered': { 
        variant: 'default', 
        icon: CheckCircle2, 
        className: 'bg-green-100 text-green-800 hover:bg-green-200' 
      },
      'in_transit': { 
        variant: 'secondary', 
        icon: Truck, 
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
      },
      'pending': { 
        variant: 'destructive', 
        icon: AlertCircle, 
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
      },
      'cancelled': { 
        variant: 'outline', 
        icon: XCircle, 
        className: 'bg-red-100 text-red-800 hover:bg-red-200' 
      }
    };

    const config = statusConfig[status] || statusConfig['pending'];
    const IconComponent = config.icon;

    return (
      <Badge className={config.className}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      startDate: '',
      endDate: '',
      status: 'all',
      vehicleId: '',
      customerId: ''
    });
  };

  // Export functionality
  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Dispatch history export is being prepared...",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Dispatch History</h2>
            <p className="text-gray-600 mb-4">{error?.message || 'An error occurred'}</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dispatch History</h1>
            <p className="text-gray-600">Track and analyze dispatch operations performance</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Dispatches</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalDispatches || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{summary.deliveredDispatches || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Transit</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.inTransitDispatches || 0}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalValue || 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vehicleId">Vehicle</Label>
                <Input
                  id="vehicleId"
                  placeholder="Vehicle No."
                  value={filters.vehicleId}
                  onChange={(e) => handleFilterChange('vehicleId', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="limit">Items per page</Label>
                <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dispatch History
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading dispatch history...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No dispatch history found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dispatch Date</TableHead>
                      <TableHead>Delivery Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((dispatch) => (
                      <TableRow key={dispatch.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {dispatch.dispatchId || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{dispatch.customer?.name || 'N/A'}</p>
                            {dispatch.customer?.phone && (
                              <p className="text-sm text-gray-500">{dispatch.customer.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Truck className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{dispatch.vehicle?.number || 'N/A'}</span>
                          </div>
                          {dispatch.driver?.name && (
                            <p className="text-sm text-gray-500">{dispatch.driver.name}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {dispatch.items?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(dispatch.totalValue)}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(dispatch.status)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(dispatch.dispatchDate)}
                        </TableCell>
                        <TableCell>
                          {dispatch.deliveryDate ? formatDateTime(dispatch.deliveryDate) : (
                            <span className="text-gray-400">Pending</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                    {pagination.totalCount} entries
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-sm">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}