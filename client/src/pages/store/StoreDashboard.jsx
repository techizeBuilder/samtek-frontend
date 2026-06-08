import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useNavigate } from 'react-router-dom';

const StoreDashboard = () => {
  const navigate = useNavigate();

  // Fetch order tracking data (company-scoped on backend)
  const { data: trackingResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders/get-tracking'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/get-tracking');
      return response;
    }
  });

  // Fetch inventory stats (company-scoped on backend)
  const { data: inventoryResponse, isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/inventory/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/inventory/stats');
      return response;
    }
  });

  const isLoading = ordersLoading || inventoryLoading;

  // --- Order derived values ---
  const orders = Array.isArray(trackingResponse?.data)
    ? trackingResponse.data
    : (Array.isArray(trackingResponse) ? trackingResponse : []);

  const summary = trackingResponse?.summary || {};

  const storeOrders = orders.filter(item => item.gatePass?.status === 'Generated');
  const pendingDispatch = orders.filter(item =>
    (item.orderStatus === 'approved' || item.orderStatus === 'pending' || item.paymentStatus === 'Paid') &&
    item.gatePass?.status !== 'Generated'
  );
  const completedToday = summary.completedToday ?? 0;
  const recentlyAdded = storeOrders.slice(0, 5);

  // --- Inventory derived values ---
  const invStats = inventoryResponse?.stats || {};
  const typeStats = inventoryResponse?.typeStats || [];
  const categoryQtyStats = inventoryResponse?.categoryQtyStats || [];

  // Build inventory overview bars from real data
  const totalQtyAll = typeStats.reduce((sum, t) => sum + (t.totalQty || 0), 0) || 1;

  // Try to map to known groups, fallback to actual type names
  const TYPE_LABELS = {
    'Material': { label: 'Raw Materials', color: 'bg-blue-400' },
    'Product': { label: 'Finished Goods', color: 'bg-emerald-400' },
    'Spares': { label: 'Spares', color: 'bg-amber-400' },
    'Assemblies': { label: 'Assemblies', color: 'bg-purple-400' }
  };

  const inventoryBars = typeStats.length > 0
    ? typeStats.map(t => {
        const mapped = TYPE_LABELS[t._id] || { label: t._id || 'Other', color: 'bg-slate-400' };
        const pct = totalQtyAll > 0 ? Math.round((t.totalQty / totalQtyAll) * 100) : 0;
        return { label: mapped.label, val: pct, count: t.count, totalQty: t.totalQty, color: mapped.color };
      })
    : [
        { label: 'No Inventory Data', val: 0, count: 0, totalQty: 0, color: 'bg-slate-400' }
      ];

  const stats = [
    {
      title: 'Total Store Orders',
      value: isLoading ? '...' : storeOrders.length,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      description: 'Orders with approved Gate Pass'
    },
    {
      title: 'Pending Dispatch',
      value: isLoading ? '...' : pendingDispatch.length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      description: 'Approved orders awaiting dispatch'
    },
    {
      title: 'Completed Today',
      value: isLoading ? '...' : completedToday,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      description: 'Gate passes generated today'
    }
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Store Dashboard
        </h1>
        <p className="text-slate-500">Welcome back! Here's what's happening in the store today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-500">{stat.title}</div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inventory Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {inventoryLoading ? '...' : (invStats.totalItems ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">Total Inventory Items</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {inventoryLoading ? '...' : (invStats.lowStockCount ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">Low Stock Alerts</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-teal-50 text-teal-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">
                {inventoryLoading ? '...' : `₹${((invStats.totalValue ?? 0) / 100000).toFixed(1)}L`}
              </div>
              <div className="text-xs text-slate-500">Total Inventory Value</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Store Orders */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Recent Store Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {ordersLoading ? (
                <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading data...
                </div>
              ) : recentlyAdded.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No recent store orders</div>
              ) : recentlyAdded.map((order, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {(order.orderCode || 'OR').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{order.orderCode}</div>
                      <div className="text-xs text-slate-500">{order.customerName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">₹{(order.totalAmount || 0).toLocaleString()}</div>
                    <div className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">
                      {order.gatePass?.gatePassNumber || 'GP Issued'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Overview — Dynamic */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6">
          <div className="h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-bold">Inventory Overview</h3>
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-slate-400 text-sm mb-6">Current stock breakdown by item type.</p>

              {inventoryLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading inventory...
                </div>
              ) : (
                <div className="space-y-4">
                  {inventoryBars.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-slate-300">
                        <span>{item.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-slate-400 normal-case font-normal">
                            {item.totalQty != null ? `${item.totalQty} qty` : ''}
                            {item.count != null ? ` · ${item.count} items` : ''}
                          </span>
                          <span>{item.val}%</span>
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-700`}
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-sm transition-colors"
              onClick={() => navigate('/store/inventory')}
            >
              View Detailed Stock
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StoreDashboard;
