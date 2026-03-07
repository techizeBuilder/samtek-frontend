import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    RotateCcw, Search, Calendar, Package,
    TrendingDown, AlertTriangle, RefreshCw, Eye,
    Info, Building
} from 'lucide-react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Direct fetch helper using localStorage token
const fetchWithAuth = async (url) => {
    const token = localStorage.getItem('token');
    const base = window.location.origin; // e.g. http://localhost:5000
    const fullUrl = url.startsWith('http') ? url : `${base}${url}`;
    const res = await fetch(fullUrl, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
};

const SalesReturns = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('returns');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedEntry, setSelectedEntry] = useState(null);

    const [returns, setReturns] = useState([]);
    const [damages, setDamages] = useState([]);
    const [returnsLoading, setReturnsLoading] = useState(false);
    const [damagesLoading, setDamagesLoading] = useState(false);
    const [returnsError, setReturnsError] = useState(null);
    const [damagesError, setDamagesError] = useState(null);

    const loadReturns = async () => {
        setReturnsLoading(true);
        setReturnsError(null);
        try {
            const params = new URLSearchParams({ page: '1', limit: '100' });
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const data = await fetchWithAuth(`/api/accounts/sales/returns?${params}`);
            setReturns(data.returns || []);
        } catch (err) {
            console.error('Returns fetch error:', err);
            setReturnsError(err.message);
        } finally {
            setReturnsLoading(false);
        }
    };

    const loadDamages = async () => {
        setDamagesLoading(true);
        setDamagesError(null);
        try {
            const params = new URLSearchParams({ page: '1', limit: '100' });
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const data = await fetchWithAuth(`/api/accounts/sales/damages?${params}`);
            setDamages(data.damages || []);
        } catch (err) {
            console.error('Damages fetch error:', err);
            setDamagesError(err.message);
        } finally {
            setDamagesLoading(false);
        }
    };

    useEffect(() => {
        loadReturns();
        loadDamages();
    }, [statusFilter]);

    const activeData = activeTab === 'returns' ? returns : damages;
    const filteredData = activeData.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (item.customerName || '').toLowerCase().includes(term) ||
            (item.reason || '').toLowerCase().includes(term)
        );
    });

    const isLoading = activeTab === 'returns' ? returnsLoading : damagesLoading;
    const currentError = activeTab === 'returns' ? returnsError : damagesError;

    const totalReturnsAmount = returns.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const totalDamagesAmount = damages.reduce((s, d) => s + (d.totalAmount || 0), 0);
    const pendingReturns = returns.filter(r => r.status === 'pending').length;
    const pendingDamages = damages.filter(d => d.status === 'pending').length;

    const getStatusVariant = (status) => {
        if (status === 'completed' || status === 'approved') return 'success';
        if (status === 'pending') return 'warning';
        if (status === 'rejected') return 'destructive';
        return 'outline';
    };

    const getStatusColor = (status) => {
        const map = {
            completed: 'bg-green-100 text-green-800',
            pending: 'bg-amber-100 text-amber-800',
            approved: 'bg-blue-100 text-blue-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return map[status] || 'bg-slate-100 text-slate-800';
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales Returns & Damages</h1>
                    <p className="text-slate-500 mt-1">Overview of recorded returns and reported damages.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => { loadReturns(); loadDamages(); }}
                        className="h-11 gap-2 border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                        disabled={returnsLoading || damagesLoading}
                    >
                        <RefreshCw className={cn("w-4 h-4 text-slate-500", (returnsLoading || damagesLoading) && "animate-spin")} />
                        <span className="font-semibold">Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Returns Amount</p>
                            <h3 className="text-3xl font-bold mt-1">₹{totalReturnsAmount.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-blue-100 mt-1">{returns.length} entries</p>
                        </div>
                        <RotateCcw className="h-12 w-12 text-blue-200 opacity-50" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Pending Returns</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{pendingReturns}</h3>
                            <p className="text-xs text-amber-500 mt-1 font-medium">Awaiting action</p>
                        </div>
                        <AlertTriangle className="h-12 w-12 text-amber-100" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Damages Amount</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">₹{totalDamagesAmount.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-red-500 mt-1 font-medium">{damages.length} entries</p>
                        </div>
                        <TrendingDown className="h-12 w-12 text-red-100" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Pending Damages</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{pendingDamages}</h3>
                            <p className="text-xs text-orange-500 mt-1 font-medium">Currently pending</p>
                        </div>
                        <Package className="h-12 w-12 text-orange-100" />
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('returns')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-sm font-bold transition-all",
                                        activeTab === 'returns'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    )}
                                >
                                    Returns
                                </button>
                                <button
                                    onClick={() => setActiveTab('damages')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-sm font-bold transition-all",
                                        activeTab === 'damages'
                                            ? 'bg-white text-red-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    )}
                                >
                                    Damages
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search customer or reason..."
                                    className="pl-10 w-full sm:w-64 border-slate-200 focus:ring-blue-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-40 border-slate-200">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {currentError && (
                        <div className="p-8 text-center text-red-500 font-bold">
                            ❌ Error: {currentError}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="hover:bg-transparent border-b">
                                    <TableHead className="font-semibold px-6 py-4 text-slate-900 uppercase text-[11px] tracking-wider">Customer</TableHead>
                                    <TableHead className="font-semibold py-4 text-slate-900 uppercase text-[11px] tracking-wider">Dates</TableHead>
                                    <TableHead className="font-semibold py-4 text-slate-900 uppercase text-[11px] tracking-wider">Reason</TableHead>
                                    <TableHead className="font-semibold text-center py-4 text-slate-900 uppercase text-[11px] tracking-wider">Items</TableHead>
                                    <TableHead className="font-semibold text-right py-4 text-slate-900 uppercase text-[11px] tracking-wider">Amount</TableHead>
                                    <TableHead className="font-semibold text-center py-4 text-slate-900 uppercase text-[11px] tracking-wider">Status</TableHead>
                                    <TableHead className="text-right px-6 py-4 font-semibold text-slate-900 uppercase text-[11px] tracking-wider">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={7} className="h-16 text-center text-slate-400">Loading...</TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <TrendingDown className="h-12 w-12 mb-2 opacity-20" />
                                                <p>No {activeTab} found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item) => (
                                        <TableRow key={item._id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="px-6 py-4">
                                                <span className="font-bold text-slate-900 uppercase">{item.customerName || 'Unknown'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="text-slate-500">Ord: {item.orderDate ? new Date(item.orderDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                                                    <span className="font-bold text-blue-600">Ret: {item.returnDate ? new Date(item.returnDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-slate-600 truncate max-w-[150px] inline-block">
                                                    {item.reason || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-slate-900">{item.items?.length || 0} items</span>
                                                    <span className="text-[10px] text-slate-400">{item.totalQuantity || 0} total qty</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-900">
                                                ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={cn("px-2.5 py-0.5 rounded-full border-0 text-[10px] font-bold uppercase", getStatusColor(item.status))}>
                                                    {item.status || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedEntry(item)}
                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                >
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
                <DialogContent className="max-w-3xl w-full flex flex-col max-h-[90vh] my-4 p-0 overflow-hidden border-0 shadow-2xl">
                    <DialogHeader className={cn(
                        "p-6 text-white shrink-0 bg-gradient-to-r",
                        selectedEntry?.type === 'damage' ? "from-red-600 to-red-700" : "from-blue-600 to-indigo-600"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                                    {selectedEntry?.type === 'damage' ? <AlertTriangle className="h-8 w-8" /> : <RotateCcw className="h-8 w-8" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-bold uppercase italic">
                                        {selectedEntry?.type === 'damage' ? 'Damage Report' : 'Return Details'}
                                    </DialogTitle>
                                    <p className="text-blue-100 text-sm mt-0.5">{selectedEntry?.customerName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Total Amount</p>
                                <p className="text-3xl font-bold italic">₹{(selectedEntry?.totalAmount || 0).toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedEntry && (
                        <div className="p-8 space-y-8 overflow-y-auto flex-1 min-h-0 bg-white">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" /> ORDER DATE
                                    </h4>
                                    <p className="text-slate-900 font-semibold">{selectedEntry.orderDate ? new Date(selectedEntry.orderDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" /> RETURN DATE
                                    </h4>
                                    <p className="text-slate-900 font-semibold">{selectedEntry.returnDate ? new Date(selectedEntry.returnDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</h4>
                                    <Badge className={cn("px-2.5 py-0.5 rounded-full border-0 text-[10px] font-bold uppercase", getStatusColor(selectedEntry.status))}>
                                        {selectedEntry.status}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Qty</h4>
                                    <p className="text-slate-900 font-semibold">{selectedEntry.totalQuantity}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reason for {activeTab === 'returns' ? 'Return' : 'Damage'}</h4>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-700 font-medium">
                                    "{selectedEntry.reason || 'No reason provided'}"
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="h-4 w-4" /> Products ({selectedEntry.items?.length || 0})
                                </h4>
                                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow className="hover:bg-transparent border-b">
                                                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Product</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center">Qty</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Price</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(selectedEntry.items || []).map((item, i) => (
                                                <TableRow key={i} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-bold text-slate-900 uppercase text-xs">{item.productName}</TableCell>
                                                    <TableCell className="text-center font-bold text-xs">{item.quantity} {item.unit || ''}</TableCell>
                                                    <TableCell className="text-right text-slate-600 text-xs">₹{item.pricePerUnit?.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-900 text-xs">₹{(item.totalAmount || (item.pricePerUnit * item.quantity))?.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button variant="outline" onClick={() => setSelectedEntry(null)} className="rounded-xl font-bold px-8">
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesReturns;
