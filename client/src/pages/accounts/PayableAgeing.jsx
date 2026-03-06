import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingDown, AlertTriangle } from 'lucide-react';

const PayableAgeing = () => {
    const { data: ageingData, isLoading } = useQuery({
        queryKey: ['/api/accounts/purchases/outstanding'],
        queryFn: () => apiRequest('GET', '/api/accounts/purchases/outstanding')
    });

    const vendors = ageingData?.data || [];
    const totalPayable = vendors.reduce((sum, v) => sum + v.totalOutstanding, 0);

    // Calculate ageing slabs dynamically
    const today = new Date();
    const slabs = {
        current: 0, // 0-30 days
        due: 0,     // 31-60 days
        overdue: 0  // 61+ days
    };

    vendors.forEach(vendor => {
        vendor.invoices.forEach(inv => {
            const invoiceDate = new Date(inv.date);
            const diffDays = Math.floor((today - invoiceDate) / (1000 * 60 * 60 * 24));

            if (diffDays <= 30) slabs.current += inv.balance;
            else if (diffDays <= 60) slabs.due += inv.balance;
            else slabs.overdue += inv.balance;
        });
    });

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Payable Ageing</h1>
                    <p className="text-slate-500">Track outstanding bills and vendor liabilities balance</p>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Total Accounts Payable</div>
                    <div className="text-4xl font-black text-slate-900">₹{totalPayable.toLocaleString()}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center">
                            <TrendingDown className="w-4 h-4 mr-1 text-green-500" /> Current (0-30 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">₹{slabs.current.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">
                            {totalPayable > 0 ? Math.round((slabs.current / totalPayable) * 100) : 0}% of total
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm border-l-4 border-l-yellow-400">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center">
                            <BarChart3 className="w-4 h-4 mr-1 text-yellow-500" /> Due (31-60 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-700">₹{slabs.due.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">
                            {totalPayable > 0 ? Math.round((slabs.due / totalPayable) * 100) : 0}% of total
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm border-l-4 border-l-red-500 bg-red-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-red-500 uppercase flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1" /> Overdue (60+ Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹{slabs.overdue.toLocaleString()}</div>
                        <div className="text-xs text-red-400 opacity-70">
                            {totalPayable > 0 ? Math.round((slabs.overdue / totalPayable) * 100) : 0}% of total
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle>Vendor-wise Outstanding Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor Name</TableHead>
                                <TableHead>Pending Bills</TableHead>
                                <TableHead>Total Outstanding (₹)</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vendors.map((vendor) => (
                                <TableRow key={vendor.vendorId}>
                                    <TableCell className="font-bold text-slate-700">{vendor.vendorName}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {vendor.invoices.map((inv, idx) => (
                                                <Badge key={idx} variant="outline" className="text-[10px] bg-white">
                                                    {inv.invoiceNo}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-lg font-black text-slate-900">
                                        ₹{vendor.totalOutstanding.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {vendor.totalOutstanding > 100000 ? (
                                            <Badge variant="destructive">High Liability</Badge>
                                        ) : (
                                            <Badge className="bg-green-500">Manageable</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {vendors.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-slate-400 italic">
                                        No outstanding payables found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default PayableAgeing;
