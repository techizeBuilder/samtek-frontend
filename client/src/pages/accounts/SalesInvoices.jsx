import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
    Printer
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
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
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';

const SalesInvoices = () => {
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

    const { data: invoicesResponse, isLoading: isInvoicesLoading } = useQuery({
        queryKey: ['/api/accounts/sales/account/invoices', searchTerm],
        queryFn: () => apiRequest('GET', `/api/accounts/sales/account/invoices?search=${searchTerm}`)
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
    useEffect(() => {
        if (isAddModalOpen) {
            const currentYear = new Date().getFullYear();
            const allInvoices = invoicesResponse?.data?.invoices || [];
            // Count invoices for current year from existing list
            const yearInvoices = allInvoices.filter(inv => {
                const invNo = inv.invoiceNumber || '';
                return invNo.startsWith(`INV-${currentYear}-`);
            });
            // Find highest series number
            let maxSeries = yearInvoices.reduce((max, inv) => {
                const parts = (inv.invoiceNumber || '').split('-');
                const num = parseInt(parts[2]) || 0;
                return Math.max(max, num);
            }, 0);
            const nextSeries = String(maxSeries + 1).padStart(2, '0');
            setAutoInvoiceNo(`INV-${currentYear}-${nextSeries}`);
        }
    }, [isAddModalOpen, invoicesResponse]);

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
        const gstAmount = items.reduce((sum, item) => sum + (item.totalPrice * item.gstPercent / 100), 0);
        const tdsAmount = (subtotal * tdsPercent / 100);
        const totalAmount = subtotal + gstAmount - tdsAmount;

        // Rounding to 2 decimal places to prevent floating point errors (e.g. 63.800000000000004)
        return {
            subtotal: Math.round(subtotal * 100) / 100,
            gstAmount: Math.round(gstAmount * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            tdsAmount: Math.round(tdsAmount * 100) / 100
        };
    };

    const { subtotal, gstAmount, totalAmount, tdsAmount } = calculateTotals();

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const invoiceData = {
            customerId: selectedCustomer,
            invoiceNo: autoInvoiceNo || formData.get('invoiceNumber'),
            saleDate: formData.get('saleDate'),
            dueDate: formData.get('dueDate'),
            items,
            subtotal,
            taxAmount: gstAmount,
            totalAmount,
            tdsAmount,
            tdsPercent,
            gstType,
            notes: formData.get('notes')
        };
        createMutation.mutate(invoiceData);
    };

    // ─── Print / PDF Invoice ────────────────────────────────────────
    const handlePrintInvoice = (inv) => {
        if (!inv) return;
        const rows = (inv.items || []).map((item, i) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 16px;font-weight:600;color:#1e293b;">${i + 1}. ${item.productName || item.itemName || 'Item'}</td>
                <td style="padding:12px 16px;text-align:center;color:#475569;">${item.quantity}</td>
                <td style="padding:12px 16px;text-align:right;color:#475569;">₹${(item.unitPrice || 0).toLocaleString('en-IN')}</td>
                <td style="padding:12px 16px;text-align:center;color:#64748b;">${item.tax || item.gstPercent || 0}%</td>
                <td style="padding:12px 16px;text-align:right;font-weight:700;color:#0f172a;">₹${(item.totalPrice || 0).toLocaleString('en-IN')}</td>
            </tr>
        `).join('');

        // Sunrise logo as inline SVG (sun icon)
        const logoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>`;

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${inv.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Arial,sans-serif; }
    body { background:#fff; color:#1e293b; }
    .header { background: linear-gradient(135deg,#1e3a8a,#3730a3); color:#fff; padding:32px 40px; border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center; }
    .logo-area { display:flex; align-items:center; gap:16px; }
    .company-name { font-size:28px; font-weight:900; letter-spacing:-1px; }
    .company-sub  { font-size:11px; color:#bfdbfe; margin-top:4px; text-transform:uppercase; letter-spacing:2px; }
    .company-gst  { font-size:10px; color:#93c5fd; margin-top:6px; font-weight:600; letter-spacing:1px; }
    .invoice-badge { background:rgba(255,255,255,0.15); padding:12px 24px; border-radius:50px; text-align:right; }
    .invoice-no { font-size:20px; font-weight:900; }
    .invoice-label { font-size:10px; color:#bfdbfe; text-transform:uppercase; letter-spacing:2px; }
    .meta { display:flex; justify-content:space-between; padding:24px 40px; background:#f8fafc; border-left:4px solid #3730a3; margin:0; }
    .meta-block label { font-size:9px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:2px; display:block; margin-bottom:4px; }
    .meta-block span  { font-size:14px; font-weight:700; color:#0f172a; }
    .meta-block .sub-info { font-size:11px; color:#64748b; margin-top:2px; }
    .section { padding:24px 40px; }
    .section-title { font-size:10px; font-weight:900; color:#94a3b8; text-transform:uppercase; letter-spacing:3px; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#f1f5f9; }
    thead th { padding:10px 16px; text-align:left; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:2px; color:#64748b; }
    thead th.right { text-align:right; }
    thead th.center { text-align:center; }
    .totals { margin:0 40px; border-radius:12px; background:#f8fafc; padding:20px 28px; }
    .totals-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#475569; }
    .totals-row.grand { padding-top:12px; margin-top:8px; border-top:2px solid #e2e8f0; font-size:20px; font-weight:900; color:#1e3a8a; }
    .footer { padding:20px 40px; text-align:center; color:#94a3b8; font-size:10px; border-top:1px solid #f1f5f9; margin-top:16px; }
    .status-badge { display:inline-block; padding:4px 14px; border-radius:50px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; }
    .status-paid { background:#dcfce7; color:#15803d; }
    .status-pending { background:#fef9c3; color:#a16207; }
    .status-overdue { background:#fee2e2; color:#b91c1c; }
    @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      ${logoSVG}
      <div>
        <div class="company-name">SUNRISE</div>
        <div class="company-sub">Sales &amp; Distribution ERP</div>
        <div class="company-gst">GST No: ${inv.companyId?.gst || '—'}</div>
      </div>
    </div>
    <div class="invoice-badge">
      <div class="invoice-label">Tax Invoice</div>
      <div class="invoice-no">${inv.invoiceNumber}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <label>Billed To</label>
      <span>${inv.customer?.name || 'N/A'}</span>
      <div class="sub-info">GST No: ${inv.customer?.gstin || '—'}</div>
    </div>
    <div class="meta-block">
      <label>Invoice Date</label>
      <span>${new Date(inv.saleDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
    </div>
    <div class="meta-block">
      <label>Due Date</label>
      <span>${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
    </div>
    <div class="meta-block">
      <label>Status</label>
      <span class="status-badge ${inv.paymentStatus === 'Paid' ? 'status-paid' : inv.paymentStatus === 'Overdue' ? 'status-overdue' : 'status-pending'}">${inv.paymentStatus || 'Pending'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Item Details</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="center">Qty</th>
          <th class="right">Rate (₹)</th>
          <th class="center">GST %</th>
          <th class="right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

    <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>₹${(inv.subtotal || 0).toLocaleString('en-IN')}</span></div>
    <div class="totals-row"><span>Tax (GST)</span><span>₹${(inv.taxAmount || 0).toLocaleString('en-IN')}</span></div>
    ${inv.tdsAmount > 0 ? `<div class="totals-row" style="color:#e11d48;font-weight:600;"><span>TDS Deduction (${inv.tdsPercent}%)</span><span>- ₹${(inv.tdsAmount || 0).toLocaleString('en-IN')}</span></div>` : ''}
    <div class="totals-row grand"><span>Grand Total</span><span>₹${(inv.totalAmount || 0).toLocaleString('en-IN')}</span></div>
  </div>

  ${inv.notes ? `<div class="section"><div class="section-title">Remarks</div><p style="color:#475569;font-style:italic;">${inv.notes}</p></div>` : ''}

  <div class="footer">
    Generated by Sunrise ERP &bull; This is a computer-generated invoice and does not require a signature.
  </div>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 500);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Paid': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Paid</Badge>;
            case 'Partially Paid': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Partial</Badge>;
            case 'Overdue': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Overdue</Badge>;
            default: return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Pending</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Invoices</h1>
                    <p className="text-slate-500 mt-1">Generate invoices and track receivables automatically.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95">
                        <Plus className="w-4 h-4 mr-2" /> New Invoice
                    </Button>
                </div>
            </div>

            {/* Invoices List */}
            <Card className="border-0 shadow-xl overflow-hidden bg-white">
                <CardHeader className="border-b bg-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold">Recent Billing</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search invoice or customer..."
                                className="pl-10 h-9 text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="px-6">Invoice</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right px-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isInvoicesLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6} className="text-center h-12 text-slate-400">Loading...</TableCell></TableRow>
                                ))
                            ) : invoicesResponse?.data?.invoices?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-32">
                                        <p className="text-slate-500 italic">No invoices found.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoicesResponse?.data?.invoices?.map((inv) => (
                                    <TableRow key={inv._id} className="hover:bg-slate-50/50 group">
                                        <TableCell className="px-6 font-bold text-slate-900">{inv.invoiceNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{inv.customer?.name}</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">{inv.customer?.customerCode}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{new Date(inv.saleDate).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right font-black text-slate-900">₹{inv.totalAmount.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-center">{getStatusBadge(inv.paymentStatus)}</TableCell>
                                        <TableCell className="text-right px-6">
                                            <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => setViewInvoice(inv)}>
                                                <Eye className="w-4 h-4 mr-2" /> View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create Invoice Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[1100px] max-h-[95vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl">
                    <DialogHeader className="p-6 border-b bg-white rounded-t-3xl">
                        <DialogTitle className="flex items-center text-xl font-bold text-slate-900">
                            <Receipt className="w-5 h-5 mr-3 text-blue-600" />
                            Create New Sales Invoice
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/50">
                        {/* Summary Header */}
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-white rounded-3xl shadow-sm border border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Account</label>
                                    <select
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                                        value={selectedCustomer}
                                        onChange={(e) => {
                                            const custId = e.target.value;
                                            setSelectedCustomer(custId);
                                            const customer = customersData?.data?.find(c => c._id === custId);
                                            if (customer) {
                                                const section = customer.tdsSection;
                                                const entityType = customer.entityType;
                                                let rate = 0;

                                                if (section === '194C') {
                                                    rate = (entityType === 'Individual' || entityType === 'HUF') ? 1 : 2;
                                                } else if (section === '194J') {
                                                    rate = 10;
                                                } else if (section === '194Q' || section === '206C_1H') {
                                                    rate = 0.1;
                                                }

                                                setTdsPercent(rate);
                                            }
                                        }}
                                        required
                                    >
                                        <option value="">Select Customer</option>
                                        {customersData?.data?.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.customerCode})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Invoice No.</label>
                                    <Input
                                        name="invoiceNumber"
                                        value={autoInvoiceNo}
                                        onChange={(e) => setAutoInvoiceNo(e.target.value)}
                                        className="bg-blue-50 border-blue-200 rounded-xl h-12 font-bold text-blue-700"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sale Date</label>
                                    <Input name="saleDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="bg-slate-50 border-slate-200 rounded-xl h-12" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Due Date</label>
                                    <Input name="dueDate" type="date" defaultValue={new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} className="bg-slate-50 border-slate-200 rounded-xl h-12" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">GST Type</label>
                                    <select
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 transition-all font-semibold h-12"
                                        value={gstType}
                                        onChange={(e) => setGstType(e.target.value)}
                                        required
                                    >
                                        <option value="CGST_SGST">Local (CGST + SGST)</option>
                                        <option value="IGST">Inter-state (IGST)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b flex items-center justify-between bg-white">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                                        <h3 className="text-lg font-black text-slate-800 italic uppercase tracking-wider">Line Items</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            className="bg-blue-50 border-blue-200 text-blue-700 rounded-full px-6 h-10 text-sm font-bold appearance-none cursor-pointer hover:bg-blue-100 transition-colors shadow-sm"
                                            onChange={(e) => {
                                                const item = salesItemsData?.data?.items?.find(i => i._id === e.target.value);
                                                if (item) addItem(item);
                                                e.target.value = '';
                                            }}
                                        >
                                            <option value="">+ SELECT PRODUCT</option>
                                            {salesItemsData?.data?.items?.map(item => (
                                                <option key={item._id} value={item._id}>{item.name} ({item.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="w-[30%] px-6 text-[10px] font-black uppercase text-slate-400">Description</TableHead>
                                                <TableHead className="w-[15%] text-[10px] font-black uppercase text-slate-400">Qty</TableHead>
                                                <TableHead className="w-[15%] text-[10px] font-black uppercase text-slate-400">Rate (₹)</TableHead>
                                                <TableHead className="w-[10%] text-[10px] font-black uppercase text-slate-400">GST %</TableHead>
                                                <TableHead className="text-right px-6 text-[10px] font-black uppercase text-slate-400">Amount (₹)</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-slate-100">
                                            {items.map((item, idx) => (
                                                <TableRow key={idx} className="group transition-colors hover:bg-slate-50/30">
                                                    <TableCell className="px-6 py-4 font-bold text-slate-900">{item.itemName}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            className="h-9 border-slate-200 rounded-lg text-center"
                                                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="text"
                                                            value={item.unitPrice}
                                                            className="h-9 border-slate-200 rounded-lg text-right font-mono"
                                                            onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={item.gstPercent}
                                                            className="h-9 border-slate-200 rounded-lg text-center"
                                                            onChange={(e) => updateItem(idx, 'gstPercent', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right px-6 font-black text-slate-900">
                                                        ₹{item.totalPrice.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Footer Summary */}
                                    <div className="p-8 border-t bg-slate-50 flex justify-between items-start rounded-b-3xl">
                                        <div className="w-1/2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Remarks</label>
                                            <textarea
                                                name="notes"
                                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                                placeholder="Add any internal notes..."
                                            />
                                        </div>
                                        <div className="w-1/3 space-y-2">
                                            <div className="flex justify-between text-sm text-slate-600">
                                                <span>Subtotal</span>
                                                <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-slate-600">
                                                <span>Tax (GST) - {gstType === 'CGST_SGST' ? '9%+9%' : '18%'}</span>
                                                <span className="font-semibold">₹{gstAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm text-slate-600 gap-4">
                                                <span>TDS Deduction (%)</span>
                                                <Input
                                                    type="number"
                                                    className="w-20 h-8 text-right font-semibold bg-white border-slate-200 no-spinner"
                                                    value={tdsPercent}
                                                    onChange={(e) => setTdsPercent(parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    max="10"
                                                />
                                            </div>
                                            <div className="flex justify-between text-sm text-rose-600 font-bold">
                                                <span>TDS Amount (-)</span>
                                                <span>₹{tdsAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="h-px bg-slate-200 my-2" />
                                            <div className="flex justify-between items-end">
                                                <span className="text-sm font-bold text-slate-900">Total Amount</span>
                                                <span className="text-3xl font-bold text-blue-600">₹{totalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-8 pb-8 flex justify-end gap-3">
                                    <Button type="button" variant="outline" className="rounded-full px-8 border-slate-200" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={createMutation.isLoading || items.length === 0} className="bg-blue-600 hover:bg-blue-700 rounded-full px-12 font-black italic shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                                        {createMutation.isLoading ? 'POSTING TO LEDGER...' : 'FINALIZE & POST INVOICE'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Invoice Details (Full Modal) */}
            <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
                <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-[1.5rem]">
                    <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Receipt className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 flex justify-between items-center w-full">
                            <div className="flex items-center gap-5">
                                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                                    <FileText className="w-8 h-8 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-bold">Invoice #{viewInvoice?.invoiceNumber}</DialogTitle>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-blue-100 flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5" /> {new Date(viewInvoice?.saleDate).toLocaleDateString()}
                                        </span>
                                        {getStatusBadge(viewInvoice?.paymentStatus)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">Total Receivable</div>
                                <div className="text-4xl font-black tracking-tight">₹{viewInvoice?.totalAmount?.toLocaleString()}</div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 space-y-8 custom-scrollbar">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Billed To</h4>
                                        <div className="text-xl font-bold text-slate-900 tracking-tight">{viewInvoice?.customer?.name}</div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">Code: {viewInvoice?.customer?.customerCode}</span>
                                            {viewInvoice?.customer?.gstin && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">GST: {viewInvoice.customer.gstin}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Breakdown</h4>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <div className="text-2xl font-bold text-slate-900 tracking-tight">₹{viewInvoice?.balanceAmount?.toLocaleString('en-IN')}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Balance</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-600">₹{viewInvoice?.paidAmount?.toLocaleString('en-IN')}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-green-600">Received So Far</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-3 uppercase tracking-widest">
                                    <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                                    Billed Inventory Details
                                </h3>
                                <Badge className="bg-slate-900 text-[9px] font-bold uppercase tracking-wider rounded-full px-4">{viewInvoice?.items?.length || 0} Line Items</Badge>
                            </div>

                            <Card className="rounded-2xl border-0 shadow-sm overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-0">
                                            <TableHead className="px-8 h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Product Description</TableHead>
                                            <TableHead className="text-center h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Qty</TableHead>
                                            <TableHead className="text-right h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Rate (₹)</TableHead>
                                            <TableHead className="text-center h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Tax Detail</TableHead>
                                            <TableHead className="text-right px-8 h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Total Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewInvoice?.items?.map((item, idx) => (
                                            <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="px-8 py-5">
                                                    <div className="font-semibold text-slate-900">{item.productName || item.itemName}</div>
                                                </TableCell>
                                                <TableCell className="text-center text-slate-600 font-medium">{item.quantity}</TableCell>
                                                <TableCell className="text-right text-slate-600 font-mono text-sm">₹{item.unitPrice?.toLocaleString()}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-500 px-2">{item.tax || 0}% GST</Badge>
                                                </TableCell>
                                                <TableCell className="text-right px-8 font-bold text-slate-900">₹{item.totalPrice?.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter className="bg-slate-50 border-t-2 border-slate-100">
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={4} className="text-right py-4 px-8 text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal</TableCell>
                                            <TableCell className="text-right px-8 font-bold text-slate-900">₹{viewInvoice?.subtotal?.toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={4} className="text-right py-2 px-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Tax ({viewInvoice?.gstType === 'CGST_SGST' ? 'CGST+SGST' : 'IGST'})
                                            </TableCell>
                                            <TableCell className="text-right px-8 font-bold text-slate-600">₹{viewInvoice?.taxAmount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                        {viewInvoice?.tdsAmount > 0 && (
                                            <TableRow className="hover:bg-transparent">
                                                <TableCell colSpan={4} className="text-right py-2 px-8 text-xs font-bold text-rose-500 uppercase tracking-wider">
                                                    TDS Deduction ({viewInvoice?.tdsPercent}%)
                                                </TableCell>
                                                <TableCell className="text-right px-8 font-bold text-rose-500">(-₹{viewInvoice?.tdsAmount?.toLocaleString()})</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow className="hover:bg-transparent border-t-2 border-slate-200">
                                            <TableCell colSpan={4} className="text-right py-6 px-8 text-sm font-bold text-blue-600 uppercase tracking-widest">Grand Total</TableCell>
                                            <TableCell className="text-right px-8 py-6 text-2xl font-bold text-blue-600">₹{viewInvoice?.totalAmount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </Card>
                        </div>

                        {viewInvoice?.notes && (
                            <div className="p-6 bg-white rounded-2xl border border-slate-200 relative">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" /> Remarks
                                </h4>
                                <p className="text-slate-600 leading-relaxed font-medium italic">"{viewInvoice.notes}"</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t bg-white flex justify-end gap-3 shrink-0">
                        <Button
                            variant="outline"
                            className="h-11 rounded-xl px-6 font-bold uppercase text-xs tracking-wider gap-2 border-slate-200 hover:bg-slate-50 transition-all"
                            onClick={() => handlePrintInvoice(viewInvoice)}
                        >
                            <Printer className="w-4 h-4" /> Print / PDF
                        </Button>
                        <Button
                            onClick={() => setViewInvoice(null)}
                            className="h-11 rounded-xl px-8 bg-slate-900 text-white font-bold uppercase text-xs tracking-widest transition-all active:scale-95"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesInvoices;
