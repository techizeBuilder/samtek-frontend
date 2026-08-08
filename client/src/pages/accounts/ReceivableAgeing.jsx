import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { sendWhatsApp } from '@/lib/whatsapp';
import SendEmailModal from '@/components/email/SendEmailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Search,
    Download,
    Filter,
    TrendingDown,
    AlertCircle,
    Clock,
    ChevronRight,
    ArrowUpRight,
    Users,
    Activity,
    Send,
    MessageCircle,
    Mail,
    Copy,
    CheckCheck,
    Smartphone,
    Eye,
    X,
    Info,
    Building,

} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const ReceivableAgeing = () => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isPaymentLinkOpen, setIsPaymentLinkOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [emailModal, setEmailModal] = useState({ open: false, to: '', subject: '', message: '' });
    const [customMessage, setCustomMessage] = useState('');
    const [contactLoading, setContactLoading] = useState(false);

    const { data: ageingResponse, isLoading } = useQuery({
        queryKey: ['/api/accounts/sales/receivables/ageing'],
        queryFn: () => apiRequest('GET', '/api/accounts/sales/receivables/ageing')
    });

    const ageingData = ageingResponse?.data || [];

    const filteredData = ageingData.filter(item =>
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totals = ageingData.reduce((acc, item) => ({
        total: acc.total + item.totalOutstanding,
        s0_30: acc.s0_30 + item.slab0_30,
        s31_60: acc.s31_60 + item.slab31_60,
        s61p: acc.s61p + item.slab61_plus
    }), { total: 0, s0_30: 0, s31_60: 0, s61p: 0 });

    // ─── Payment Link Logic ───────────────────────────────────────────────
    const buildPaymentMessage = (customer) => {
        const amount = customer?.totalOutstanding?.toLocaleString('en-IN');
        const invoiceList = (customer?.invoices || [])
            .map(inv => `  • ${inv.invoiceNo} → ₹${inv.balance?.toLocaleString('en-IN')} (${inv.age} days old)`)
            .join('\n');

        const defaultMsg = `Dear ${customer?.customerName},\n\nThis is a gentle reminder regarding your outstanding payment with *SUNRISE*.\n\n*Total Due: ₹${amount}*\n\nPending Invoices:\n${invoiceList}\n\nKindly arrange the payment at the earliest to avoid any inconvenience.\n\nThank you!\n— Sunrise Accounts Team`;
        return customMessage || defaultMsg;
    };

    const openPaymentLinkModal = (customer) => {
        setCustomMessage('');
        setCopied(false);
        // Modal turant open karo — pehle existing data se
        setSelectedCustomer(customer);
        setIsPaymentLinkOpen(true);
        // Background mein fresh contact info fetch karo
        setContactLoading(true);
        apiRequest('GET', `/api/customers/${customer.customerId}`)
            .then((res) => {
                const freshData = res?.customer || res?.data || {};
                setSelectedCustomer((prev) => ({
                    ...prev,
                    customerMobile: freshData.mobile || prev.customerMobile || '',
                    customerEmail: freshData.email || prev.customerEmail || '',
                }));
            })
            .catch(() => { /* already set above */ })
            .finally(() => setContactLoading(false));
    };

    const handleWhatsApp = async () => {
        const customer = selectedCustomer;
        const mobile = customer?.customerMobile;
        if (!mobile) {
            toast({
                title: "📵 Mobile Number Nahi Mila",
                description: `${customer?.customerName} ka mobile number register nahi hai.`,
                variant: "destructive"
            });
            return;
        }
        const result = await sendWhatsApp(mobile, buildPaymentMessage(customer));
        if (result.automatic) {
            toast({ title: "Sent!", description: "Payment reminder sent automatically via WhatsApp" });
        }
    };

    const handleEmail = () => {
        const customer = selectedCustomer;
        const email = customer?.customerEmail;
        if (!email) {
            toast({
                title: "📧 Email Nahi Mila",
                description: `${customer?.customerName} ka email register nahi hai.`,
                variant: "destructive"
            });
            return;
        }
        const amount = customer?.totalOutstanding?.toLocaleString('en-IN');
        const subject = `Payment Reminder — Outstanding ₹${amount} | SUNRISE`;
        const body = (customMessage || buildPaymentMessage(customer)).replace(/\*/g, '');
        setEmailModal({ open: true, to: email, subject, message: body });
    };

    const handleCopyMessage = () => {
        const msg = buildPaymentMessage(selectedCustomer);
        navigator.clipboard.writeText(msg).then(() => {
            setCopied(true);
            toast({ title: "Copied!", description: "Message clipboard mein copy ho gaya." });
            setTimeout(() => setCopied(false), 3000);
        });
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Receivable Ageing</h1>
                    <p className="text-slate-500 mt-1">Strategic credit analysis and collection oversight.</p>
                </div>
            </div>

            {/* Global Ageing Slabs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Outstanding</p>
                            <h3 className="text-3xl font-bold mt-1">₹{totals.total.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-blue-100 mt-1">{ageingData.length} active debtors</p>
                        </div>
                        <Activity className="h-12 w-12 text-blue-200 opacity-50" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white border-b-4 border-green-500">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">0 - 30 Days</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">₹{totals.s0_30.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-green-500 mt-1 font-medium">Current balance</p>
                        </div>
                        <Clock className="h-12 w-12 text-green-100" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white border-b-4 border-amber-500">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">31 - 60 Days</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">₹{totals.s31_60.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-amber-500 mt-1 font-medium">Due balance</p>
                        </div>
                        <TrendingDown className="h-12 w-12 text-amber-100" />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-white border-b-4 border-red-500">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">61+ Days</p>
                            <h3 className="text-3xl font-bold mt-1 text-slate-900">₹{totals.s61p.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-red-500 mt-1 font-medium">Critical overdue</p>
                        </div>
                        <AlertCircle className="h-12 w-12 text-red-100" />
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="bg-white border-b px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-xl font-semibold">Debtor Wise Slabs</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search customer name or code..."
                                    className="pl-10 w-full sm:w-64 border-slate-200 focus:ring-blue-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="h-10 border-slate-200">
                                <Filter className="w-4 h-4 mr-2" /> Filter
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="hover:bg-transparent border-b">
                                    <TableHead className="font-bold px-6 py-4 text-slate-900 uppercase text-[11px] tracking-wider">Customer</TableHead>
                                    <TableHead className="font-bold py-4 text-slate-900 uppercase text-[11px] tracking-wider text-right">Total Debt</TableHead>
                                    <TableHead className="font-bold py-4 text-green-600 uppercase text-[11px] tracking-wider text-right">0-30 Days</TableHead>
                                    <TableHead className="font-bold py-4 text-amber-600 uppercase text-[11px] tracking-wider text-right">31-60 Days</TableHead>
                                    <TableHead className="font-bold py-4 text-red-600 uppercase text-[11px] tracking-wider text-right">61+ Days</TableHead>
                                    <TableHead className="text-right px-6 py-4 font-bold text-slate-900 uppercase text-[11px] tracking-wider">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={6} className="h-16 text-center text-slate-400">Analyzing balances...</TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <TrendingDown className="h-12 w-12 mb-2 opacity-20" />
                                                <p>No outstanding found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item) => (
                                        <TableRow key={item.customerId} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedCustomer(item)}>
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 uppercase">{item.customerName}</span>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-slate-500 font-mono tracking-tighter">Code: {item.customerCode}</span>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 h-4">{item.invoiceCount} Bills</Badge>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-bold text-slate-900">₹{item.totalOutstanding.toLocaleString()}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn("font-medium", item.slab0_30 > 0 ? "text-green-600" : "text-slate-300")}>
                                                    ₹{item.slab0_30.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn("font-medium", item.slab31_60 > 0 ? "text-amber-600" : "text-slate-300")}>
                                                    ₹{item.slab31_60.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={cn("font-bold text-red-600", item.slab61_plus === 0 && "text-slate-300")}>
                                                    ₹{item.slab61_plus.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
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

            {/* ─── Send Email Modal ───────────────────────────────────────── */}
            <SendEmailModal
                open={emailModal.open}
                onOpenChange={(open) => setEmailModal((p) => ({ ...p, open }))}
                to={emailModal.to}
                department="ACCOUNTS"
                defaultSubject={emailModal.subject}
                defaultMessage={emailModal.message}
            />

            {/* ─── Customer Detail Modal ───────────────────────────────────────── */}
            <Dialog open={!!selectedCustomer && !isPaymentLinkOpen} onOpenChange={() => setSelectedCustomer(null)}>
                <DialogContent className="max-w-3xl w-full flex flex-col max-h-[90vh] my-4 p-0 overflow-hidden border-0 shadow-2xl">
                    <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                                    <Clock className="h-8 w-8" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-bold uppercase">{selectedCustomer?.customerName}</DialogTitle>
                                    <p className="text-blue-100 text-sm mt-0.5">Detailed Ageing Audit</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Total Outstanding</p>
                                <p className="text-3xl font-bold italic">₹{selectedCustomer?.totalOutstanding?.toLocaleString()}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedCustomer && (
                        <div className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0 bg-white">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Building className="h-3 w-3" /> Code
                                    </h4>
                                    <p className="text-slate-900 font-semibold">{selectedCustomer.customerCode}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Smartphone className="h-3 w-3" /> Mobile
                                    </h4>
                                    <p className="text-slate-900 font-semibold">{selectedCustomer.customerMobile || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> Email
                                    </h4>
                                    <p className="text-slate-900 font-semibold text-xs truncate max-w-[150px]">{selectedCustomer.customerEmail || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                                    Pending Invoice Breakdown
                                </h3>
                                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow className="hover:bg-transparent border-b">
                                                <TableHead className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">Bill No.</TableHead>
                                                <TableHead className="text-center py-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">Date</TableHead>
                                                <TableHead className="text-center py-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">Age</TableHead>
                                                <TableHead className="text-right px-6 py-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">Balance (₹)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedCustomer.invoices.map((inv, i) => (
                                                <TableRow key={i} className="hover:bg-slate-50/50">
                                                    <TableCell className="px-6 py-3 font-bold text-slate-800 uppercase text-xs">{inv.invoiceNo}</TableCell>
                                                    <TableCell className="text-center text-slate-500 font-medium text-xs">{new Date(inv.date).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn(
                                                            "rounded-full px-2 text-[10px] font-bold border-0",
                                                            inv.age > 60 ? 'bg-red-50 text-red-600' :
                                                                inv.age > 30 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                                                        )}>
                                                            {inv.age} DAYS
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right px-6 font-bold text-slate-900 text-sm">₹{inv.balance.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-3 border-t">
                                <Button variant="ghost" onClick={() => setSelectedCustomer(null)} className="font-bold">Close</Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-slate-900 rounded-xl font-bold gap-2 text-white px-6"
                                    onClick={() => openPaymentLinkModal(selectedCustomer)}
                                >
                                    <Send className="w-4 h-4" /> Send Payment Link
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── Send Payment Link Modal ─────────────────────────────────────── */}
            <Dialog open={isPaymentLinkOpen} onOpenChange={(open) => { if (!open) setIsPaymentLinkOpen(false); }}>
                <DialogContent className="max-w-2xl w-full flex flex-col max-h-[90vh] my-4 p-0 overflow-hidden border-0 shadow-2xl rounded-[2rem]">
                    {selectedCustomer && (
                        <div className="flex flex-col overflow-y-auto max-h-[90vh]">
                            {/* Header */}
                            <DialogHeader className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white/20 p-3 rounded-2xl">
                                        <Send className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-bold uppercase italic tracking-tight">Send Reminder</DialogTitle>
                                        <DialogDescription className="text-indigo-100 font-medium text-xs mt-1">
                                            {selectedCustomer.customerName} &bull; Total: <span className="font-bold text-white">₹{selectedCustomer.totalOutstanding?.toLocaleString('en-IN')}</span>
                                        </DialogDescription>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-6">
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold",
                                        selectedCustomer.customerMobile ? "bg-white/20 text-white" : "bg-white/5 text-indigo-300/40 line-through"
                                    )}>
                                        <Smartphone className="w-3.5 h-3.5" />
                                        {selectedCustomer.customerMobile || 'No Mobile'}
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold",
                                        selectedCustomer.customerEmail ? "bg-white/20 text-white" : "bg-white/5 text-indigo-300/40 line-through"
                                    )}>
                                        <Mail className="w-3.5 h-3.5" />
                                        {selectedCustomer.customerEmail || 'No Email'}
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Message Preview */}
                            <div className="p-8 bg-slate-50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Message Preview</label>
                                    <span className="text-[9px] text-slate-400 italic">Pre-filled with payment details</span>
                                </div>
                                <textarea
                                    className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 min-h-[160px] font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none shadow-sm"
                                    value={customMessage || buildPaymentMessage(selectedCustomer)}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="p-8 bg-white border-t">
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <button
                                        onClick={handleWhatsApp}
                                        className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-green-50 bg-green-50/50 hover:bg-green-500 hover:text-white transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center group-hover:bg-white/20">
                                            <MessageCircle className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="font-bold text-xs uppercase tracking-wider">WhatsApp</span>
                                    </button>

                                    <button
                                        onClick={handleEmail}
                                        className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-blue-50 bg-blue-50/50 hover:bg-blue-600 hover:text-white transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center group-hover:bg-white/20">
                                            <Mail className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="font-bold text-xs uppercase tracking-wider">Email</span>
                                    </button>

                                    <button
                                        onClick={handleCopyMessage}
                                        className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-900 hover:text-white transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center group-hover:bg-white/20">
                                            {copied ? <CheckCheck className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white" />}
                                        </div>
                                        <span className="font-bold text-xs uppercase tracking-wider">{copied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 h-12 rounded-xl font-bold text-slate-500"
                                        onClick={() => setIsPaymentLinkOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReceivableAgeing;
