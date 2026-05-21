import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const StoreDashboard = () => {
  const { data: trackingData, isLoading } = useQuery({
    queryKey: ['/api/orders/get-tracking'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders/get-tracking');
      return response.data;
    }
  });

  const orders = Array.isArray(trackingData) ? trackingData : (trackingData?.data || []);
  
  // Filter for orders that have a gate pass (Store Orders)
  const storeOrders = orders.filter(item => item.gatePass?.status === 'Generated');
  const pendingDispatch = storeOrders.length;
  const recentlyAdded = storeOrders.slice(0, 5);

  const stats = [
    {
      title: 'Total Store Orders',
      value: storeOrders.length,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      description: 'Orders with approved Gate Pass'
    },
    {
      title: 'Pending Dispatch',
      value: pendingDispatch,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      description: 'Waiting for final movement'
    },
    {
      title: 'Completed Today',
      value: '0',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      description: 'Successfully dispatched'
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : stat.value}</div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Recent Store Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400">Loading data...</div>
              ) : recentlyAdded.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No recent store orders</div>
              ) : recentlyAdded.map((order, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">
                      {order.orderCode?.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{order.orderCode}</div>
                      <div className="text-xs text-slate-500">{order.customerName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">₹{order.totalAmount?.toLocaleString()}</div>
                    <div className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">{order.gatePass?.gatePassNumber}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6">
          <div className="h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Inventory Overview</h3>
              <p className="text-slate-400 text-sm mb-6">Current stock status and movement analytics.</p>
              
              <div className="space-y-4">
                {[
                  { label: 'Raw Materials', val: 75, color: 'bg-blue-400' },
                  { label: 'Finished Goods', val: 92, color: 'bg-emerald-400' },
                  { label: 'Packaging Materials', val: 45, color: 'bg-amber-400' }
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-slate-300">
                      <span>{item.label}</span>
                      <span>{item.val}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-sm transition-colors">
              View Detailed Stock
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StoreDashboard;

