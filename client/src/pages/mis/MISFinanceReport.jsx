import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#49A7F5', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
const AGEING_COLORS = { '0-30 days': '#34D399', '31-60 days': '#F59E0B', '61-90 days': '#F97316', '90+ days': '#EF4444' };

const fmt = (n) => {
  if (!n && n !== 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

export default function MISFinanceReport() {
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
      const res = await fetch(`${API_BASE}/mis/finance-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch finance report');
      const json = await res.json();
      setData(json.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const monthChartData = data?.revenueByMonth?.map(m => ({
    month: MONTH_NAMES[m._id.month - 1],
    revenue: m.totalAmount,
    collected: m.paidAmount,
    pending: m.balance,
    count: m.count
  })) || [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  );

  const o = data?.overall || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator size={24} className="text-[#49A7F5]" />
            Finance Reports
          </h1>
          <p className="text-sm text-gray-500">Revenue, collections, GST & ageing analysis</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-[#49A7F5] text-white rounded-lg text-sm hover:bg-[#3d96e4]">
            <RefreshCw size={14} /> Apply
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-2"><AlertTriangle size={18}/>{error}</div>}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(o.totalRevenue), color: '#16A34A' },
          { label: 'Total Collected', value: fmt(o.totalCollected), color: '#0891B2' },
          { label: 'Total Pending', value: fmt(o.totalPending), color: '#EF4444' },
          { label: 'Total Tax', value: fmt(o.totalTax), color: '#8B5CF6' }
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Bar Chart */}
      {monthChartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Revenue vs Collection</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#49A7F5" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" fill="#34D399" name="Collected" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" fill="#F59E0B" name="Pending" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ageing Report */}
        {data?.ageingReport?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Receivable Ageing</h3>
            <div className="space-y-3">
              {data.ageingReport.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: `${Object.values(AGEING_COLORS)[i % 4]}15` }}>
                  <div>
                    <p className="font-medium text-gray-700">{a._id}</p>
                    <p className="text-xs text-gray-500">{a.count} invoices</p>
                  </div>
                  <p className="font-bold text-lg" style={{ color: Object.values(AGEING_COLORS)[i % 4] }}>{fmt(a.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GST Summary */}
        {data?.gstSummary?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">GST / Tax Summary</h3>
            <div className="space-y-3">
              {data.gstSummary.map((g, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-700">{g._id || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{g.count} invoices</p>
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-gray-500">Tax: <span className="font-semibold text-gray-700">{fmt(g.totalTax)}</span></span>
                    <span className="text-gray-500">TDS: <span className="font-semibold text-gray-700">{fmt(g.totalTds)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Method Breakdown */}
        {data?.paymentMethodBreakdown?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Payment Methods</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.paymentMethodBreakdown} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="_id"
                  label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.paymentMethodBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Invoice Type Split */}
        {data?.invoiceTypeSplit?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Invoice Type (Pakka / Kachha)</h3>
            <div className="space-y-3">
              {data.invoiceTypeSplit.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-700">{t._id || 'Not Specified'}</p>
                    <p className="text-xs text-gray-500">{t.count} invoices</p>
                  </div>
                  <p className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>{fmt(t.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
