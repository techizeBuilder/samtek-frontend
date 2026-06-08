import React, { useState, useEffect } from 'react';
import { Factory, RefreshCw, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#49A7F5', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

const STATUS_COLORS = {
  completed: '#34D399', in_production: '#49A7F5', approved: '#06B6D4',
  pending: '#F59E0B', pending_service_approval: '#F97316',
  cancelled: '#EF4444', rejected: '#8B5CF6', rejected_by_service: '#EC4899'
};

const STATUS_LABELS = {
  completed: 'Completed', in_production: 'In Production', approved: 'Approved',
  pending: 'Pending', pending_service_approval: 'Awaiting Service Approval',
  cancelled: 'Cancelled', rejected: 'Rejected', rejected_by_service: 'Rejected by Service'
};

export default function MISProductionReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`${API_BASE}/mis/production-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Server is taking too long to respond. Please try again.');
      } else {
        setError(err.message);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const trendData = data?.orderTrend?.map(m => ({
    month: MONTH_NAMES[m._id.month - 1],
    orders: m.count
  })) || [];

  const pieData = data?.ordersByStatus?.map(s => ({
    name: STATUS_LABELS[s._id] || s._id,
    rawStatus: s._id,
    value: s.count
  })) || [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.summary || {};
  const completionRate = s.total > 0 ? ((s.completed / s.total) * 100).toFixed(1) : 0;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Factory size={24} className="text-[#49A7F5]" />Production Summary</h1>
          <p className="text-sm text-gray-500">Order fulfillment and production overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-[#49A7F5] text-white rounded-lg text-sm hover:bg-[#3d96e4]"><RefreshCw size={14} /> Apply</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-2"><AlertTriangle size={18}/>{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: s.total || 0, color: '#49A7F5' },
          { label: 'Completed / Delivered', value: s.completed || 0, color: '#16A34A' },
          { label: 'Pending / In Progress', value: s.pending || 0, color: '#D97706' },
          { label: 'Completion Rate', value: `${completionRate}%`, color: '#8B5CF6' }
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Order Volume</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#49A7F5" name="Orders" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Order Status Breakdown</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.rawStatus] || COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      {data?.recentOrders?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Recent Orders</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Order ID</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{o._id?.toString().slice(-8).toUpperCase()}</td>
                    <td className="px-5 py-3 text-gray-800">{o.customer?.name || 'N/A'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: `${STATUS_COLORS[o.status] || '#6B7280'}20`, color: STATUS_COLORS[o.status] || '#6B7280' }}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
