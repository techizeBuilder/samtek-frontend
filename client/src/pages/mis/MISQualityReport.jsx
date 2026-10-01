import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle, Search, PackageSearch } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SOURCE_LABELS = {
  Purchase: 'Purchase (Goods Receiving)',
  Store: 'Store',
  Stock: 'Stock Build',
  QC_Rejected: 'Rework/Repair',
  Production: 'Production (Machine)',
  ChildPartProduction: 'Child Part',
  SubChildPartProduction: 'Sub Child Part',
  SubChildPartJobWork: 'Sub Child Part (Outsourced)'
};

function pct(num, den) {
  return den > 0 ? ((num / den) * 100).toFixed(1) : '0.0';
}

function BatchQualityBlock({ title, quality }) {
  const { totals, bySteps } = quality;
  const decidedQty = totals.passed + totals.rework + totals.scrap;
  if (decidedQty === 0 && bySteps.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">Every decided attempt across the period — a unit reworked then passed counts toward both, not just its final state.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-gray-50">
        <div><p className="text-xs text-gray-500 uppercase font-medium">Qty Submitted</p><p className="text-xl font-bold text-gray-800">{totals.submitted}</p></div>
        <div><p className="text-xs text-gray-500 uppercase font-medium">Passed</p><p className="text-xl font-bold text-green-600">{totals.passed}</p></div>
        <div><p className="text-xs text-gray-500 uppercase font-medium">Rework</p><p className="text-xl font-bold text-amber-600">{totals.rework}</p></div>
        <div><p className="text-xs text-gray-500 uppercase font-medium">Scrap</p><p className="text-xl font-bold text-red-600">{totals.scrap}</p></div>
      </div>
      {bySteps.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">Step</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Submitted</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Passed</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Rework</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Scrap</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Pass %</th>
              </tr>
            </thead>
            <tbody>
              {bySteps.map((s, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-5 py-2 text-gray-700">{s.step}</td>
                  <td className="px-5 py-2 text-right text-gray-600">{s.submitted}</td>
                  <td className="px-5 py-2 text-right text-green-600">{s.passed}</td>
                  <td className="px-5 py-2 text-right text-amber-600">{s.rework}</td>
                  <td className="px-5 py-2 text-right text-red-600">{s.scrap}</td>
                  <td className="px-5 py-2 text-right font-semibold text-gray-700">{pct(s.passed, s.submitted)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UnitQualityBlock({ title, quality }) {
  const { totals, bySteps } = quality;
  const decided = totals.pass + totals.reject;
  if (decided === 0 && bySteps.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">Every Pass/Reject decision across every unit's every QC step for the period.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 p-5 border-b border-gray-50">
        <div><p className="text-xs text-gray-500 uppercase font-medium">Pass</p><p className="text-xl font-bold text-green-600">{totals.pass}</p></div>
        <div><p className="text-xs text-gray-500 uppercase font-medium">Reject</p><p className="text-xl font-bold text-red-600">{totals.reject}</p></div>
        <div><p className="text-xs text-gray-500 uppercase font-medium">Pass Rate</p><p className="text-xl font-bold text-gray-800">{pct(totals.pass, decided)}%</p></div>
      </div>
      {bySteps.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">Step</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Pass</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Reject</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">Pass %</th>
              </tr>
            </thead>
            <tbody>
              {bySteps.map((s, i) => (
                <tr key={i} className="border-t border-gray-50">
                  <td className="px-5 py-2 text-gray-700">{s.step}</td>
                  <td className="px-5 py-2 text-right text-green-600">{s.pass}</td>
                  <td className="px-5 py-2 text-right text-red-600">{s.reject}</td>
                  <td className="px-5 py-2 text-right font-semibold text-gray-700">{pct(s.pass, s.pass + s.reject)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MISQualityReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [productCode, setProductCode] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (productCode.trim()) params.append('productCode', productCode.trim());
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

  const trendData = data?.monthlyTrend?.map(m => ({
    month: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
    approved: m.approved,
    rejected: m.rejected
  })) || [];

  const sourceChartData = data?.sourceBreakdown?.map(s => ({
    name: SOURCE_LABELS[s.source] || s.source,
    approved: s.approved,
    rejected: s.rejected,
    pending: s.pending
  })) || [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.summary || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={24} className="text-[#49A7F5]" />Quality Reports</h1>
          <p className="text-sm text-gray-500">Real QC outcomes — Purchase/Store receiving, Sub Child Part batches, Child Part &amp; Machine units</p>
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
              placeholder="Item code (any kind)"
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-48"
            />
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-[#49A7F5] text-white rounded-lg text-sm hover:bg-[#3d96e4]"><RefreshCw size={14} /> Apply</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-2"><AlertTriangle size={18}/>{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total QC Jobs', value: s.totalJobs || 0, color: '#49A7F5' },
          { label: 'Approved', value: s.approved || 0, color: '#16A34A' },
          { label: 'Rejected', value: s.rejected || 0, color: '#EF4444' },
          { label: 'Pass Rate', value: `${s.passRate || 0}%`, color: '#8B5CF6', sub: `${s.pending || 0} still pending/in progress` }
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
            {item.sub && <p className="text-xs text-gray-400 mt-1">{item.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quality by Code — mirrors Sales/Production/Inventory Report's lookup */}
      {data?.qualityByCode && (
        <div className="bg-white rounded-xl border-2 border-[#49A7F5]/30 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2">
            <PackageSearch size={18} className="text-[#49A7F5]" />
            <h3 className="font-semibold text-gray-700">Quality for "{productCode}"</h3>
          </div>
          {data.qualityByCode.matchedItems.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">No QC jobs found for code "{productCode}".</p>
          ) : (
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-400">Matched:</span>
                {data.qualityByCode.matchedItems.map((it, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-[#3d96e4] rounded-full text-xs font-medium">{it.name} ({it.code})</span>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Approved</p><p className="text-lg font-bold text-green-600">{data.qualityByCode.statusCounts.Approved}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Rejected</p><p className="text-lg font-bold text-red-600">{data.qualityByCode.statusCounts.Rejected}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Pending</p><p className="text-lg font-bold text-amber-600">{data.qualityByCode.statusCounts.Pending + data.qualityByCode.statusCounts['In Progress']}</p></div>
                <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Jobs</p><p className="text-lg font-bold text-gray-800">{data.qualityByCode.jobs.length < 10 ? data.qualityByCode.jobs.length : '10+'}</p></div>
              </div>
              {data.qualityByCode.jobs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Job</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Source</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Status</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Inspector</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.qualityByCode.jobs.map((j, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="px-4 py-2 font-mono text-xs text-gray-500">{j.qcJobId}</td>
                          <td className="px-4 py-2 text-gray-600">{SOURCE_LABELS[j.source] || j.source}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${j.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : j.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{j.status}</span>
                            {j.failReason && <span className="block text-[11px] text-red-500 mt-0.5">{j.failReason}</span>}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{j.inspector || '—'}</td>
                          <td className="px-4 py-2 text-gray-500">{new Date(j.createdAt).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <BatchQualityBlock title="Sub Child Part Quality" quality={data.qualityByCode.scpQuality} />
              <UnitQualityBlock title="Child Part / Machine Unit Quality" quality={data.qualityByCode.unitQuality} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Approved vs Rejected</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="approved" stroke="#34D399" strokeWidth={2} dot={{ r: 4 }} name="Approved" />
                <Line type="monotone" dataKey="rejected" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} name="Rejected" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Jobs by Source</h3>
          {sourceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sourceChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                <Legend />
                <Bar dataKey="approved" stackId="a" fill="#34D399" name="Approved" />
                <Bar dataKey="rejected" stackId="a" fill="#EF4444" name="Rejected" />
                <Bar dataKey="pending" stackId="a" fill="#F59E0B" name="Pending" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data</div>}
        </div>
      </div>

      <BatchQualityBlock title="Sub Child Part Quality" quality={data?.subChildPartQuality || { totals: { submitted: 0, passed: 0, rework: 0, scrap: 0 }, bySteps: [] }} />
      <UnitQualityBlock title="Child Part / Machine Unit Quality" quality={data?.unitQuality || { totals: { pass: 0, reject: 0 }, bySteps: [] }} />
    </div>
  );
}
