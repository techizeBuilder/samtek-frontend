import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, RotateCw, Trash2, Receipt, Eye, Pencil, AlertCircle, Calendar, RotateCcw } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from '@/components/ui/table';
import { showSmartToast } from '@/lib/toast-utils';

const PurchaseReturns = () => {
    const { hasFeatureAccess } = usePermissions();
    const canAdd = hasFeatureAccess('accounts', 'purchases', 'add');
    const canEdit = hasFeatureAccess('accounts', 'purchases', 'edit');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewReturn, setViewReturn] = useState(null);
    const [editReturn, setEditReturn] = useState(null);
    const queryClient = useQueryClient();

    // New Return form state
    const [newReturn, setNewReturn] = useState({
        vendorId: '',
        returnDate: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
        items: [],
        totalAmount: 0,
        bankAccountId: ''
    });
    const [selectedItems, setSelectedItems] = useState([]);

    // Fetch Vendors
    const { data: vendorsData } = useQuery({
        queryKey: ['/api/accounts/purchases/vendors'],
        queryFn: () => apiRequest('GET', '/api/accounts/purchases/vendors'),
    });
    const vendors = vendorsData?.data || [];

    // Fetch Bank Accounts
    const { data: accountsData } = useQuery({
        queryKey: ['/api/accounts/bank-cash/summary'],
        queryFn: () => apiRequest('GET', '/api/accounts/bank-cash/summary'),
    });
    const bankAccounts = accountsData?.data?.accounts || [];

    // Fetch vendor items when vendor selected
    const { data: vendorItemsData, isLoading: isItemsLoading } = useQuery({
        queryKey: ['/api/accounts/purchases/vendor-items', newReturn.vendorId],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/vendor-items?vendorId=${newReturn.vendorId}`),
        enabled: !!newReturn.vendorId
    });
    const vendorItems = vendorItemsData?.data || [];

    // Fetch Returns list
    const { data: response, isLoading } = useQuery({
        queryKey: ['/api/accounts/purchases/returns', searchTerm, currentPage],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/returns?search=${searchTerm}&page=${currentPage}&limit=${limit}`),
    });
    const returns = response?.data?.returns || [];
    const pagination = response?.data?.pagination || {};

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data) => apiRequest('POST', '/api/accounts/purchases/returns', data),
        onSuccess: () => {
            setShowAddModal(false);
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/purchases/returns'] });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/bank-cash/summary'] });
            showSmartToast({ success: true, message: 'Purchase return recorded successfully' });
        },
        onError: (err) => showSmartToast({ success: false, message: err.message || 'Failed to create return' })
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => apiRequest('PUT', `/api/accounts/purchases/returns/${id}`, data),
        onSuccess: () => {
            setEditReturn(null);
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/purchases/returns'] });
            showSmartToast({ success: true, message: 'Return updated successfully' });
        },
        onError: (err) => showSmartToast({ success: false, message: err.message || 'Failed to update' })
    });

    const resetForm = () => {
        setNewReturn({ vendorId: '', returnDate: format(new Date(), 'yyyy-MM-dd'), reason: '', items: [], totalAmount: 0, bankAccountId: '' });
        setSelectedItems([]);
    };

    const handleAddItem = (item) => {
        if (selectedItems.find(i => i._id === item._id)) return;
        const newItem = { ...item, quantity: 1, returnPrice: item.lastUnitPrice || 0 };
        const updated = [...selectedItems, newItem];
        setSelectedItems(updated);
        recalcTotal(updated);
    };

    const recalcTotal = (items) => {
        const total = items.reduce((sum, i) => sum + (i.quantity * i.returnPrice), 0);
        setNewReturn(prev => ({
            ...prev,
            totalAmount: total,
            items: items.map(i => ({ item: i._id, itemName: i.itemName, quantity: i.quantity, unitPrice: i.returnPrice, totalPrice: i.quantity * i.returnPrice }))
        }));
    };

    const handleQtyChange = (itemId, qty) => {
        const updated = selectedItems.map(i => i._id === itemId ? { ...i, quantity: parseFloat(qty) || 0 } : i);
        setSelectedItems(updated);
        recalcTotal(updated);
    };

    const handlePriceChange = (itemId, price) => {
        const updated = selectedItems.map(i => i._id === itemId ? { ...i, returnPrice: parseFloat(price) || 0 } : i);
        setSelectedItems(updated);
        recalcTotal(updated);
    };

    const handleRemoveItem = (itemId) => {
        const updated = selectedItems.filter(i => i._id !== itemId);
        setSelectedItems(updated);
        recalcTotal(updated);
    };

    const handleCreate = () => {
        const payload = { ...newReturn };
        if (!payload.bankAccountId || payload.bankAccountId === 'none') delete payload.bankAccountId;
        if (!payload.invoiceId) delete payload.invoiceId;
        createMutation.mutate(payload);
    };

    const handleUpdate = () => {
        if (!editReturn) return;
        updateMutation.mutate({
            id: editReturn._id,
            data: {
                reason: editReturn.reason,
                returnDate: editReturn.returnDate,
                totalAmount: parseFloat(editReturn.totalAmount) || 0
            }
        });
    };

    const safeFormat = (date) => {
        try { return format(new Date(date), 'dd MMM yyyy'); } catch { return '—'; }
    };

    const safeFormatInput = (date) => {
        try { return format(new Date(date), 'yyyy-MM-dd'); } catch { return ''; }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Purchase Returns</h1>
                    <p className="text-slate-500">Record material returns and vendor debit notes</p>
                </div>
                {canAdd && (
                    <Button onClick={() => setShowAddModal(true)} className="bg-slate-900">
                        <Plus className="w-4 h-4 mr-2" />
                        New Return
                    </Button>
                )}
            </div>

            {/* Search */}
            <Card className="border-0 shadow-sm mb-6">
                <CardContent className="p-4">
                    <Input
                        placeholder="Search by reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </CardContent>
            </Card>

            {/* Returns Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle>Return History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Item(s) Returned</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                                        <RotateCw className="animate-spin inline mr-2 w-4 h-4" /> Loading...
                                    </TableCell>
                                </TableRow>
                            ) : returns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">No purchase returns found</TableCell>
                                </TableRow>
                            ) : returns.map((ret) => (
                                <TableRow key={ret._id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>{safeFormat(ret.returnDate)}</TableCell>
                                    <TableCell className="font-semibold text-slate-900">{ret.vendor?.supplierName || '—'}</TableCell>
                                    <TableCell className="font-medium text-slate-800">
                                        {ret.items && ret.items.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {ret.items.map((i, idx) => (
                                                    <span key={idx} className="text-xs bg-slate-100/80 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 w-fit font-medium">
                                                        {i.itemName || i.item?.name || 'Item'}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-slate-600">
                                        {ret.items && ret.items.length > 0 ? (
                                            <div className="flex flex-col">
                                                {ret.items.map((i, idx) => (
                                                    <span key={idx} className="text-xs text-slate-600 block">
                                                        {i.quantity} {ret.unit || 'pcs'}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell className="text-slate-500 max-w-[200px] truncate">{ret.reason}</TableCell>
                                    <TableCell className="font-bold text-orange-600">₹{ret.totalAmount?.toLocaleString()}</TableCell>
                                    <TableCell>
                                        {ret.reason && ret.reason.toLowerCase().includes('qc rejected') ? (
                                            <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50/50 font-bold px-2 py-0.5 shadow-sm">
                                                <AlertCircle className="w-3 h-3 mr-1 text-rose-500" /> QC Rejected
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-bold px-2 py-0.5 shadow-sm">
                                                Recorded
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setViewReturn(ret)} className="hover:bg-slate-100">
                                                <Eye className="w-4 h-4 text-slate-600" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setEditReturn({ ...ret, returnDate: safeFormatInput(ret.returnDate) })} className="hover:bg-slate-100">
                                                <Pencil className="w-4 h-4 text-slate-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {pagination.total > limit && (
                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <p className="text-sm text-slate-500">Total: {pagination.total} returns</p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                                <Button variant="outline" size="sm" disabled={currentPage * limit >= pagination.total} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ===== ADD RETURN MODAL (colorful style) ===== */}
            <Dialog open={showAddModal} onOpenChange={(open) => { if (!open) resetForm(); setShowAddModal(open); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl rounded-2xl p-0">
                    {/* Gradient Header - same as View */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2.5 rounded-xl">
                                <RotateCcw className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">New Purchase Return</h2>
                                <p className="text-slate-300 text-sm">Select vendor, add items and record return</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vendor <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full border rounded-lg p-2 text-sm bg-slate-50"
                                    value={newReturn.vendorId}
                                    onChange={(e) => setNewReturn({ ...newReturn, vendorId: e.target.value })}
                                >
                                    <option value="">Select Vendor</option>
                                    {vendors.map(v => (
                                        <option key={v._id} value={v._id}>{v.supplierName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Return Date <span className="text-red-500">*</span></label>
                                <Input type="date" className="bg-slate-50" value={newReturn.returnDate}
                                    onChange={(e) => setNewReturn({ ...newReturn, returnDate: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reason <span className="text-red-500">*</span></label>
                                <Input className="bg-slate-50" placeholder="e.g. Quality Issue"
                                    value={newReturn.reason}
                                    onChange={(e) => setNewReturn({ ...newReturn, reason: e.target.value })} />
                            </div>
                        </div>

                        {/* Items */}
                        {newReturn.vendorId && (
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-blue-900 text-sm">Purchased Items — Click to Add</h3>
                                    {isItemsLoading && <span className="text-xs text-blue-400 flex items-center gap-1"><RotateCw className="w-3 h-3 animate-spin" /> Loading...</span>}
                                </div>
                                {!isItemsLoading && vendorItems.length === 0 && (
                                    <p className="text-xs text-blue-400 italic flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> No past purchase items found for this vendor</p>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {vendorItems.map(item => (
                                        <button key={item._id} type="button" onClick={() => handleAddItem(item)}
                                            className="text-xs px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all font-medium shadow-sm">
                                            + {item.itemName}
                                        </button>
                                    ))}
                                </div>

                                {selectedItems.length > 0 && (
                                    <div className="mt-4 overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-blue-100 text-blue-800">
                                                    <th className="text-left px-3 py-2 rounded-l font-bold">Item</th>
                                                    <th className="text-center px-3 py-2 font-bold">Qty</th>
                                                    <th className="text-right px-3 py-2 font-bold">Price (₹)</th>
                                                    <th className="text-right px-3 py-2 font-bold">Total</th>
                                                    <th className="px-3 py-2 rounded-r"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedItems.map(item => (
                                                    <tr key={item._id} className="border-b border-blue-100 bg-white">
                                                        <td className="px-3 py-2 font-semibold text-slate-800">{item.itemName}</td>
                                                        <td className="px-3 py-2 w-[90px]">
                                                            <Input type="number" value={item.quantity}
                                                                onChange={(e) => handleQtyChange(item._id, e.target.value)} className="h-8 text-center" />
                                                        </td>
                                                        <td className="px-3 py-2 w-[110px]">
                                                            <Input type="number" value={item.returnPrice}
                                                                onChange={(e) => handlePriceChange(item._id, e.target.value)} className="h-8 text-right" />
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-bold text-orange-600">
                                                            ₹{(item.quantity * item.returnPrice).toLocaleString()}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <button onClick={() => handleRemoveItem(item._id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Amount & Bank */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Return Amount (₹) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                                    <Input type="number" placeholder="0.00" className="pl-7 bg-slate-50 font-bold text-lg text-orange-600"
                                        value={newReturn.totalAmount || ''}
                                        onChange={(e) => setNewReturn({ ...newReturn, totalAmount: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            {newReturn.totalAmount > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bank Account (Refund to)</label>
                                    <Select value={newReturn.bankAccountId}
                                        onValueChange={(val) => setNewReturn({ ...newReturn, bankAccountId: val })}>
                                        <SelectTrigger className="bg-slate-50">
                                            <SelectValue placeholder="None (No refund)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None (Adjust against balance)</SelectItem>
                                            {bankAccounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.name} (₹{acc.balance?.toLocaleString()})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-green-600 mt-0.5 italic">
                                        Money will be added to this account on submit.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="px-6 pb-6 gap-3">
                        <Button variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</Button>
                        <Button onClick={handleCreate} className="bg-orange-600 hover:bg-orange-700 px-8 min-w-[140px]"
                            disabled={createMutation.isPending || !newReturn.reason || !newReturn.totalAmount || !newReturn.vendorId}>
                            {createMutation.isPending ? <><RotateCw className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Record Return'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== VIEW MODAL ===== */}
            <Dialog open={!!viewReturn} onOpenChange={(open) => { if (!open) setViewReturn(null); }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-0 shadow-2xl rounded-2xl p-0">
                    {/* Gradient Header */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-t-2xl">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2.5 rounded-xl">
                                    <Receipt className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Return Details</h2>
                                    <p className="text-slate-300 text-sm">{viewReturn?.vendor?.supplierName || '—'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Total Amount</div>
                                <div className="text-3xl font-black text-white">₹{viewReturn?.totalAmount?.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-5 bg-slate-50">
                        {/* Info Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white border rounded-xl p-4">
                                <div className="text-xs text-slate-400 font-bold uppercase mb-1.5">Date</div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-orange-500" />
                                    {viewReturn && safeFormat(viewReturn.returnDate)}
                                </div>
                            </div>
                            <div className="bg-white border rounded-xl p-4 col-span-2">
                                <div className="text-xs text-slate-400 font-bold uppercase mb-1.5">Reason</div>
                                <div className="font-semibold text-slate-800">{viewReturn?.reason}</div>
                            </div>
                        </div>

                        {/* Items */}
                        {viewReturn?.items?.length > 0 && (
                            <div className="bg-white border rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-orange-500 rounded-full" />
                                    <h3 className="font-bold text-slate-700 text-sm">Returned Items</h3>
                                </div>
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewReturn.items.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₹{item.unitPrice?.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold text-orange-600">₹{item.totalPrice?.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold">Grand Total</TableCell>
                                            <TableCell className="text-right font-black text-orange-600">₹{viewReturn?.totalAmount?.toLocaleString()}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        )}
                    </div>

                    <div className="px-6 pb-6 flex justify-end">
                        <Button variant="outline" onClick={() => setViewReturn(null)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ===== EDIT MODAL ===== */}
            <Dialog open={!!editReturn} onOpenChange={(open) => { if (!open) setEditReturn(null); }}>
                <DialogContent className="max-w-md border-0 shadow-2xl rounded-2xl p-0">
                    {/* Gradient Header - same as View */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 rounded-t-2xl">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2.5 rounded-xl">
                                    <Pencil className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Edit Return</h2>
                                    <p className="text-slate-300 text-sm">{editReturn?.vendor?.supplierName || 'Purchase Return'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Current Amount</div>
                                <div className="text-2xl font-black text-white">₹{Number(editReturn?.totalAmount || 0).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {editReturn && (
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Return Date</label>
                                <Input type="date" className="bg-slate-50"
                                    value={editReturn.returnDate || ''}
                                    onChange={(e) => setEditReturn({ ...editReturn, returnDate: e.target.value })} />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reason <span className="text-red-500">*</span></label>
                                <Input className="bg-slate-50" placeholder="Reason for return"
                                    value={editReturn.reason || ''}
                                    onChange={(e) => setEditReturn({ ...editReturn, reason: e.target.value })} />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Amount (₹) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                                    <Input type="number" className="pl-7 bg-slate-50 font-bold text-lg"
                                        value={editReturn.totalAmount || ''}
                                        onChange={(e) => setEditReturn({ ...editReturn, totalAmount: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setEditReturn(null)}>Cancel</Button>
                                <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 px-8 min-w-[130px]"
                                    disabled={updateMutation.isPending || !editReturn.reason || !editReturn.totalAmount}>
                                    {updateMutation.isPending ? <><RotateCw className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PurchaseReturns;
