import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  TrendingUp, ShoppingCart, Users, AlertTriangle, IndianRupee, Package,
  MessageSquare, CheckCircle, Clock, RefreshCw, Building2, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#49A7F5', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

const fmt = (n) => {
  if (!n && n !== 0) return '0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

function KPICard({ title, value, subtitle, icon: Icon, color = '#49A7F5', bg = '#EBF5FF' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function MISDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/mis/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const chartData = data?.monthlyRevenue?.map(m => ({
    month: MONTH_NAMES[(m._id.month - 1)],
    revenue: m.revenue,
    orders: m.orders
  })) || [];

  const pieData = data?.paymentBreakdown?.map(p => ({
    name: p._id || 'Unknown',
    value: p.count
  })) || [];

  const leadData = data?.leadStatusBreakdown?.map(l => ({
    name: l._id || 'Unknown',
    value: l.count
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="text-red-500">{error}</p>
        <button onClick={fetchData} className="text-[#49A7F5] text-sm flex items-center gap-1 hover:underline">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">MIS Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Building2 size={14} />
            {user?.company?.name || 'Company Overview'}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={fmt(kpis.totalRevenue)}
          subtitle={`${fmt(kpis.revenueThisMonth)} this month`}
          icon={IndianRupee}
          color="#16A34A"
          bg="#DCFCE7"
        />
        <KPICard
          title="Pending Payments"
          value={fmt(kpis.pendingPayments)}
          subtitle="Outstanding dues"
          icon={Clock}
          color="#D97706"
          bg="#FEF3C7"
        />
        <KPICard
          title="Total Orders"
          value={kpis.totalOrders?.toLocaleString() || '0'}
          subtitle={`${kpis.ordersThisMonth || 0} this month`}
          icon={ShoppingCart}
          color="#49A7F5"
          bg="#EBF5FF"
        />
        <KPICard
          title="Pending Orders"
          value={kpis.pendingOrders?.toLocaleString() || '0'}
          subtitle="Awaiting fulfillment"
          icon={Package}
          color="#8B5CF6"
          bg="#EDE9FE"
        />
        <KPICard
          title="Total Leads"
          value={kpis.totalLeads?.toLocaleString() || '0'}
          subtitle={`${kpis.convertedLeads || 0} converted`}
          icon={Users}
          color="#0891B2"
          bg="#E0F2FE"
        />
        <KPICard
          title="Conversion Rate"
          value={`${kpis.leadConversionRate || 0}%`}
          subtitle="Lead to sale"
          icon={TrendingUp}
          color="#16A34A"
          bg="#DCFCE7"
        />
        <KPICard
          title="Open Complaints"
          value={kpis.openComplaints?.toLocaleString() || '0'}
          subtitle={`${kpis.totalComplaints || 0} total`}
          icon={MessageSquare}
          color="#EF4444"
          bg="#FEE2E2"
        />
        <KPICard
          title="Resolved"
          value={kpis.resolvedComplaints?.toLocaleString() || '0'}
          subtitle="Complaints resolved"
          icon={CheckCircle}
          color="#16A34A"
          bg="#DCFCE7"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Revenue & Orders Trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v} />
                <Tooltip formatter={(v, n) => [n === 'revenue' ? fmt(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                <Legend />
                <Bar dataKey="revenue" fill="#49A7F5" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" fill="#34D399" name="Orders" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data available</div>
          )}
        </div>

        {/* Payment Status Pie */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Payment Status Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* Lead Status Chart */}
      {leadData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Lead Status Overview</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={leadData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
              <Tooltip />
              <Bar dataKey="value" fill="#8B5CF6" name="Leads" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
