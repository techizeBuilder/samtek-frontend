import { useState, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Search,
    Eye,
    RefreshCw,
    TrendingUp,
    CreditCard,
    Building,
    UserCheck,
    Wallet,
    UserPlus,
    Pencil,
    Info,
    Phone,
    ClipboardList,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import CustomerCashAccessModal from '@/components/accounts/CustomerCashAccessModal';

export default function CustomerMaster() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [cashAccessCustomer, setCashAccessCustomer] = useState(null);
    // Order-wise financial breakdown modal — kis order ka kitna paid/advance/due
    const [ordersCustomer, setOrdersCustomer] = useState(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Order-wise financials — fetched on-demand only when the Orders modal opens
    const { data: orderFinResponse, isLoading: orderFinLoading } = useQuery({
        queryKey: ['customer-order-financials', ordersCustomer?._id],
        queryFn: () => apiRequest('GET', `/api/customers/${ordersCustomer._id}/order-financials`),
        enabled: !!ordersCustomer?._id
    });
    const orderFin = orderFinResponse?.data;

    // Fetch customers
    const { data: customersResponse, isLoading, refetch } = useQuery({
        queryKey: ['/api/customers', { page: currentPage, name: searchTerm, status: statusFilter }],
        queryFn: () => {
            // Backend (getCustomers) reads the text-search filter as `name`, not `search`.
            let url = `/api/customers?page=${currentPage}&limit=20&name=${encodeURIComponent(searchTerm)}`;
            if (statusFilter !== 'All') {
                url += `&status=${statusFilter}`;
            }
            return apiRequest('GET', url);
        },
    });

    const customers = customersResponse?.customers || [];
    const pagination = customersResponse?.pagination || {};

    // Fetch salespeople for dropdown
    const { data: salespeopleResponse } = useQuery({
        queryKey: ['/api/customers/salespeople'],
        queryFn: () => apiRequest('GET', '/api/customers/salespeople'),
    });

    const salespeople = salespeopleResponse?.data || [];

    const stats = {
        total: pagination.total || 0,
        active: customers.filter(c => c.active === 'Yes').length,
        totalOutstanding: customers.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0)
    };

    const getStatusColor = (status) => {
        return status === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    };



    // ─── Update Customer Mutation ───────────────────────────────
    const updateCustomerMutation = useMutation({
        mutationFn: ({ id, data }) => apiRequest('PUT', `/api/customers/${id}`, data),
        onSuccess: (updatedData) => {
            queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
            setIsEditModalOpen(false);
            // Refresh view modal with updated data if it's still open
            if (viewingCustomer && updatedData?.customer) {
                setViewingCustomer(updatedData.customer);
            }
            toast({
                title: "Profile Updated ✓",
                description: "Customer profile has been updated successfully.",
            });
        },
        onError: (err) => {
            toast({
                title: "Update Failed",
                description: err.message || "Failed to update customer profile.",
                variant: "destructive"
            });
        }
    });



    const handleEditCustomer = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Ensure salesContact is properly handled (convert "none" or empty string to null)
        if (data.salesContact === "" || data.salesContact === "none") {
            data.salesContact = null;
        }

        updateCustomerMutation.mutate({ id: editingCustomer._id, data });
    };

    // Open edit modal pre-filled with current customer data
    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setIsEditModalOpen(true);
        // Close the view modal so edit modal is on top cleanly
        setViewingCustomer(null);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">
            {/* Header & Main Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Customer Master</h1>
                    <p className="text-slate-500 mt-1">Manage receivables, credit limits, and customer profiles.</p>
                </div>

            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Customers</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
                        </div>
                        <Users className="h-12 w-12 text-blue-200 opacity-50" />
                    </CardContent>
                </Card>

                {/* Outstanding Card with tooltip explanation */}
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-slate-500 text-sm font-medium">Total Outstanding</p>
                                <div className="group relative cursor-pointer">
                                    <Info className="h-3.5 w-3.5 text-slate-400" />
                                    <div className="absolute left-0 bottom-5 z-50 hidden group-hover:block w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl">
                                        <p className="font-bold text-amber-300 mb-1">📌 Outstanding kya hota hai?</p>
                                        <p>Customer ne kitna maal le liya hai lekin abhi paisa nahi diya — woh raqam jo customer par baaki hai. Jitna zyada outstanding, utna zyada credit risk.</p>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">₹{stats.totalOutstanding.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-red-500 mt-1 font-medium">Across all customers</p>
                        </div>
                        <Wallet className="h-12 w-12 text-red-100" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Active Accounts</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">{stats.active}</h3>
                            <p className="text-xs text-green-500 mt-1 font-medium">Currently active</p>
                        </div>
                        <UserCheck className="h-12 w-12 text-green-100" />
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-xl font-semibold">Customer List</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by name, code or mobile..."
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
                                    <SelectItem value="All">All Status</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold px-6">Customer & Code</TableHead>
                                    <TableHead className="font-semibold">Category</TableHead>
                                    <TableHead className="font-semibold text-right">Credit Limit</TableHead>
                                    <TableHead className="font-semibold text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            Outstanding
                                            <div className="group relative cursor-pointer">
                                                <Info className="h-3 w-3 text-slate-400" />
                                                <div className="absolute right-0 bottom-5 z-50 hidden group-hover:block w-56 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl">
                                                    <p className="font-bold text-amber-300 mb-1">Outstanding</p>
                                                    <p>Customer par kitna baaki hai — sales ki gayi items ka jo abhi tak payment nahi aaya.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold text-right">Advance</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-left px-6 font-semibold">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={6} className="h-16 text-center text-slate-400">Loading...</TableCell>
                                        </TableRow>
                                    ))
                                ) : customers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <Users className="h-12 w-12 mb-2 opacity-20" />
                                                <p>No customers found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    customers.map((customer) => (
                                        <TableRow key={customer._id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{customer.name}</span>
                                                    <span className="text-xs text-slate-500 font-mono uppercase tracking-tighter">{customer.customerCode || 'N/A'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium text-xs rounded-full">
                                                    {customer.category || 'Retailer'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-slate-600">
                                                ₹{(customer.creditLimit || 0).toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {customer.hasOrderForm ? (
                                                    <span className={cn(
                                                        "font-bold text-lg",
                                                        (customer.outstandingAmount || 0) > 0 ? "text-red-600" : "text-slate-400"
                                                    )}>
                                                        ₹{(customer.outstandingAmount || 0).toLocaleString('en-IN')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-sm" title="No Order Form submitted yet">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(customer.advancePayment || 0) > 0 ? (
                                                    <span className="font-bold text-emerald-600">
                                                        ₹{(customer.advancePayment || 0).toLocaleString('en-IN')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-sm">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("px-2.5 py-0.5 rounded-full border-0 text-xs font-semibold", getStatusColor(customer.active))}>
                                                    {customer.active === 'Yes' ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => setViewingCustomer(customer)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" /> View
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                        title="Order-wise Paid / Advance / Due breakdown"
                                                        onClick={() => setOrdersCustomer(customer)}
                                                    >
                                                        <ClipboardList className="h-4 w-4 mr-1" /> Orders
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                                        onClick={() => openEditModal(customer)}
                                                    >
                                                        <Pencil className="h-4 w-4 mr-1" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => setCashAccessCustomer(customer)}
                                                    >
                                                        <Phone className="h-4 w-4 mr-1" /> Call
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 bg-slate-50/50 border-t flex items-center justify-between">
                        <p className="text-sm text-slate-500 font-medium">
                            Showing <span className="text-slate-900">{(currentPage - 1) * 20 + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * 20, pagination.total || 0)}</span> of <span className="text-slate-900">{pagination.total}</span> entries
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= (pagination.pages || 1)}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Customer DETAIL / VIEW Dialog ─────────────────────── */}
            <Dialog open={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)}>
                <DialogContent className="max-w-3xl w-full flex flex-col max-h-[90vh] my-4 p-0 overflow-hidden border-0 shadow-2xl">
                    <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                                <Building className="h-8 w-8" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold">{viewingCustomer?.name}</DialogTitle>
                                <p className="text-blue-100 text-sm mt-0.5">Customer Profile & Account Status</p>
                            </div>
                        </div>
                    </DialogHeader>

                    {viewingCustomer && (
                        <div className="p-8 space-y-8 overflow-y-auto flex-1 min-h-0">
                            {/* Financial Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Credit Limit</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">₹{(viewingCustomer.creditLimit || 0).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Max credit allowed to this customer</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                    <div className="flex items-center gap-1">
                                        <p className="text-red-500 text-xs font-bold uppercase tracking-wider">Current Outstanding</p>
                                        <div className="group relative cursor-pointer">
                                            <Info className="h-3.5 w-3.5 text-red-400" />
                                            <div className="absolute left-0 bottom-5 z-50 hidden group-hover:block w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl">
                                                <p className="font-bold text-amber-300 mb-1">📌 Outstanding kya hai?</p>
                                                <p>Customer ne jo maal liya lekin abhi tak payment nahi di — woh baaki amount. Red mein dikhta hai kyunki yeh receivable hai.</p>
                                                <p className="mt-1 font-bold text-green-300">Credit Note:</p>
                                                <p>Jab customer maal wapas karta hai ya discount milti hai, to uski raqam Credit Note se deduct hoti hai outstanding se.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-red-700 mt-1">₹{(viewingCustomer.outstandingAmount || 0).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-red-400 mt-1">Unpaid sales — Amount due from customer</p>
                                </div>
                                {(viewingCustomer.advancePayment || 0) > 0 && (
                                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                        <div className="flex items-center gap-1">
                                            <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Advance Balance</p>
                                            <div className="group relative cursor-pointer">
                                                <Info className="h-3.5 w-3.5 text-emerald-400" />
                                                <div className="absolute left-0 bottom-5 z-50 hidden group-hover:block w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl">
                                                    <p className="font-bold text-amber-300 mb-1">📌 Advance Balance kya hai?</p>
                                                    <p>Customer ne Lead stage pe jo advance payment di thi, uska remaining balance. Yeh invoice generate hone par automatically deduct ho jaata hai.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-emerald-700 mt-1">₹{(viewingCustomer.advancePayment || 0).toLocaleString('en-IN')}</p>
                                        <p className="text-[10px] text-emerald-500 mt-1">Pre-paid advance — will adjust against invoices</p>
                                    </div>
                                )}
                            </div>

                            {/* Credit Note explanation box */}

                            {/* Grid Info */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                        <TrendingUp className="h-3 w-3 mr-1" /> ACCOUNT TYPE
                                    </h4>
                                    <p className="text-slate-900 font-semibold">{viewingCustomer.category || 'Retailer'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                        <UserCheck className="h-3 w-3 mr-1" /> SALES PERSON
                                    </h4>
                                    <p className="text-slate-900 font-semibold">{viewingCustomer.salesContact?.fullName || viewingCustomer.salesContact?.username || 'Not Assigned'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                                        <CreditCard className="h-3 w-3 mr-1" /> GSTIN
                                    </h4>
                                    <p className="text-slate-900 font-mono uppercase">{viewingCustomer.gstin || 'No GST Provided'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">CONTACT</h4>
                                    <p className="text-slate-900 font-semibold">{viewingCustomer.mobile}</p>
                                    <p className="text-xs text-slate-500 truncate">{viewingCustomer.email}</p>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                    <TrendingUp className="h-3 w-3 mr-1" /> BILLING ADDRESS
                                </h4>
                                <div className="flex gap-4">
                                    <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                                        <RefreshCw className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-800 leading-relaxed font-medium">
                                            {viewingCustomer.address1 || 'Address not listed'}
                                        </p>
                                        <p className="text-slate-500 text-sm">
                                            {viewingCustomer.city}, {viewingCustomer.state} - {viewingCustomer.pin}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-3 border-t">
                                <Button variant="ghost" onClick={() => setViewingCustomer(null)}>Close</Button>
                                <Button
                                    className="bg-slate-900 text-white hover:bg-indigo-600 gap-2"
                                    onClick={() => openEditModal(viewingCustomer)}
                                >
                                    <Pencil className="h-4 w-4" /> Edit Profile
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── EDIT CUSTOMER Modal ────────────────────────────────── */}
            <Dialog open={isEditModalOpen} onOpenChange={(open) => { if (!open) setIsEditModalOpen(false); }}>
                <DialogContent className="max-w-2xl w-full flex flex-col max-h-[90vh] my-4 p-0 overflow-hidden border-0 shadow-2xl rounded-[2rem]">
                    <DialogHeader className="bg-indigo-700 p-8 text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <Pencil className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black italic tracking-tight uppercase">Edit Profile</DialogTitle>
                                <DialogDescription className="text-indigo-200 font-bold uppercase text-[10px] tracking-widest">
                                    {editingCustomer?.name}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {editingCustomer && (
                        <form onSubmit={handleEditCustomer} className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name *</Label>
                                    <Input
                                        name="name"
                                        defaultValue={editingCustomer.name}
                                        placeholder="Customer Name"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number *</Label>
                                    <Input
                                        name="mobile"
                                        defaultValue={editingCustomer.mobile}
                                        placeholder="9876543210"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                        pattern="[0-9]{10}"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address *</Label>
                                    <Input
                                        name="email"
                                        type="email"
                                        defaultValue={editingCustomer.email}
                                        placeholder="email@example.com"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Type *</Label>
                                    <Select name="category" defaultValue={editingCustomer.category || 'Retailer'}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold">
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Distributor">Distributor</SelectItem>
                                            <SelectItem value="Retailer">Retailer</SelectItem>
                                            <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                                            <SelectItem value="End User">End User</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN (Optional)</Label>
                                    <Input
                                        name="gstin"
                                        defaultValue={editingCustomer.gstin || ''}
                                        placeholder="15 Digit GST Number"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-mono uppercase"
                                        maxLength={15}
                                    />
                                </div>
                                {/* <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credit Limit (₹)</Label>
                                    <Input
                                        name="creditLimit"
                                        type="number"
                                        defaultValue={editingCustomer.creditLimit || 0}
                                        placeholder="50000"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-right"
                                    />
                                </div> */}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Status</Label>
                                    <Select name="active" defaultValue={editingCustomer.active || 'Yes'}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">Active</SelectItem>
                                            <SelectItem value="No">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Type</Label>
                                    <Select name="entityType" defaultValue={editingCustomer.entityType || 'Others'}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-blue-600">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Individual">Individual</SelectItem>
                                            <SelectItem value="HUF">HUF</SelectItem>
                                            <SelectItem value="Company">Company</SelectItem>
                                            <SelectItem value="Firm">Firm</SelectItem>
                                            <SelectItem value="Others">Others</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TDS Section</Label>
                                    <Select name="tdsSection" defaultValue={editingCustomer.tdsSection || 'None'}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-amber-600">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="194C">Section 194C (Contract)</SelectItem>
                                            <SelectItem value="194J">Section 194J (Prof.)</SelectItem>
                                            <SelectItem value="194Q">Section 194Q (Goods Sale)</SelectItem>
                                            <SelectItem value="206C_1H">Section 206C(1H)</SelectItem>
                                            <SelectItem value="None">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Sales Person</Label>
                                    <Select name="salesContact" defaultValue={editingCustomer.salesContact?._id || editingCustomer.salesContact || "none"}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold text-indigo-600">
                                            <SelectValue placeholder="Select Sales Person" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {salespeople.map(sp => (
                                                <SelectItem key={sp._id} value={sp._id}>
                                                    {sp.fullName || sp.username} ({sp.email || 'No email'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PIN Code</Label>
                                    <Input
                                        name="pin"
                                        defaultValue={editingCustomer.pin || ''}
                                        placeholder="400001"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                        pattern="\d{6}"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Address</Label>
                                <Input
                                    name="address1"
                                    defaultValue={editingCustomer.address1 || ''}
                                    placeholder="Street, Building, Area"
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</Label>
                                    <Input
                                        name="city"
                                        defaultValue={editingCustomer.city || ''}
                                        placeholder="Mumbai"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">State</Label>
                                    <Input
                                        name="state"
                                        defaultValue={editingCustomer.state || ''}
                                        placeholder="Maharashtra"
                                        className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 h-12 rounded-xl font-bold"
                                >
                                    CANCEL
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-[2] h-12 bg-indigo-600 hover:bg-slate-900 rounded-xl font-black italic shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
                                    disabled={updateCustomerMutation.isPending}
                                >
                                    {updateCustomerMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {cashAccessCustomer && (
                <CustomerCashAccessModal
                    customer={cashAccessCustomer}
                    onClose={() => setCashAccessCustomer(null)}
                />
            )}

            {/* ─── Order-wise Financial Breakdown Modal ─────────────────── */}
            <Dialog open={!!ordersCustomer} onOpenChange={(o) => !o && setOrdersCustomer(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-indigo-600" />
                            Order-wise Account — {ordersCustomer?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Har order ka Total aur Advance uske Order Form se aata hai — items ka Billing Amount (GST included) aur Payment section ka Advance
                        </DialogDescription>
                    </DialogHeader>

                    {orderFinLoading ? (
                        <div className="py-12 text-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
                            <p className="text-sm text-slate-400 mt-2">Loading order-wise breakdown...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(orderFin?.orders || []).length === 0 ? (
                                <p className="text-center py-8 text-slate-400 text-sm">
                                    {(orderFin?.ordersWithoutForm || 0) > 0
                                        ? `${orderFin.ordersWithoutForm} order(s) hain lekin unka Order Form abhi submit nahi hua — form submit hone ke baad yahan dikhenge.`
                                        : 'No orders found for this customer.'}
                                </p>
                            ) : (
                                <div className="border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="font-semibold">Order ID</TableHead>
                                                <TableHead className="font-semibold">Date</TableHead>
                                                <TableHead className="font-semibold text-right">Total</TableHead>
                                                <TableHead className="font-semibold text-right">Advance</TableHead>
                                                <TableHead className="font-semibold text-right">Received</TableHead>
                                                <TableHead className="font-semibold text-right">Due</TableHead>
                                                <TableHead className="font-semibold text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(orderFin?.orders || []).map((o) => (
                                                <Fragment key={o.orderId}>
                                                    <TableRow>
                                                        <TableCell>
                                                            <div className="font-bold text-slate-900">{o.orderCode}</div>
                                                            {o.productName && <div className="text-[10px] text-slate-400 max-w-[180px] truncate">{o.productName}</div>}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-slate-500">
                                                            {o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN') : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-semibold">
                                                            ₹{(o.total || 0).toLocaleString('en-IN')}
                                                            {o.additionalCharges > 0 && (
                                                                <div className="text-[9px] font-normal text-slate-400">
                                                                    (incl. ₹{o.additionalCharges.toLocaleString('en-IN')} add'l charges)
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-emerald-600">₹{(o.advance || 0).toLocaleString('en-IN')}</TableCell>
                                                        <TableCell className="text-right font-mono text-emerald-600">₹{(o.paid || 0).toLocaleString('en-IN')}</TableCell>
                                                        <TableCell className={cn("text-right font-mono font-bold", o.due > 0 ? "text-rose-600" : "text-slate-400")}>
                                                            ₹{(o.due || 0).toLocaleString('en-IN')}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={cn(
                                                                "rounded-full border-0 text-[10px] font-bold",
                                                                o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700'
                                                                    : o.paymentStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-700'
                                                                        : 'bg-rose-100 text-rose-700'
                                                            )}>
                                                                {o.paymentStatus}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                    {/* Order Form ke items — har item ka Billing Amount */}
                                                    {(o.items || []).length > 0 && (
                                                        <TableRow key={`${o.orderId}-items`} className="bg-indigo-50/40 hover:bg-indigo-50/40">
                                                            <TableCell colSpan={7} className="py-2 px-6">
                                                                <div className="space-y-1">
                                                                    {o.items.map((it, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between text-xs">
                                                                            <span className="text-slate-600">
                                                                                <span className="font-semibold text-slate-800">{it.itemName || 'Item'}</span>
                                                                                {it.specification && <span className="text-slate-400"> — {it.specification}</span>}
                                                                                {it.qty > 0 && <span className="text-slate-400"> × {it.qty}</span>}
                                                                            </span>
                                                                            <span className="font-mono font-semibold text-slate-700">₹{(it.billAmount || 0).toLocaleString('en-IN')}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </Fragment>
                                            ))}
                                            {/* Totals row */}
                                            <TableRow className="bg-slate-50 font-bold">
                                                <TableCell colSpan={2}>TOTAL ({(orderFin?.orders || []).length} orders)</TableCell>
                                                <TableCell className="text-right font-mono">₹{(orderFin?.orders || []).reduce((s, o) => s + (o.total || 0), 0).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right font-mono text-emerald-700">₹{(orderFin?.orders || []).reduce((s, o) => s + (o.advance || 0), 0).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right font-mono text-emerald-700">₹{(orderFin?.orders || []).reduce((s, o) => s + (o.paid || 0), 0).toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="text-right font-mono text-rose-700">₹{(orderFin?.orders || []).reduce((s, o) => s + (o.due || 0), 0).toLocaleString('en-IN')}</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Orders whose Order Form is not submitted yet — not listed above */}
                            {(orderFin?.orders || []).length > 0 && (orderFin?.ordersWithoutForm || 0) > 0 && (
                                <p className="text-[11px] text-slate-400 px-1">
                                    + {orderFin.ordersWithoutForm} order(s) ka Order Form abhi submit nahi hua — form aane par yahan dikhenge.
                                </p>
                            )}

                            {/* Unallocated (general) receipts */}
                            {(orderFin?.unallocated?.count || 0) > 0 && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                                    <span className="font-bold text-amber-800">General Receipts (kisi order se linked nahi): </span>
                                    <span className="text-amber-700">
                                        {orderFin.unallocated.count} receipt(s) — ₹{(orderFin.unallocated.total || 0).toLocaleString('en-IN')}
                                    </span>
                                    <p className="text-[11px] text-amber-600 mt-1">
                                        Ye purane/general receipts hain — aage se payment karte time order select karo taaki tracking order-wise rahe.
                                    </p>
                                </div>
                            )}

                            {/* Customer-level reference */}
                            <div className="flex gap-6 text-xs text-slate-500 px-1">
                                <span>Customer Outstanding (master): <strong className="text-rose-600">₹{(orderFin?.customer?.outstandingAmount || 0).toLocaleString('en-IN')}</strong></span>
                                <span>Customer Advance (master): <strong className="text-emerald-600">₹{(orderFin?.customer?.advancePayment || 0).toLocaleString('en-IN')}</strong></span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
}
