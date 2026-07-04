import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Wallet,
    Banknote,
    CreditCard,
    RefreshCw,
    History,
    User,
    Calendar,
    ArrowRight,
    CheckCircle2,
    DollarSign,
    QrCode,
    FileText,
    TrendingUp,
    Printer,
    Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CustomerPayments = () => {
    const { toast } = useToast();
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch logged-in user's company details
    const { data: companyResponse } = useQuery({
        queryKey: ['my-company-payments'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const companyId = user?.companyId || user?.company?._id;
            if (!companyId) return null;
            const apiBase = import.meta.env.VITE_API_URL || '/api';
            const res = await axios.get(`${apiBase}/super-admin/companies/${companyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        },
        staleTime: 1000 * 60 * 10
    });
    const companyData = companyResponse?.company || {};
    const companyName = 'SAMTEK MACHINERY';
    const companyGst = companyData.gst || '';
    const companyMobile = companyData.mobile || '';
    const companyEmail = companyData.email || '';
    const companyAddress = [companyData.address, companyData.city, companyData.state].filter(Boolean).join(', ');

    const { data: customersData } = useQuery({
        queryKey: ['/api/customers/dropdown'],
        queryFn: () => apiRequest('GET', '/api/customers/dropdown/list')
    });

    const { data: outstandingResponse, isLoading: isLoadingOutstanding } = useQuery({
        queryKey: ['/api/accounts/sales/receivables/ageing', selectedCustomer],
        queryFn: () => apiRequest('GET', `/api/accounts/sales/receivables/ageing?customerId=${selectedCustomer}`),
        enabled: !!selectedCustomer
    });

    // Use Customer Master's outstandingAmount as the authoritative balance
    // The ageing query can show duplicates if multiple Sale records exist for one order
    const customerOutstanding = outstandingResponse?.data?.[0];
    const selectedCustomerInfo = customersData?.data?.find(c => c._id === selectedCustomer);

    // True outstanding = Customer Master outstandingAmount (single source of truth)
    // Ageing invoices list is still useful to show breakdown
    const trueOutstanding = selectedCustomerInfo?.outstandingAmount ?? customerOutstanding?.totalOutstanding ?? 0;
    const pendingInvoices = customerOutstanding?.invoices || [];
    const invoiceCount = customerOutstanding?.invoiceCount || 0;

    const { data: statsResponse } = useQuery({
        queryKey: ['/api/accounts/sales/payment/stats'],
        queryFn: () => apiRequest('GET', '/api/accounts/sales/payment/stats')
    });

    const paymentStats = statsResponse?.data;

    const { data: bankAccountsResponse } = useQuery({
        queryKey: ['/api/accounts/bank-cash/summary'],
        queryFn: () => apiRequest('GET', '/api/accounts/bank-cash/summary'),
        staleTime: 0,
        refetchOnMount: true,
    });
    const bankAccounts = bankAccountsResponse?.data?.accounts || [];

    const createMutation = useMutation({
        mutationFn: (paymentData) => apiRequest('POST', '/api/accounts/sales/payments', paymentData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/sales/account/invoices'] });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/sales/receivables/ageing'] });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/sales/payment/stats'] });
            toast({
                title: "Receipt Recorded",
                description: "Payment has been allocated to outstanding invoices.",
                variant: "success",
                className: "bg-green-50 border-green-200 text-green-900",
                duration: 3000
            });
            setSelectedCustomer('');
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const paymentData = Object.fromEntries(formData.entries());
        paymentData.amount = parseFloat(paymentData.amount);
        paymentData.customerId = selectedCustomer;

        if (paymentData.amount <= 0) {
            return toast({ title: "Invalid Amount", description: "Payment must be greater than zero.", variant: "destructive" });
        }

        createMutation.mutate(paymentData);
    };

    const [showRecentReceipts, setShowRecentReceipts] = useState(false);

    const { data: recentPaymentsData, isLoading: isLoadingRecent } = useQuery({
        queryKey: ['/api/accounts/sales/payments'],
        queryFn: () => apiRequest('GET', '/api/accounts/sales/payments?limit=10'),
        enabled: showRecentReceipts // Only fetch when modal is open
    });

    const recentPayments = recentPaymentsData?.data?.payments || [];

    const handlePrintReceipt = (payment) => {
        if (!payment) return;

        // Use actual logo from public folder (encode spaces for safe URL resolution)
        const logoUrl = window.location.origin + '/logo%20Semtek.webp';

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${payment.referenceNo || ''}</title>
  <style>
    @page { size: A5 landscape; margin: 10mm; }
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Arial,sans-serif; }
    body { background:#fff; color:#1e293b; padding: 20px; }
    .receipt-card { border: 2px solid #f1f5f9; border-radius: 16px; overflow: hidden; }
    .header { background: #1e293b; color:#fff; padding:24px; display:flex; justify-content:space-between; align-items:center; }
    .logo-area { display:flex; align-items:center; gap:12px; }
    .logo-img { width:54px; height:54px; object-fit:contain; }
    .company-info .company-name { font-size:22px; font-weight:900; letter-spacing:1px; }
    .company-info .company-sub { font-size:10px; color:#94a3b8; margin-top:2px; }
    .company-info .company-details { font-size:9px; color:#cbd5e1; margin-top:6px; line-height:1.6; }
    .receipt-badge { background:rgba(255,255,255,0.1); padding:8px 16px; border-radius:8px; text-align:right; }
    .content { padding: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .info-block label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:4px; }
    .info-block span { font-size:16px; font-weight:700; color:#0f172a; }
    .amount-box { grid-column: span 2; background: #f8fafc; padding: 24px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #10b981; }
    .footer { padding:16px; text-align:center; color:#94a3b8; font-size:10px; border-top:1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div class="logo-area">
        <img src="${logoUrl}" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
        <div class="company-info">
          <div class="company-name">${companyName}</div>
          <div class="company-sub">Official Payment Receipt</div>
          <div class="company-details">
            ${companyAddress ? companyAddress + '<br/>' : ''}
            ${companyGst ? 'GSTIN: ' + companyGst + ' &nbsp;|&nbsp; ' : ''}${companyMobile ? 'Tel: ' + companyMobile : ''}
            ${companyEmail ? '<br/>' + companyEmail : ''}
          </div>
        </div>
      </div>
      <div class="receipt-badge">
        <div style="font-size:10px; opacity:0.7; text-transform:uppercase;">Payment Receipt</div>
        <div style="font-size:16px; font-weight:900;">${payment.referenceNo || 'OFFICIAL-COPY'}</div>
      </div>
    </div>
    <div class="content">
      <div class="info-block">
        <label>Customer Name</label>
        <span>${payment.customer?.name || 'N/A'}</span>
      </div>
      <div class="info-block" style="text-align:right;">
        <label>Date Received</label>
        <span>${new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>
      <div class="info-block">
        <label>Payment Mode</label>
        <span>${payment.paymentMode}</span>
      </div>
      <div class="info-block" style="text-align:right;">
         <label>Reference No</label>
         <span>${payment.referenceNo || '—'}</span>
      </div>
      <div class="amount-box">
        <div>
          <label style="color:#64748b; font-size:11px;">Amount Received In Words</label>
          <span style="color:#1e3a8a; font-size:14px; text-transform:capitalize;">Rupees ${payment.amount.toLocaleString('en-IN')} Only</span>
        </div>
        <div style="text-align:right;">
          <label style="color:#64748b; font-size:11px;">Total Amount Received</label>
          <div style="font-size:32px; font-weight:900; color:#059669;">₹${payment.amount.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
    <div class="footer">
      This is an electronic receipt and does not require a physical signature. &nbsp;|&nbsp; ${companyName}
    </div>
  </div>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(html);
        win.document.close();
        win.focus();

        // Wait for logo image to load completely before opening print window
        win.onload = function() {
            win.print();
        };
        // Fallback for some browsers where onload might not trigger correctly
        setTimeout(() => {
            if (win && !win.closed) {
                win.print();
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Customer Receipts</h1>
                    <p className="text-slate-500 mt-1">Record payments and manage automated FIFO allocations.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="rounded-full h-11 px-6 border-slate-200 hover:bg-white hover:text-blue-600 transition-colors"
                        onClick={() => setShowRecentReceipts(true)}
                    >
                        <History className="w-4 h-4 mr-2" /> Recent Receipts
                    </Button>
                </div>
            </div>

            {/* Recent Receipts Modal */}
            {showRecentReceipts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black italic tracking-tight text-slate-900">Recent Transactions</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Last 10 Receipts</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowRecentReceipts(false)} className="rounded-full hover:bg-slate-100">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {isLoadingRecent ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : recentPayments.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 font-medium italic">No recent receipts found.</div>
                            ) : (
                                <div className="space-y-3">
                                    {recentPayments.map((payment) => (
                                        <div key={payment._id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-blue-100 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                                    payment.paymentMode === 'Bank Transfer' ? 'bg-green-50 text-green-600 group-hover:bg-green-100' : 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
                                                )}>
                                                    {payment.paymentMode === 'Bank Transfer' ? <CreditCard className="w-5 h-5" /> : <Banknote className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-900">{payment.customer?.name || 'Unknown Customer'}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                                        {new Date(payment.paymentDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} • {payment.referenceNo || 'No Ref'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black italic tracking-tight text-slate-900">
                                                    +₹{payment.amount.toLocaleString('en-IN')}
                                                </div>
                                                <div className="flex items-center justify-end gap-2 mt-1">
                                                    <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block">
                                                        RECEIVED
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                                                        onClick={() => handlePrintReceipt(payment)}
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
                            <Button variant="ghost" size="sm" onClick={() => setShowRecentReceipts(false)} className="text-slate-500 hover:text-slate-900 font-bold text-xs uppercase tracking-wider">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Section */}
                <Card className="lg:col-span-8 shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="bg-slate-900 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Wallet className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="bg-blue-500 p-3 rounded-2xl">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic tracking-tight">RECEIPT ENTRY</CardTitle>
                                <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-0.5">Automated Ledger Posting</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-10">
                        <form onSubmit={handleSubmit} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Select Customer Account</label>
                                    <select
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] p-4 font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Search Customer --</option>
                                        {customersData?.data?.map(c => (
                                            <option key={c._id} value={c._id}>{c.name} ({c.customerCode})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Receipt Date</label>
                                    <Input name="paymentDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-14 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50 font-bold px-6" required />
                                </div>
                            </div>

                            {/* Outstanding Dynamic UI */}
                            {selectedCustomer && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                                        <div className="absolute -bottom-8 -right-8 opacity-20 rotate-12">
                                            <FileText className="w-48 h-48 text-white" />
                                        </div>
                                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                            <div className="space-y-2">
                                                <h3 className="text-blue-100/70 text-[10px] font-black uppercase tracking-[0.2em]">Current Receivables</h3>
                                                <div className="text-5xl font-black italic tracking-tighter">₹{trueOutstanding.toLocaleString('en-IN')}</div>
                                                <div className="flex items-center gap-3 mt-4">
                                                    <Badge className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-1 text-[10px] font-bold border-0 backdrop-blur-sm">
                                                        OUTSTANDING BALANCE
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Receipt Amount (₹)</label>
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-blue-500 transition-colors">₹</span>
                                        <Input
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="h-20 rounded-[1.5rem] border-4 border-slate-50 bg-slate-50 pl-14 text-4xl font-black italic tracking-tighter focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Deposit To (Bank/Cash)</label>
                                    <select
                                        name="accountId"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] p-4 font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="">-- Choose Account --</option>
                                        {bankAccounts?.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} (₹{(acc.balance ?? 0).toLocaleString()})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Payment Channel</label>
                                    <div className="grid grid-cols-2 gap-3 h-20">
                                        <label className="relative flex items-center justify-center border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                            <input type="radio" name="paymentMode" value="Bank Transfer" className="sr-only" defaultChecked />
                                            <div className="flex flex-col items-center gap-1">
                                                <CreditCard className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase">Bank / NEFT</span>
                                            </div>
                                        </label>
                                        <label className="relative flex items-center justify-center border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                                            <input type="radio" name="paymentMode" value="Cash" className="sr-only" />
                                            <div className="flex flex-col items-center gap-1">
                                                <Banknote className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase">Cash</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Transaction Ref / UTR / Remarks</label>
                                <Input name="referenceNo" placeholder="Enter bank reference number or customer note..." className="h-14 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50 font-semibold px-6" />
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 rounded-[1.5rem] text-xl font-black italic shadow-xl shadow-blue-500/30 transition-all active:scale-[0.98] mt-8"
                                disabled={createMutation.isPending || !selectedCustomer}
                            >
                                {createMutation.isPending ? 'COMMITTING TO LEDGER...' : 'SECURELY RECORD RECEIPT'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Sidebar Stats Section */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="shadow-xl shadow-blue-500/10 border-0 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-[2rem] p-4">
                        <CardHeader>
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Monthly Yield</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="text-5xl font-black italic tracking-tighter mb-2">₹{paymentStats?.totalPaid?.toLocaleString('en-IN') || '0'}</div>
                            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                                <TrendingUp className="w-4 h-4" />
                                Total Collection (MTD)
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xl shadow-slate-200 border-0 bg-white rounded-[2rem] overflow-hidden">
                        <CardHeader className="bg-slate-50 px-8 py-6 border-b border-slate-100">
                            <CardTitle className="text-sm font-black uppercase italic tracking-widest text-slate-500 flex items-center gap-2">
                                <QrCode className="w-4 h-4" />
                                Mode Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            {paymentStats?.modes?.map((mode, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                mode._id === 'Bank Transfer' ? 'bg-green-50 text-green-600' :
                                                    mode._id === 'Cash' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                            )}>
                                                {mode._id === 'Bank Transfer' ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                                            </div>
                                            <span className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{mode._id}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-slate-400 block">{mode.count} Txns</span>
                                            <span className="text-lg font-black italic text-slate-900">{mode.percentage}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000",
                                                mode._id === 'Bank Transfer' ? 'bg-green-500' :
                                                    mode._id === 'Cash' ? 'bg-amber-500' : 'bg-blue-500'
                                            )}
                                            style={{ width: `${mode.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {(!paymentStats?.modes || paymentStats.modes.length === 0) && (
                                <div className="text-center py-10 opacity-30 italic font-bold text-slate-400">
                                    No entries found
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Help / Info */}
                    <div className="p-8 bg-blue-50 rounded-[2rem] border-2 border-dashed border-blue-200">
                        <h4 className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase italic mb-4">
                            <CheckCircle2 className="w-4 h-4" />
                            Pro Tip
                        </h4>
                        <p className="text-blue-700/80 text-xs font-medium leading-relaxed italic">
                            FIFO allocation automatically applies payments to the oldest outstanding invoices first. You can view allocation details in the Customer Ledger.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerPayments;
