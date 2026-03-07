import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    Download,
    Trash2,
    Edit2,
    MoreVertical,
    Calendar,
    IndianRupee,
    PieChart,
    ChevronLeft,
    ChevronRight,
    TrendingDown
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EXPENSE_CATEGORIES = ['Operational'];
const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit Card'];

export default function Expenses() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

    // Form State
    const [formData, setFormData] = useState({
        category: 'Operational',
        expenseType: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentMode: 'Cash',
        notes: ''
    });

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const response = await api.getExpenses({
                page: pagination.page,
                limit: pagination.limit,
                search: searchTerm,
                category: categoryFilter !== 'all' ? categoryFilter : undefined
            });
            if (response.success) {
                setExpenses(response.expenses);
                setPagination(response.pagination);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch expenses",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.getExpenseStats();
            if (response.success) {
                setStats(response);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    useEffect(() => {
        fetchExpenses();
        fetchStats();
    }, [pagination.page, categoryFilter, searchTerm]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            category: 'Operational',
            expenseType: '',
            amount: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            paymentMode: 'Cash',
            notes: ''
        });
        setEditingExpense(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let response;
            if (editingExpense) {
                response = await api.updateExpense(editingExpense._id, formData);
            } else {
                response = await api.createExpense(formData);
            }

            if (response.success) {
                toast({
                    title: "Success",
                    description: editingExpense ? "Expense updated" : "Expense recorded",
                });
                setIsModalOpen(false);
                resetForm();
                fetchExpenses();
                fetchStats();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Something went wrong",
                variant: "destructive"
            });
        }
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setFormData({
            category: expense.category,
            expenseType: expense.expenseType,
            amount: expense.amount,
            date: format(new Date(expense.date), 'yyyy-MM-dd'),
            paymentMode: expense.paymentMode,
            notes: expense.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!expenseToDelete) return;
        setIsDeleting(true);
        try {
            const response = await api.deleteExpense(expenseToDelete._id);
            if (response.success) {
                toast({
                    title: "Deleted",
                    description: "Expense removed successfully",
                });
                fetchExpenses();
                fetchStats();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete expense",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
            setExpenseToDelete(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Expenses</h1>
                    <p className="text-slate-500">Track and manage your bakery expenses and overheads</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-md bg-gradient-to-br from-red-500 to-rose-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium opacity-80 text-white">Total Expenses (Period)</CardTitle>
                        <TrendingDown className="h-4 w-4 opacity-80" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{(stats?.totalExpense || 0).toLocaleString()}</div>
                        <p className="text-xs opacity-70">Total overhead recorded</p>
                    </CardContent>
                </Card>

                {stats?.stats?.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-md bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500">{stat._id} Costs</CardTitle>
                            <PieChart className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₹{stat.totalAmount.toLocaleString()}</div>
                            <p className="text-xs text-slate-400">{stat.count} entries found</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters & Search */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <Input
                                placeholder="Search expense type or notes..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-none shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Expense Type</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Payment Mode</TableHead>
                                <TableHead>Recorded By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10">
                                        <div className="flex justify-center flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-slate-500">Loading expenses...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : expenses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                                        No expenses found for the selected criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                expenses.map((expense) => (
                                    <TableRow key={expense._id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {format(new Date(expense.date), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={expense.notes}>
                                            <div className="font-semibold text-slate-900">{expense.expenseType}</div>
                                            <div className="text-xs text-slate-500 truncate">{expense.notes}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "rounded-md px-2 py-0.5",
                                                expense.category === 'Production' ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                    expense.category === 'Operational' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        "bg-slate-50 text-slate-700 border-slate-200"
                                            )}>
                                                {expense.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-900">
                                            ₹{expense.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-slate-600">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-normal">
                                                    {expense.paymentMode}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium text-slate-700">{expense.createdBy?.fullName || expense.createdBy?.username}</div>
                                            <div className="text-[10px] text-slate-400">{expense.unit}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    onClick={() => handleEdit(expense)}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setExpenseToDelete(expense)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
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
                <div className="p-4 border-t flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Showing {expenses.length} of {pagination.total} entries
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Add/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? 'Edit Expense' : 'Record New Expense'}</DialogTitle>
                        <DialogDescription>
                            Enter the details of the expense incurred.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(v) => handleSelectChange('category', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <Input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Expense Type / Item</label>
                            <Input
                                placeholder="e.g. Electricity Bill, Staff Salary, Rent"
                                name="expenseType"
                                value={formData.expenseType}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center">
                                    Amount <IndianRupee className="w-3 h-3 ml-1" />
                                </label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Mode</label>
                                <Select
                                    value={formData.paymentMode}
                                    onValueChange={(v) => handleSelectChange('paymentMode', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_MODES.map(mode => (
                                            <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes (Optional)</label>
                            <textarea
                                className="w-full min-h-[80px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                                placeholder="Add any additional details here..."
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                                {editingExpense ? 'Update Expense' : 'Save Expense'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Delete Expense</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this expense record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4 flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setExpenseToDelete(null)}>
                            No, Keep it
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Utility function for conditional class names if not globally available
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
