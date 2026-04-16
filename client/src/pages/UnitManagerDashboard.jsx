import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Factory,
  AlertTriangle,
  Warehouse,
  Calendar,
  BarChart3,
  Star,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { showSmartToast } from '@/lib/toast-utils';

export default function UnitManagerDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query for dashboard data
  const { data: dashboardData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['unit-manager-dashboard', selectedPeriod],
    queryFn: () => {
      console.log('🔄 Fetching dashboard data for period:', selectedPeriod);
      return apiRequest('GET', `/api/unit-manager/dashboard/stats?period=${selectedPeriod}`);
    },
    retry: 1,
    refetchInterval: 300000, // Refetch every 5 minutes
    onSuccess: (data) => {
      console.log('✅ Dashboard data received:', data);
    },
    onError: (error) => {
      console.error('❌ Dashboard API error:', error);
      showSmartToast('error', `Failed to fetch dashboard data: ${error?.message || 'Unknown error'}`);
    }
  });

  // Query for approved product summaries
  const { data: productSummariesData, isLoading: isLoadingProductSummaries, error: productSummariesError } = useQuery({
    queryKey: ['unit-manager-approved-product-summaries'],
    queryFn: () => {
      console.log('🔄 Fetching approved product summaries...');
      return apiRequest('GET', '/api/unit-manager/product-summaries/approved?limit=1000'); // Get all records
    },
    retry: 1,
    onSuccess: (data) => {
      console.log('✅ Approved product summaries received:', data);
    },
    onError: (error) => {
      console.error('❌ Product summaries API error:', error);
    }
  });

  const handleRefresh = () => {
    window.location.reload();
  };

  const dashboard = dashboardData?.data || {};
  const overview = dashboard.overview || {};
  const orders = dashboard.orders || {};
  const inventory = dashboard.inventory || {};
  const salesPersons = dashboard.salesPersons || [];
  const customers = dashboard.customers || {};
  const monthlyTrends = dashboard.monthlyTrends || [];
  
  // Product summaries data
  const productSummaries = productSummariesData?.data?.summaries || [];
  const productSummariesStats = productSummariesData?.data?.stats || {};

  const totalApprovedBatchAdjusted = productSummaries.reduce((sum, summary) => {
    const val = Number(summary?.batchAdjusted);
    return sum + (Number.isFinite(val) ? val : 0);
  }, 0);

  const formatBatches = (batches) => {
    const val = Number(batches);
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number.isFinite(val) ? val : 0);
  };

  // Debug logging
  console.log('🔍 Dashboard state:', {
    isLoading,
    isFetching,
    error: error?.message,
    hasData: !!dashboardData,
    dataStructure: dashboardData ? Object.keys(dashboardData) : null
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGrowthIcon = (growth) => {
    const numGrowth = parseFloat(growth);
    if (numGrowth > 0) {
      return <ArrowUpRight className="h-3 w-3 text-green-500" />;
    } else if (numGrowth < 0) {
      return <ArrowDownRight className="h-3 w-3 text-red-500" />;
    }
    return null;
  };

  const getGrowthColor = (growth) => {
    const numGrowth = parseFloat(growth);
    if (numGrowth > 0) return "text-green-600";
    if (numGrowth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-blue-100 text-blue-800',
      'in_production': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
              <div className="space-y-2 mb-4">
                <p className="text-gray-600">{String(error?.message || 'Unknown error')}</p>
                {error?.response?.status && (
                  <p className="text-sm text-red-600">
                    Status: {error.response.status} - {String(error.response.statusText || 'API Error')}
                  </p>
                )}
                {error?.response?.data?.message && (
                  <p className="text-sm text-gray-500">
                    Details: {String(error.response.data.message)}
                  </p>
                )}
              </div>
              <Button onClick={handleRefresh} className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Unit Manager Dashboard</h1>
            {isFetching && !isLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
          </div>
          <p className="text-muted-foreground">Overview of operations and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="current-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="current-quarter">This Quarter</option>
            <option value="last-quarter">Last Quarter</option>
          </select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Orders */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overview.totalOrders || 0}</p>
                <p className="text-sm text-muted-foreground">
                  Total Orders
                  {overview.orderGrowth !== undefined && (
                    <span className={`ml-2 flex items-center ${getGrowthColor(overview.orderGrowth || 0)}`}>
                      {getGrowthIcon(overview.orderGrowth || 0)}
                      {Math.abs(overview.orderGrowth || 0)}%
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
      

        {/* Active Customers */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.total || 0}</p>
                <p className="text-sm text-muted-foreground">
                  Active Customers
                  {customers.growth !== undefined && (
                    <span className={`ml-2 flex items-center ${getGrowthColor(customers.growth || 0)}`}>
                      {getGrowthIcon(customers.growth || 0)}
                      {Math.abs(customers.growth || 0)}%
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Items */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inventory.totalItems || 0}</p>
                <p className="text-sm text-muted-foreground">
                  Inventory Items
                  {(inventory.lowStockCount || 0) > 0 && (
                    <span className="ml-2 text-red-600">
                      ({inventory.lowStockCount || 0} low stock)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.pendingOrders || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Orders */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.completedOrders || 0}</p>
                <p className="text-sm text-muted-foreground">Completed Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Production */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Factory className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.inProductionOrders || 0}</p>
                <p className="text-sm text-muted-foreground">In Production</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Batches per Production */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Factory className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingProductSummaries ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading
                    </span>
                  ) : (
                    formatBatches(totalApprovedBatchAdjusted)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Batches per Production</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        {/* <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(overview.averageOrderValue)}</p>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

   

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Order Status Distribution
            </CardTitle>
            <CardDescription>Current month order breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(orders.statusDistribution || {}).map(([status, count]) => {
                const total = Object.values(orders.statusDistribution || {}).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(status)}>
                          {status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card> */}

        {/* Top Inventory Categories */}
           {/* Approved Product Summaries Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Approved Product Summary Overview
            <Badge className="ml-2 bg-green-100 text-green-800">
              {productSummariesStats.totalApproved || 0} Available
            </Badge>
          </CardTitle>
          <CardDescription>
            Products with final batches available for production
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProductSummaries ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : productSummariesError ? (
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Unable to load product summaries</span>
            </div>
          ) : productSummaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No approved products with available batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    {/* <TableHead className="text-right">Qty Per Batch</TableHead> */}
                    <TableHead className="text-right">Batch Adjusted</TableHead>
                    {/* <TableHead className="text-right">Production Final Batches</TableHead> */}
                    {/* <TableHead className="text-right">Total Quantity</TableHead>
                    <TableHead className="text-right">Physical Stock</TableHead> */}
                    {/* <TableHead className="text-center">Status</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummaries.map((summary) => (
                    <TableRow key={summary.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          <div className="flex flex-col space-y-1">
                            <span>{summary.productName}</span>
                            {summary.productGroups && summary.productGroups.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {summary.productGroups.map((groupName, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    {groupName}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      {/* <TableCell className="text-right font-medium">
                        {summary.qtyPerBatch || 0}
                      </TableCell> */}
                      <TableCell className="text-right">
                        <span className={`font-medium ${summary.batchAdjusted > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {summary.batchAdjusted || 0}
                        </span>
                      </TableCell>
                      {/* <TableCell className="text-right">
                        <span className={`font-bold ${summary.productionFinalBatches > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {summary.productionFinalBatches || 0}
                        </span>
                      </TableCell> */}
                      {/* <TableCell className="text-right">
                        {summary.totalQuantity || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary.physicalStock || 0}
                      </TableCell> */}
                      {/* <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-800 capitalize">
                          {summary.status}
                        </Badge>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Sales Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Sales Team Performance
            </CardTitle>
            <CardDescription>Top performing sales personnel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(salesPersons || []).slice(0, 5).map((person, index) => (
                <div key={person._id || index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{person.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {person.totalOrders || 0} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(person.totalRevenue || 0)}</p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Monthly Trends */}
      {monthlyTrends && monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Monthly Trends
            </CardTitle>
            <CardDescription>Order and revenue trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Avg Order Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(monthlyTrends || []).map((trend, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {new Date(trend.year || 0, (trend.month || 1) - 1).toLocaleDateString('en-IN', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell className="text-right">{trend.orderCount || 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(trend.totalRevenue || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(trend.avgOrderValue || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}