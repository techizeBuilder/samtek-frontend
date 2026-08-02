import React, { useState, useRef } from 'react';
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
    Check,
    CreditCard
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

// Order Form fetch — 404 means "form not filled yet", not an error
const fetchOrderForm = async (orderId) => {
    try {
        const res = await apiRequest('GET', `/api/order-forms/by-order/${orderId}`);
        return res?.orderForm || null;
    } catch (e) {
        if (e.status === 404) return null;
        throw e;
    }
};

// Bill math from the Order Form — additional charges are already folded into
// the items' Bill Amounts, so nothing is added separately. GST rides on top.
//   Pakka  = Σ billAmount + Σ gstAmount
//   Kachha = Σ billAmount + Σ gstAmount + Σ cashAmount
const formCalc = (form) => {
    if (!form || form.status !== 'Submitted') return null;
    const rows = form.items || [];
    const num = (v) => Number(v) || 0;
    const visible = rows.filter(it => !it.hiddenCharge);
    const bill = rows.reduce((s, it) => s + num(it.billAmount), 0);
    const gst = rows.reduce((s, it) => s + num(it.gstAmount), 0);
    const cash = rows.reduce((s, it) => s + num(it.cashAmount), 0);
    return { visible, bill, gst, cash, pakkaTotal: bill + gst, kachhaTotal: bill + gst + cash };
};

const SalesOrders = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [viewOrder, setViewOrder] = useState(null);
    const [billingOrder, setBillingOrder] = useState(null);
    const { toast } = useToast();

    const changeSearch = (value) => { setSearchTerm(value); setPage(1); };

    // Generate Invoice button is a hidden click-count gesture: 1 (or 2)
    // clicks generates the Pakka bill, 3 rapid clicks generates the Kachha
    // bill. Resolved after a short pause so a triple-click doesn't also
    // fire the single-click Pakka path along the way.
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef(null);
    const CLICK_RESOLVE_MS = 400;

    // Fetch orders approved by salesman
    const { data: ordersResponse, isLoading } = useQuery({
        queryKey: ['/api/accounts/sales/account/pending-orders', page, searchTerm],
        queryFn: () => apiRequest('GET', `/api/accounts/sales/account/pending-orders?page=${page}&limit=20&search=${encodeURIComponent(searchTerm)}`),
        keepPreviousData: true,
    });

    // Order Form of the order being viewed / billed — source of truth for items & totals
    const { data: viewForm, isLoading: viewFormLoading } = useQuery({
        queryKey: ['order-form-by-order', viewOrder?._id],
        queryFn: () => fetchOrderForm(viewOrder._id),
        enabled: !!viewOrder?._id
    });
    const { data: billingForm, isLoading: billingFormLoading } = useQuery({
        queryKey: ['order-form-by-order', billingOrder?._id],
        queryFn: () => fetchOrderForm(billingOrder._id),
        enabled: !!billingOrder?._id
    });
    const viewCalc = formCalc(viewForm);
    const billingCalc = formCalc(billingForm);

    // Advance preview — Order Form ke Payment section se, warna lead advance
    // (backend bhi isi order mein dekhta hai)
    const billingAdvance = (billingForm?.paymentType === 'Advance Payment' && Number(billingForm?.receivedAmount) > 0)
        ? Number(billingForm.receivedAmount)
        : (billingOrder?.advancedPaymentAmount || 0);

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

    const handleGenerateInvoice = (type) => {
        if (!billingOrder) return;

        if (!billingCalc) {
            toast({
                title: "Order Form not found",
                description: "This order's Order Form has not been submitted yet — the bill is generated from the Order Form's amounts.",
                variant: "destructive"
            });
            return;
        }

        const order = billingOrder;
        const isKachha = type === 'Kachha';

        // Amounts straight from the Order Form (backend recomputes the same
        // way — this payload just keeps the preview honest)
        const subtotal = isKachha ? billingCalc.bill + billingCalc.cash : billingCalc.bill;
        const taxAmount = billingCalc.gst;
        const totalAmount = subtotal + taxAmount;

        const invoiceData = {
            orderId: order._id,
            customerId: order.customer?._id,
            invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
            saleDate: format(new Date(), 'yyyy-MM-dd'),
            dueDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
            items: billingCalc.visible.map(it => {
                const qty = Number(it.qty) || 1;
                const lineTotal = (Number(it.billAmount) || 0) + (Number(it.gstAmount) || 0) + (isKachha ? (Number(it.cashAmount) || 0) : 0);
                return {
                    productName: it.itemName,
                    quantity: qty,
                    unitPrice: Math.round((lineTotal / qty) * 100) / 100,
                    totalPrice: lineTotal,
                    tax: 0
                };
            }),
            subtotal,
            taxAmount,
            totalAmount,
            invoiceType: type,
            gstType: 'CGST_SGST',
            notes: `Generated from Order ${order.orderCode} (Order Form)`
        };

        generateInvoiceMutation.mutate(invoiceData);
    };

    // Single entry point for the "Generate Invoice" button — counts clicks
    // within a short window and resolves to Pakka (1-2 clicks) or Kachha
    // (3+ clicks) once the user pauses.
    const handleGenerateClick = () => {
        clickCountRef.current += 1;
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => {
            const type = clickCountRef.current >= 3 ? 'Kachha' : 'Pakka';
            clickCountRef.current = 0;
            handleGenerateInvoice(type);
        }, CLICK_RESOLVE_MS);
    };

    // Search now happens server-side — `orders` is already the current
    // page's filtered slice.
    const orders = ordersResponse?.data || [];
    const filteredOrders = orders;
    const pagination = ordersResponse?.pagination || {};
    const summary = ordersResponse?.summary || {};

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
                            <p className="text-xs text-slate-500 font-medium uppercase">Not Invoiced</p>
                            <h3 className="text-xl font-bold text-slate-900">{summary.notInvoicedCount || 0}</h3>
                        </div>
                        <Clock className="h-8 w-8 text-amber-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Invoiced Orders</p>
                            <h3 className="text-xl font-bold text-slate-900">{summary.invoicedCount || 0}</h3>
                        </div>
                        <CheckSquare className="h-8 w-8 text-blue-500 opacity-20" />
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase">Potential Revenue</p>
                            <h3 className="text-xl font-bold text-slate-900">₹{(summary.potentialRevenue || 0).toLocaleString('en-IN')}</h3>
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
                                onChange={(e) => changeSearch(e.target.value)}
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
                                    <TableHead className="text-center font-semibold">Advanced Payment</TableHead>
                                    <TableHead className="text-left px-6 font-semibold">Actions</TableHead>
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
                                                {order.advancedPaymentAmount > 0 ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] px-2 py-0.5 flex items-center gap-1">
                                                            <CreditCard className="w-2.5 h-2.5" />
                                                            Advanced Paid
                                                        </Badge>
                                                        <span className="text-xs font-bold text-emerald-600">
                                                            ₹{order.advancedPaymentAmount.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">No Advance</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50" onClick={() => setViewOrder(order)}>
                                                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-blue-600 text-white font-semibold"
                                                        onClick={() => setBillingOrder(order)}
                                                    >
                                                        Generate Invoice
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 py-4 border-t">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.page <= 1}>Previous</Button>
                            <span className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} orders)</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={pagination.page >= pagination.pages}>Next</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Order Preview</DialogTitle></DialogHeader>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Customer</p>
                                <p className="font-bold text-slate-900">{viewOrder?.customer?.name}</p>
                                <p className="text-sm text-slate-500 mt-1">{viewOrder?.customer?.address1}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Financials (Order Form se)</p>
                                {viewFormLoading ? (
                                    <p className="text-sm text-slate-400 italic">Loading Order Form...</p>
                                ) : viewCalc ? (
                                    <>
                                        <p className="text-xl font-bold text-blue-600">₹{viewCalc.pakkaTotal.toLocaleString('en-IN')}</p>
                                        <p className="text-[11px] text-slate-500">
                                            Bill Amount ₹{viewCalc.bill.toLocaleString('en-IN')} + GST ₹{viewCalc.gst.toLocaleString('en-IN')}
                                            <span className="text-slate-400"> (additional charges included)</span>
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Total items: {viewCalc.visible.length}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-amber-600 font-semibold">Order Form not submitted yet</p>
                                )}
                                {viewOrder?.advancedPaymentAmount > 0 && viewCalc && (
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                        <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                            <CreditCard className="w-3 h-3" />
                                            Advanced Paid: ₹{viewOrder.advancedPaymentAmount.toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-sm font-bold text-blue-700 mt-0.5">
                                            Net Payable: ₹{Math.max(0, viewCalc.pakkaTotal - viewOrder.advancedPaymentAmount).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Advanced Payment Details */}
                        {viewOrder?.advancedPayments?.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Advanced Payment Details (from Lead)
                                </p>
                                <div className="space-y-1">
                                    {viewOrder.advancedPayments.map((ap, idx) => (
                                        <div key={idx} className="flex justify-between text-xs text-emerald-800">
                                            <span>{ap.leadCode} — {ap.paymentMethod} {ap.transactionId ? `(Ref: ${ap.transactionId})` : ''}</span>
                                            <span className="font-bold">₹{ap.amount?.toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Items — Order Form se, har item ke aage sirf uska Billing Amount */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-semibold px-4">Item Name</TableHead>
                                        <TableHead className="text-center font-semibold">Qty</TableHead>
                                        <TableHead className="text-right font-semibold px-4">Billing Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewFormLoading ? (
                                        <TableRow><TableCell colSpan={3} className="text-center h-20 text-slate-400 italic">Loading Order Form items...</TableCell></TableRow>
                                    ) : !viewCalc ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-20 text-amber-600 text-sm font-medium">
                                                This order's Order Form has not been submitted yet — items come from the Order Form.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {viewCalc.visible.map((it, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="px-4 font-medium">
                                                        {it.itemName}
                                                        {it.specification && <div className="text-[10px] text-slate-400 max-w-[320px] truncate">{it.specification}</div>}
                                                    </TableCell>
                                                    <TableCell className="text-center">{it.qty || '—'}</TableCell>
                                                    <TableCell className="text-right px-4 font-bold">₹{(Number(it.billAmount) || 0).toLocaleString('en-IN')}</TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-slate-50">
                                                <TableCell colSpan={2} className="px-4 text-right text-xs font-semibold text-slate-500">Bill Amount (incl. additional charges)</TableCell>
                                                <TableCell className="text-right px-4 font-bold">₹{viewCalc.bill.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                            <TableRow className="bg-slate-50">
                                                <TableCell colSpan={2} className="px-4 text-right text-xs font-semibold text-slate-500">GST Amount</TableCell>
                                                <TableCell className="text-right px-4 font-bold">₹{viewCalc.gst.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                            <TableRow className="bg-blue-50">
                                                <TableCell colSpan={2} className="px-4 text-right text-sm font-bold text-blue-900">Grand Total (Bill + GST)</TableCell>
                                                <TableCell className="text-right px-4 font-bold text-blue-700">₹{viewCalc.pakkaTotal.toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        </>
                                    )}
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
                                <Button
                                    className="bg-blue-600 text-white"
                                    onClick={() => {
                                        setBillingOrder(viewOrder);
                                        setViewOrder(null);
                                    }}
                                >
                                    Generate Invoice
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Billing Selection Modal */}
            <Dialog open={!!billingOrder} onOpenChange={() => setBillingOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generate Invoice</DialogTitle>
                        <DialogDescription>Order {billingOrder?.orderCode}</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-6">

                        {/* Order Form status / totals preview — always Pakka figures */}
                        {billingFormLoading ? (
                            <p className="text-sm text-slate-400 italic text-center">Loading Order Form...</p>
                        ) : !billingCalc ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 font-medium">
                                This order's Order Form has not been submitted yet — the bill is generated from the Order Form's amounts. Please get the form submitted first.
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                                <p className="text-xs font-bold text-slate-500 uppercase">Order Form Totals</p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Bill Amount (incl. additional charges)</span>
                                    <span className="font-semibold">₹{billingCalc.bill.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">GST Amount</span>
                                    <span className="font-semibold">₹{billingCalc.gst.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-blue-700 border-t border-slate-200 pt-1">
                                    <span>Bill Total</span>
                                    <span>₹{billingCalc.pakkaTotal.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        )}

                        {/* Advanced Payment Notice */}
                        {billingAdvance > 0 && billingCalc && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Advanced Payment Applied
                                </p>
                                <div className="flex justify-between text-sm text-emerald-700">
                                    <span>Less: Advanced Paid</span>
                                    <span className="font-semibold">- ₹{billingAdvance.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-blue-700 border-t border-emerald-200 pt-1">
                                    <span>Net Payable</span>
                                    <span>₹{Math.max(0, billingCalc.pakkaTotal - billingAdvance).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        )}

                        <Button
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase"
                            onClick={handleGenerateClick}
                            disabled={
                                generateInvoiceMutation.isLoading
                                || billingFormLoading
                                || !billingCalc
                            }
                        >
                            {generateInvoiceMutation.isLoading ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                    </div>
                    {generateInvoiceMutation.isLoading && <div className="text-center text-xs font-bold text-blue-600 animate-pulse">Processing official record...</div>}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesOrders;
