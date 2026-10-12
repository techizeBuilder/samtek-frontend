import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingDown, AlertTriangle, Package } from 'lucide-react';

const PayableAgeing = () => {
    const { data: ageingData, isLoading } = useQuery({
        queryKey: ['/api/accounts/purchases/outstanding'],
        queryFn: () => apiRequest('GET', '/api/accounts/purchases/outstanding')
    });

    const vendors = ageingData?.data || [];
    const totalPayable = vendors.reduce((sum, v) => sum + v.totalOutstanding, 0);

    // Ageing by DUE date (2026-10-12). A PO's bill only gets a due date once
    // everything is received and QC-passed (credit days after that); until
    // then it's on order, not yet payable — apart from any advance still
    // unpaid, which is due now. A bill without a PO uses its own due date
    // (its bill date when it has none).
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const today = startOfDay(new Date());
    const slabs = { onOrder: 0, notDue: 0, overdue30: 0, overdueMore: 0 };
    vendors.forEach(vendor => {
        vendor.invoices.forEach(inv => {
            let balance = inv.balance;
            if (inv.purchaseOrder && !inv.fullyAcceptedAt) {
                const advanceLeft = inv.payableNow?.advance || 0;
                slabs.overdue30 += advanceLeft;          // an unpaid advance is due now
                slabs.onOrder += Math.max(0, balance - advanceLeft);
                return;
            }
            const due = startOfDay(inv.dueDate || inv.date);
            const late = Math.floor((today - due) / (1000 * 60 * 60 * 24));
            if (late <= 0) slabs.notDue += balance;
            else if (late <= 30) slabs.overdue30 += balance;
            else slabs.overdueMore += balance;
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { key: 'onOrder', label: 'On order — not payable yet', icon: Package, tone: 'border-l-slate-400', text: 'text-slate-700', hint: 'PO material not yet received + QC-passed' },
                    { key: 'notDue', label: 'Payable — not due yet', icon: TrendingDown, tone: 'border-l-green-500', text: 'text-green-700', hint: 'Within the credit days' },
                    { key: 'overdue30', label: 'Due now / overdue up to 30 days', icon: BarChart3, tone: 'border-l-yellow-400', text: 'text-yellow-700', hint: 'Includes unpaid advances' },
                    { key: 'overdueMore', label: 'Overdue 30+ days', icon: AlertTriangle, tone: 'border-l-red-500 bg-red-50', text: 'text-red-600', hint: 'Past the due date by over a month' },
                ].map(c => (
                    <Card key={c.key} className={`border-0 shadow-sm border-l-4 ${c.tone}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 uppercase flex items-center">
                                <c.icon className="w-4 h-4 mr-1" /> {c.label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${c.text}`}>₹{Math.round(slabs[c.key]).toLocaleString('en-IN')}</div>
                            <div className="text-xs text-slate-400">{c.hint}</div>
                        </CardContent>
                    </Card>
                ))}
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
                                                    {inv.poNumber || inv.invoiceNo}
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
