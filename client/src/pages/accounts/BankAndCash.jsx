import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Eye, Wallet, Receipt, ArrowUpRight, ArrowDownRight, CheckCircle2, History } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';

const BankAndCash = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    bankBalance: 0,
    cashBalance: 0,
    accounts: []
  });
  const [transactions, setTransactions] = useState([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  // Form States
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'Bank',
    balance: '',
    bankName: '',
    accountNumber: ''
  });

  const [accountFormErrors, setAccountFormErrors] = useState({
    name: '',
    balance: '',
    accountNumber: ''
  });

  const [txnForm, setTxnForm] = useState({
    type: 'Receipt',
    mode: 'Bank Transfer',
    accountId: '',
    amount: '',
    reference: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const summaryRes = await api.getBankCashSummary();
      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
      // Also fetch recent transactions
      const transactionsRes = await api.get('/accounts/transactions?limit=20');
      if (transactionsRes.success) {
        setTransactions(transactionsRes.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching bank/cash data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bank and cash data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSubmit = async () => {
    // Inline field validation
    const errors = { name: '', balance: '', accountNumber: '' };
    let hasError = false;

    if (!accountForm.name.trim()) {
      errors.name = 'Account name is required';
      hasError = true;
    }
    if (!accountForm.balance) {
      errors.balance = 'Opening balance is required';
      hasError = true;
    }
    if (accountForm.type === 'Bank' && !accountForm.accountNumber.trim()) {
      errors.accountNumber = 'Account number is required for Bank accounts';
      hasError = true;
    }

    setAccountFormErrors(errors);
    if (hasError) return;

    try {
      const accountData = {
        accountName: accountForm.name,
        accountType: 'Asset',
        isBankOrCash: true,
        type: accountForm.type,
        balance: parseFloat(accountForm.balance),
        bankDetails: accountForm.type === 'Bank' ? {
          bankName: accountForm.bankName,
          accountNumber: accountForm.accountNumber
        } : null
      };

      let res;
      if (isEditing && selectedAccount) {
        res = await api.updateAccount(selectedAccount.id, accountData);
      } else {
        res = await api.createAccount(accountData);
      }

      if (res.success) {
        toast({ title: 'Success', description: `Account ${isEditing ? 'updated' : 'created'} successfully` });
        setIsAccountModalOpen(false);
        resetAccountForm();
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message || `Failed to ${isEditing ? 'update' : 'create'} account`, variant: 'destructive' });
    }
  };

  const resetAccountForm = () => {
    setAccountForm({ name: '', type: 'Bank', balance: '', bankName: '', accountNumber: '' });
    setAccountFormErrors({ name: '', balance: '', accountNumber: '' });
    setSelectedAccount(null);
    setIsEditing(false);
  };

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setAccountForm({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      bankName: account.bankDetails?.bankName || '',
      accountNumber: account.bankDetails?.accountNumber || ''
    });
    setIsEditing(true);
    setIsAccountModalOpen(true);
  };

  const handleView = (account) => {
    setSelectedAccount(account);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (account) => {
    setAccountToDelete(account);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await api.deleteAccount(accountToDelete.id);
      if (res.success) {
        toast({ title: 'Success', description: 'Account deleted successfully' });
        setIsDeleteModalOpen(false);
        setAccountToDelete(null);
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to delete account', variant: 'destructive' });
    }
  };

  const handleTransactionSubmit = async () => {
    try {
      if (!txnForm.accountId || !txnForm.amount) {
        toast({ title: 'Validation Error', description: 'Account and amount are required', variant: 'destructive' });
        return;
      }

      // Based on type, call different endpoints or a general one
      let res;
      if (txnForm.type === 'Receipt') {
        // This is a general income/receipt - for now we use a generic ledger post
        // In a real system, you'd have a specific endpoint for Other Income
        res = await api.post('/accounts/transactions/general', {
          ...txnForm,
          amount: parseFloat(txnForm.amount)
        });
      } else {
        res = await api.post('/accounts/transactions/general', {
          ...txnForm,
          amount: parseFloat(txnForm.amount)
        });
      }

      if (res.success) {
        toast({ title: 'Success', description: 'Transaction recorded successfully' });
        setIsTransactionModalOpen(false);
        setTxnForm({ type: 'Receipt', mode: 'Bank Transfer', accountId: '', amount: '', reference: '', description: '' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to record transaction', variant: 'destructive' });
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Bank': return 'bg-blue-100 text-blue-800';
      case 'Cash': return 'bg-green-100 text-green-800';
      case 'UPI': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAccounts = summary.accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || acc.type === filterType;
    return matchesSearch && matchesType;
  });

  const types = ['All', 'Bank', 'Cash', 'UPI'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Bank & Cash Management</h1>
            <p className="text-gray-600 mt-2">Monitor bank accounts and cash positions</p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <Dialog open={isAccountModalOpen} onOpenChange={(open) => {
              setIsAccountModalOpen(open);
              if (!open) resetAccountForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all">
                  <Plus className="w-4 h-4 mr-2" />
                  New Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    {isEditing ? 'Edit Account' : 'Add New Account'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Account Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      placeholder="e.g. SBI Current A/c"
                      value={accountForm.name}
                      className={accountFormErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      onChange={(e) => {
                        setAccountForm({ ...accountForm, name: e.target.value });
                        if (e.target.value.trim()) setAccountFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                    />
                    {accountFormErrors.name && (
                      <p className="text-xs text-red-500">{accountFormErrors.name}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Account Type</Label>
                    <Select
                      value={accountForm.type}
                      onValueChange={(val) => {
                        setAccountForm({ ...accountForm, type: val });
                        // Clear accountNumber error if switching away from Bank
                        if (val !== 'Bank') setAccountFormErrors(prev => ({ ...prev, accountNumber: '' }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank">Bank</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI / Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="openingBalance">Opening Balance <span className="text-red-500">*</span></Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      placeholder="0.00"
                      value={accountForm.balance}
                      className={accountFormErrors.balance ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      onChange={(e) => {
                        setAccountForm({ ...accountForm, balance: e.target.value });
                        if (e.target.value) setAccountFormErrors(prev => ({ ...prev, balance: '' }));
                      }}
                    />
                    {accountFormErrors.balance && (
                      <p className="text-xs text-red-500">{accountFormErrors.balance}</p>
                    )}
                  </div>
                  {accountForm.type === 'Bank' && (
                    <div className="grid gap-2">
                      <Label>Bank Details</Label>
                      <Input
                        placeholder="Bank Name"
                        className="mb-2"
                        value={accountForm.bankName}
                        onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                      />
                      <Input
                        placeholder="Account Number *"
                        inputMode="numeric"
                        value={accountForm.accountNumber}
                        className={accountFormErrors.accountNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setAccountForm({ ...accountForm, accountNumber: val });
                          if (val.trim()) setAccountFormErrors(prev => ({ ...prev, accountNumber: '' }));
                        }}
                      />
                      {accountFormErrors.accountNumber && (
                        <p className="text-xs text-red-500">{accountFormErrors.accountNumber}</p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAccountModalOpen(false)}>Cancel</Button>
                  <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={handleAccountSubmit}>
                    {isEditing ? 'Save Changes' : 'Create Account'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* View Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-900">Account Details</DialogTitle>
                </DialogHeader>
                {selectedAccount && (
                  <div className="grid gap-6 py-4">
                    <div className="flex justify-between items-center border-b pb-4">
                      <div>
                        <p className="text-sm text-slate-500">Account Name</p>
                        <p className="text-lg font-bold text-slate-900">{selectedAccount.name}</p>
                      </div>
                      <Badge className={getTypeColor(selectedAccount.type)}>{selectedAccount.type}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Current Balance</p>
                        <p className="text-xl font-bold text-slate-900">₹{selectedAccount.balance?.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Type</p>
                        <p className="text-md font-medium text-slate-700">{selectedAccount.type === 'Bank' ? 'Institutional' : 'Operational'}</p>
                      </div>
                    </div>
                    {selectedAccount.bankDetails && (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Bank Details</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Bank Name:</span>
                            <span className="text-sm font-semibold text-slate-900">{selectedAccount.bankDetails.bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Account Number:</span>
                            <span className="text-sm font-mono font-semibold text-slate-900">{selectedAccount.bankDetails.accountNumber}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button className="bg-slate-900 text-white" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-red-600">Confirm Deletion</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-slate-600">
                    Are you sure you want to delete <span className="font-bold text-slate-900">{accountToDelete?.name}</span>?
                    This action cannot be undone and may affect associated transactions.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                  <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>
                    Delete Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm transition-all">
                  <Receipt className="w-4 h-4 mr-2" />
                  New Receipt / Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Record Financial Transaction</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Transaction Type</Label>
                      <Select
                        value={txnForm.type}
                        onValueChange={(val) => setTxnForm({ ...txnForm, type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Receipt">Receipt (In)</SelectItem>
                          <SelectItem value="Payment">Payment (Out)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Payment Mode</Label>
                      <Select
                        value={txnForm.mode}
                        onValueChange={(val) => setTxnForm({ ...txnForm, mode: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Select Account</Label>
                    <Select
                      value={txnForm.accountId}
                      onValueChange={(val) => setTxnForm({ ...txnForm, accountId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Bank/Cash Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {summary.accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name} (₹{acc.balance})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={txnForm.amount}
                        onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Reference No.</Label>
                      <Input
                        placeholder="Txn ID / Cheque No."
                        value={txnForm.reference}
                        onChange={(e) => setTxnForm({ ...txnForm, reference: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description / Notes</Label>
                    <Input
                      placeholder="e.g. Miscellaneous Sales / Petty Cash"
                      value={txnForm.description}
                      onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTransactionModalOpen(false)}>Cancel</Button>
                  <Button className="bg-slate-900 text-white" onClick={handleTransactionSubmit}>Post Transaction</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium mb-1">Total Balance</p>
                  <p className="text-3xl font-bold text-gray-900">₹{(summary.totalBalance / 100000).toFixed(2)} L</p>
                  <p className="text-xs text-blue-500 mt-1">Aggregate across all accounts</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-2xl">
                  <Wallet className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-600 font-medium mb-1">Bank Balance</p>
                  <p className="text-3xl font-bold text-gray-900">₹{(summary.bankBalance / 100000).toFixed(2)} L</p>
                  <p className="text-xs text-cyan-500 mt-1">Funds in bank accounts</p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-2xl">
                  <ArrowUpRight className="w-8 h-8 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium mb-1">Cash in Hand</p>
                  <p className="text-3xl font-bold text-gray-900">₹{(summary.cashBalance / 100000).toFixed(2)} L</p>
                  <p className="text-xs text-green-500 mt-1">Physical cash available</p>
                </div>
                <div className="p-3 bg-green-100 rounded-2xl">
                  <ArrowDownRight className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by account name..."
                    className="pl-10 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                {types.map(type => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className={filterType === type ? "bg-slate-900 text-white border-slate-900" : "text-slate-600 hover:bg-slate-50"}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="accounts" className="w-full">
          <TabsList className="mb-6 bg-white p-1 shadow-sm border">
            <TabsTrigger value="accounts" className="px-6 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="transactions" className="px-6 flex items-center gap-2">
              <History className="w-4 h-4" />
              Transactions & BRS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Card className="shadow-lg border-0">
              <CardHeader className="border-b">
                <CardTitle>Bank & Cash Accounts ({filteredAccounts.length})</CardTitle>
                <CardDescription>All registered bank accounts and cash wallets</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Account Name</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">Balance</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-700">Bank Details</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-10 text-center text-gray-500">Loading accounts...</td>
                        </tr>
                      ) : filteredAccounts.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-10 text-center text-gray-500">No accounts found</td>
                        </tr>
                      ) : (
                        filteredAccounts.map((account) => (
                          <tr key={account.id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{account.name}</p>
                                <p className="text-xs text-gray-500">{account.type === 'Bank' ? 'Institutional' : 'Operational'}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={getTypeColor(account.type)}>{account.type}</Badge>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                              ₹{account.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4">
                              {account.bankDetails ? (
                                <div className="text-center">
                                  <p className="text-xs font-medium text-gray-700">{account.bankDetails.bankName}</p>
                                  <p className="text-[10px] text-gray-500 font-mono italic">A/c: {account.bankDetails.accountNumber}</p>
                                </div>
                              ) : (
                                <p className="text-xs text-center text-gray-400">-</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                  onClick={() => handleView(account)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleEdit(account)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteClick(account)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card className="shadow-lg border-0">
              <CardHeader className="border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Transactions & Reconciliation</CardTitle>
                  <CardDescription>Match system entries with bank statement</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {transactions.filter(t => !t.isReconciled).length} Pending BRS
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">Description</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-700">Mode</th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-700">BRS Status</th>
                        <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-10 text-center text-gray-500">No transactions recorded yet</td>
                        </tr>
                      ) : (
                        transactions.map((txn) => (
                          <tr key={txn._id} className="border-b hover:bg-slate-50">
                            <td className="px-6 py-4 text-gray-600">
                              {format(new Date(txn.createdAt), 'dd MMM yyyy')}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-900">{txn.description}</p>
                              <p className="text-[10px] text-gray-500 uppercase">Ref: {txn.reference || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                                {txn.mode || 'Cash'}
                              </Badge>
                            </td>
                            <td className={`px-6 py-4 text-right font-bold ${txn.entries[0]?.debit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {txn.entries[0]?.debit > 0 ? '+' : '-'}₹{txn.totalAmount?.toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {txn.isReconciled ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Reconciled
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-200">Pending</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {!txn.isReconciled && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-blue-600 text-xs h-7"
                                  onClick={async () => {
                                    try {
                                      await api.reconcileTransaction(txn._id, { isReconciled: true });
                                      fetchData();
                                      toast({ title: 'Success', description: 'Transaction reconciled' });
                                    } catch (e) {
                                      toast({ title: 'Error', description: 'Reconciliation failed', variant: 'destructive' });
                                    }
                                  }}
                                >
                                  Mark Cleared
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BankAndCash;
