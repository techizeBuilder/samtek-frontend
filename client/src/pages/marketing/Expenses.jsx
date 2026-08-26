import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus, Receipt, IndianRupee, Trash2, Edit2, RefreshCw, ChevronLeft, ChevronRight, Wallet,
} from 'lucide-react';

const BASE = '/api/marketing/expenses';
const todayStr = () => new Date().toISOString().split('T')[0];

const emptyForm = () => ({ category: '', amount: '', date: todayStr(), notes: '' });

export default function MarketingExpenses() {
  const { user } = useAuth();
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess('marketing', 'expenses', 'add');
  const canEdit = hasFeatureAccess('marketing', 'expenses', 'edit');
  const canDelete = hasFeatureAccess('marketing', 'expenses', 'delete');
  const { toast } = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [month, setMonth] = useState(''); // 'YYYY-MM', empty = all time
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // expense being edited, or null for "new"
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Categories (single source of truth from backend) ──
  const { data: categoriesRes } = useQuery({
    queryKey: ['mkt-expense-categories'],
    queryFn: () => apiRequest('GET', `${BASE}/categories`),
  });
  const categories = categoriesRes?.data || [];

  // ── Expense list ──
  const listParams = new URLSearchParams({ page: String(page), limit: '15' });
  if (categoryFilter !== 'all') listParams.set('category', categoryFilter);
  if (month) listParams.set('month', month);

  const { data: listRes, isLoading } = useQuery({
    queryKey: ['mkt-expenses', page, categoryFilter, month],
    queryFn: () => apiRequest('GET', `${BASE}?${listParams.toString()}`),
  });
  const expenses = listRes?.data || [];
  const pagination = listRes?.pagination || { currentPage: 1, totalPages: 1, totalRecords: 0 };
  const periodTotal = listRes?.totalAmount || 0;

  // ── Summary (category-wise totals, current filters' month if set) ──
  const summaryParams = new URLSearchParams();
  if (month) summaryParams.set('month', month);
  const { data: summaryRes } = useQuery({
    queryKey: ['mkt-expense-summary', month],
    queryFn: () => apiRequest('GET', `${BASE}/summary?${summaryParams.toString()}`),
  });
  const summary = summaryRes?.data || { byCategory: [], grandTotal: 0 };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['mkt-expenses'] });
    qc.invalidateQueries({ queryKey: ['mkt-expense-summary'] });
  };

  const createMut = useMutation({
    mutationFn: (data) => apiRequest('POST', BASE, data),
    onSuccess: () => { invalidateAll(); toast({ title: 'Expense added', description: 'Marketing expense logged successfully.' }); closeForm(); },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Failed to add expense', variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `${BASE}/${id}`, data),
    onSuccess: () => { invalidateAll(); toast({ title: 'Expense updated' }); closeForm(); },
    onError: (e) => toast({ title: 'Error', description: e.message || 'Failed to update expense', variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `${BASE}/${id}`),
    onSuccess: () => { invalidateAll(); toast({ title: 'Expense deleted' }); setDeleteTarget(null); },
    onError: (e) => { toast({ title: 'Error', description: e.message || 'Failed to delete expense', variant: 'destructive' }); setDeleteTarget(null); },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (exp) => {
    setEditing(exp);
    setForm({
      category: exp.category,
      amount: String(exp.amount),
      date: exp.date ? exp.date.split('T')[0] : todayStr(),
      notes: exp.notes || '',
    });
    setFormOpen(true);
  };
  const closeForm = () => { setFormOpen(false); setEditing(null); setForm(emptyForm()); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category) {
      toast({ title: 'Category required', description: 'Please select an expense category.', variant: 'destructive' });
      return;
    }
    if (!(Number(form.amount) > 0)) {
      toast({ title: 'Invalid amount', description: 'Amount must be greater than 0.', variant: 'destructive' });
      return;
    }
    const payload = { category: form.category, amount: Number(form.amount), date: form.date, notes: form.notes };
    if (editing) updateMut.mutate({ id: editing._id, data: payload });
    else createMut.mutate(payload);
  };

  // Marketing Head (or Superadmin) can manage everyone's entries; Marketing
  // Employee can only manage their own — mirrors the backend's canManage rule.
  const canManage = (exp) => {
    if (user?.role === 'Marketing Head' || user?.role === 'Superadmin' || user?.role === 'Super Admin') return true;
    return exp.addedBy?._id === user?._id || exp.addedBy === user?._id;
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Marketing Expenses</h1>
          <p className="text-slate-500">Log and track marketing spend — every entry is stamped with date &amp; time.</p>
        </div>
        {canAdd && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-80 text-white">
              {month ? 'Selected Month Total' : 'Grand Total'}
            </CardTitle>
            <Wallet className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(summary.grandTotal || 0).toLocaleString()}</div>
            <p className="text-xs opacity-70">{expenses.length > 0 ? `${pagination.totalRecords} entries` : 'No entries yet'}</p>
          </CardContent>
        </Card>
        {(summary.byCategory || []).slice(0, 3).map((c) => (
          <Card key={c.category} className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 truncate">{c.category}</CardTitle>
              <Receipt className="h-4 w-4 text-slate-400 shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-slate-900">₹{c.total.toLocaleString()}</div>
              <p className="text-xs text-slate-400">{c.count} entries</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-64"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            type="month"
            className="w-full md:w-48"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          />
          {month && (
            <Button variant="outline" size="sm" onClick={() => setMonth('')}>Clear Month</Button>
          )}
        </CardContent>
      </Card>

      {/* History table */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b">
              <TableRow>
                <TableHead>Expense Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Added At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex justify-center flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-slate-500 text-sm">Loading expenses...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    No marketing expenses recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp._id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{exp.category}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">₹{exp.amount.toLocaleString()}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-slate-600" title={exp.notes}>
                      {exp.notes || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-700">
                      {exp.addedBy?.fullName || exp.addedBy?.username || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(exp.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-right">
                      {(canEdit || canDelete) && canManage(exp) ? (
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(exp)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(exp)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
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
            Showing {expenses.length} of {pagination.totalRecords} entries
            {pagination.totalRecords > 0 && <span className="ml-2 font-medium text-slate-700">· Page total: ₹{periodTotal.toLocaleString()}</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Marketing Expense' : 'Add Marketing Expense'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the details of this expense entry.' : 'Log a new marketing expense with its category and amount.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select expense category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center">Amount <IndianRupee className="w-3 h-3 ml-1" /></Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Expense Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full min-h-[70px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                placeholder="Any additional details (vendor name, campaign, etc.)"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Expense' : 'Save Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>No, Keep it</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteTarget._id)}>
              {deleteMut.isPending ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
