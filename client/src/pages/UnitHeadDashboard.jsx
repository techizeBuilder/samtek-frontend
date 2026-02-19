import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Users,
  Calendar,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function UnitHeadDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const { toast } = useToast();

  // Period options for the dashboard
  const periodOptions = [
    { value: 'current-month', label: 'This Month', icon: Calendar },
    { value: 'current-quarter', label: 'This Quarter', icon: Calendar },
    { value: 'current-year', label: 'This Year', icon: Calendar }
  ];

  // Query for dashboard data with period parameter
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/unit-head/dashboard', selectedPeriod],
    queryFn: () => apiRequest('GET', `/api/unit-head/dashboard?period=${selectedPeriod}`),
    retry: 1,
    refetchInterval: 300000, // Refetch every 5 minutes
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch dashboard data",
        variant: "destructive"
      });
    }
  });

  // Query for inventory items (still needed for alternative data source)
  const { data: inventoryData } = useQuery({
    queryKey: ['/api/unit-head/inventory/items'],
    queryFn: () => apiRequest('GET', '/api/unit-head/inventory/items'),
    retry: 1,
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  const dashboard = dashboardData?.data || {};
  const inventory = inventoryData?.data || [];

  // Log debug info from API
  console.log('🎯 Dashboard Data received:', {
    monthlyOrders: dashboard.monthlyOrders,
    monthlyRevenue: dashboard.monthlyRevenue,
    todayIndentValue: dashboard.todayIndentValue,
    dispatchValue: dashboard.dispatchValue,
    salesTrendData: dashboard.salesTrendData,
    orders: dashboard.orders,
    _debug: dashboard._debug
  });

  // Use data from dashboard API which now includes everything
  const finishedGoodsItems = dashboard.finishedGoodsItems || [];
  const lowStockItems = dashboard.lowStockItems || [];
  const rawMaterialItems = dashboard.rawMaterialItems || [];
  const packingMaterialItems = dashboard.packingMaterialItems || [];
  const productionVsDispatchData = dashboard.productionVsDispatchData || [];
  const salesTrendData = dashboard.salesTrendData || [];
  const orders = dashboard.orders || [];

  const formatCurrency = (amount) => {
    // If amount is already very small (pre-formatted as Lakh), multiply back
    const actualAmount = (amount || 0) > 100000 ? amount : amount * 100000;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(actualAmount);
  };

  const getStockStatus = (current, minimum) => {
    if (current <= 0) return { label: 'Out of Stock', variant: 'destructive', icon: AlertCircle };
    if (current <= minimum) return { label: 'Low Stock', variant: 'secondary', icon: AlertTriangle };
    return { label: 'In Stock', variant: 'default', icon: CheckCircle };
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 sm:h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 sm:h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-3 sm:px-6 py-3 sm:py-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="truncate">Unit Head Dashboard</span>
            </h1>
            <p className="text-purple-100 mt-1 text-sm sm:text-base">
              Real-time overview of unit operations and performance metrics
            </p>
            {dashboard.unitLocation && (
              <div className="flex items-center gap-1 mt-2 text-purple-200">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate">{dashboard.unitLocation}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3 items-center flex-shrink-0">
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              className="bg-white text-purple-600 hover:bg-purple-50 px-2 sm:px-3"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Sales */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-1 sm:space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-xs text-gray-600 font-medium">Total Sales</CardTitle>
              <div className="text-base sm:text-lg font-bold line-clamp-2">{formatCurrency(dashboard.monthlyRevenue)}</div>
            </div>
            <div className="flex items-center gap-1 mt-1 sm:mt-0">
              <span className="text-xs text-green-600 font-medium">{dashboard.monthlyOrders || 0}</span>
              <span className="text-xs text-gray-500">units</span>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600 font-medium">Green</p>
            </div>
          </CardContent>
        </Card>

        {/* Damage Returns */}
        <Card className={`border-l-4 ${dashboard.damageReturnsValue > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-1 sm:space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-xs text-gray-600 font-medium">Damage Returns</CardTitle>
              <div className="text-base sm:text-lg font-bold line-clamp-2">{formatCurrency(dashboard.damageReturnsValue)}</div>
            </div>
            <div className="flex items-center gap-1 mt-1 sm:mt-0">
              <span className={`text-xs font-medium ${dashboard.damageReturnsValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {dashboard.damageReturnsPacks || 0}
              </span>
              <span className="text-xs text-gray-500">packs</span>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
            <div className="flex items-center gap-1">
              {dashboard.damageReturnsValue > 0 ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  <p className="text-xs text-red-600 font-medium">Error</p>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <p className="text-xs text-green-600 font-medium">Green</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today Indent */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-1 sm:space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-xs text-gray-600 font-medium">Today Indent</CardTitle>
              <div className="text-base sm:text-lg font-bold line-clamp-2">{formatCurrency(dashboard.todayIndentValue)}</div>
            </div>
            <div className="flex items-center gap-1 mt-1 sm:mt-0">
              <span className="text-xs text-green-600 font-medium">{dashboard.todayIndentPacks || 0}</span>
              <span className="text-xs text-gray-500">packs</span>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600 font-medium">Green</p>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Value */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-1 sm:space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-xs text-gray-600 font-medium">Dispatch Value</CardTitle>
              <div className="text-base sm:text-lg font-bold line-clamp-2">{formatCurrency(dashboard.dispatchValue)}</div>
            </div>
            <div className="flex items-center gap-1 mt-1 sm:mt-0">
              <span className="text-xs text-green-600 font-medium">{dashboard.dispatchPacks || 0}</span>
              <span className="text-xs text-gray-500">packs</span>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600 font-medium">Green</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
        {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Production vs Dispatch Chart */}
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg">Production vs Dispatch</CardTitle>
            <CardDescription className="text-xs mt-1">Last 7 days comparison</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {productionVsDispatchData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No production data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productionVsDispatchData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.1)' }} formatter={(value) => value.toFixed(2)} />
                  <Legend />
                  <Bar dataKey="production" fill="#3b82f6" name="Production" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="dispatch" fill="#10b981" name="Dispatch" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales Trend Chart */}
        <Card>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-base sm:text-lg">Sales Trend - Last 7 Days</CardTitle>
            <CardDescription className="text-xs mt-1">Daily sales by sales persons</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {salesTrendData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No sales data available</p>
              </div>
            ) : (
              <>
                {/* Desktop Chart View */}
                <div className="hidden sm:block">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        label={{ value: 'Day', position: 'insideBottomRight', offset: -5 }}
                      />
                      <YAxis 
                        yAxisId="left"
                        label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        label={{ value: 'Orders', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }}
                        formatter={(value, name) => {
                          if (name === 'Sales') return [value.toLocaleString(), `₹${value.toLocaleString()}`];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Day: ${label}`}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#10b981" 
                        name="Sales (₹)"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="orders" 
                        stroke="#3b82f6" 
                        name="Orders"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3">
                  {/* Mobile Summary Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <p className="text-xs text-gray-600 font-medium">Total Sales</p>
                      <p className="text-lg font-bold text-green-600">
                        ₹{salesTrendData.reduce((sum, item) => sum + (item.sales || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-xs text-gray-600 font-medium">Total Orders</p>
                      <p className="text-lg font-bold text-blue-600">
                        {salesTrendData.reduce((sum, item) => sum + (item.orders || 0), 0)}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Daily Breakdown */}
                  {salesTrendData.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-gray-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{item.day}</p>
                          <p className="text-xs text-gray-500">{item.date}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">{item.orders || 0} orders</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
                        <div>
                          <p className="text-gray-600">Total Sales</p>
                          <p className="font-bold text-green-600">{(item.sales || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">In Lakhs</p>
                          <p className="font-bold text-blue-600">{item.salesInLakhs?.toFixed(2) || 0}L</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Finished Goods Stock Section */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base sm:text-lg">Finished Goods Stock</CardTitle>
            {finishedGoodsItems.length > 0 && (
              <span className="text-xs text-gray-500">{finishedGoodsItems.length} items</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {finishedGoodsItems.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No finished goods inventory data available</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto max-h-96 overflow-y-auto">
                <Table className="text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center">Packs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finishedGoodsItems.map((item) => {
                      const qty = item.productId?.qty || item.qtyPerBatch || 0;
                      const minStock = item.productId?.minStock || 0;
                      const name = item.productId?.name || item.productName || 'Unknown';
                      const status = getStockStatus(qty, minStock);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={item._id}>
                          <TableCell className="font-medium">{name}</TableCell>
                          <TableCell className="text-center font-semibold">{qty?.toLocaleString() || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {finishedGoodsItems.map((item) => {
                  const qty = item.productId?.qty || item.qtyPerBatch || 0;
                  const minStock = item.productId?.minStock || 0;
                  const name = item.productId?.name || item.productName || 'Unknown';
                  const status = getStockStatus(qty, minStock);
                  return (
                    <div key={item._id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{name}</p>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <p className="font-semibold text-gray-700">{qty?.toLocaleString() || 0}</p>
                        <p className="text-xs text-gray-500">packs</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Items & Packing Material Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Items Alert Section */}
          <Card className="border-l-4 border-l-red-500 bg-red-50">
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <CardTitle className="text-base sm:text-lg text-red-800">
                    Raw Material - Low Stock Alert !
                  </CardTitle>
                </div>
                <Badge className="text-xs bg-red-600 text-white">URGENT</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto max-h-96 overflow-y-auto">
                <Table className="text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center">Current</TableHead>
                      <TableHead className="text-center">Min Stock</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => {
                      const qty = item.productId?.qty || item.qtyPerBatch || 0;
                      const minStock = item.productId?.minStock || 0;
                      const name = item.productId?.name || item.productName || 'Unknown';
                      const unit = item.productId?.unit || 'units';
                      return (
                        <TableRow key={item._id} className="bg-white hover:bg-red-50">
                          <TableCell className="font-medium text-gray-900">{name}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-red-600">{qty?.toLocaleString() || 0}</span>
                            <span className="text-xs text-gray-600 ml-1">{unit}</span>
                          </TableCell>
                          <TableCell className="text-center text-gray-700">{minStock?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-xs ${qty <= 0 ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                              {qty <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {lowStockItems.map((item) => {
                  const qty = item.productId?.qty || item.qtyPerBatch || 0;
                  const minStock = item.productId?.minStock || 0;
                  const name = item.productId?.name || item.productName || 'Unknown';
                  const unit = item.productId?.unit || 'units';
                  return (
                    <div key={item._id} className="bg-white p-3 rounded border border-red-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm text-gray-900 flex-1">{name}</p>
                        <Badge className={`text-xs ml-2 ${qty <= 0 ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                          {qty <= 0 ? 'OUT' : 'LOW'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-600">Current</p>
                          <p className="font-bold text-red-600">{qty?.toLocaleString() || 0} {unit}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Min Stock</p>
                          <p className="font-bold text-gray-700">{minStock?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
    

        {/* Packing Material Section */}
        <Card className={`border-l-4 ${packingMaterialItems.length > 0 ? 'border-l-orange-500 bg-orange-50' : 'border-l-green-500 bg-green-50'}`}>
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${packingMaterialItems.length > 0 ? 'text-orange-600' : 'text-green-600'}`} />
              <CardTitle className={`text-base sm:text-lg ${packingMaterialItems.length > 0 ? 'text-orange-800' : 'text-green-800'}`}>
                Packing Material {packingMaterialItems.length > 0 ? `- ${packingMaterialItems.length} Items Low` : ''}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-3">
            {packingMaterialItems.length === 0 ? (
              <div className="text-center py-4 text-gray-600">
                <p className="text-sm">All packing materials are in stock</p>
              </div>
            ) : (
              packingMaterialItems.map((item) => {
                const name = item.productId?.name || item.productName || 'Unknown';
                const qty = item.productId?.qty || item.qtyPerBatch || 0;
                const minStock = item.productId?.minStock || 0;
                const unit = item.productId?.unit || 'units';
                return (
                  <div key={item._id} className="flex items-center justify-between bg-white p-3 rounded border border-orange-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{name}</p>
                      <p className="text-xs text-gray-600">Min Level: {minStock?.toLocaleString()} {unit}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-bold text-orange-600">{qty?.toLocaleString() || 0}</p>
                      <Badge className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100">LOW STOCK</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw Material - Low Stock Alert Section */}
      {rawMaterialItems.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <CardTitle className="text-base sm:text-lg text-red-800">
                  Raw Material - Low Stock Alert - {rawMaterialItems.length} Items
                </CardTitle>
              </div>
              <Badge className="text-xs bg-red-600 text-white">URGENT</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="space-y-3">
              {rawMaterialItems.map((item) => (
                <div key={item._id} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-600">Min Level: {item.minStock?.toLocaleString()} {item.unit}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <p className="font-bold text-red-600">{item.qty?.toLocaleString() || 0}</p>
                    <Badge className="text-xs bg-red-100 text-red-800 hover:bg-red-100">LOW STOCK</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    
    </div>
  );
};