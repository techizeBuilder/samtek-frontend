import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Search, Receipt, Calculator, ShoppingBag, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
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

const PurchaseInvoices = () => {
    const { toast } = useToast();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [selectedVendor, setSelectedVendor] = useState('');
    const [viewInvoice, setViewInvoice] = useState(null);
    const [tdsPercent, setTdsPercent] = useState(0);
    const [gstType, setGstType] = useState('CGST_SGST');
    const [page, setPage] = useState(1);
    const [itemSearchTerm, setItemSearchTerm] = useState('');

    const { data: invoicesData } = useQuery({
        queryKey: ['/api/accounts/purchases/invoices', page],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/invoices?page=${page}&limit=20`),
        keepPreviousData: true,
    });

    const { data: vendorsData } = useQuery({
        queryKey: ['/api/suppliers'],
        queryFn: () => apiRequest('GET', '/api/suppliers')
    });

    // Type-to-search against the backend instead of only ever showing the
    // first (alphabetically) 50 inventory items — previously this dropdown
    // had no search at all, so anything past the first page was simply
    // unreachable.
    const { data: inventoryData } = useQuery({
        queryKey: ['/api/accounts/purchases/items', itemSearchTerm],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/items?search=${encodeURIComponent(itemSearchTerm)}&limit=50`),
    });

    const mutation = useMutation({
        mutationFn: (invoiceData) => apiRequest('POST', '/api/accounts/purchases/invoices', invoiceData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/purchases/invoices'] });
            toast({ title: "Success", description: "Invoice recorded and posted to ledger" });
            setIsAddModalOpen(false);
            setItems([]);
        }
    });

    const addItem = (item) => {
        const newItem = {
            item: item._id,
            itemName: item.name,
            quantity: 1,
            unitPrice: item.purchaseCost || 0,
            gstPercent: item.gst || 0,
            totalPrice: item.purchaseCost || 0
        };
        setItems([...items, newItem]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = parseFloat(value);

        // Recalculate totalPrice
        const qty = newItems[index].quantity;
        const price = newItems[index].unitPrice;
        newItems[index].totalPrice = qty * price;

        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const gstAmount = items.reduce((sum, item) => sum + (item.totalPrice * item.gstPercent / 100), 0);
        const tdsAmount = (subtotal * tdsPercent / 100);
        const totalAmount = subtotal + gstAmount - tdsAmount;

        // Rounding to 2 decimal places to prevent floating point errors
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
            vendorId: selectedVendor,
            invoiceNo: formData.get('invoiceNo'),
            invoiceDate: formData.get('invoiceDate'),
            items,
            subtotal,
            gstAmount,
            totalAmount,
            tdsAmount,
            tdsPercent,
            gstType,
            notes: formData.get('notes')
        };
        mutation.mutate(invoiceData);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Purchase Invoices</h1>
                    <p className="text-slate-500">Record bills and track inventory intake</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900">
                    <Plus className="w-4 h-4 mr-2" />
                    Record New Bill
                </Button>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice No</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoicesData?.data?.invoices?.map((inv) => (
                                <TableRow key={inv._id}>
                                    <TableCell className="font-medium">{inv.invoiceNo}</TableCell>
                                    <TableCell>{inv.vendor?.supplierName}</TableCell>
                                    <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="font-bold">₹{inv.totalAmount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={inv.status === 'Paid' ? 'success' : 'warning'}>{inv.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => setViewInvoice(inv)}>View</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {invoicesData?.data?.pagination?.pages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={invoicesData.data.pagination.page <= 1}>Previous</Button>
                            <span className="text-sm text-slate-500">Page {invoicesData.data.pagination.page} of {invoicesData.data.pagination.pages} ({invoicesData.data.pagination.total} invoices)</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={invoicesData.data.pagination.page >= invoicesData.data.pagination.pages}>Next</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[1000px] h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="flex items-center">
                            <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                            New Purchase Invoice Entry
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-3 gap-6 mb-8 bg-slate-50 p-4 rounded-xl border">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Vendor*</label>
                                <select
                                    className="w-full border rounded-lg p-2 mt-1"
                                    value={selectedVendor}
                                    onChange={(e) => {
                                        const vendorId = e.target.value;
                                        setSelectedVendor(vendorId);
                                        const vendor = vendorsData?.suppliers?.find(v => v._id === vendorId);
                                        if (vendor) {
                                            const section = vendor.tdsSection;
                                            const entityType = vendor.entityType;
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
                                    <option value="">Select Vendor</option>
                                    {vendorsData?.suppliers?.map(v => (
                                        <option key={v._id} value={v._id}>{v.supplierName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Invoice No*</label>
                                <Input name="invoiceNo" placeholder="BILL/23-24/001" className="mt-1" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Invoice Date*</label>
                                <Input name="invoiceDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1" required />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">GST Type*</label>
                                <select
                                    className="w-full border rounded-lg p-2 mt-1"
                                    value={gstType}
                                    onChange={(e) => setGstType(e.target.value)}
                                    required
                                >
                                    <option value="CGST_SGST">Local (CGST + SGST)</option>
                                    <option value="IGST">Inter-state (IGST)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-900 border-l-4 border-blue-600 pl-2">Bill Items</h3>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Search item name/code..."
                                        className="w-48 text-sm"
                                        value={itemSearchTerm}
                                        onChange={(e) => setItemSearchTerm(e.target.value)}
                                    />
                                    <select
                                        className="border rounded-lg p-2 text-sm"
                                        onChange={(e) => {
                                            const item = inventoryData?.data?.items?.find(i => i._id === e.target.value);
                                            if (item) addItem(item);
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">+ Add Item</option>
                                        {inventoryData?.data?.items?.map(item => (
                                            <option key={item._id} value={item._id}>{item.name} ({item.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <Table className="border">
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Item Details</TableHead>
                                        <TableHead className="w-[100px]">Qty</TableHead>
                                        <TableHead className="w-[120px]">Price (₹)</TableHead>
                                        <TableHead className="w-[100px]">GST (%)</TableHead>
                                        <TableHead className="text-right">Total (₹)</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{item.itemName}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.gstPercent}
                                                    onChange={(e) => updateItem(idx, 'gstPercent', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                ₹{item.totalPrice.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500"
                                                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-slate-900 text-white">
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-right font-bold">Subtotal</TableCell>
                                        <TableCell className="text-right font-bold">₹{subtotal.toLocaleString()}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-right font-bold italic text-slate-300">GST Amount ({gstType === 'CGST_SGST' ? '9%+9%' : '18%'})</TableCell>
                                        <TableCell className="text-right font-bold">₹{gstAmount.toLocaleString()}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    <TableRow className="bg-slate-800/50">
                                        <TableCell colSpan={3} className="text-right font-bold text-slate-300 italic">TDS Deduction (%)</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="h-8 bg-white text-slate-900 font-bold text-right"
                                                value={tdsPercent}
                                                onChange={(e) => setTdsPercent(parseFloat(e.target.value) || 0)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-rose-400">- ₹{tdsAmount.toLocaleString()}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    <TableRow className="text-lg">
                                        <TableCell colSpan={4} className="text-right font-black uppercase">Grand Total</TableCell>
                                        <TableCell className="text-right font-black">₹{totalAmount.toLocaleString()}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t mt-auto">
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={mutation.isLoading} className="bg-blue-600 hover:bg-blue-700">
                                {mutation.isLoading ? 'Processing...' : 'Post Invoice to Ledger'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Invoice Modal */}
            <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
                <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-[1.5rem]">
                    <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Receipt className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 flex justify-between items-center w-full">
                            <div className="flex items-center gap-5">
                                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                                    <ShoppingBag className="w-8 h-8 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-bold">Purchase Bill #{viewInvoice?.invoiceNo}</DialogTitle>
                                    <div className="flex items-center gap-3">
                                        <Badge className={cn(
                                            "font-bold uppercase text-[10px] tracking-wider",
                                            viewInvoice?.status === 'Paid' ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                                        )}>
                                            {viewInvoice?.status}
                                        </Badge>
                                        <span className="text-xs font-medium text-blue-100 flex items-center">
                                            Recorded on {new Date(viewInvoice?.invoiceDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">Bill Amount</div>
                                <div className="text-4xl font-black tracking-tight">₹{viewInvoice?.totalAmount?.toLocaleString()}</div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 space-y-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Vendor Details</h4>
                                <div className="text-xl font-bold text-slate-900 mb-1">{viewInvoice?.vendor?.supplierName}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">GST No: {viewInvoice?.vendor?.gstNumber || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest mt-auto">Payment Summary</h4>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-2xl font-bold text-slate-900 tracking-tight">₹{viewInvoice?.balanceAmount?.toLocaleString()}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance Outstanding</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Amount Paid</div>
                                        <div className="text-sm font-bold text-slate-600 italic">₹{viewInvoice?.paidAmount?.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-3 uppercase tracking-widest">
                                <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                                Billed Items
                            </h3>
                            <Card className="rounded-2xl border-0 shadow-sm overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-0">
                                            <TableHead className="px-8 h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Item Name</TableHead>
                                            <TableHead className="text-center h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Qty</TableHead>
                                            <TableHead className="text-right h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Unit Price (₹)</TableHead>
                                            <TableHead className="text-center h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">GST (%)</TableHead>
                                            <TableHead className="text-right px-8 h-12 font-bold text-xs text-slate-500 uppercase tracking-wider">Total (₹)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewInvoice?.items?.map((item, idx) => (
                                            <TableRow key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="px-8 py-5 font-semibold text-slate-900">{item.itemName}</TableCell>
                                                <TableCell className="text-center text-slate-600 font-medium">{item.quantity}</TableCell>
                                                <TableCell className="text-right text-slate-600 font-mono text-sm">₹{item.unitPrice?.toLocaleString()}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-500 px-2">{item.gstPercent}%</Badge>
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
                                            <TableCell colSpan={4} className="text-right py-2 px-8 text-xs font-bold text-slate-500 uppercase tracking-wider italic opacity-70">
                                                GST ({viewInvoice?.gstType === 'CGST_SGST' ? 'CGST+SGST' : 'IGST'})
                                            </TableCell>
                                            <TableCell className="text-right px-8 font-bold text-slate-600">₹{viewInvoice?.gstAmount?.toLocaleString()}</TableCell>
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
                            <div className="p-6 bg-white rounded-2xl border border-slate-200">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Remarks / Notes</h4>
                                <p className="text-sm text-slate-600 font-medium italic">"{viewInvoice.notes}"</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t bg-white flex justify-end shrink-0">
                        <Button
                            onClick={() => setViewInvoice(null)}
                            className="h-11 rounded-xl px-12 bg-slate-900 text-white font-bold uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                        >
                            Close Details
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PurchaseInvoices;
