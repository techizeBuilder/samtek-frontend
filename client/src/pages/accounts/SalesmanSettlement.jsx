import { useAuth } from '@/hooks/useAuth';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsSalesPersonsApi } from '@/api/customerService';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Search,
  IndianRupee,
  Clock,
  TrendingUp,
  X,
  Users,
  CheckCircle,
  FileText,
  Calculator,
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';
import { cn } from '@/lib/utils';

export default function SalesmanSettlement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Shared State
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');

  // 1. OVERVIEW TAB STATE
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // 2. SETTLEMENT TAB STATE
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [transactionType, setTransactionType] = useState('Credit');
  const [entryType, setEntryType] = useState('Cash Deposit');
  const [bankAccountId, setBankAccountId] = useState('cash');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [dailyCommRate, setDailyCommRate] = useState(5);

  // 3. LEDGER TAB STATE
  const [ledgerDates, setLedgerDates] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // QUERIES
  const { data: salesPersonsData, isLoading: isListLoading } = useQuery({
    queryKey: ['/accounts/sales-persons', filters],
    queryFn: () => accountsSalesPersonsApi.getAll(filters),
  });
  const salesPersons = salesPersonsData?.data?.salesPersons || [];

  const { data: dailyStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['salesman/daily-stats', selectedSalesmanId, settlementDate],
    queryFn: () => accountsSalesPersonsApi.getDailyStats(selectedSalesmanId, settlementDate),
    enabled: !!selectedSalesmanId && activeTab === 'settlement'
  });
  const stats = dailyStats?.data || null;

  const { data: ledgerData, isLoading: isLedgerLoading, refetch: refetchLedger } = useQuery({
    queryKey: ['salesman/ledger', selectedSalesmanId, ledgerDates],
    queryFn: () => accountsSalesPersonsApi.getLedger(selectedSalesmanId, ledgerDates),
    enabled: !!selectedSalesmanId && (activeTab === 'ledger' || activeTab === 'overview')
  });
  const ledgerEntries = ledgerData?.data || [];

  // Fetch Bank Accounts for dropdown
  const { data: bankSummary } = useQuery({
    queryKey: ['/accounts/bank-cash/summary'],
    queryFn: () => queryClient.getQueryData(['/accounts/bank-cash/summary']) || apiRequest('GET', '/api/accounts/bank-cash/summary'),
    enabled: activeTab === 'settlement'
  });
  const bankAccounts = bankSummary?.data?.accounts || [];



  // MUTATIONS
  const saveSettlementMutation = useMutation({
    mutationFn: (data) => accountsSalesPersonsApi.saveDailySettlement(data),
    onSuccess: () => {
      showSmartToast({ success: true, message: 'Settlement recorded successfully' });
      queryClient.invalidateQueries(['salesman/ledger']);
      queryClient.invalidateQueries(['/accounts/sales-persons']);
      queryClient.invalidateQueries(['/accounts/bank-cash/summary']);
      setSettlementAmount('');
      setSettlementNotes('');
      setActiveTab('ledger');
    },
    onError: (err) => showSmartToast({ variant: 'destructive', title: 'Error', description: err.message })
  });


  // HANDLERS
  const handleSaveSettlement = () => {
    if (!settlementAmount) return showSmartToast({ variant: 'destructive', title: 'Required', description: 'Please enter amount' });
    saveSettlementMutation.mutate({
      salesmanId: selectedSalesmanId,
      date: settlementDate,
      ...stats,
      amount: parseFloat(settlementAmount),
      transactionType,
      entryType,
      bankAccountId: bankAccountId === 'cash' ? null : bankAccountId,
      notes: settlementNotes
    });
  };


  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Salesman Management
          </h1>
          <p className="text-sm text-gray-500">Manage settlements, ledgers and commissions</p>
        </div>
        <div className="w-64">
          <Select value={selectedSalesmanId} onValueChange={setSelectedSalesmanId}>
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Select Salesman" />
            </SelectTrigger>
            <SelectContent>
              {salesPersons.map(sp => (
                <SelectItem key={sp._id} value={sp._id}>{sp.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[450px] mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settlement">Daily Settlement</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="border-gray-200">
            <CardHeader className="bg-gray-50/50 border-b">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <CardTitle>Sales Team Overview</CardTitle>
                  <CardDescription>Overall performance and settlement status</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search salesman..."
                    className="pl-9"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesman</TableHead>
                    <TableHead>Gross Sales</TableHead>
                    <TableHead>Returns</TableHead>
                    <TableHead>Expected Cash</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isListLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10">Loading...</TableCell></TableRow>
                  ) : salesPersons.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-500">No records found</TableCell></TableRow>
                  ) : salesPersons.map((sp) => (
                    <TableRow key={sp._id}>
                      <TableCell className="font-medium text-blue-900">{sp.fullName}</TableCell>
                      <TableCell>{formatCurrency(sp.totalGrossSales)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(sp.totalReturns)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(sp.netReceivable)}</TableCell>
                      <TableCell className="text-green-700 font-bold">{formatCurrency(sp.totalCollected)}</TableCell>
                      <TableCell>
                        <Badge variant={sp.settlementStatus === 'Paid' ? 'default' : 'secondary'} className={sp.settlementStatus === 'Paid' ? 'bg-green-500' : ''}>
                          {sp.settlementStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedSalesmanId(sp._id); setActiveTab('settlement'); }}>
                          Settle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlement">
          {!selectedSalesmanId ? (
            <div className="p-20 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400">Please select a salesman to start settlement</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50">
                    <div>
                      <CardTitle className="text-lg">Daily Statistics</CardTitle>
                      <CardDescription>Summary for {settlementDate}</CardDescription>
                    </div>
                    <Input
                      type="date"
                      className="w-40"
                      value={settlementDate}
                      onChange={(e) => setSettlementDate(e.target.value)}
                    />
                  </CardHeader>
                  <CardContent className="p-6">
                    {isStatsLoading ? <div className="p-10 text-center">Loading stats...</div> : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg bg-white">
                          <p className="text-xs text-gray-500 font-bold uppercase">Gross Sales</p>
                          <p className="text-xl font-bold">{formatCurrency(stats?.totalInvoiceSale)}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-white">
                          <p className="text-xs text-red-500 font-bold uppercase border-red-100">Returns</p>
                          <p className="text-xl font-bold text-red-600">-{formatCurrency(stats?.totalReturn)}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                          <p className="text-xs text-blue-600 font-bold uppercase">Net Sale</p>
                          <p className="text-xl font-bold text-blue-700">{formatCurrency(stats?.netSale)}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-white">
                          <p className="text-xs text-green-600 font-bold uppercase">Cash Sale</p>
                          <p className="text-xl font-bold text-green-700">{formatCurrency(stats?.cashSale)}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-white">
                          <p className="text-xs text-orange-600 font-bold uppercase">Credit Sale</p>
                          <p className="text-xl font-bold text-orange-600">{formatCurrency(stats?.creditSale)}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-indigo-600 text-white">
                          <p className="text-xs text-indigo-100 font-bold uppercase">Expected Cash</p>
                          <p className="text-xl font-bold">{formatCurrency(stats?.expectedCash)}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-8 space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-gray-400" />
                          Order List
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stats?.orders?.map(o => (
                                <TableRow key={o._id}>
                                  <TableCell className="font-medium">{o.orderCode}</TableCell>
                                  <TableCell>{o.customerName}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={o.paymentMethod === 'Cash' || o.paymentMethod === 'Other' ? 'text-green-600' : 'text-orange-600'}>
                                      {o.paymentMethod}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrency(o.totalAmount)}</TableCell>
                                </TableRow>
                              )) || <TableRow><TableCell colSpan={4} className="text-center py-4 text-gray-400">No orders</TableCell></TableRow>}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {stats?.returns?.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-red-600 flex items-center gap-2">
                            <RotateCcw className="h-4 w-4" />
                            Return List
                          </h4>
                          <div className="border border-red-100 rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader className="bg-red-50/50">
                                <TableRow>
                                  <TableHead>Return#</TableHead>
                                  <TableHead>Customer</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stats.returns.map(r => (
                                  <TableRow key={r._id}>
                                    <TableCell className="font-medium">{r.returnNumber}</TableCell>
                                    <TableCell>{r.customerName}</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">-{formatCurrency(r.totalAmount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-blue-200 shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-b-0 space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <IndianRupee className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Settlement Entry</CardTitle>
                        <CardDescription className="text-blue-100">Manual adjustments & collections</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Type</Label>
                        <div className="flex p-1 bg-slate-100 rounded-lg">
                          <button
                            onClick={() => setTransactionType('Credit')}
                            className={cn(
                              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                              transactionType === 'Credit' ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                          >
                            Credit (Add to Bank)
                          </button>
                          <button
                            onClick={() => setTransactionType('Debit')}
                            className={cn(
                              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all",
                              transactionType === 'Debit' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                          >
                            Debit (Cut from Bank)
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Category</Label>
                        <Select value={entryType} onValueChange={setEntryType}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {transactionType === 'Credit' ? (
                              <>
                                <SelectItem value="Cash Deposit">Cash Deposit</SelectItem>
                                <SelectItem value="Opening Balance">Opening Balance</SelectItem>
                                <SelectItem value="Adjustment (In)">Adjustment (In)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="Salary">Salary Payment</SelectItem>
                                <SelectItem value="Commission">Commission</SelectItem>
                                <SelectItem value="Advance">Advance Taken</SelectItem>
                                <SelectItem value="Incentive">Incentive</SelectItem>
                                <SelectItem value="Expense Reimbursement">Expense Reimb.</SelectItem>
                                <SelectItem value="Shortage">Shortage</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Amount (₹)</Label>
                      <Input
                        placeholder="0.00"
                        className="text-2xl font-black py-6 text-center border-slate-200 focus:ring-blue-500 rounded-xl"
                        type="number"
                        value={settlementAmount}
                        onChange={(e) => setSettlementAmount(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Bank Account</Label>
                      <Select value={bankAccountId} onValueChange={setBankAccountId}>
                        <SelectTrigger className={cn("h-10", bankAccountId !== 'cash' && "border-blue-300 bg-blue-50/50")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Internal Cash Registry</SelectItem>
                          {bankAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} (₹{acc.balance?.toLocaleString()})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {bankAccountId !== 'cash' && (
                        <p className="text-[10px] text-blue-600 font-medium italic">
                          ℹ️ Bank Action: {transactionType === 'Credit' ? 'ADD' : 'DEDUCT'} ₹{settlementAmount || '0'} {transactionType === 'Credit' ? 'to' : 'from'} account.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Remarks</Label>
                      <Input
                        placeholder="Optional details..."
                        className="h-9 text-xs"
                        value={settlementNotes}
                        onChange={(e) => setSettlementNotes(e.target.value)}
                      />
                    </div>


                    <Button
                      className={cn(
                        "w-full h-12 font-bold text-white shadow-lg transition-all",
                        transactionType === 'Credit' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                      )}
                      disabled={!settlementAmount || saveSettlementMutation.isPending}
                      onClick={handleSaveSettlement}
                    >
                      {saveSettlementMutation.isPending ? <RefreshCw className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Post {transactionType} Entry
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ledger">
          {!selectedSalesmanId ? (
            <div className="p-20 text-center bg-gray-50 border-2 border-dashed rounded-xl">
              <p className="text-gray-400">Select a salesman to view statement</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-end gap-4 p-4 bg-white border rounded-xl shadow-sm">
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">From</Label>
                    <Input type="date" value={ledgerDates.startDate} onChange={(e) => setLedgerDates(p => ({ ...p, startDate: e.target.value }))} className="w-40" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">To</Label>
                    <Input type="date" value={ledgerDates.endDate} onChange={(e) => setLedgerDates(p => ({ ...p, endDate: e.target.value }))} className="w-40" />
                  </div>
                  <div className="mt-5">
                    <Button variant="outline" onClick={refetchLedger} className="h-10">
                      <RefreshCw className={`h-4 w-4 mr-2 ${isLedgerLoading ? 'animate-spin' : ''}`} />
                      Reload
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-400 font-bold uppercase">Balance</p>
                  <div className={`text-2xl font-bold ${ledgerEntries[0]?.runningBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(ledgerEntries[0]?.runningBalance || 0))}
                  </div>
                </div>
              </div>

              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-white border-b px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">Ledger Transactions</CardTitle>
                      <CardDescription>Detailed statement of accounts</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold px-6">Date</TableHead>
                          <TableHead className="font-semibold">Transaction Details</TableHead>
                          <TableHead className="font-semibold text-right text-red-600">Debit (DR)</TableHead>
                          <TableHead className="font-semibold text-right text-green-600">Credit (CR)</TableHead>
                          <TableHead className="text-right pr-6 font-semibold">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLedgerLoading ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Loading ledger entries...</TableCell></TableRow>
                        ) : ledgerEntries.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400 italic">No transactions found for this period</TableCell></TableRow>
                        ) : ledgerEntries.map(entry => (
                          <TableRow key={entry._id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="px-6 py-4">
                              <span className="text-slate-900 font-medium">
                                {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{entry.entryType}</span>
                                <span className="text-xs text-slate-500 italic max-w-xs truncate">{entry.description}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {entry.transactionType === 'Debit' ? formatCurrency(entry.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-700">
                              {entry.transactionType === 'Credit' ? formatCurrency(entry.amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span className={cn(
                                "font-bold text-lg",
                                entry.runningBalance >= 0 ? "text-red-600" : "text-green-600"
                              )}>
                                ₹{Math.abs(entry.runningBalance || 0).toLocaleString('en-IN')}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
