import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, RefreshCw, Search, PackageSearch } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#49A7F5', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];

const fmt = (n) => {
  if (!n && n !== 0) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

// A fabrication item's real stock is per-size (dimensionVariants[].subStock),
// not the flat qty field — shows the item's own qty next to the real total,
// plus how many of its sizes are actually below reorder point.
function QtyCell({ item }) {
  if (!item.isFabrication) return <span className="font-bold text-red-500">{item.effectiveQty}</span>;
  return (
    <span>
      <span className="font-bold text-red-500">{item.effectiveQty}</span>
      <span className="text-[11px] text-gray-400 block">{item.lowVariantCount} of {item.variantCount} sizes low</span>
    </span>
  );
}

export default function MISInventoryReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productCode, setProductCode] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (productCode.trim()) params.append('productCode', productCode.trim());
      const res = await fetch(`${API_BASE}/mis/inventory-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch inventory report');
      const json = await res.json();
      setData(json.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.summary || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package size={24} className="text-[#49A7F5]" />Inventory Reports</h1>
          <p className="text-sm text-gray-500">Stock levels, value analysis and alerts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={productCode}
              onChange={e => setProductCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchData(); }}
              placeholder="Item code (any kind)"
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-48"
            />
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-2"><AlertTriangle size={18}/>{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: s.totalItems || 0, color: '#49A7F5' },
          { label: 'Total Stock Value', value: fmt(s.totalValue), color: '#16A34A', sub: s.costGapCount > 0 ? `${s.costGapCount} items have no cost set — excluded` : null },
          { label: 'Low Stock Items', value: s.lowStockCount || 0, color: '#D97706' },
          { label: 'Critical Items', value: s.criticalCount || 0, color: '#EF4444' }
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
            {item.sub && <p className="text-[11px] text-amber-600 mt-1">{item.sub}</p>}
          </div>
        ))}
      </div>

      {/* Inventory by Code — mirrors Sales/Production Report's own lookup */}
      {data?.inventoryByCode && (
        <div className="bg-white rounded-xl border-2 border-[#49A7F5]/30 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2">
            <PackageSearch size={18} className="text-[#49A7F5]" />
            <h3 className="font-semibold text-gray-700">Inventory for "{productCode}"</h3>
          </div>
          {data.inventoryByCode.matched.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No item matches code "{productCode}".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Item Name</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Code</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Source</th>
                    <th className="text-right px-5 py-3 text-gray-500 font-medium">Qty</th>
                    <th className="text-right px-5 py-3 text-gray-500 font-medium">Value</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventoryByCode.matched.map((item, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">{item.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                      <td className="px-5 py-3 text-gray-600">{item.source}</td>
                      <td className="px-5 py-3 text-right"><QtyCell item={item} /></td>
                      <td className="px-5 py-3 text-right font-semibold text-[#49A7F5]">{item.stdCost > 0 ? fmt(item.effectiveQty * item.stdCost) : <span className="text-gray-400 font-normal text-xs">No cost set</span>}</td>
                      <td className="px-5 py-3">
                        {item.isLow ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Low Stock</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data?.sourceBreakdown?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Stock Value by Source</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.sourceBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v} />
                <YAxis dataKey="_id" type="category" tick={{ fontSize: 10 }} width={130} />
                <Tooltip formatter={v => fmt(v)} />
                <Bar dataKey="totalValue" fill="#49A7F5" name="Value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data?.typeBreakdown?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Item Type Breakdown</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.typeBreakdown} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="_id"
                  label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.typeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Low Stock Alerts */}
      {data?.lowStockItems?.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="font-semibold text-amber-800">Low Stock Alerts ({s.lowStockCount} items{s.lowStockCount > data.lowStockItems.length ? `, showing ${data.lowStockItems.length}` : ''})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Item Name</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Code</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Current Qty</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Min Required</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Source</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map((item, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                    <td className="px-5 py-3 text-right"><QtyCell item={item} /></td>
                    <td className="px-5 py-3 text-right text-gray-600">{item.isFabrication ? '—' : item.minStock}</td>
                    <td className="px-5 py-3 text-gray-600">{item.source}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.importance === 'Critical' ? 'bg-red-100 text-red-700' : item.importance === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.importance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* High Value Items */}
      {data?.highValueItems?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-700">High Value Items</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Item Name</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Code</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Source</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Qty</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Unit Cost</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.highValueItems.map((item, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                    <td className="px-5 py-3 text-gray-600">{item.source}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{item.effectiveQty}</td>
                    <td className="px-5 py-3 text-right text-[#49A7F5] font-semibold">{fmt(item.stdCost)}</td>
                    <td className="px-5 py-3 text-right font-bold text-green-600">{fmt(item.value)}</td>
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
