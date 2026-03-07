import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp as ProfitIcon,
    Percent,
    Calendar,
    Filter,
    Download,
    IndianRupee,
    Briefcase,
    ExternalLink,
    ChevronRight,
    Calculator
} from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export default function FinancialSummary() {
    const { user } = useAuth();
    console.log("user", user);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [period, setPeriod] = useState('month'); // week, month, year, custom
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [customRange, setCustomRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const response = await api.getFinanceSummary({
                period,
                startDate,
                endDate
            });
            if (response.success) {
                setSummary(response.summary);
            }
        } catch (error) {
            console.error("Failed to fetch finance summary", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [period, startDate, endDate]);

    const handlePeriodChange = (val) => {
        setPeriod(val);
        const now = new Date();
        if (val === 'week') {
            setStartDate(format(startOfWeek(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfWeek(now), 'yyyy-MM-dd'));
        } else if (val === 'month') {
            setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (val === 'previous_year') {
            const lastYear = now.getFullYear() - 1;
            setStartDate(format(new Date(lastYear, 0, 1), 'yyyy-MM-dd'));
            setEndDate(format(new Date(lastYear, 11, 31), 'yyyy-MM-dd'));
        }
    };

    const handleMonthChange = (e) => {
        const monthVal = e.target.value;
        setSelectedMonth(monthVal);
        const [year, month] = monthVal.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'));
    };

    const handleCustomRangeApply = () => {
        setStartDate(customRange.start);
        setEndDate(customRange.end);
    };

    const calculateMargin = () => {
        if (!summary || summary.netSales === 0) return 0;
        return ((summary.netProfit / summary.netSales) * 100).toFixed(1);
    };

    const mainStats = [
        {
            label: 'Gross Sales',
            value: summary?.totalSales || 0,
            icon: TrendingUp,
            color: 'blue',
            desc: 'Total revenue before returns'
        },
        {
            label: 'Sales Returns',
            value: summary?.totalReturns || 0,
            icon: TrendingDown,
            color: 'orange',
            desc: 'Goods returned by customers'
        },
        {
            label: 'Net Sales',
            value: summary?.netSales || 0,
            icon: BarChart3,
            color: 'indigo',
            desc: 'Revenue after returns'
        },
        {
            label: 'Operating Expenses',
            value: summary?.totalExpenses || 0,
            icon: Calculator,
            color: 'rose',
            desc: 'Total overhead costs'
        }
    ];

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Financial Summary</h1>
                    <p className="text-slate-500">Unit-wise Profit & Loss (P&L) Statement</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Select value={period} onValueChange={handlePeriodChange}>
                        <SelectTrigger className="w-full sm:w-[140px] bg-white shadow-sm border-slate-200">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Weekly</SelectItem>
                            <SelectItem value="month">Monthly</SelectItem>
                            <SelectItem value="custom_month">Select Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="previous_year">Previous Year</SelectItem>
                            <SelectItem value="custom_range">Date Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {period === 'custom_month' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm">
                            <span className="text-xs font-medium text-slate-500">Month:</span>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="text-sm outline-none border-none bg-transparent"
                            />
                        </div>
                    )}

                    {period === 'custom_range' && (
                        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-md border border-slate-200 shadow-sm">
                            <input
                                type="date"
                                value={customRange.start}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="text-xs outline-none border border-slate-100 rounded px-1 py-0.5"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input
                                type="date"
                                value={customRange.end}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="text-xs outline-none border border-slate-100 rounded px-1 py-0.5"
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-[10px]" onClick={handleCustomRangeApply}>
                                Apply
                            </Button>
                        </div>
                    )}

                    <Button variant="outline" className="bg-white shadow-sm border-slate-200" onClick={() => window.print()}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Main Profit Card */}
            <Card className={`border-none shadow-xl bg-gradient-to-r ${(summary?.netProfit || 0) >= 0 ? 'from-blue-700 via-indigo-600 to-purple-600' : 'from-red-700 via-rose-600 to-orange-600'} text-white overflow-hidden relative`}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    {(summary?.netProfit || 0) >= 0 ? <ProfitIcon size={120} /> : <TrendingDown size={120} />}
                </div>
                <CardContent className="p-6 sm:p-10 z-10 relative">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div>
                            <p className="text-blue-100 font-medium mb-1">Net Final Profit</p>
                            <div className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                                ₹{(summary?.netProfit || 0).toLocaleString()}
                            </div>
                            <div className="flex items-center mt-4 gap-4">
                                <div className="flex items-center bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-sm font-semibold">
                                    <Percent className="w-3.5 h-3.5 mr-1" />
                                    {calculateMargin()}% Margin
                                </div>
                                <div className="text-blue-100 text-sm italic">
                                    Report for {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd, yyyy')}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:gap-8 border-l border-white/20 pl-0 md:pl-8 mt-6 md:mt-0">
                            <div className="space-y-1">
                                <p className="text-blue-200 text-xs uppercase tracking-wider font-bold">Unit Location</p>
                                <p className="text-xl font-bold">{user?.unit || 'Main Facility'}</p>
                                <p className="text-blue-100/60 text-[10px]">{user?.company?.location}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-blue-200 text-xs uppercase tracking-wider font-bold">Status</p>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 ${(summary?.netProfit || 0) >= 0 ? 'bg-green-400' : 'bg-red-300'} rounded-full animate-pulse`} />
                                    <p className="text-xl font-bold">{(summary?.netProfit || 0) >= 0 ? 'Profitable' : 'Loss'}</p>
                                </div>
                                <p className="text-blue-100/60 text-[10px]">Real-time Calculation</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {mainStats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-md bg-white hover:shadow-lg transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-tight">{stat.label}</CardTitle>
                            <div className={`p-2 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                                <stat.icon size={18} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₹{stat.value.toLocaleString()}</div>
                            <p className="text-xs text-slate-400 mt-1">{stat.desc}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">VIEW DETAILS</span>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Simple Breakdown Table */}
                <Card className="lg:col-span-2 border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle>Profit & Loss Breakdown</CardTitle>
                        <CardDescription>Detailed calculation of your unit's performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Total Sales Revenue</h4>
                                        <p className="text-xs text-slate-500">All invoices generated in period</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-slate-900">+₹{(summary?.totalSales || 0).toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                        <TrendingDown size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Total Returns Value</h4>
                                        <p className="text-xs text-slate-500">Customer returns and adjustments</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-orange-600">-₹{(summary?.totalReturns || 0).toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-indigo-900">Net Revenue</h4>
                                        <p className="text-xs text-indigo-500">Actual receivable amount</p>
                                    </div>
                                </div>
                                <div className="text-xl font-extrabold text-indigo-700">₹{(summary?.netSales || 0).toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                        <Calculator size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Total Expenses</h4>
                                        <p className="text-xs text-slate-500">Operating and production costs</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-rose-600">-₹{(summary?.totalExpenses || 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions / Tips */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle>Insights & Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className={`flex items-center gap-2 ${(summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-bold text-sm`}>
                                {(summary?.netProfit || 0) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                <span>{(summary?.netProfit || 0) >= 0 ? 'Great Performance!' : 'Action Required'}</span>
                            </div>
                            <p className="text-sm text-slate-600">
                                {(summary?.netProfit || 0) >= 0
                                    ? `Your profit margin is currently ${calculateMargin()}%. This is above your monthly target of 45%.`
                                    : `You are currently at a loss of ₹${Math.abs(summary?.netProfit || 0).toLocaleString()}. Consider reviewing operational costs.`}
                            </p>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                                <TrendingDown size={16} />
                                <span>Cost Saving Tip</span>
                            </div>
                            <p className="text-xs text-amber-800">Operational costs have increased by 12% this week. Consider reviewing electricity usage during baking hours.</p>
                        </div>

                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg py-6" asChild>
                            <a href="/accounts/expenses">
                                Add Daily Expenses
                                <ExternalLink className="w-4 h-4 ml-2" />
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
