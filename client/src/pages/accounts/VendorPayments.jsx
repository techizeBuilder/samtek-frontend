import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Send, Banknote, FileText, History, Undo2 } from 'lucide-react';
import VendorMoneyBackList from '@/components/accounts/purchase/VendorMoneyBackList';

// Vendor Payments (rebuilt 2026-10-12 — client's answers, see
// server/docs/procurement-v2/accounts-bill-ledger-payments-2026-10.md).
// A PO's own bill decides what can be paid:
//   - the ADVANCE (Advance % of the PO) — due when the PO is placed; once
//     it's fully paid, the vendor's delivery days start counting;
//   - MATERIAL — what QC has passed: before everything is in, its value
//     less its share of the advance (an optional part payment); once every
//     line is received and QC-passed, the whole balance, due Credit Days later.
// Bills with no PO ("Record New Bill") are paid as before: one partly or
// fully, several only in full, or oldest first.
const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const STAGE_TONE = {
    'Advance due': 'bg-violet-100 text-violet-700 border-violet-200',
    'Awaiting material': 'bg-sky-100 text-sky-700 border-sky-200',
    'Payable': 'bg-amber-100 text-amber-800 border-amber-200',
    'Paid': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const VendorPayments = () => {
    const { toast } = useToast();
    const { hasFeatureAccess } = usePermissions();
    const canAdd = hasFeatureAccess('accounts', 'purchases', 'add');
    const [selectedVendor, setSelectedVendor] = useState('');
    const [billId, setBillId] = useState(null);          // a PO bill
    const [kind, setKind] = useState('');                 // 'Advance' | 'Payment'
    const [manualIds, setManualIds] = useState(() => new Set()); // bills without a PO
    const [amount, setAmount] = useState('');
    // Pay out of credit the vendor holds of ours (2026-10-12, Slice 3).
    const [useCredit, setUseCredit] = useState(false);

    const { data: vendorsData } = useQuery({
        queryKey: ['/api/suppliers'],
        queryFn: () => apiRequest('GET', '/api/suppliers')
    });

    const { data: outstandingResponse } = useQuery({
        queryKey: ['/api/accounts/purchases/outstanding', selectedVendor],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/outstanding?vendorId=${selectedVendor}`),
        enabled: !!selectedVendor
    });
    const vendorOutstanding = outstandingResponse?.data?.[0];
    const poBills = (vendorOutstanding?.invoices || []).filter(inv => inv.purchaseOrder);
    const manualBills = (vendorOutstanding?.invoices || []).filter(inv => !inv.purchaseOrder);

    const { data: statsResponse } = useQuery({
        queryKey: ['/api/accounts/purchases/payments/stats'],
        queryFn: () => apiRequest('GET', '/api/accounts/purchases/payments/stats')
    });
    const paymentStats = statsResponse?.data;

    // A page at a time (2026-10-19) — only the newest 20 could ever be seen.
    const [historyPage, setHistoryPage] = useState(1);
    React.useEffect(() => { setHistoryPage(1); }, [selectedVendor]);
    const { data: historyResponse } = useQuery({
        queryKey: ['/api/accounts/purchases/payments', selectedVendor, historyPage],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/payments?limit=20&page=${historyPage}${selectedVendor ? `&vendorId=${selectedVendor}` : ''}`),
        keepPreviousData: true,
    });
    const history = historyResponse?.data?.payments || [];
    const historyPages = historyResponse?.data?.pagination?.pages || 1;
    const historyTotal = historyResponse?.data?.pagination?.total || history.length;

    const { data: bankAccountsResponse } = useQuery({
        queryKey: ['/api/accounts/bank-cash/summary'],
        queryFn: () => apiRequest('GET', '/api/accounts/bank-cash/summary')
    });
    const bankAccounts = bankAccountsResponse?.data?.accounts || [];

    const { data: moneyBackResponse } = useQuery({
        queryKey: ['/api/accounts/purchases/money-back', selectedVendor],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/money-back?vendorId=${selectedVendor}`),
        enabled: !!selectedVendor
    });
    const vendorCredit = moneyBackResponse?.data?.vendorCredit || 0;

    const bill = poBills.find(b => String(b._id) === String(billId)) || null;
    const can = bill?.payableNow || { advance: 0, material: 0 };
    const maxNow = bill ? (kind === 'Advance' ? can.advance : kind === 'Payment' ? can.material : 0) : null;
    const manualSelected = manualBills.filter(inv => manualIds.has(inv._id));
    const manualTotal = manualSelected.reduce((sum, inv) => sum + inv.balance, 0);

    const reset = () => { setBillId(null); setKind(''); setManualIds(new Set()); setAmount(''); setUseCredit(false); };
    const pickBill = (b) => {
        setManualIds(new Set());
        if (String(b._id) === String(billId)) { reset(); return; }
        setBillId(b._id);
        const k = b.payableNow?.advance > 0 ? 'Advance' : b.payableNow?.material > 0 ? 'Payment' : '';
        setKind(k);
        setAmount(k === 'Advance' ? String(b.payableNow.advance) : k === 'Payment' ? String(b.payableNow.material) : '');
    };
    const pickKind = (k) => { setKind(k); setAmount(String(k === 'Advance' ? can.advance : can.material)); };
    const toggleManual = (id) => {
        setBillId(null); setKind('');
        setManualIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    };

    const mutation = useMutation({
        mutationFn: (paymentData) => apiRequest('POST', '/api/accounts/purchases/payments', paymentData),
        onSuccess: (res) => {
            ['/api/accounts/purchases/invoices', '/api/accounts/purchases/outstanding', '/api/accounts/purchases/payments/stats',
             '/api/accounts/purchases/payments', '/api/accounts/bank-cash/summary', '/api/accounts/purchases/money-back'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
            reset();
            toast({
                title: 'Payment recorded',
                description: res?.clockStarted ? 'The advance is fully paid — the vendor\'s delivery days start today; Store has the dates.' : undefined,
            });
        },
        onError: (error) => {
            toast({ title: 'Payment not recorded', description: error?.message || 'Something went wrong while recording the payment.', variant: 'destructive' });
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const form = Object.fromEntries(new FormData(e.target).entries());
        const value = Math.round((parseFloat(amount) || 0) * 100) / 100;
        if (!(value > 0)) return toast({ title: 'Enter the amount paid', variant: 'destructive' });
        if (bill) {
            if (!kind) return toast({ title: 'Nothing can be paid on this PO right now', variant: 'destructive' });
            if (value > maxNow + 0.005) return toast({ title: `You can pay up to ${inr(maxNow)} now`, variant: 'destructive' });
            if (useCredit) {
                if (value > vendorCredit + 0.005) return toast({ title: `The vendor's credit is ${inr(vendorCredit)}`, variant: 'destructive' });
                return mutation.mutate({ paymentDate: form.paymentDate, referenceNo: form.referenceNo, billId: bill._id, kind, amount: value, useCredit: true });
            }
            return mutation.mutate({ ...form, billId: bill._id, kind, amount: value });
        }
        if (manualIds.size > 1 && value < manualTotal) {
            return toast({ title: 'Full payment required', description: `Paying ${manualIds.size} bills at once needs their full balance: ${inr(manualTotal)}. Select one bill to pay it partly.`, variant: 'destructive' });
        }
        mutation.mutate({ ...form, vendorId: selectedVendor, amount: value, ...(manualIds.size ? { invoiceIds: Array.from(manualIds) } : {}) });
    };

    const nothingChosen = !bill && manualIds.size === 0 && manualBills.length === 0;

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Vendor Payments</h1>
                <p className="text-slate-500">Pay a PO's advance or its QC-passed material, as its payment terms allow</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 shadow-sm border-0">
                    <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                        <CardTitle className="flex items-center">
                            <Send className="w-5 h-5 mr-2" />
                            Record a Payment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Select Vendor</label>
                                    <select
                                        className="w-full border-2 rounded-xl p-3 bg-white"
                                        value={selectedVendor}
                                        onChange={(e) => { setSelectedVendor(e.target.value); reset(); }}
                                        required
                                    >
                                        <option value="">-- Choose Vendor --</option>
                                        {vendorsData?.suppliers?.map(v => (
                                            <option key={v._id} value={v._id}>{v.supplierName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Payment Date</label>
                                    <Input name="paymentDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} max={new Date().toISOString().split('T')[0]} className="p-6 rounded-xl border-2" required />
                                </div>
                            </div>

                            {selectedVendor && (
                                <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-6 space-y-5">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-blue-900">Open bills</h3>
                                        <span className="text-sm text-blue-700">Still to pay: <strong>{inr(vendorOutstanding?.totalOutstanding || 0)}</strong></span>
                                    </div>

                                    {poBills.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-blue-400 uppercase">Purchase orders — pick one</p>
                                            {poBills.map(b => {
                                                const on = String(b._id) === String(billId);
                                                const now = b.payableNow || {};
                                                return (
                                                    <button type="button" key={b._id} onClick={() => pickBill(b)}
                                                        className={`w-full text-left text-sm p-3 rounded-lg border transition-colors ${on ? 'bg-white border-blue-600 ring-2 ring-blue-200' : 'bg-white border-blue-100 hover:border-blue-300'}`}>
                                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                                            <span className="flex items-center gap-2">
                                                                <input type="radio" readOnly checked={on} className="pointer-events-none" />
                                                                <span className="font-bold text-slate-800">{b.poNumber || b.invoiceNo}</span>
                                                                {b.stage && <Badge variant="outline" className={STAGE_TONE[b.stage] || ''}>{b.stage}</Badge>}
                                                            </span>
                                                            <span className="text-slate-500">PO total <strong className="text-slate-800">{inr(b.totalAmount)}</strong> · paid {inr(b.paidAmount)}</span>
                                                        </div>
                                                        <div className="mt-1.5 pl-6 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
                                                            {b.advanceAmount > 0 && <span>Advance {b.advancePercent}%: {inr(b.advancePaid)} of {inr(b.advanceAmount)} paid</span>}
                                                            <span>QC-passed so far: {inr(b.acceptedValue)}</span>
                                                            {b.fullyAcceptedAt
                                                                ? <span className={b.dueDate && new Date(b.dueDate) < new Date() ? "text-red-700 font-semibold" : "text-amber-800"}>Everything accepted · full payment {b.dueDate && new Date(b.dueDate) < new Date() ? "overdue since" : "due"} {day(b.dueDate)}</span>
                                                                : <span>Full payment: {b.creditDays ? `${b.creditDays} days after` : 'when'} everything passes QC</span>}
                                                            <span className="font-semibold text-blue-700">
                                                                Can pay now: {now.advance > 0 ? `advance ${inr(now.advance)}` : ''}{now.advance > 0 && now.material > 0 ? ' · ' : ''}{now.material > 0 ? `material ${inr(now.material)}` : ''}{!(now.advance > 0) && !(now.material > 0) ? 'nothing yet' : ''}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {bill && (can.advance > 0 || can.material > 0) && (
                                        <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase">This payment is for</p>
                                            <div className="flex flex-wrap gap-2">
                                                {can.advance > 0 && (
                                                    <button type="button" onClick={() => pickKind('Advance')} className={`px-3 py-1.5 rounded-md text-sm border ${kind === 'Advance' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-slate-200 hover:border-violet-400'}`}>
                                                        The advance (up to {inr(can.advance)})
                                                    </button>
                                                )}
                                                {can.material > 0 && (
                                                    <button type="button" onClick={() => pickKind('Payment')} className={`px-3 py-1.5 rounded-md text-sm border ${kind === 'Payment' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 hover:border-emerald-400'}`}>
                                                        {bill.fullyAcceptedAt ? 'Full payment' : 'QC-passed material'} (up to {inr(can.material)})
                                                    </button>
                                                )}
                                            </div>
                                            {kind === 'Advance' && bill.deliveryClock?.startsOn === 'advance' && !bill.deliveryClock?.startedAt && (
                                                <p className="text-xs text-violet-700">When the whole advance is paid, the vendor's delivery days start counting from the payment date, and Store gets the expected dates.</p>
                                            )}
                                            {vendorCredit > 0 && kind && (
                                                <label className="flex items-center gap-2 text-sm text-violet-800 bg-violet-50 border border-violet-200 rounded-md px-3 py-2 cursor-pointer">
                                                    <input type="checkbox" checked={useCredit} onChange={e => { setUseCredit(e.target.checked); if (e.target.checked) setAmount(String(Math.min(vendorCredit, maxNow || 0))); }} />
                                                    Pay from the vendor's credit with us ({inr(vendorCredit)} available) — no bank needed
                                                </label>
                                            )}
                                            {kind === 'Payment' && !bill.fullyAcceptedAt && (
                                                <p className="text-xs text-slate-500">Optional part payment for material QC has passed — its value less its share of the advance. The rest is paid when everything is in and accepted.</p>
                                            )}
                                        </div>
                                    )}
                                    {bill && !(can.advance > 0) && !(can.material > 0) && (
                                        <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">Nothing is payable on {bill.poNumber} right now — the advance is paid and nothing more has passed QC yet.</p>
                                    )}

                                    {manualBills.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold text-blue-400 uppercase">Bills without a PO — select one or more</p>
                                                {manualIds.size > 0 && (
                                                    <button type="button" onClick={() => setManualIds(new Set())} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Clear (pay oldest first)</button>
                                                )}
                                            </div>
                                            {manualBills.map(inv => {
                                                const on = manualIds.has(inv._id);
                                                return (
                                                    <button type="button" key={inv._id} onClick={() => toggleManual(inv._id)}
                                                        className={`w-full flex justify-between items-center text-sm p-3 rounded-lg border text-left ${on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 hover:border-blue-300'}`}>
                                                        <span className="flex items-center gap-2">
                                                            <input type="checkbox" readOnly checked={on} className="pointer-events-none" />
                                                            <span className="font-bold">{inv.invoiceNo}</span>
                                                            <span className={on ? 'text-blue-100' : 'text-slate-500'}>{day(inv.date)}</span>
                                                        </span>
                                                        <span className="font-black">{inr(inv.balance)}</span>
                                                    </button>
                                                );
                                            })}
                                            {manualIds.size > 1 && (
                                                <p className="text-xs text-amber-800">{manualIds.size} bills selected — paying several at once needs their full balance: <strong>{inr(manualTotal)}</strong>.</p>
                                            )}
                                        </div>
                                    )}

                                    {poBills.length === 0 && manualBills.length === 0 && (
                                        <p className="text-sm text-slate-500 italic">Nothing open for this vendor.</p>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Amount Paid (₹){maxNow != null && maxNow > 0 ? <span className="font-normal text-slate-400"> — up to {inr(maxNow)}</span> : null}</label>
                                    <Input type="number" step="0.01" min="0.01" max={maxNow || undefined} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="p-6 rounded-xl border-2 text-2xl font-black" required />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Paid From</label>
                                    <select name="accountId" className="w-full border-2 rounded-xl p-3 bg-white disabled:opacity-50" required={!useCredit} disabled={useCredit}>
                                        <option value="">-- Choose Bank/Cash --</option>
                                        {bankAccounts?.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({inr(acc.balance)})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Payment Mode</label>
                                    <select name="paymentMode" className="w-full border-2 rounded-xl p-3 bg-white" required>
                                        <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI / Digital</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Reference / UTR</label>
                                    <Input name="referenceNo" placeholder="Bank confirmation number" className="p-6 rounded-xl border-2" />
                                </div>
                            </div>

                            {canAdd && (
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold" disabled={mutation.isPending || !selectedVendor || nothingChosen || (bill && !kind)}>
                                    {mutation.isPending ? 'Recording Payment...' : bill ? (kind === 'Advance' ? 'Record Advance Payment' : 'Record Payment') : 'Record Payment'}
                                </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-sm border-0 bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider opacity-80">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black mb-1">{inr(paymentStats?.totalPaid || 0)}</div>
                            <div className="text-sm opacity-80">Total Paid this month</div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-0">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-600">Payment Modes Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {paymentStats?.modes?.map((mode, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex items-center text-sm">
                                        <Banknote className={`w-4 h-4 mr-2 ${mode._id === 'Bank Transfer' ? 'text-green-500' :
                                            mode._id === 'Cheque' ? 'text-orange-500' :
                                                mode._id === 'Cash' ? 'text-blue-500' : 'text-purple-500'
                                            }`} />
                                        {mode._id}
                                    </div>
                                    <span className="font-bold">{mode.percentage}%</span>
                                </div>
                            ))}
                            {(!paymentStats?.modes || paymentStats?.modes.length === 0) && (
                                <p className="text-xs text-slate-400 text-center py-4 italic">No payments recorded this month</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Refunds and credits (2026-10-12, Slice 3). */}
            <Card className="shadow-sm border-0 mt-8">
                <CardHeader>
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <Undo2 className="w-4 h-4" /> Refunds &amp; credits{selectedVendor && vendorOutstanding?.vendorName ? ` — ${vendorOutstanding.vendorName}` : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <VendorMoneyBackList vendorId={selectedVendor} bankAccounts={bankAccounts} canEdit={canAdd} />
                </CardContent>
            </Card>

            {/* Payment history (2026-10-12 — there was no list before). */}
            <Card className="shadow-sm border-0 mt-8">
                <CardHeader>
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <History className="w-4 h-4" /> Recent payments{selectedVendor && vendorOutstanding?.vendorName ? ` — ${vendorOutstanding.vendorName}` : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {history.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-8">No payments yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase text-slate-400 border-b">
                                        <th className="px-4 py-2 font-semibold">Date</th>
                                        <th className="px-4 py-2 font-semibold">Vendor</th>
                                        <th className="px-4 py-2 font-semibold">For</th>
                                        <th className="px-4 py-2 font-semibold">Mode / Ref</th>
                                        <th className="px-4 py-2 font-semibold">From</th>
                                        <th className="px-4 py-2 font-semibold text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {history.map(p => (
                                        <tr key={p._id}>
                                            <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{day(p.paymentDate)}</td>
                                            <td className="px-4 py-2">{p.vendor?.supplierName || '—'}</td>
                                            <td className="px-4 py-2">
                                                {p.purchaseOrder
                                                    ? <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" />{p.purchaseOrder.purchaseOrderNumber}<Badge variant="outline" className={p.kind === 'Advance' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>{p.kind === 'Advance' ? 'Advance' : 'Material'}</Badge>{p.fromCredit && <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">from credit</Badge>}</span>
                                                    : <span className="text-slate-500">{(p.allocations || []).map(a => a.invoice?.invoiceNo).filter(Boolean).join(', ') || 'Bills without a PO'}</span>}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500">{p.paymentMode}{p.referenceNo ? ` · ${p.referenceNo}` : ''}</td>
                                            <td className="px-4 py-2 text-slate-500">{p.fromCredit ? 'Vendor credit' : (p.bankAccount?.accountName || '—')}</td>
                                            <td className="px-4 py-2 text-right font-semibold">{inr(p.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {historyPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-slate-500">
                            <span>{historyTotal} payments · page {historyPage} of {historyPages}</span>
                            <span className="flex gap-2">
                                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={historyPage <= 1} onClick={() => setHistoryPage(p => Math.max(1, p - 1))}>Previous</Button>
                                <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={historyPage >= historyPages} onClick={() => setHistoryPage(p => p + 1)}>Next</Button>
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default VendorPayments;
