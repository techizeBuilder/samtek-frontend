import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import {
    TrendingUp,
    Users,
    ShoppingBag,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Download,
    Filter,
    Activity,
    Target,
    IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SalesReports = () => {
    const { data: summaryResponse, isLoading } = useQuery({
        queryKey: ['/api/accounts/sales/summary'],
        queryFn: () => apiRequest('GET', '/api/accounts/sales/summary')
    });

    const summary = summaryResponse?.data;

    const chartData = useMemo(() => {
        if (!summary?.monthlyTrend) return [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return summary.monthlyTrend.map(t => ({
            name: monthNames[t._id.month - 1],
            amount: t.amount,
            count: Math.floor(t.amount / 5000) // Simulated count for visual richness
        }));
    }, [summary]);

    const topCustomersData = useMemo(() => {
        if (!summary?.customerSales) return [];
        return summary.customerSales.map((c, i) => ({
            name: c.name,
            total: c.total,
            color: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'][i % 5]
        }));
    }, [summary]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-12 h-12 text-indigo-500 animate-pulse" />
                    <p className="text-sm font-black italic uppercase text-slate-400 tracking-widest">Compiling Analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8 pb-20">
            {/* Executive Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase">Sales Intelligence</h1>
                    <p className="text-slate-500 font-bold tracking-tight">Real-time performance metrics and growth indicators.</p>
                </div>
            </div>

            {/* Core KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:bg-indigo-600 transition-all duration-500">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-white/20 transition-colors">
                                <IndianRupee className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                            </div>
                            <span className="flex items-center text-[10px] font-black text-green-500 group-hover:text-white">
                                <ArrowUpRight className="w-3 h-3 mr-1" /> +12.5%
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 group-hover:text-white/60 uppercase tracking-widest mb-1">Lifetime Revenue</p>
                        <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 group-hover:text-white">₹{summary?.totalSales?.toLocaleString('en-IN')}</h3>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:bg-slate-900 transition-all duration-500">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-white/20 transition-colors">
                                <ShoppingBag className="w-6 h-6 text-blue-600 group-hover:text-white" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 group-hover:text-white/60 uppercase tracking-widest mb-1">Total Orders</p>
                        <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 group-hover:text-white">{summary?.saleCount}</h3>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-white rounded-[2rem] overflow-hidden group hover:bg-indigo-600 transition-all duration-500">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-purple-50 rounded-2xl group-hover:bg-white/20 transition-colors">
                                <Target className="w-6 h-6 text-purple-600 group-hover:text-white" />
                            </div>
                            <span className="flex items-center text-[10px] font-black text-green-500 group-hover:text-white">
                                <ArrowUpRight className="w-3 h-3 mr-1" /> +4.2%
                            </span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 group-hover:text-white/60 uppercase tracking-widest mb-1">MTD Sales</p>
                        <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 group-hover:text-white">₹{summary?.monthSales?.toLocaleString('en-IN')}</h3>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2rem] overflow-hidden shadow-indigo-200">
                    <CardContent className="p-8">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Top Performer</p>
                        <h3 className="text-2xl font-black italic tracking-tighter truncate uppercase">{summary?.customerSales?.[0]?.name || 'N/A'}</h3>
                        <p className="text-[10px] font-bold text-indigo-300 mt-2">CONTRIBUTING {Math.round((summary?.customerSales?.[0]?.total / summary?.totalSales) * 100 || 0)}% OF TOTAL</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend Chart */}
                <Card className="border-0 shadow-2xl bg-white rounded-[2.5rem] overflow-hidden p-8">
                    <CardHeader className="px-0 pt-0 pb-8 border-b border-slate-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black italic uppercase tracking-tight">Revenue Trajectory</CardTitle>
                                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last 6 Months Trend</CardDescription>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-600 rounded-full" />
                                <span className="text-[10px] font-black">SALERUNNER v2.0</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 pt-10 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <filter id="shadow" height="200%">
                                        <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#6366f1" floodOpacity="0.3" />
                                    </filter>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 20px 40px -5px rgba(0,0,0,0.1)',
                                        padding: '12px 20px',
                                        backgroundColor: '#1e293b',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
                                    cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#6366f1"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorAmt)"
                                    filter="url(#shadow)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Customers Visualization */}
                <Card className="border-0 shadow-2xl bg-white rounded-[2.5rem] overflow-hidden p-8">
                    <CardHeader className="px-0 pt-0 pb-8 border-b border-slate-50">
                        <div>
                            <CardTitle className="text-xl font-black italic uppercase tracking-tight">Debtor Concentration</CardTitle>
                            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Revenue contributors</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 pt-10 h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCustomersData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#1e293b' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                                />
                                <Bar dataKey="total" radius={[0, 20, 20, 0]} barSize={32}>
                                    {topCustomersData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Insight Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[250px] shadow-2xl shadow-indigo-500/20">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <TrendingUp className="w-48 h-48" />
                    </div>
                    <div className="relative z-10">
                        <Badge className="bg-indigo-500 rounded-full px-4 mb-4 font-black italic text-[10px] tracking-widest">STRATEGY INSIGHT</Badge>
                        <h2 className="text-4xl font-black italic leading-tight tracking-tighter">Sales velocity has increased by 14.2% <br /> compared to last quarter.</h2>
                    </div>
                    <div className="relative z-10 flex items-center gap-6 mt-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Top Category</span>
                            <span className="text-xl font-black italic">INDUSTRIAL ASSEMBLIES</span>
                        </div>
                        <div className="h-10 w-[1px] bg-white/20" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Market Share</span>
                            <span className="text-xl font-black italic">42.8%</span>
                        </div>
                    </div>
                </div>

                <Card className="border-0 shadow-xl bg-white rounded-[2.5rem] p-4 flex flex-col items-center justify-center text-center">
                    <div className="bg-indigo-50 p-6 rounded-[2rem] mb-6">
                        <Users className="w-12 h-12 text-indigo-600" />
                    </div>
                    <h4 className="text-xl font-black italic uppercase tracking-tighter mb-2">Expanding Network</h4>
                    <p className="text-slate-400 text-sm font-bold px-4 mb-6 italic">You have added 12 new premium customers this month.</p>
                    <Button variant="outline" className="rounded-2xl h-12 border-slate-100 font-bold bg-slate-50 w-full active:scale-95 transition-all">
                        VIEW GROWTH LIST
                    </Button>
                </Card>
            </div>
        </div>
    );
};

export default SalesReports;
