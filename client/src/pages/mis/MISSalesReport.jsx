import React, { useState, useEffect } from 'react';
import { TrendingUp, IndianRupee, FileText, AlertTriangle, RefreshCw, Download, Search, PackageSearch } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#49A7F5', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

const fmt = (n) => {
  if (!n && n !== 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

function SummaryCard({ title, value, sub, color = '#49A7F5' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function MISSalesReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [productCode, setProductCode] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (productCode.trim()) params.append('productCode', productCode.trim());
      const res = await fetch(`${API_BASE}/mis/sales-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch sales report');
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const monthlyChartData = data?.monthlyTrend?.map(m => ({
    month: MONTH_NAMES[m._id.month - 1],
    revenue: m.revenue,
    paid: m.paid,
    invoices: m.invoiceCount
  })) || [];

  const paymentPieData = data?.paymentStatusBreakdown?.map(p => ({
    name: p._id || 'Unknown',
    value: p.count,
    amount: p.amount
  })) || [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading sales report...</p>
      </div>
    </div>
  );

  const s = data?.summary || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={24} className="text-[#49A7F5]" />
            Sales Reports
          </h1>
          <p className="text-sm text-gray-500">Complete sales performance overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={productCode}
              onChange={e => setProductCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchData(); }}
              placeholder="Product code (Product/Motor Master)"
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-56"
            />
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-[#49A7F5] text-white rounded-lg text-sm hover:bg-[#3d96e4] transition-colors">
            <RefreshCw size={14} /> Apply
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-600">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Invoices" value={s.totalInvoices || 0} sub="All time invoices" />
        <SummaryCard title="Total Sales Amount" value={fmt(s.totalAmount)} sub="Gross revenue" color="#16A34A" />
        <SummaryCard title="Total Collected" value={fmt((s.totalPaid || 0) + (s.totalAdvance || 0))} sub="Paid + Advance" color="#0891B2" />
        <SummaryCard title="Balance Pending" value={fmt(s.totalBalance)} sub="Outstanding amount" color="#EF4444" />
      </div>

      {/* Product Sales (by code) — Product Master / Motor Master only */}
      {data?.productSales && (
        <div className="bg-white rounded-xl border-2 border-[#49A7F5]/30 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2">
            <PackageSearch size={18} className="text-[#49A7F5]" />
            <h3 className="font-semibold text-gray-700">Product Sales — "{productCode}"</h3>
          </div>
          {data.productSales.matchedItems.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No Product Master / Motor Master item matches code "{productCode}".</p>
          ) : (
            <div className="p-5 space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-400">Matched:</span>
                {data.productSales.matchedItems.map((it, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-[#3d96e4] rounded-full text-xs font-medium">
                    {it.name} ({it.code}) — {it.productKind === 'Machine' ? 'Product Master' : 'Motor Master'}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard title="Qty Sold" value={data.productSales.totalQty} sub="Selected period" />
                <SummaryCard title="Revenue" value={fmt(data.productSales.totalRevenue)} sub="Selected period" color="#16A34A" />
              </div>

              {data.productSales.monthlyTrend.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Monthly Trend</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Month</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Qty</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.productSales.monthlyTrend.map((m, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-4 py-2 text-gray-700">{MONTH_NAMES[m._id.month - 1]} {m._id.year}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{m.qty}</td>
                            <td className="px-4 py-2 text-right font-semibold text-[#49A7F5]">{fmt(m.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.productSales.topCustomers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Top Customers for this Product</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-500 font-medium">Customer</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Qty</th>
                          <th className="text-right px-4 py-2 text-gray-500 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.productSales.topCustomers.map((c, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-800">{c.customerName}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{c.qty}</td>
                            <td className="px-4 py-2 text-right font-semibold text-green-600">{fmt(c.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Overdue Alert */}
      {data?.overdueInvoices?.count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">Overdue Invoices Alert</p>
            <p className="text-sm text-amber-700">
              {data.overdueInvoices.count} invoices overdue — {fmt(data.overdueInvoices.total)} pending collection
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Revenue Trend</h3>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v} />
                <Tooltip formatter={(v, n) => [n === 'invoices' ? v : fmt(v), n === 'revenue' ? 'Revenue' : n === 'paid' ? 'Collected' : 'Invoices']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#49A7F5" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
                <Line type="monotone" dataKey="paid" stroke="#34D399" strokeWidth={2} dot={{ r: 4 }} name="Collected" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data for selected period</div>
          )}
        </div>

        {/* Payment Status Pie */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Payment Status Distribution</h3>
          {paymentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ top: 24, right: 32, bottom: 8, left: 32 }}>
                <Pie data={paymentPieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {paymentPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n, p) => [v, p.payload.name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data available</div>
          )}
        </div>
      </div>

      {/* Top Customers Table */}
      {data?.topCustomers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Top Customers by Revenue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Customer</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Total Revenue</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{c.customerName}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-600">{fmt(c.totalAmount)}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{c.invoices}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products Table */}
      {data?.salesByProduct?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Top Products by Revenue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Product</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Qty Sold</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.salesByProduct.map((p, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{p._id}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{p.totalQty}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#49A7F5]">{fmt(p.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Stats */}
      {data?.leadStats?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Lead Funnel Summary</h3>
          <div className="flex flex-wrap gap-3">
            {data.leadStats.map((l, i) => (
              <div key={i} className="px-4 py-3 rounded-lg border border-gray-100 bg-gray-50 text-center min-w-[120px]">
                <p className="text-2xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{l.count}</p>
                <p className="text-xs text-gray-500 mt-1">{l._id || 'Unknown'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
