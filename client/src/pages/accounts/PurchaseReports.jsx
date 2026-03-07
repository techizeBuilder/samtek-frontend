import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3, TrendingUp, TrendingDown, Package,
    RotateCw, Calendar, ArrowUpRight, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

const PurchaseReports = () => {
    const { data: response, isLoading } = useQuery({
        queryKey: ['/api/accounts/purchases/reports/summary'],
        queryFn: () => apiRequest('GET', '/api/accounts/purchases/reports/summary'),
    });

    const stats = response?.data || {
        totalPurchases: 0,
        purchaseCount: 0,
        monthPurchases: 0,
        totalReturns: 0,
        monthlyTrend: []
    };

    const chartData = stats.monthlyTrend.map(item => ({
        name: `${item._id.month}/${item._id.year}`,
        amount: item.amount
    }));

    if (isLoading) return <div className="p-8 text-center"><RotateCw className="animate-spin inline mr-2" /> Loading reports...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Purchase Analytics</h1>
                <p className="text-slate-600">Complete overview of your procurement spending and patterns</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Total Procurement</p>
                                <h3 className="text-3xl font-bold mt-1">₹{stats.totalPurchases.toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-blue-500/30 rounded-lg">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-blue-100">
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                            <span>{stats.purchaseCount} Total Invoices</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Monthly Spending</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-900">₹{stats.monthPurchases.toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">Current Month Volume</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Returns</p>
                                <h3 className="text-3xl font-bold mt-1 text-red-600">₹{stats.totalReturns.toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">Returns & Debit Notes</p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Net Spending</p>
                                <h3 className="text-3xl font-bold mt-1 text-green-600">₹{(stats.totalPurchases - stats.totalReturns).toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">Excluding Returns</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Vendor Chart */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Package className="w-5 h-5 mr-2 text-blue-500" /> Top Suppliers
                        </CardTitle>
                        <CardDescription>Highest spending by vendor</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {stats.vendorSpending?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.vendorSpending} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No vendor data</div>
                        )}
                    </CardContent>
                </Card>

                {/* Category Chart */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2 text-purple-500" /> Spend by Category
                        </CardTitle>
                        <CardDescription>Procurement distributed across item types</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {stats.categorySpending?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.categorySpending}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="_id" />
                                    <YAxis />
                                    <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                                    <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No category data</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Trend Chart */}
                <Card className="lg:col-span-2 border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Spending Trend</CardTitle>
                        <CardDescription>Monthly purchase volume over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(val) => [`₹${val.toLocaleString()}`, 'Amount']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">
                                No trend data available yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Links / Info */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Procurement Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                            <h4 className="text-orange-900 font-semibold mb-1 flex items-center">
                                <Package className="w-4 h-4 mr-2" />
                                Inventory Impact
                            </h4>
                            <p className="text-orange-700 text-sm">
                                Your total procurement has increased inventory value by approx. ₹{(stats.totalPurchases * 0.85).toLocaleString()}.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-slate-900 font-semibold">Key Highlights</h4>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="text-sm text-slate-600">Avg. Invoice Value</span>
                                <span className="font-bold">₹{(stats.purchaseCount ? stats.totalPurchases / stats.purchaseCount : 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <span className="text-sm text-slate-600">Return Rate</span>
                                <span className="font-bold text-red-600">
                                    {stats.totalPurchases ? ((stats.totalReturns / stats.totalPurchases) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PurchaseReports;
