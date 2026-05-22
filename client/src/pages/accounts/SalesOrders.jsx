import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import {
    Search,
    Receipt,
    Eye,
    CheckCircle2,
    Clock,
    User,
    Calendar,
    ArrowRight,
    CheckSquare,
    AlertCircle,
    XCircle,
    FileText,
    ShieldCheck,
    Check
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const SalesOrders = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewOrder, setViewOrder] = useState(null);
    const [approvingOrder, setApprovingOrder] = useState(null);
    const [rejectingOrder, setRejectingOrder] = useState(null);
    const [billingOrder, setBillingOrder] = useState(null);
    const [selectedType, setSelectedType] = useState('Pakka');
    const [remarks, setRemarks] = useState('');
    const { toast } = useToast();

    // Fetch orders approved by salesman (for Account approval)
    const { data: ordersResponse, isLoading } = useQuery({
        queryKey: ['/api/accounts/sales/account/pending-orders'],
        queryFn: () => apiRequest('GET', '/api/accounts/sales/account/pending-orders')
    });

    // Account Approval Mutation
    const approveMutation = useMutation({
        mutationFn: (orderId) => apiRequest('POST', '/api/accounts/sales/account/approve-order', { orderId, remarks }),
        onSuccess: () => {
            queryClient.invalidateQueries(['/api/accounts/sales/account/pending-orders']);
            toast({ title: "Approved", description: "Order verified and approved by Accounts." });
            setApprovingOrder(null);
            setRemarks('');
        }
    });

    // Account Rejection Mutation
    const rejectMutation = useMutation({
        mutationFn: (orderId) => apiRequest('POST', '/api/accounts/sales/account/reject-order', { orderId, remarks }),
        onSuccess: () => {
            queryClient.invalidateQueries(['/api/accounts/sales/account/pending-orders']);
            toast({ title: "Order Rejected", description: "The order has been rejected.", variant: "destructive" });
            setRejectingOrder(null);
            setRemarks('');
        },
        onError: (error) => {
            toast({ title: "Rejection Failed", description: error.message, variant: "destructive" });
        }
    });

    // Invoice Generation Mutation
    const generateInvoiceMutation = useMutation({
        mutationFn: (invoiceData) => apiRequest('POST', '/api/accounts/sales/account/invoices', invoiceData),
        onSuccess: () => {
            queryClient.invalidateQueries(['/api/accounts/sales/account/pending-orders']);
            queryClient.invalidateQueries(['/api/accounts/sales/account/invoices']);
            toast({ title: "Invoice Generated", description: "The official bill has been created successfully." });
            setBillingOrder(null);
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleGenerateInvoice = () => {
        if (!billingOrder) return;

        const order = billingOrder;
        const type = selectedType;

        // Calculate tax based on type
        const subtotal = order.totalAmount;
        const taxAmount = type === 'Pakka' ? (subtotal * 0.18) : 0;
        const totalAmount = subtotal + taxAmount;

        const invoiceData = {
            orderId: order._id,
            customerId: order.customer?._id,
            invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
            saleDate: format(new Date(), 'yyyy-MM-dd'),
            dueDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
            items: order.products.map(p => ({
                item: p.product?._id,
                productName: p.product?.name,
                quantity: p.quantity,
                unitPrice: p.price,
                totalPrice: p.total,
                tax: type === 'Pakka' ? 18 : 0
            })),
            subtotal,
            taxAmount,
            totalAmount,
            invoiceType: type,
            gstType: 'CGST_SGST',
            notes: `Generated from Order ${order.orderCode}`
        };

        generateInvoiceMutation.mutate(invoiceData);
    };

    const orders = ordersResponse?.data || [];
    const filteredOrders = orders.filter(order =>
        order.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Sales Orders Desk</h1>
                    <p className="text-slate-500 text-sm">Review and approve orders for billing</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Pending Review</p>
                            <h3 className="text-xl font-bold text-slate-900">{orders.filter(o => o.accountApproval?.status !== 'approved').length}</h3>
                        </div>
                        <Clock className="h-8 w-8 text-amber-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Invoiced Orders</p>
                            <h3 className="text-xl font-bold text-slate-900">{orders.filter(o => o.generatedInvoices?.length > 0).length}</h3>
                        </div>
                        <CheckSquare className="h-8 w-8 text-blue-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Potential Revenue</p>
                            <h3 className="text-xl font-bold text-slate-900">₹{orders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString('en-IN')}</h3>
                        </div>
                        <Receipt className="h-8 w-8 text-green-500 opacity-20" />
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Table */}
            <Card className="border-0 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold">Approved Orders History</CardTitle>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by Order ID or Customer..."
                                className="pl-10 w-full sm:w-80 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="px-6 font-semibold">Order ID</TableHead>
                                    <TableHead className="font-semibold">Customer</TableHead>
                                    <TableHead className="font-semibold">Billing Status</TableHead>
                                    <TableHead className="text-right font-semibold">Amount</TableHead>
                                    <TableHead className="text-center font-semibold">Approval</TableHead>
                                    <TableHead className="text-right px-6 font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={6} className="text-center h-24 text-slate-300 italic">Loading...</TableCell></TableRow>
                                    ))
                                ) : filteredOrders.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-48 text-slate-400 italic">No orders found.</TableCell></TableRow>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <TableRow key={order._id} className="hover:bg-slate-50 border-none transition-colors">
                                            <TableCell className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{order.orderCode}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-medium">{format(new Date(order.orderDate), 'dd MMM yyyy')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{order.customer?.name}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase">{order.customer?.customerCode}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {order.generatedInvoices?.includes('Pakka') && <Badge className="bg-green-100 text-green-700 border-none text-[9px] px-2 py-0.5">Pakka ✅</Badge>}
                                                    {order.generatedInvoices?.includes('Kachha') && <Badge className="bg-blue-100 text-blue-700 border-none text-[9px] px-2 py-0.5">Kachha ✅</Badge>}
                                                    {(!order.generatedInvoices || order.generatedInvoices.length === 0) && <span className="text-[10px] text-slate-400 italic">Not Invoiced</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</TableCell>
                                            <TableCell className="text-center">
                                                {order.accountApproval?.status === 'approved' ? (
                                                    <Badge className="bg-blue-100 text-blue-700 uppercase text-[10px] px-3 py-1 font-bold">Approved</Badge>
                                                ) : order.accountApproval?.status === 'rejected' ? (
                                                    <Badge className="bg-red-100 text-red-700 uppercase text-[10px] px-3 py-1 font-bold">Rejected</Badge>
                                                ) : (
                                                    <Badge className="bg-amber-100 text-amber-700 uppercase text-[10px] px-3 py-1 font-bold">Pending</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50" onClick={() => setViewOrder(order)}>
                                                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                                                    </Button>
                                                    {order.accountApproval?.status === 'approved' ? (
                                                        <Button size="sm" className="h-8 bg-blue-600 text-white font-semibold" onClick={() => setBillingOrder(order)}>
                                                            Generate Invoice
                                                        </Button>
                                                    ) : order.accountApproval?.status === 'rejected' ? (
                                                        <span className="text-xs text-red-500 font-medium italic">Rejected</span>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <Button size="sm" className="h-8 bg-slate-900 text-white font-semibold" onClick={() => setApprovingOrder(order)}>
                                                                Approve
                                                            </Button>
                                                            <Button size="sm" variant="destructive" className="h-8 font-semibold" onClick={() => setRejectingOrder(order)}>
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>Order Preview</DialogTitle></DialogHeader>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Customer</p>
                                <p className="font-bold text-slate-900">{viewOrder?.customer?.name}</p>
                                <p className="text-sm text-slate-500 mt-1">{viewOrder?.customer?.address1}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Financials</p>
                                <p className="text-xl font-bold text-blue-600">₹{viewOrder?.totalAmount?.toLocaleString()}</p>
                                <p className="text-xs text-slate-500 mt-1">Total items: {viewOrder?.products?.length}</p>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-semibold px-4">Item Name</TableHead>
                                        <TableHead className="text-center font-semibold">Qty</TableHead>
                                        <TableHead className="text-right font-semibold px-4">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewOrder?.products?.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="px-4 font-medium">{item.product?.name}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right px-4 font-bold">₹{item.total?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t">
                            <div>
                                {viewOrder?.quotation && (
                                    <Button
                                        variant="outline"
                                        className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                                        onClick={() => {
                                            const base64String = viewOrder.quotation;
                                            if (base64String.startsWith('data:application/pdf')) {
                                                const win = window.open();
                                                win.document.write('<iframe src="' + base64String + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                            } else {
                                                const link = document.createElement('a');
                                                link.href = viewOrder.quotation;
                                                link.download = `Quotation_${viewOrder.orderCode}.pdf`;
                                                link.click();
                                            }
                                        }}
                                    >
                                        <FileText className="w-4 h-4 mr-2" /> View Quotation
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setViewOrder(null)}>Close</Button>
                                {viewOrder?.accountApproval?.status !== 'approved' && viewOrder?.accountApproval?.status !== 'rejected' && (
                                    <div className="flex gap-2">
                                        <Button variant="destructive" onClick={() => { setRejectingOrder(viewOrder); setViewOrder(null); }}>Reject</Button>
                                        <Button className="bg-slate-900 text-white" onClick={() => { setApprovingOrder(viewOrder); setViewOrder(null); }}>Approve Now</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Approval Dialog */}
            <Dialog open={!!approvingOrder} onOpenChange={() => { setApprovingOrder(null); setRemarks(''); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Approval</DialogTitle>
                        <DialogDescription>Verify this order for official invoicing.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Internal Notes</label>
                            <Input placeholder="Enter any notes here..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => { setApprovingOrder(null); setRemarks(''); }}>Cancel</Button>
                            <Button className="flex-1 bg-blue-600 text-white" onClick={() => approveMutation.mutate(approvingOrder._id)} disabled={approveMutation.isLoading}>
                                {approveMutation.isLoading ? 'Approving...' : 'Confirm Approval'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rejection Dialog */}
            <Dialog open={!!rejectingOrder} onOpenChange={() => { setRejectingOrder(null); setRemarks(''); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Confirm Rejection</DialogTitle>
                        <DialogDescription>Are you sure you want to reject this order? This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejection Reason (Required)</label>
                            <Input
                                placeholder="Enter rejection comment..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className={cn(!remarks && "border-red-300 focus-visible:ring-red-400")}
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => { setRejectingOrder(null); setRemarks(''); }}>Cancel</Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => rejectMutation.mutate(rejectingOrder._id)}
                                disabled={rejectMutation.isLoading || !remarks.trim()}
                            >
                                {rejectMutation.isLoading ? 'Rejecting...' : 'Confirm Reject'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Billing Selection Modal */}
            <Dialog open={!!billingOrder} onOpenChange={() => setBillingOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generate Invoice</DialogTitle>
                        <DialogDescription>Select the billing type for order {billingOrder?.orderCode}</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all relative",
                                    selectedType === 'Kachha' ? "border-slate-900 bg-slate-50 shadow-md" : "border-slate-100 hover:border-slate-200 bg-white"
                                )}
                                onClick={() => setSelectedType('Kachha')}
                            >
                                <FileText className={cn("w-8 h-8 mb-2", selectedType === 'Kachha' ? "text-slate-900" : "text-slate-300")} />
                                <span className={cn("font-bold text-sm", selectedType === 'Kachha' ? "text-slate-900" : "text-slate-400")}>Kachha Bill</span>
                                {billingOrder?.generatedInvoices?.includes('Kachha') && (
                                    <div className="absolute top-2 right-2"><CheckSquare className="w-4 h-4 text-green-600" /></div>
                                )}
                            </button>

                            <button
                                className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all relative",
                                    selectedType === 'Pakka' ? "border-blue-600 bg-blue-50 shadow-md" : "border-slate-100 hover:border-slate-200 bg-white"
                                )}
                                onClick={() => setSelectedType('Pakka')}
                            >
                                <ShieldCheck className={cn("w-8 h-8 mb-2", selectedType === 'Pakka' ? "text-blue-600" : "text-slate-300")} />
                                <span className={cn("font-bold text-sm", selectedType === 'Pakka' ? "text-blue-600" : "text-slate-400")}>Pakka Bill</span>
                                {billingOrder?.generatedInvoices?.includes('Pakka') && (
                                    <div className="absolute top-2 right-2"><CheckSquare className="w-4 h-4 text-green-600" /></div>
                                )}
                            </button>
                        </div>

                        <Button
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase"
                            onClick={handleGenerateInvoice}
                            disabled={generateInvoiceMutation.isLoading}
                        >
                            {generateInvoiceMutation.isLoading ? 'Generating...' : `Generate ${selectedType} Invoice`}
                        </Button>
                    </div>
                    {generateInvoiceMutation.isLoading && <div className="text-center text-xs font-bold text-blue-600 animate-pulse">Processing official record...</div>}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesOrders;
