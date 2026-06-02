import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Printer, Download, Filter, Calendar as CalendarIcon, ArrowLeft, ArrowRight, Wallet, History } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useReactToPrint } from 'react-to-print';

const LedgerRecord = () => {
    const { toast } = useToast();
    const printRef = useRef();

    // States
    const [accounts, setAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [accountInfo, setAccountInfo] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
    const [selectedRecordForReceipt, setSelectedRecordForReceipt] = useState(null);
    const receiptPrintRef = useRef();

    // Filters
    const getDefaultDates = () => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const fyStartYear = today.getMonth() < 3 ? currentYear - 1 : currentYear;
        return {
            startDate: format(new Date(fyStartYear, 3, 1), 'yyyy-MM-dd'),
            endDate: format(today, 'yyyy-MM-dd')
        };
    };

    const [dateRange, setDateRange] = useState(getDefaultDates());
    const [financialYear, setFinancialYear] = useState(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        return today.getMonth() < 3
            ? `${currentYear - 1}-${currentYear}`
            : `${currentYear}-${currentYear + 1}`;
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccountId) {
            fetchLedger(1);
        }
    }, [selectedAccountId, dateRange, financialYear]);

    const fetchAccounts = async () => {
        try {
            setAccountsLoading(true);
            const res = await api.get('/accounts?limit=200');
            console.log('Ledger: Accounts API Response:', res);

            if (res.success) {
                const accountList = res.accounts || res.data?.accounts || res.data || [];
                console.log('Ledger: Account list extracted:', accountList);

                if (Array.isArray(accountList)) {
                    // Sort: Bank & Cash accounts first, then the rest
                    const sorted = [...accountList].sort((a, b) => {
                        if (a.isBankOrCash && !b.isBankOrCash) return -1;
                        if (!a.isBankOrCash && b.isBankOrCash) return 1;
                        return (a.accountName || '').localeCompare(b.accountName || '');
                    });
                    setAccounts(sorted);
                } else {
                    console.log('Ledger: accountList is not an array!');
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            toast({
                title: 'Error',
                description: 'Failed to load accounts list',
                variant: 'destructive',
            });
        } finally {
            setAccountsLoading(false);
        }
    };

    const fetchLedger = async (page = 1) => {
        try {
            setLoading(true);
            const res = await api.getLedgerRecords({
                accountId: selectedAccountId,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                page,
                limit: 15
            });

            if (res.success) {
                setRecords(res.records);
                setOpeningBalance(res.openingBalance);
                setAccountInfo(res.account);
                setPagination(res.pagination);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to fetch ledger records',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Ledger_${accountInfo?.name || 'Record'}_${format(new Date(), 'ddMMyyyy')}`,
    });

    const handlePrintReceipt = useReactToPrint({
        contentRef: receiptPrintRef,
        documentTitle: `Receipt_${selectedRecordForReceipt?.voucherNo || 'Detail'}_${format(new Date(), 'ddMMyyyy')}`,
    });

    const triggerReceiptPrint = (record) => {
        setSelectedRecordForReceipt(record);
    };

    useEffect(() => {
        if (selectedRecordForReceipt) {
            handlePrintReceipt();
            const timer = setTimeout(() => setSelectedRecordForReceipt(null), 1000);
            return () => clearTimeout(timer);
        }
    }, [selectedRecordForReceipt, handlePrintReceipt]);

    const formatCurrency = (amount) => {
        const absAmount = Math.abs(amount);
        const formatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(absAmount);

        const suffix = amount >= 0 ? ' Db' : ' Cr';
        // Adjust suffix based on account type if possible, but standard is Db/Cr
        return `${formatted}${suffix}`;
    };

    const renderPagination = () => {
        if (pagination.pages <= 1) return null;

        return (
            <div className="flex items-center justify-between px-2 py-4 border-t">
                <div className="text-sm text-slate-500">
                    Showing {records.length} of {pagination.total} records
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => fetchLedger(pagination.page - 1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                            let pageNum;
                            if (pagination.pages <= 5) pageNum = i + 1;
                            else if (pagination.page <= 3) pageNum = i + 1;
                            else if (pagination.page >= pagination.pages - 2) pageNum = pagination.pages - 4 + i;
                            else pageNum = pagination.page - 2 + i;

                            return (
                                <Button
                                    key={pageNum}
                                    variant={pagination.page === pageNum ? "default" : "outline"}
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => fetchLedger(pageNum)}
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => fetchLedger(pagination.page + 1)}
                    >
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ledger Record</h1>
                        <p className="text-slate-500 mt-1">View transaction history and running balances for all accounts</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Legacy buttons removed as per user request */}
                    </div>
                </div>

                {/* Filters Section */}
                <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-600 font-medium">Select Account</Label>
                                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger className="bg-white border-slate-200 focus:ring-slate-400">
                                        <SelectValue placeholder="Search account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accountsLoading && (
                                            <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                                        )}
                                        {!accountsLoading && accounts.length === 0 && (
                                            <SelectItem value="none" disabled>No accounts found</SelectItem>
                                        )}
                                        {accounts.map(acc => (
                                            <SelectItem key={acc._id} value={acc._id}>
                                                {acc.isBankOrCash ? '🏦 ' : ''}{acc.accountName}
                                                {acc.bankDetails?.bankName && (
                                                    <span className="text-[10px] text-slate-400 ml-1">({acc.bankDetails.bankName})</span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 font-medium">Financial Year</Label>
                                <Select value={financialYear} onValueChange={setFinancialYear}>
                                    <SelectTrigger className="bg-white border-slate-200 focus:ring-slate-400">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2024-2025">FY 2024-2025</SelectItem>
                                        <SelectItem value="2025-2026">FY 2025-2026</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 font-medium">Start Date</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="date"
                                        className="pl-10 border-slate-200 focus:ring-slate-400"
                                        value={dateRange.startDate}
                                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 font-medium">End Date</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="date"
                                        className="pl-10 border-slate-200 focus:ring-slate-400"
                                        value={dateRange.endDate}
                                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                {accountInfo && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-0 shadow-sm bg-blue-50/50">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Wallet className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-blue-600 uppercase">Opening Balance</p>
                                    <p className="text-lg font-bold text-slate-900">{formatCurrency(openingBalance)}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-emerald-50/50">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 rounded-lg">
                                    <ArrowRight className="w-5 h-5 text-emerald-600 rotate-45" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-emerald-600 uppercase">Total Debit</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ₹{records.reduce((sum, r) => sum + (r.debit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-rose-50/50">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-rose-100 rounded-lg">
                                    <ArrowLeft className="w-5 h-5 text-rose-600 rotate-45" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-rose-600 uppercase">Total Credit</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        ₹{records.reduce((sum, r) => sum + (r.credit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-slate-900 text-white">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-slate-800 rounded-lg">
                                    <History className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-400 uppercase">Closing Balance</p>
                                    <p className="text-lg font-bold">
                                        {formatCurrency(records.length > 0 ? records[0].balance : openingBalance)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Main Table Content */}
                <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
                    <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-900">
                                {accountInfo ? `${accountInfo.name} - Ledger` : 'Transaction History'}
                            </CardTitle>
                            <CardDescription>
                                {accountInfo ? `Account Number: ${accountInfo.accountNumber}` : 'Select an account to view records'}
                            </CardDescription>
                        </div>
                        {accountInfo && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 px-4 py-1">
                                {accountInfo.type} Account
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto min-h-[400px]">
                            <div ref={printRef} className="p-8 print:p-4">
                                {/* Print Header */}
                                <div className="hidden print:block mb-8 text-center border-b pb-6">
                                    <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-900">{accountInfo?.name}</h2>
                                    <p className="text-slate-500 mt-2">Ledger Account: {accountInfo?.accountNumber}</p>
                                    <p className="text-sm text-slate-400 mt-1">Period: {format(new Date(dateRange.startDate), 'dd-MMM-yy')} to {format(new Date(dateRange.endDate), 'dd-MMM-yy')}</p>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/80 border-y hover:bg-slate-50/80">
                                            <TableHead className="w-[120px] font-bold text-slate-900 py-4">Date</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Voucher No.</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Ledger / Description</TableHead>
                                            <TableHead className="font-bold text-slate-900 py-4">Entity Name</TableHead>
                                            <TableHead className="text-right font-bold text-slate-900 py-4">Debit</TableHead>

                                            <TableHead className="text-right font-bold text-slate-900 py-4">Credit (₹)</TableHead>
                                            <TableHead className="text-right font-bold text-slate-900 py-4">Balance</TableHead>
                                            <TableHead className="text-center font-bold text-slate-900 py-4 pr-6">Print</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!selectedAccountId ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-64 text-center">

                                                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                                                        <div className="p-4 bg-slate-50 rounded-full">
                                                            <Wallet className="w-12 h-12 stroke-[1.5]" />
                                                        </div>
                                                        <p className="text-lg font-medium">Please select an account to view ledger</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-64 text-center">

                                                    <div className="flex flex-col items-center justify-center gap-4">
                                                        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                                                        <p className="text-slate-500 font-medium">Loading ledger data...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {/* Transaction Rows */}
                                                {records.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="h-32 text-center text-slate-500 py-10">

                                                            No transactions found for the selected period.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    <>
                                                        {records.map((record, index) => (
                                                            <TableRow key={record._id || index} className="hover:bg-slate-50/80 transition-colors border-b">
                                                                <TableCell className="text-slate-600">
                                                                    {format(new Date(record.date), 'dd-MMM-yy')}
                                                                </TableCell>
                                                                <TableCell className="font-mono text-[13px] text-slate-700 uppercase tracking-tighter">
                                                                    {record.voucherNo}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold text-slate-800">{record.ledger}</span>
                                                                        <span className="text-xs text-slate-400 italic line-clamp-1">{record.description}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-slate-700">
                                                                    {record.entityName || '-'}
                                                                </TableCell>

                                                                <TableCell className="text-right text-slate-900 font-medium">
                                                                    {record.debit > 0 ? record.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right text-slate-900 font-medium">
                                                                    {record.credit > 0 ? record.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-slate-900">
                                                                    {formatCurrency(record.balance)}
                                                                </TableCell>
                                                                <TableCell className="text-center pr-6">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900"
                                                                        onClick={() => triggerReceiptPrint(record)}
                                                                    >
                                                                        <Printer className="w-4 h-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}

                                                        {/* Opening Balance Row at the BOTTOM of the list (when on last page) */}
                                                        {pagination.page === pagination.pages && (
                                                            <TableRow className="bg-blue-50/30 hover:bg-blue-50/50 transition-colors border-b">
                                                                <TableCell className="font-medium text-blue-700">
                                                                    {format(new Date(dateRange.startDate), 'dd-MMM-yy')}
                                                                </TableCell>
                                                                <TableCell>-</TableCell>
                                                                <TableCell className="font-bold text-slate-900">Opening Balance</TableCell>
                                                                <TableCell>-</TableCell>

                                                                <TableCell className="text-right">0.00</TableCell>
                                                                <TableCell className="text-right">0.00</TableCell>
                                                                <TableCell className="text-right font-bold text-slate-900">
                                                                    {formatCurrency(openingBalance)}
                                                                </TableCell>
                                                                <TableCell className="pr-6"></TableCell>
                                                            </TableRow>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Print Footer Summary */}
                                <div className="hidden print:grid grid-cols-3 gap-6 mt-12 pt-8 border-t">
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total Debits</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            ₹{records.reduce((sum, r) => sum + r.debit, 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Total Credits</p>
                                        <p className="text-xl font-bold text-slate-900">
                                            ₹{records.reduce((sum, r) => sum + r.credit, 0).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-slate-900 rounded-xl text-white">
                                        <p className="text-xs text-slate-300 font-bold uppercase mb-1">Closing Balance</p>
                                        <p className="text-xl font-bold">
                                            {formatCurrency(records.length > 0 ? records[records.length - 1].balance : openingBalance)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {renderPagination()}
                    </CardContent>
                </Card>
            </div>

            {/* Hidden Receipt Template for Individual Printing */}
            <div className="hidden">
                <ReceiptTemplate
                    ref={receiptPrintRef}
                    record={selectedRecordForReceipt}
                    accountInfo={accountInfo}
                    openingBalance={openingBalance}
                />
            </div>
        </div>
    );
};

// --- Receipt Template for Individual Transaction Printing ---
const ReceiptTemplate = React.forwardRef(({ record, accountInfo }, ref) => {
    if (!record) return null;

    return (
        <div ref={ref} className="p-10 bg-white text-slate-900 font-sans print:p-8" style={{ width: '210mm', minHeight: '297mm' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">SUNRISE FOODS</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Quality You Can Trust</p>
                    <div className="mt-4 text-xs space-y-0.5 text-slate-600">
                        <p>Tirupati, Andhra Pradesh, India</p>
                        <p>GSTIN: 37AAAAA0000A1Z5</p>
                        <p>Contact: +91 98765 43210</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="bg-slate-900 text-white px-4 py-2 font-bold text-xl inline-block mb-4">
                        TRANSACTION RECEIPT
                    </div>
                    <div className="text-xs space-y-1">
                        <p><span className="font-bold text-slate-400 uppercase mr-2">Voucher No:</span> {record.voucherNo}</p>
                        <p><span className="font-bold text-slate-400 uppercase mr-2">Date:</span> {format(new Date(record.date), 'dd-MMMM-yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-12 mb-10">
                <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-900">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Account Details</p>
                    <h3 className="text-xl font-bold text-slate-900">{accountInfo?.name}</h3>
                    <p className="text-sm text-slate-600">A/c No: {accountInfo?.accountNumber || '-'}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border-r-4 border-slate-900 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">In Relation To</p>
                    <h3 className="text-xl font-bold text-slate-900">{record.entityName || record.ledger}</h3>
                    <p className="text-sm text-slate-600">{record.entityType || record.relatedDocument || 'General Transaction'}</p>
                    {record.paymentMode && <p className="text-xs text-emerald-600 font-bold mt-1 uppercase">via {record.paymentMode}</p>}
                </div>
            </div>

            {/* Description */}
            <div className="mb-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Description</p>
                <div className="bg-white border-2 border-slate-100 p-6 rounded-xl">
                    <p className="text-lg text-slate-800 leading-relaxed">
                        {record.description || 'No additional description provided.'}
                    </p>
                </div>
            </div>

            {/* Totals Table */}
            <table className="w-full mb-10 border-collapse">
                <thead>
                    <tr className="bg-slate-900 text-white">
                        <th className="py-4 px-6 text-left text-xs font-bold uppercase tracking-widest">Type</th>
                        <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-widest">Amount (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-slate-100">
                        <td className="py-6 px-6 font-bold text-slate-600 uppercase text-sm">Debit</td>
                        <td className="py-6 px-6 text-right text-xl font-mono text-slate-900">
                            ₹ {record.debit > 0 ? record.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                    </tr>
                    <tr className="border-b border-slate-100">
                        <td className="py-6 px-6 font-bold text-slate-600 uppercase text-sm">Credit</td>
                        <td className="py-6 px-6 text-right text-xl font-mono text-slate-900">
                            ₹ {record.credit > 0 ? record.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        </td>
                    </tr>
                    <tr className="bg-slate-50">
                        <td className="py-6 px-6 font-black text-slate-900 uppercase">Closing Balance</td>
                        <td className="py-6 px-6 text-right text-2xl font-black text-slate-900">
                            ₹ {Math.abs(record.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="text-xs ml-1">{record.balance >= 0 ? 'Db' : 'Cr'}</span>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Signatory */}
            <div className="mt-32 flex justify-between items-end border-t pt-10">
                <div className="text-[10px] text-slate-400 max-w-[300px]">
                    <p className="font-bold text-slate-600 mb-1">SYSTEM GENERATED DOCUMENT</p>
                    <p>Computer generated invoice. No signature required.</p>
                </div>
                <div className="text-center">
                    <div className="w-48 h-1 bg-slate-200 mb-4 mx-auto"></div>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Authorized Signatory</p>
                    <p className="text-[10px] text-slate-400 mt-1">for Sunrise Foods</p>
                </div>
            </div>
        </div>
    );
});
ReceiptTemplate.displayName = 'ReceiptTemplate';

export default LedgerRecord;
