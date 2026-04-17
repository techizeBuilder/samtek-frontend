import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { 
    Search, 
    FileText, 
    Eye, 
    Download, 
    RefreshCw,
    Plus,
    Clock,
    CheckCircle,
    AlertCircle,
    FileCheck
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

const MyInvoices = () => {
    const { user } = useAuthContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewInvoice, setViewInvoice] = useState(null);
    const [page, setPage] = useState(1);
    const limit = 10;

    // Fetch invoices from backend
    const { data: response, isLoading } = useQuery({
        queryKey: ['/api/sales/my-invoices', page, searchTerm, statusFilter],
        queryFn: () => apiRequest('GET', `/api/sales/my-invoices?page=${page}&limit=${limit}&search=${searchTerm}&paymentStatus=${statusFilter === 'all' ? '' : statusFilter}`)
    });

    const invoices = response?.invoices || [];
    const stats = response?.stats || { totalAmount: 0, paidAmount: 0, balanceAmount: 0, overdueCount: 0 };
    const pagination = response?.pagination || { total: 0, pages: 1 };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Paid': return 'default';
            case 'Partially Paid': return 'secondary';
            case 'Pending': return 'outline';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    };

    const generatePDF = async (invoice) => {
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
            const url = `${baseUrl}/api/sales/invoice/${invoice._id}/pdf`;

            const res = await fetch(url, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : ''
                }
            });

            if (!res.ok) throw new Error('Failed to download PDF');

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download PDF invoice. Please try again.');
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header - Simple Blue Background as before */}
            <div className="bg-blue-600 rounded-lg px-4 py-3 flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5" />
                    <h1 className="text-lg font-semibold">My Invoices</h1>
                </div>
                <div className="flex items-center space-x-2">
                    <Button 
                        variant="outline" 
                        onClick={() => window.location.reload()}
                        className="bg-white hover:bg-gray-50 text-blue-600 border-0 h-8 w-8 p-0"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Simple Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Invoices</p>
                                <p className="text-2xl font-bold">{pagination.total}</p>
                            </div>
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending</p>
                                <p className="text-2xl font-bold">{invoices.filter(i => i.paymentStatus === 'Pending').length}</p>
                            </div>
                            <Clock className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Partial</p>
                                <p className="text-2xl font-bold">{invoices.filter(i => i.paymentStatus === 'Partially Paid').length}</p>
                            </div>
                            <RefreshCw className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Paid</p>
                                <p className="text-2xl font-bold">{invoices.filter(i => i.paymentStatus === 'Paid').length}</p>
                            </div>
                            <FileCheck className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Simple Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white"
                    />
                </div>
                <select 
                    className="h-10 text-sm bg-white border border-input rounded-md px-3 outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Partially Paid">Partial</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                </select>
            </div>

            {/* Simple Table with Original Columns */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead>CUSTOMER</TableHead>
                            <TableHead>INVOICE ID</TableHead>
                            <TableHead>ORDER NO</TableHead>
                            <TableHead>AMOUNT</TableHead>
                            <TableHead>DUE DATE</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead className="text-right">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-500 italic">Finding invoices...</TableCell></TableRow>
                        ) : invoices.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-500">No invoices found.</TableCell></TableRow>
                        ) : (
                            invoices.map((invoice) => (
                                <TableRow key={invoice._id}>
                                    <TableCell>
                                        <div className="font-medium text-gray-900">{invoice.customer?.name}</div>
                                        <div className="text-xs text-gray-500">{invoice.customer?.email}</div>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">{invoice.invoiceNumber}</TableCell>
                                    <TableCell className="text-sm">{invoice.order?.orderCode || 'N/A'}</TableCell>
                                    <TableCell className="font-medium">₹{invoice.totalAmount.toLocaleString('en-IN')}</TableCell>
                                    <TableCell className="text-sm">
                                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(invoice.paymentStatus)}>
                                            {invoice.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setViewInvoice(invoice)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={() => generatePDF(invoice)}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Simple View Modal */}
            <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Invoice Details - {viewInvoice?.invoiceNumber}</DialogTitle>
                        <DialogDescription>
                            Full information for this billing record.
                        </DialogDescription>
                    </DialogHeader>
                    {viewInvoice && (
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</label>
                                <p className="font-medium">{viewInvoice.customer?.name}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order No</label>
                                <p className="font-medium">{viewInvoice.order?.orderCode || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</label>
                                <p className="font-medium">₹{viewInvoice.totalAmount.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                                <div><Badge variant={getStatusVariant(viewInvoice.paymentStatus)}>{viewInvoice.paymentStatus}</Badge></div>
                            </div>
                            <div className="col-span-2 space-y-2 mt-4">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</label>
                                <div className="border rounded-md divide-y">
                                    {viewInvoice.items?.map((item, idx) => (
                                        <div key={idx} className="p-3 flex justify-between text-sm">
                                            <span>{item.productName || item.itemName} × {item.quantity}</span>
                                            <span className="font-bold">₹{item.totalPrice.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MyInvoices;