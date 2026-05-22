import React, { useMemo } from 'react';
import { useSupportTickets } from '@/hooks/useComplaints';
import { ClipboardList, CheckCircle2, Clock, AlertOctagon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export default function SupportDashboard() {
  const { data: response, isLoading, isError } = useSupportTickets({});

  // Calculate our metrics AND chart data from the API response
  const { metrics, issueTypeData } = useMemo(() => {
    if (!response?.data) {
        return { 
            metrics: { total: 0, completed: 0, pending: 0, breached: 0, avgTime: '0 mins' },
            issueTypeData: [] 
        };
    }

    const tickets = response.data;
    
    // 1. Calculate Top Metrics
    const calcMetrics = {
      total: response.pagination.totalTickets,
      completed: tickets.filter((t: any) => t.status === 'Resolved' || t.status === 'Closed').length,
      pending: tickets.filter((t: any) => ['Unassigned', 'Pending', 'In Progress', 'Reopened'].includes(t.status)).length,
      breached: tickets.filter((t: any) => t.sla?.isBreached).length,
      avgTime: response.metrics?.averageResolutionTime || 'N/A'
    };

    // 2. Calculate Issue Type Data for the Chart
    const issueCounts: Record<string, number> = {};
    tickets.forEach((t: any) => {
        const type = t.issue?.issueType || 'Other';
        issueCounts[type] = (issueCounts[type] || 0) + 1;
    });

    const chartData = Object.keys(issueCounts).map(key => ({
        name: key,
        value: issueCounts[key]
    }));

    return { metrics: calcMetrics, issueTypeData: chartData };
  }, [response]);

  if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading dashboard metrics...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Failed to load dashboard data.</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Support Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of ticket metrics, SLA performance, and issue trends.</p>
      </div>

      <div className="space-y-6">
        {/* Top row: The 4 Main Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Total Complaints</p>
              <h3 className="text-3xl font-extrabold text-blue-900">{metrics.total}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><ClipboardList size={24} /></div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Resolved</p>
              <h3 className="text-3xl font-extrabold text-emerald-900">{metrics.completed}</h3>
            </div>
            <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><CheckCircle2 size={24} /></div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Pending / Active</p>
              <h3 className="text-3xl font-extrabold text-amber-900">{metrics.pending}</h3>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg text-amber-600"><Clock size={24} /></div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">SLA Breached</p>
              <h3 className="text-3xl font-extrabold text-red-900">{metrics.breached}</h3>
            </div>
            <div className="bg-red-100 p-3 rounded-lg text-red-600"><AlertOctagon size={24} /></div>
          </div>
        </div>

        {/* Secondary Row: SLA & Performance Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Left Side: Average Time */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
              <Clock size={16} className="text-indigo-500" />
              Average Resolution Time
            </h4>
            <div className="flex items-end gap-2 mt-8">
              <span className="text-5xl font-bold text-gray-800">{metrics.avgTime.toString().split(' ')[0]}</span>
              <span className="text-gray-500 mb-1 font-medium">{metrics.avgTime.toString().split(' ')[1] || 'minutes'}</span>
            </div>
            <p className="text-xs text-gray-400 mt-4">Calculated from creation to resolution across all closed tickets.</p>
          </div>

          {/* Right Side: Issue Type Chart */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col">
             <h4 className="text-sm font-semibold text-gray-700 mb-4">Issue Breakdown</h4>
             
             {issueTypeData.length > 0 ? (
                 <div className="flex-1 min-h-[200px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={issueTypeData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                       >
                         {issueTypeData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip 
                          formatter={(value) => [`${value} Tickets`, 'Count']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <Legend verticalAlign="bottom" height={36} iconType="circle" />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
             ) : (
                 <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                     No issue data available yet.
                 </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}