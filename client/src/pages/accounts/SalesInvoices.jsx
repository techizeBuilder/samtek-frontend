import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
    Plus,
    Search,
    Receipt,
    TrendingUp,
    Trash2,
    Download,
    Eye,
    FileText,
    CheckCircle2,
    Clock,
    User,
    Calendar,
    ArrowRight,
    Printer,
    Filter,
    ShieldCheck,
    Check
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from '@/components/ui/table';
import { format } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';

const SalesInvoices = () => {
    const { hasFeatureAccess } = usePermissions();
    const canAdd = hasFeatureAccess('accounts', 'sales', 'add');
    const { toast } = useToast();
    const { user } = useAuthContext();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [viewInvoice, setViewInvoice] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [autoInvoiceNo, setAutoInvoiceNo] = useState('');
    const [tdsPercent, setTdsPercent] = useState(0);
    const [gstType, setGstType] = useState('CGST_SGST');
    const [page, setPage] = useState(1);

    const changeSearch = (value) => { setSearchTerm(value); setPage(1); };

    // Kachha is a hidden feature — this list only ever shows/creates Pakka
    // invoices; Kachha bills are only reachable via the triple-click gesture
    // on download (see handlePrintClick below).
    const activeTab = 'Pakka';
    const [generatingInvoice, setGeneratingInvoice] = useState(null); // The order being invoiced
    const [viewOrder, setViewOrder] = useState(null);

    // Print/Download click-count gesture: 1 (or 2) clicks downloads the
    // Pakka bill, 3 rapid clicks downloads the Kachha bill (if one exists
    // for that order). Tracked per invoice id so clicking different rows
    // doesn't merge their click counts.
    const printClickRef = useRef({ id: null, count: 0, timer: null });

    const { data: invoicesResponse, isLoading: isInvoicesLoading } = useQuery({
        queryKey: ['/api/accounts/sales/account/invoices', page, searchTerm, activeTab],
        queryFn: () => apiRequest('GET', `/api/accounts/sales/account/invoices?page=${page}&limit=20&search=${encodeURIComponent(searchTerm)}&type=${activeTab}`),
        keepPreviousData: true,
    });

    const { data: customersData } = useQuery({
        queryKey: ['/api/customers/dropdown'],
        queryFn: () => apiRequest('GET', '/api/customers/dropdown/list')
    });

    const { data: salesItemsData } = useQuery({
        queryKey: ['/api/accounts/sales/account/items'],
        queryFn: () => apiRequest('GET', '/api/accounts/sales/account/items')
    });


    // ─── Auto Invoice Number Generator ──────────────────────────────
    // Fetches just the next available series number for the current year
    // instead of pulling every invoice the company has ever issued.
    const { data: nextInvoiceNumberResponse } = useQuery({
        queryKey: ['/api/accounts/sales/account/invoices/next-number'],
        queryFn: () => apiRequest('GET', '/api/accounts/sales/account/invoices/next-number'),
        enabled: isAddModalOpen
    });

    useEffect(() => {
        if (isAddModalOpen && nextInvoiceNumberResponse?.invoiceNumber) {
            setAutoInvoiceNo(nextInvoiceNumberResponse.invoiceNumber);
        }
    }, [isAddModalOpen, nextInvoiceNumberResponse]);

    const createMutation = useMutation({
        mutationFn: (invoiceData) => apiRequest('POST', '/api/accounts/sales/account/invoices', invoiceData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/sales/account/invoices'] });
            toast({ title: "Invoice Created", description: "Ledger updated and inventory adjusted." });
            setIsAddModalOpen(false);
            setItems([]);
            setSelectedCustomer('');
            setAutoInvoiceNo('');
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const addItem = (item) => {
        const price = item.mrp || item.salePrice || item.stdCost || 0;
        const newItem = {
            item: item._id,
            itemName: item.name,
            quantity: 1,
            unitPrice: price,
            gstPercent: item.gst || 18,
            totalPrice: price
        };
        setItems([...items, newItem]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        const val = parseFloat(value) || 0;
        newItems[index][field] = val;
        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
        }
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const gstAmount = activeTab === 'Kachha' ? 0 : items.reduce((sum, item) => sum + (item.totalPrice * item.gstPercent / 100), 0);
        const tdsAmount = (subtotal * tdsPercent / 100);
        const totalAmount = activeTab === 'Kachha' ? subtotal : (subtotal + gstAmount - tdsAmount);
        return { subtotal, gstAmount, tdsAmount, totalAmount };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const { subtotal, gstAmount, tdsAmount, totalAmount } = calculateTotals();
        const invoiceData = {
            orderId: generatingInvoice?._id || null,
            customerId: selectedCustomer,
            invoiceNo: autoInvoiceNo,
            saleDate: e.target.saleDate.value,
            dueDate: e.target.dueDate.value,
            items: items.map(it => ({
                item: it.item,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice,
                tax: it.gstPercent
            })),
            subtotal,
            taxAmount: gstAmount,
            totalAmount,
            tdsPercent,
            tdsAmount,
            invoiceType: activeTab,
            gstType,
            notes: e.target.notes.value
        };
        createMutation.mutate(invoiceData);
    };

    const handlePrintInvoice = async (inv) => {
        try {
            toast({ title: "Downloading...", description: "Generating your official PDF bill." });
            
            // Get the token from localStorage (standard for this app)
            const token = localStorage.getItem('samtek_auth_token') || localStorage.getItem('token');
            
            const response = await fetch(`/api/accounts/sales/account/invoices/${inv._id}/pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to generate PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${inv.invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast({ title: "Success", description: "Invoice downloaded successfully." });
        } catch (error) {
            console.error('PDF Download Error:', error);
            toast({ 
                title: "Download Failed", 
                description: "There was an error generating the PDF. Please try again.",
                variant: "destructive" 
            });
        }
    };

    const PRINT_CLICK_RESOLVE_MS = 400;

    // 1 (or 2) clicks downloads this row's Pakka bill; 3 rapid clicks
    // downloads the Kachha bill for the same order, if one has been
    // generated. Resolved after a short pause so a triple-click doesn't
    // also fire the single-click Pakka download along the way.
    const handlePrintClick = (inv) => {
        const state = printClickRef.current;
        if (state.id !== inv._id) {
            if (state.timer) clearTimeout(state.timer);
            state.id = inv._id;
            state.count = 0;
        }
        state.count += 1;
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(() => {
            const count = state.count;
            state.count = 0;
            state.id = null;
            if (count >= 3) {
                if (inv.siblingInvoice) {
                    handlePrintInvoice(inv.siblingInvoice);
                } else {
                    toast({ title: "No Kachha bill", description: "No Kachha bill has been generated for this order yet." });
                }
            } else {
                handlePrintInvoice(inv);
            }
        }, PRINT_CLICK_RESOLVE_MS);
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Sales Invoices</h1>
                    <p className="text-slate-500 text-sm">Manage and generate customer invoices</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Receipt className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Invoice</p>
                            <h3 className="text-xl font-bold text-slate-900">{invoicesResponse?.data?.summary?.totalInvoices || 0}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600"><TrendingUp className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Revenue</p>
                            <h3 className="text-xl font-bold text-slate-900">₹{(invoicesResponse?.data?.summary?.totalRevenue || 0).toLocaleString('en-IN')}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Clock className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Orders</p>
                            <h3 className="text-xl font-bold text-slate-900">{invoicesResponse?.data?.summary?.pendingOrdersCount ?? invoicesResponse?.data?.pendingOrders?.length ?? 0}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-xl text-red-600"><Trash2 className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Unpaid Balance</p>
                            <h3 className="text-xl font-bold text-slate-900">₹{(invoicesResponse?.data?.summary?.unpaidBalance || 0).toLocaleString('en-IN')}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card className="border-0 shadow-sm overflow-hidden bg-white">
                <CardHeader className="border-b px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold">Invoice Records</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    placeholder="Search by invoice or customer..." 
                                    className="pl-10 w-full sm:w-64 border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => changeSearch(e.target.value)}
                                />
                            </div>
                            {canAdd && (
                                <Button onClick={() => { setGeneratingInvoice(null); setIsAddModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" /> New Invoice
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="px-6 font-semibold">Reference</TableHead>
                                    <TableHead className="font-semibold">Customer</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="text-right font-semibold">Amount</TableHead>
                                    <TableHead className="text-right px-6 font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isInvoicesLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}><TableCell colSpan={5} className="text-center h-24 text-slate-300 italic">Loading...</TableCell></TableRow>
                                    ))
                                ) : (
                                    <>
                                        {/* Render Pending Orders */}
                                        {invoicesResponse?.data?.pendingOrders?.map((order) => (
                                            <TableRow key={order._id} className="bg-amber-50/30 border-l-4 border-amber-400">
                                                <TableCell className="px-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900">{order.orderCode}</span>
                                                        <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pending {activeTab} Bill</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700">{order.customer?.name}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase">{order.customer?.customerCode}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">{format(new Date(order.orderDate), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right px-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50" onClick={() => setViewOrder(order)}>
                                                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                                                        </Button>
                                                        <Button size="sm" className="h-8 bg-slate-900 text-white" onClick={() => { setGeneratingInvoice(order); setIsAddModalOpen(true); }}>
                                                            Generate
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Render Existing Invoices */}
                                        {invoicesResponse?.data?.invoices?.length === 0 && invoicesResponse?.data?.pendingOrders?.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center h-48 text-slate-400 italic">No records found.</TableCell></TableRow>
                                        ) : (
                                            invoicesResponse?.data?.invoices?.map((inv) => (
                                                <TableRow key={inv._id} className="hover:bg-slate-50">
                                                    <TableCell className="px-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                                                            <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Generated</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700">{inv.customer?.name}</span>
                                                            <span className="text-[10px] text-slate-400 uppercase">{inv.customer?.customerCode}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-500 text-sm">{format(new Date(inv.saleDate), 'dd MMM yyyy')}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-900">₹{inv.totalAmount.toLocaleString('en-IN')}</TableCell>
                                                    <TableCell className="text-right px-6">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50" onClick={() => setViewInvoice(inv)}>
                                                                <Eye className="w-3.5 h-3.5 mr-1" /> View
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:bg-slate-100" onClick={() => handlePrintClick(inv)}>
                                                                <Printer className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {invoicesResponse?.data?.pagination?.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 py-4 border-t">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={invoicesResponse.data.pagination.page <= 1}>Previous</Button>
                            <span className="text-sm text-slate-500">Page {invoicesResponse.data.pagination.page} of {invoicesResponse.data.pagination.pages} ({invoicesResponse.data.pagination.total} invoices)</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={invoicesResponse.data.pagination.page >= invoicesResponse.data.pagination.pages}>Next</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Invoice Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Generate {activeTab} Invoice</DialogTitle>
                        <DialogDescription>Fill in the details to create a new official document.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Customer</label>
                                <select 
                                    className="w-full bg-white border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                                    value={selectedCustomer}
                                    onChange={(e) => {
                                        const custId = e.target.value;
                                        setSelectedCustomer(custId);
                                        const customer = customersData?.data?.find(c => c._id === custId);
                                        if (customer) {
                                            const section = customer.tdsSection;
                                            const entityType = customer.entityType;
                                            let rate = 0;
                                            if (section === '194C') rate = (entityType === 'Individual' || entityType === 'HUF') ? 1 : 2;
                                            else if (section === '194J') rate = 10;
                                            else if (section === '194Q' || section === '206C_1H') rate = 0.1;
                                            setTdsPercent(rate);
                                        }
                                    }}
                                    required
                                >
                                    <option value="">Select Customer</option>
                                    {customersData?.data?.map(cust => <option key={cust._id} value={cust._id}>{cust.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Invoice No</label>
                                <Input value={autoInvoiceNo} onChange={(e) => setAutoInvoiceNo(e.target.value)} required className="bg-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">GST Type</label>
                                <select className="w-full bg-white border rounded-md p-2 text-sm" value={gstType} onChange={(e) => setGstType(e.target.value)}>
                                    <option value="CGST_SGST">CGST + SGST (Intra-state)</option>
                                    <option value="IGST">IGST (Inter-state)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Sale Date</label>
                                <Input type="date" name="saleDate" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="bg-white" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Due Date</label>
                                <Input type="date" name="dueDate" defaultValue={format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')} className="bg-white" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">TDS (%)</label>
                                <Input type="number" step="0.1" value={tdsPercent} onChange={(e) => setTdsPercent(parseFloat(e.target.value))} className="bg-white" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Items & Products</h3>
                                <div className="flex gap-2">
                                    <select 
                                        className="bg-white border rounded-md p-2 text-sm min-w-[200px]"
                                        onChange={(e) => {
                                            const item = salesItemsData?.data?.items?.find(i => i._id === e.target.value);
                                            if (item) addItem(item);
                                        }}
                                        value=""
                                    >
                                        <option value="">Add Product...</option>
                                        {salesItemsData?.data?.items?.map(item => <option key={item._id} value={item._id}>{item.name} (Stock: {item.qty})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-semibold">Item Name</TableHead>
                                            <TableHead className="w-32 text-center font-semibold">Qty</TableHead>
                                            <TableHead className="w-40 text-right font-semibold">Unit Price</TableHead>
                                            <TableHead className="w-40 text-right font-semibold">Total</TableHead>
                                            <TableHead className="w-16"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, index) => (
                                            <TableRow key={index} className="bg-white">
                                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                                <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="text-center h-8" /></TableCell>
                                                <TableCell><Input type="number" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} className="text-right h-8" /></TableCell>
                                                <TableCell className="text-right font-bold">₹{item.totalPrice.toLocaleString()}</TableCell>
                                                <TableCell><Button variant="ghost" size="sm" onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-red-500 h-8 w-8 p-0"><Trash2 className="w-4 h-4" /></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 pt-4 border-t">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Internal Notes</label>
                                <textarea name="notes" className="w-full bg-slate-50 border rounded-md p-3 text-sm h-32 focus:ring-2 focus:ring-blue-500" placeholder="Add any terms or notes here..."></textarea>
                            </div>
                            <div className="w-full md:w-80 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-bold text-slate-900">₹{calculateTotals().subtotal.toLocaleString()}</span>
                                </div>
                                {activeTab === 'Pakka' && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">GST (Calculated)</span>
                                        <span className="font-bold text-slate-900">₹{calculateTotals().gstAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                {tdsPercent > 0 && (
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span className="font-medium">TDS ({tdsPercent}%)</span>
                                        <span className="font-bold">-₹{calculateTotals().tdsAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="pt-3 border-t flex justify-between items-center">
                                    <span className="font-bold text-slate-900">Total Amount</span>
                                    <span className="text-2xl font-bold text-blue-600">₹{calculateTotals().totalAmount.toLocaleString()}</span>
                                </div>
                                <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs" disabled={createMutation.isLoading || items.length === 0}>
                                    {createMutation.isLoading ? 'Processing...' : 'Complete Generation'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Invoice Modal */}
            <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Invoice Details</DialogTitle>
                        <DialogDescription>Reference: {viewInvoice?.invoiceNumber}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-8 mt-4">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-slate-50 p-6 rounded-xl border">
                                <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Customer Details</p>
                                <p className="font-bold text-slate-900 text-lg">{viewInvoice?.customer?.name}</p>
                                <p className="text-sm text-slate-500 mt-1">{viewInvoice?.customer?.address1}</p>
                                <p className="text-sm text-slate-500">{viewInvoice?.customer?.city}, {viewInvoice?.customer?.state}</p>
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">GSTIN: {viewInvoice?.customer?.gstin || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-blue-100 text-[10px] uppercase font-bold mb-1">Invoice Amount</p>
                                        <p className="text-3xl font-bold">₹{viewInvoice?.totalAmount?.toLocaleString()}</p>
                                    </div>
                                    <Badge className="bg-white/20 text-white border-none">{viewInvoice?.invoiceType}</Badge>
                                </div>
                                <div className="mt-6 pt-4 border-t border-white/10 flex justify-between text-xs">
                                    <div>
                                        <p className="text-blue-100 uppercase font-bold mb-1">Date</p>
                                        <p className="font-bold">{viewInvoice?.saleDate && format(new Date(viewInvoice.saleDate), 'dd MMM yyyy')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-blue-100 uppercase font-bold mb-1">Due Date</p>
                                        <p className="font-bold">{viewInvoice?.dueDate && format(new Date(viewInvoice.dueDate), 'dd MMM yyyy')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="px-6 font-semibold">Item Description</TableHead>
                                        <TableHead className="text-center font-semibold">Qty</TableHead>
                                        <TableHead className="text-right font-semibold">Rate</TableHead>
                                        <TableHead className="text-right px-6 font-semibold">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewInvoice?.items?.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="px-6 font-medium">{item.productName}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">₹{item.unitPrice?.toLocaleString()}</TableCell>
                                            <TableCell className="text-right px-6 font-bold">₹{item.totalPrice?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-slate-50/50">
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold text-slate-500">Subtotal</TableCell>
                                        <TableCell className="text-right px-6 font-bold">₹{viewInvoice?.subtotal?.toLocaleString()}</TableCell>
                                    </TableRow>
                                    {viewInvoice?.taxAmount > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold text-slate-500">GST Total</TableCell>
                                            <TableCell className="text-right px-6 font-bold text-blue-600">₹{viewInvoice?.taxAmount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )}
                                    {viewInvoice?.tdsAmount > 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold text-slate-500">TDS Deduction</TableCell>
                                            <TableCell className="text-right px-6 font-bold text-red-600">-₹{viewInvoice?.tdsAmount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    )}
                                </TableFooter>
                            </Table>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <Button variant="outline" onClick={() => setViewInvoice(null)}>Close</Button>
                            <Button className="bg-slate-900 text-white" onClick={() => handlePrintClick(viewInvoice)}>
                                <Printer className="w-4 h-4 mr-2" /> Print / Download PDF
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Order Modal */}
            <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Pending Order Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Customer</p>
                                <p className="font-bold text-slate-900">{viewOrder?.customer?.name}</p>
                                <p className="text-slate-500">{viewOrder?.customer?.address1}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Order Summary</p>
                                <p className="text-lg font-bold text-blue-600">₹{viewOrder?.totalAmount?.toLocaleString()}</p>
                                <p className="text-slate-500">Items: {viewOrder?.products?.length}</p>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="font-semibold">Product</TableHead>
                                        <TableHead className="text-center font-semibold">Qty</TableHead>
                                        <TableHead className="text-right font-semibold">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {viewOrder?.products?.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{item.product?.name}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-bold">₹{item.total?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => setViewOrder(null)}>Close</Button>
                            <Button className="bg-blue-600 text-white" onClick={() => { setGeneratingInvoice(viewOrder); setIsAddModalOpen(true); setViewOrder(null); }}>Proceed to Billing</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default SalesInvoices;
