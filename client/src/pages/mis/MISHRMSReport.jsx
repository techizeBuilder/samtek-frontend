import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#49A7F5', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899', '#84CC16', '#A78BFA'];

export default function MISHRMSReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/mis/hrms-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch HRMS report');
      const json = await res.json();
      setData(json.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const roleChartData = data?.roleBreakdown?.map(r => ({ name: r._id || 'Unknown', count: r.count })) || [];
  const genderData = data?.genderBreakdown?.map(g => ({ name: g._id || 'Not Specified', value: g.count })) || [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-[#49A7F5] border-t-transparent rounded-full animate-spin" /></div>;

  const s = data?.summary || {};

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users size={24} className="text-[#49A7F5]" />HRMS Report</h1>
          <p className="text-sm text-gray-500">Employee headcount, role distribution and recent joiners</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 flex items-center gap-2"><AlertTriangle size={18}/>{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Employees</p>
          <p className="text-3xl font-bold text-[#49A7F5] mt-1">{s.totalEmployees || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Active employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Roles / Departments</p>
          <p className="text-3xl font-bold text-[#8B5CF6] mt-1">{data?.roleBreakdown?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Distinct roles</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Recent Joiners</p>
          <p className="text-3xl font-bold text-[#34D399] mt-1">{data?.recentJoiners?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Last 10 employees</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roleChartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Employees by Role</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roleChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
                <Tooltip />
                <Bar dataKey="count" fill="#49A7F5" name="Employees" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {genderData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-4">Gender Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {data?.recentJoiners?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Recent Joiners</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">#</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Role</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.recentJoiners.map((e, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{e.fullName || e.name || 'N/A'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{e.role}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{e.email}</td>
                    <td className="px-5 py-3 text-gray-500">{new Date(e.createdAt).toLocaleDateString('en-IN')}</td>
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
