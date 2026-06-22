import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    AlertTriangle, Clock, Mail, Settings, Bell, CheckCircle2,
    Send, RefreshCw, TrendingDown, IndianRupee, Calendar, User
} from 'lucide-react';

const PaymentReminders = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('overdue'); // 'overdue' | 'pending' | 'settings'
    const [sendingId, setSendingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [overdueFilter, setOverdueFilter] = useState('all'); // 'all' | 'warning' | 'critical'
    const [pendingStatusFilter, setPendingStatusFilter] = useState('all'); // 'all' | 'Pending' | 'Partially Paid'

    // ── Fetch Overdue & Pending Invoices ──────────────────────────────────────
    const { data: overdueRes, isLoading: overdueLoading, refetch } = useQuery({
        queryKey: ['/api/accounts/payment-reminders/overdue'],
        queryFn: () => apiRequest('GET', '/api/accounts/payment-reminders/overdue'),
        refetchInterval: 60000 // Refresh every 1 min
    });

    // ── Fetch Reminder Settings ───────────────────────────────────────────────
    const { data: settingsRes } = useQuery({
        queryKey: ['/api/accounts/payment-reminders/settings'],
        queryFn: () => apiRequest('GET', '/api/accounts/payment-reminders/settings')
    });

    const [settings, setSettings] = useState(null);
    React.useEffect(() => {
        if (settingsRes?.data) setSettings(settingsRes.data);
    }, [settingsRes]);

    // ── Save Settings Mutation ────────────────────────────────────────────────
    const saveMutation = useMutation({
        mutationFn: (data) => apiRequest('POST', '/api/accounts/payment-reminders/settings', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/payment-reminders/settings'] });
            toast({ title: '✅ Settings Saved', description: 'Payment reminder settings updated.' });
        },
        onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' })
    });

    // ── Send Manual Reminder ──────────────────────────────────────────────────
    const sendMutation = useMutation({
        mutationFn: (invoiceId) => apiRequest('POST', '/api/accounts/payment-reminders/send', { invoiceId }),
        onSuccess: (_, invoiceId) => {
            setSendingId(null);
            toast({ title: '📧 Email Sent', description: 'Payment reminder sent to customer.' });
            refetch();
        },
        onError: (e) => {
            setSendingId(null);
            toast({ title: 'Email Failed', description: e.message, variant: 'destructive' });
        }
    });

    const overdueData = overdueRes?.data;
    const overdue = overdueData?.overdue || [];
    const pending = overdueData?.pending || [];
    const summary = overdueData?.summary || {};

    const filteredOverdue = overdue.filter(inv => {
        const matchSearch = !searchQuery ||
            inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchOverdue = overdueFilter === 'all' || inv.overdueLevel === overdueFilter;
        return matchSearch && matchOverdue;
    });

    const filteredPending = pending.filter(inv => {
        const matchSearch = !searchQuery ||
            inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = pendingStatusFilter === 'all' || inv.paymentStatus === pendingStatusFilter;
        return matchSearch && matchStatus;
    });

    const getOverdueColor = (days) => {
        if (days > 60) return 'bg-red-100 text-red-800 border-red-200';
        if (days > 30) return 'bg-orange-100 text-orange-800 border-orange-200';
        return 'bg-amber-100 text-amber-800 border-amber-200';
    };

    const defaultSettings = {
        firstReminderDays: 7,
        secondReminderDays: 15,
        overdueAfterDays: 30,
        autoEmailEnabled: false,
        reminderFrequencyDays: 7
    };
    const cfg = settings || defaultSettings;

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="w-6 h-6 text-red-500" />
                        Payment Reminders & Overdue Alerts
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Track pending payments, overdue invoices and send reminders</p>
                </div>
                <Button variant="outline" onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={cn("border-0 shadow-sm border-l-4", overdue.length > 0 ? "border-red-500" : "border-green-500")}>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", overdue.length > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Overdue Invoices</p>
                            <h3 className="text-xl font-bold text-slate-900">{overdue.length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm border-l-4 border-amber-400">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Clock className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Invoices</p>
                            <h3 className="text-xl font-bold text-slate-900">{pending.length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm border-l-4 border-red-400">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-xl text-red-600"><IndianRupee className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Overdue Amount</p>
                            <h3 className="text-xl font-bold text-red-600">₹{(summary.totalOverdueAmount || 0).toLocaleString('en-IN')}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm border-l-4 border-blue-400">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><TrendingDown className="w-6 h-6" /></div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pending Amount</p>
                            <h3 className="text-xl font-bold text-slate-900">₹{(summary.totalPendingAmount || 0).toLocaleString('en-IN')}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-200/50 rounded-xl w-fit">
                {[
                    { key: 'overdue', label: `Overdue (${overdue.length})`, icon: AlertTriangle },
                    { key: 'pending', label: `Pending (${pending.length})`, icon: Clock },
                    { key: 'settings', label: 'Settings', icon: Settings }
                ].map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                            activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {/* Search and Filters Bar */}
            {activeTab !== 'settings' && (
                <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by invoice number or customer name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'overdue' && (
                            <select
                                value={overdueFilter}
                                onChange={(e) => setOverdueFilter(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Overdue Levels</option>
                                <option value="warning">Warning (1-30 days)</option>
                                <option value="critical">Critical (30 days)</option>
                            </select>
                        )}
                        {activeTab === 'pending' && (
                            <select
                                value={pendingStatusFilter}
                                onChange={(e) => setPendingStatusFilter(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Partially Paid">Partially Paid</option>
                            </select>
                        )}
                        {(searchQuery || overdueFilter !== 'all' || pendingStatusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSearchQuery('');
                                    setOverdueFilter('all');
                                    setPendingStatusFilter('all');
                                }}
                                className="text-slate-500 hover:text-slate-700 text-sm font-semibold"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* ── OVERDUE TAB ── */}
            {activeTab === 'overdue' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="border-b px-6 py-4 bg-red-50/50">
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" /> Overdue Invoices
                        </CardTitle>
                        <CardDescription>These invoices are past their due date. Send reminders immediately.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {overdueLoading ? (
                            <div className="p-12 text-center text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Loading overdue data...</p>
                            </div>
                        ) : overdue.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No overdue invoices! 🎉</p>
                            </div>
                        ) : filteredOverdue.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 font-medium">
                                No invoices match your search/filter criteria.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Invoice</th>
                                            <th className="px-6 py-3 text-left">Customer</th>
                                            <th className="px-6 py-3 text-right">Amount</th>
                                            <th className="px-6 py-3 text-right">Paid</th>
                                            <th className="px-6 py-3 text-right">Balance</th>
                                            <th className="px-6 py-3 text-center">Due Date</th>
                                            <th className="px-6 py-3 text-center">Overdue By</th>
                                            <th className="px-6 py-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredOverdue.map((inv) => (
                                            <tr key={inv._id} className="hover:bg-red-50/30">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                        <div>
                                                            <p className="font-semibold text-slate-800">{inv.customer?.name}</p>
                                                            <p className="text-[10px] text-slate-400">{inv.customer?.email || 'No email'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold">₹{inv.totalAmount?.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right text-green-600 font-semibold">₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-bold text-red-600">₹{inv.balanceAmount?.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center text-slate-500">{format(new Date(inv.dueDate), 'dd MMM yyyy')}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge className={cn("font-bold", getOverdueColor(inv.daysOverdue))}>
                                                        {inv.daysOverdue} days
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Button size="sm"
                                                        className="bg-red-600 hover:bg-red-700 text-white h-8 gap-1.5"
                                                        disabled={!inv.customer?.email || sendMutation.isPending}
                                                        onClick={() => { setSendingId(inv._id); sendMutation.mutate(inv._id); }}>
                                                        {sendingId === inv._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                        {inv.customer?.email ? 'Send' : 'No Email'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── PENDING TAB ── */}
            {activeTab === 'pending' && (
                <Card className="border-0 shadow-sm">
                    <CardHeader className="border-b px-6 py-4 bg-amber-50/50">
                        <CardTitle className="text-amber-700 flex items-center gap-2">
                            <Clock className="w-5 h-5" /> Pending Invoices (Due Soon)
                        </CardTitle>
                        <CardDescription>These invoices are unpaid but not yet past due date.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pending.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No pending invoices!</p>
                            </div>
                        ) : filteredPending.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 font-medium">
                                No invoices match your search/filter criteria.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Invoice</th>
                                            <th className="px-6 py-3 text-left">Customer</th>
                                            <th className="px-6 py-3 text-right">Total</th>
                                            <th className="px-6 py-3 text-right">Balance</th>
                                            <th className="px-6 py-3 text-center">Due Date</th>
                                            <th className="px-6 py-3 text-center">Status</th>
                                            <th className="px-6 py-3 text-center">Remind</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredPending.map((inv) => (
                                            <tr key={inv._id} className="hover:bg-amber-50/20">
                                                <td className="px-6 py-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{inv.customer?.name}</p>
                                                        <p className="text-[10px] text-slate-400">{inv.customer?.email || 'No email'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold">₹{inv.totalAmount?.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-bold text-amber-600">₹{inv.balanceAmount?.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center text-slate-500">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold">
                                                        {inv.paymentStatus}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Button size="sm" variant="outline"
                                                        className="h-8 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                                                        disabled={!inv.customer?.email || sendMutation.isPending}
                                                        onClick={() => { setSendingId(inv._id); sendMutation.mutate(inv._id); }}>
                                                        {sendingId === inv._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                                                        Remind
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
                <Card className="border-0 shadow-sm max-w-2xl">
                    <CardHeader className="border-b px-6 py-4">
                        <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Reminder Configuration</CardTitle>
                        <CardDescription>Set when to send reminders and mark invoices as overdue.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Auto Email Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                            <div>
                                <p className="font-semibold text-slate-800">Auto Email Reminders</p>
                                <p className="text-sm text-slate-500">Automatically send reminder emails daily at 9 AM</p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({ ...(prev || defaultSettings), autoEmailEnabled: !cfg.autoEmailEnabled }))}
                                className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                    cfg.autoEmailEnabled ? "bg-blue-600" : "bg-slate-300")}>
                                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                                    cfg.autoEmailEnabled ? "translate-x-6" : "translate-x-1")} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">First Reminder (days after invoice)</label>
                                <Input type="number" min="1" value={cfg.firstReminderDays}
                                    onChange={e => setSettings(prev => ({ ...(prev || defaultSettings), firstReminderDays: +e.target.value }))}
                                    className="bg-white" />
                                <p className="text-xs text-slate-400">e.g. 7 = reminder 7 days after invoice date</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Second Reminder (days after invoice)</label>
                                <Input type="number" min="1" value={cfg.secondReminderDays}
                                    onChange={e => setSettings(prev => ({ ...(prev || defaultSettings), secondReminderDays: +e.target.value }))}
                                    className="bg-white" />
                                <p className="text-xs text-slate-400">e.g. 15 = second reminder after 15 days</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Mark as Overdue After (days past due date)</label>
                                <Input type="number" min="1" value={cfg.overdueAfterDays}
                                    onChange={e => setSettings(prev => ({ ...(prev || defaultSettings), overdueAfterDays: +e.target.value }))}
                                    className="bg-white" />
                                <p className="text-xs text-slate-400">e.g. 30 = Overdue if 30+ days past due date</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase">Repeat Overdue Reminder Every (days)</label>
                                <Input type="number" min="1" value={cfg.reminderFrequencyDays}
                                    onChange={e => setSettings(prev => ({ ...(prev || defaultSettings), reminderFrequencyDays: +e.target.value }))}
                                    className="bg-white" />
                                <p className="text-xs text-slate-400">e.g. 7 = repeat every 7 days until paid</p>
                            </div>
                        </div>

                        {/* Visual Timeline */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <p className="text-xs font-bold text-blue-700 uppercase mb-3">📅 Reminder Timeline Preview</p>
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="bg-white border px-3 py-1 rounded-full font-semibold">Day 0 — Invoice Created</span>
                                <span className="text-slate-400">→</span>
                                <span className="bg-amber-100 text-amber-800 border px-3 py-1 rounded-full font-semibold">Day {cfg.firstReminderDays} — 1st Reminder</span>
                                <span className="text-slate-400">→</span>
                                <span className="bg-orange-100 text-orange-800 border px-3 py-1 rounded-full font-semibold">Day {cfg.secondReminderDays} — 2nd Reminder</span>
                                <span className="text-slate-400">→</span>
                                <span className="bg-red-100 text-red-800 border px-3 py-1 rounded-full font-semibold">Due Date + {cfg.overdueAfterDays}d — OVERDUE 🚨</span>
                            </div>
                        </div>

                        <Button onClick={() => saveMutation.mutate(cfg)} disabled={saveMutation.isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                            {saveMutation.isPending ? 'Saving...' : '💾 Save Settings'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default PaymentReminders;
