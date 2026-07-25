import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#34D399', '#EF4444', '#49A7F5', '#F59E0B', '#8B5CF6'];
const STATUS_COLORS = { Delivered: '#34D399', Processing: '#49A7F5', Pending: '#F59E0B', Cancelled: '#EF4444', Returned: '#8B5CF6' };

export default function MISQualityReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const res = await fetch(`${API_BASE}/mis/quality-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch quality report');
      const json = await res.json();
      setData(json.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const trendData = data?.qualityTrend?.map(m => ({
    month: MONTH_NAMES[m._id.month - 1],
    total: m.total,
    delivered: m.delivered,
    returned: m.returned
  })) || [];

  const formatStatusLabel = (name) => (name || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const pieData = data?.orderStatusBreakdown?.map(s => ({ name: formatStatusLabel(s._id), value: s.count })) || [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.summary || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={24} className="text-[#49A7F5]" />Quality Reports</h1>
          <p className="text-sm text-gray-500">Fulfillment rate, returns and delivery quality metrics</p>
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
          { label: 'Total Orders', value: s.totalOrders || 0, color: '#49A7F5' },
          { label: 'Delivered Orders', value: s.deliveredOrders || 0, color: '#16A34A' },
          { label: 'Returned Orders', value: s.returnedOrders || 0, color: '#EF4444' },
          { label: 'Fulfillment Rate', value: `${s.fulfillmentRate || 0}%`, color: '#8B5CF6' }
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
            {item.label === 'Returned Orders' && s.returnRate && (
              <p className="text-xs text-gray-400 mt-1">{s.returnRate}% return rate</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Delivery vs Return Trend</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#49A7F5" strokeWidth={2} dot={{ r: 4 }} name="Total" />
                <Line type="monotone" dataKey="delivered" stroke="#34D399" strokeWidth={2} dot={{ r: 4 }} name="Delivered" />
                <Line type="monotone" dataKey="returned" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} name="Returned" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Order Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ top: 24, right: 32, bottom: 8, left: 32 }}>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>
      </div>
    </div>
  );
}
