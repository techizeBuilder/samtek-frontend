import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp as ProfitIcon,
    Percent,
    Calendar,
    Filter,
    Download,
    IndianRupee,
    Briefcase,
    ExternalLink,
    ChevronRight,
    Calculator,
    Users,
    Plus,
    Trash2,
    Edit2,
    Settings as SettingsIcon,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export default function FinancialSummary() {
    const { user } = useAuth();
    const { toast } = useToast();
    console.log("user", user);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [period, setPeriod] = useState('month'); // week, month, year, custom
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [customRange, setCustomRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    // Profit view toggle — false = Pakka (billed) profit, true = Kaccha (cash-side) profit.
    // Flips on double-clicking the hero profit amount.
    const [showKacchaProfit, setShowKacchaProfit] = useState(false);

    // Partner Management State
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [partners, setPartners] = useState([]);
    const [newPartner, setNewPartner] = useState({ name: '', percentage: '' });
    const [editingPartner, setEditingPartner] = useState(null);
    const [isSubmittingPartner, setIsSubmittingPartner] = useState(false);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const response = await api.getFinanceSummary({
                period,
                startDate,
                endDate
            });
            if (response.success) {
                setSummary(response.summary);
            }
        } catch (error) {
            console.error("Failed to fetch finance summary", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [period, startDate, endDate]);

    const handlePeriodChange = (val) => {
        setPeriod(val);
        const now = new Date();
        if (val === 'week') {
            setStartDate(format(startOfWeek(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfWeek(now), 'yyyy-MM-dd'));
        } else if (val === 'month') {
            setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (val === 'previous_year') {
            const lastYear = now.getFullYear() - 1;
            setStartDate(format(new Date(lastYear, 0, 1), 'yyyy-MM-dd'));
            setEndDate(format(new Date(lastYear, 11, 31), 'yyyy-MM-dd'));
        }
    };

    const handleMonthChange = (e) => {
        const monthVal = e.target.value;
        setSelectedMonth(monthVal);
        const [year, month] = monthVal.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'));
    };

    const handleCustomRangeApply = () => {
        setStartDate(customRange.start);
        setEndDate(customRange.end);
    };

    // Pakka (billed book) profit is the default; Kaccha (cash-side) profit
    // is Billing Amount + GST Amount + Cash Amount from the Sales Order Form,
    // shown only when the hero amount is double-clicked.
    const activeNetSales = showKacchaProfit ? (summary?.kacchaNetSales || 0) : (summary?.netSales || 0);

    const calculateMargin = () => {
        if (!summary || activeNetSales === 0) return 0;
        return ((netProfit / activeNetSales) * 100).toFixed(1);
    };

    const netProfit = showKacchaProfit ? (summary?.kacchaProfit || 0) : (summary?.netProfit || 0);

    // Dynamic partners from summary
    const activePartners = summary?.partners || [];

    // Total percentage currently assigned
    const totalAssignedPct = activePartners.reduce((sum, p) => sum + p.percentage, 0);

    const mainStats = [
        {
            label: 'Gross Sales',
            value: summary?.totalSales || 0,
            icon: TrendingUp,
            color: 'blue',
            desc: 'Total revenue before returns'
        },
        {
            label: 'Sales Returns',
            value: summary?.totalReturns || 0,
            icon: TrendingDown,
            color: 'orange',
            desc: 'Goods returned by customers'
        },
        {
            label: 'Net Sales',
            value: summary?.netSales || 0,
            icon: BarChart3,
            color: 'indigo',
            desc: 'Revenue after returns'
        },
        {
            label: 'Operating Expenses',
            value: summary?.totalExpenses || 0,
            icon: Calculator,
            color: 'rose',
            desc: 'Total overhead costs'
        }
    ];

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter text-slate-900 uppercase">Samtek & NERS Financials</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">50-50 Profit Distribution Model • {user?.unit || 'Main Facility'}</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <Select value={period} onValueChange={handlePeriodChange}>
                        <SelectTrigger className="w-full sm:w-[140px] bg-white shadow-sm border-slate-200">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Weekly</SelectItem>
                            <SelectItem value="month">Monthly</SelectItem>
                            <SelectItem value="custom_month">Select Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="previous_year">Previous Year</SelectItem>
                            <SelectItem value="custom_range">Date Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {period === 'custom_month' && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-sm">
                            <span className="text-xs font-medium text-slate-500">Month:</span>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="text-sm outline-none border-none bg-transparent"
                            />
                        </div>
                    )}

                    {period === 'custom_range' && (
                        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-md border border-slate-200 shadow-sm">
                            <input
                                type="date"
                                value={customRange.start}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                className="text-xs outline-none border border-slate-100 rounded px-1 py-0.5"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input
                                type="date"
                                value={customRange.end}
                                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                className="text-xs outline-none border border-slate-100 rounded px-1 py-0.5"
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-[10px]" onClick={handleCustomRangeApply}>
                                Apply
                            </Button>
                        </div>
                    )}

                    <Button variant="outline" className="bg-white shadow-sm border-slate-200" onClick={() => window.print()}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>

                    <Button
                        variant="default"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        onClick={() => setIsPartnerModalOpen(true)}
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Manage Partners
                    </Button>
                </div>
            </div>

            {/* Partner Management Modal */}
            <Dialog open={isPartnerModalOpen} onOpenChange={(open) => {
                setIsPartnerModalOpen(open);
                if (!open) {
                    setEditingPartner(null);
                    setNewPartner({ name: '', percentage: '' });
                }
            }}>
                <DialogContent className="max-w-md bg-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Manage Profit Partners
                        </DialogTitle>
                        <DialogDescription>
                            Define partners and their profit sharing percentages for this unit.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Current Partners List */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Active Partners</Label>
                            {activePartners.length === 0 ? (
                                <div className="text-sm text-slate-400 italic p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                    No partners added yet. Static 50/50 model applied.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activePartners.map((p) => (
                                        <div key={p._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                                <div className="text-xs text-indigo-600 font-medium">{p.percentage}% Share</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => {
                                                        setEditingPartner(p);
                                                        setNewPartner({ name: p.name, percentage: p.percentage });
                                                    }}
                                                >
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={async () => {
                                                        try {
                                                            await api.deletePartner(p._id);
                                                            toast({ title: "Partner Removed" });
                                                            fetchSummary();
                                                        } catch (err) {
                                                            toast({ title: "Error", description: err.message, variant: "destructive" });
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add/Edit Partner Form */}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <Label className="text-xs font-bold text-slate-500 uppercase">
                                {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                            </Label>
                            <div className="grid grid-cols-5 gap-2">
                                <div className="col-span-3">
                                    <Input
                                        placeholder="Partner Name"
                                        value={newPartner.name}
                                        onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                                        className="h-9"
                                    />
                                </div>
                                <div className="col-span-2 relative">
                                    <Input
                                        type="number"
                                        placeholder="%"
                                        value={newPartner.percentage}
                                        onChange={(e) => setNewPartner(prev => ({ ...prev, percentage: e.target.value }))}
                                        className="h-9 pr-7"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700"
                                    disabled={!newPartner.name || !newPartner.percentage || isSubmittingPartner}
                                    onClick={async () => {
                                        setIsSubmittingPartner(true);
                                        try {
                                            if (editingPartner) {
                                                await api.updatePartner(editingPartner._id, {
                                                    name: newPartner.name,
                                                    percentage: Number(newPartner.percentage)
                                                });
                                                toast({ title: "Partner Updated" });
                                            } else {
                                                await api.createPartner({
                                                    name: newPartner.name,
                                                    percentage: Number(newPartner.percentage)
                                                });
                                                toast({ title: "Partner Added Successfullly" });
                                            }
                                            setNewPartner({ name: '', percentage: '' });
                                            setEditingPartner(null);
                                            fetchSummary();
                                        } catch (err) {
                                            toast({ title: "Failed", description: err.message, variant: "destructive" });
                                        } finally {
                                            setIsSubmittingPartner(false);
                                        }
                                    }}
                                >
                                    {editingPartner ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Update Partner
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Partner
                                        </>
                                    )}
                                </Button>
                                {editingPartner && (
                                    <Button
                                        variant="outline"
                                        className="h-9"
                                        onClick={() => {
                                            setEditingPartner(null);
                                            setNewPartner({ name: '', percentage: '' });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                            Total percentage must not exceed 100%. If total is less than 100%, the remainder is treated as unallocated profit.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="w-full" onClick={() => setIsPartnerModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Main Profit Card */}
            <Card className={`border-none shadow-xl bg-gradient-to-r ${netProfit >= 0 ? 'from-blue-700 via-indigo-600 to-purple-600' : 'from-red-700 via-rose-600 to-orange-600'} text-white overflow-hidden relative`}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    {netProfit >= 0 ? <ProfitIcon size={120} /> : <TrendingDown size={120} />}
                </div>
                <CardContent className="p-6 sm:p-10 z-10 relative">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div>
                            <p className="text-blue-100 font-medium mb-1 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                Consolidated Profit (Samtek & NERS)
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider normal-case ${showKacchaProfit ? 'bg-amber-400/30 text-amber-100' : 'bg-emerald-400/30 text-emerald-100'}`}>
                                    {showKacchaProfit ? 'Kaccha Bill' : 'Pakka Bill'}
                                </span>
                            </p>
                            <div
                                className="text-4xl sm:text-6xl font-extrabold tracking-tight cursor-pointer select-none"
                                onDoubleClick={() => setShowKacchaProfit(prev => !prev)}
                                title="Double-click to switch between Pakka and Kaccha bill profit"
                            >
                                ₹{netProfit.toLocaleString()}
                            </div>
                            <div className="flex items-center mt-4 gap-4 flex-wrap">
                                <div className="flex items-center bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-sm font-semibold">
                                    <Percent className="w-3.5 h-3.5 mr-1" />
                                    {calculateMargin()}% Margin
                                </div>
                                <div className="text-blue-100 text-sm italic">
                                    Report for {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-blue-200/70 text-[10px] italic">
                                    (Double-click amount to view {showKacchaProfit ? 'Pakka' : 'Kaccha'} bill profit)
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 border-l border-white/20 pl-0 md:pl-8 mt-6 md:mt-0">
                            <div className="space-y-1">
                                <p className="text-blue-200 text-xs uppercase tracking-wider font-bold">Partner Profit Breakdown</p>
                                <div className="space-y-2 mt-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                                    {activePartners.length === 0 ? (
                                        <>
                                            <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-white/10">
                                                <span className="text-xs font-medium text-blue-100">Samtek (50%)</span>
                                                <span className="font-bold text-lg">₹{(netProfit / 2).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-white/10">
                                                <span className="text-xs font-medium text-blue-100">NERS (50%)</span>
                                                <span className="font-bold text-lg">₹{(netProfit / 2).toLocaleString()}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {activePartners.map((p) => (
                                                <div key={p._id} className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-white/10 mb-2">
                                                    <span className="text-xs font-medium text-blue-100">{p.name} ({p.percentage}%)</span>
                                                    <span className="font-bold text-lg">₹{(netProfit * (p.percentage / 100)).toLocaleString()}</span>
                                                </div>
                                            ))}
                                            {totalAssignedPct < 100 && (
                                                <div className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-dashed border-white/10 opacity-60">
                                                    <span className="text-xs italic text-blue-200">Unallocated ({100 - totalAssignedPct}%)</span>
                                                    <span className="font-bold text-base italic">₹{(netProfit * ((100 - totalAssignedPct) / 100)).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-blue-200 text-xs uppercase tracking-wider font-bold">
                                    Reporting Entity
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xl font-bold truncate max-w-[200px]">
                                        {user?.company?.name || user?.unit || 'Main Facility'}
                                    </p>
                                </div>
                                <p className="text-blue-100/60 text-[10px]">
                                    {activePartners.length > 0 ? `${activePartners.length} Active Partners` : 'Standard 50-50 Model'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <div className={`w-2 h-2 ${netProfit >= 0 ? 'bg-green-400' : 'bg-red-300'} rounded-full animate-pulse`} />
                                    <p className="text-sm font-semibold">{netProfit >= 0 ? 'Profitable' : 'Net Loss'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {mainStats.map((stat, idx) => (
                    <Card key={idx} className="border-none shadow-md bg-white hover:shadow-lg transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-tight">{stat.label}</CardTitle>
                            <div className={`p-2 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                                <stat.icon size={18} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">₹{stat.value.toLocaleString()}</div>
                            <p className="text-xs text-slate-400 mt-1">{stat.desc}</p>
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">VIEW DETAILS</span>
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Simple Breakdown Table */}
                <Card className="lg:col-span-2 border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle>Profit & Loss Breakdown</CardTitle>
                        <CardDescription>Detailed calculation of your unit's performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Total Sales Revenue</h4>
                                        <p className="text-xs text-slate-500">All invoices generated in period</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-slate-900">+₹{(summary?.totalSales || 0).toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                        <TrendingDown size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Total Returns Value</h4>
                                        <p className="text-xs text-slate-500">Customer returns and adjustments</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-orange-600">-₹{(summary?.totalReturns || 0).toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-indigo-900">Net Revenue</h4>
                                        <p className="text-xs text-indigo-500">Actual receivable amount</p>
                                    </div>
                                </div>
                                <div className="text-xl font-extrabold text-indigo-700">₹{(summary?.netSales || 0).toLocaleString()}</div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                                        <Calculator size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Total Expenses</h4>
                                        <p className="text-xs text-slate-500">Operating and production costs</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-rose-600">-₹{(summary?.totalExpenses || 0).toLocaleString()}</div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {activePartners.length === 0 ? (
                                    <>
                                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Samtek Share (50%)</p>
                                            <div className="text-lg font-bold text-blue-900">₹{(netProfit / 2).toLocaleString()}</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">NERS Share (50%)</p>
                                            <div className="text-lg font-bold text-indigo-900">₹{(netProfit / 2).toLocaleString()}</div>
                                        </div>
                                    </>
                                ) : (
                                    activePartners.map((p) => (
                                        <div key={p._id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">{p.name} ({p.percentage}%)</p>
                                            <div className="text-lg font-bold text-slate-900">₹{(netProfit * (p.percentage / 100)).toLocaleString()}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions / Tips */}
                <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                        <CardTitle>Insights & Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className={`flex items-center gap-2 ${(summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'} font-bold text-sm`}>
                                {(summary?.netProfit || 0) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                <span>{(summary?.netProfit || 0) >= 0 ? 'Great Performance!' : 'Action Required'}</span>
                            </div>
                            <p className="text-sm text-slate-600">
                                {(summary?.netProfit || 0) >= 0
                                    ? `Your profit margin is currently ${calculateMargin()}%. This is above your monthly target of 45%.`
                                    : `You are currently at a loss of ₹${Math.abs(summary?.netProfit || 0).toLocaleString()}. Consider reviewing operational costs.`}
                            </p>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 space-y-2">
                            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                                <TrendingDown size={16} />
                                <span>Cost Saving Tip</span>
                            </div>
                            <p className="text-xs text-amber-800">Operational costs have increased by 12% this week. Consider reviewing electricity usage during baking hours.</p>
                        </div>

                        <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg py-6" asChild>
                            <a href="/accounts/expenses">
                                Add Daily Expenses
                                <ExternalLink className="w-4 h-4 ml-2" />
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
