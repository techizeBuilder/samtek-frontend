import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Send, Wallet, Banknote, CreditCard } from 'lucide-react';

const VendorPayments = () => {
    const { toast } = useToast();
    const { hasFeatureAccess } = usePermissions();
    const canAdd = hasFeatureAccess('accounts', 'purchases', 'add');
    const [selectedVendor, setSelectedVendor] = useState('');

    const { data: vendorsData } = useQuery({
        queryKey: ['/api/suppliers'],
        queryFn: () => apiRequest('GET', '/api/suppliers')
    });

    const { data: outstandingResponse, isLoading: isLoadingOutstanding } = useQuery({
        queryKey: ['/api/accounts/purchases/outstanding', selectedVendor],
        queryFn: () => apiRequest('GET', `/api/accounts/purchases/outstanding?vendorId=${selectedVendor}`),
        enabled: !!selectedVendor
    });

    const vendorOutstanding = outstandingResponse?.data?.[0];

    const { data: statsResponse } = useQuery({
        queryKey: ['/api/accounts/purchases/payments/stats'],
        queryFn: () => apiRequest('GET', '/api/accounts/purchases/payments/stats')
    });

    const paymentStats = statsResponse?.data;

    const { data: bankAccountsResponse } = useQuery({
        queryKey: ['/api/accounts/bank-cash/summary'],
        queryFn: () => apiRequest('GET', '/api/accounts/bank-cash/summary')
    });
    const bankAccounts = bankAccountsResponse?.data?.accounts || [];

    const mutation = useMutation({
        mutationFn: (paymentData) => apiRequest('POST', '/api/accounts/purchases/payments', paymentData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/purchases/invoices'] });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/purchases/outstanding'] });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/purchases/payments/stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/accounts/bank-cash/summary'] });
            toast({ title: "Success", description: "Payment recorded successfully" });
        },
        onError: (error) => {
            toast({
                title: "Payment Failed",
                description: error?.message || "Something went wrong while recording the payment.",
                variant: "destructive"
            });
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const paymentData = Object.fromEntries(formData.entries());
        paymentData.amount = parseFloat(paymentData.amount);
        paymentData.vendorId = selectedVendor;
        mutation.mutate(paymentData);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Vendor Payments</h1>
                <p className="text-slate-500">Process outgoings and match against invoices</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 shadow-sm border-0">
                    <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                        <CardTitle className="flex items-center">
                            <Send className="w-5 h-5 mr-2" />
                            Create Payment Advice
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
                                        onChange={(e) => setSelectedVendor(e.target.value)}
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
                                    <Input name="paymentDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="p-6 rounded-xl border-2" required />
                                </div>
                            </div>

                            {selectedVendor && (
                                <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-6 mb-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-blue-900">Outstanding Summary</h3>
                                        <Badge className="bg-blue-600">{vendorOutstanding?.invoiceCount || 0} Pending Invoices</Badge>
                                    </div>
                                    <div className="text-4xl font-black text-blue-700">₹{vendorOutstanding?.totalOutstanding?.toLocaleString() || 0}</div>

                                    {vendorOutstanding?.invoices?.length > 0 && (
                                        <div className="mt-6 space-y-3">
                                            <p className="text-xs font-bold text-blue-400 uppercase">Pending Bills</p>
                                            {vendorOutstanding.invoices.map((inv, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-blue-100">
                                                    <div>
                                                        <span className="font-bold text-slate-700">{inv.invoiceNo}</span>
                                                        <span className="mx-2 text-slate-300">|</span>
                                                        <span className="text-slate-500">{new Date(inv.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="font-black text-slate-900">₹{inv.balance.toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Amount to Pay (₹)</label>
                                    <Input name="amount" type="number" step="0.01" placeholder="0.00" className="p-6 rounded-xl border-2 text-2xl font-black" required />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">Account (Withdraw From)</label>
                                    <select
                                        name="accountId"
                                        className="w-full border-2 rounded-xl p-3 bg-white"
                                        required
                                    >
                                        <option value="">-- Choose Bank/Cash --</option>
                                        {bankAccounts?.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} (₹{acc.balance.toLocaleString()})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-600 mb-2 block">Payment Mode</label>
                                <select name="paymentMode" className="w-full border-2 rounded-xl p-3 bg-white" required>
                                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                                    <option value="Cheque">Post Dated Cheque</option>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI / Digital</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-600 mb-2 block">Transaction Reference / UTR</label>
                                <Input name="referenceNo" placeholder="Bank confirmation number" className="p-6 rounded-xl border-2" />
                            </div>

                            {canAdd && (
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-bold" disabled={mutation.isPending}>
                                    {mutation.isPending ? 'Recording Payment...' : 'Confirm & Post Payment'}
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
                            <div className="text-4xl font-black mb-1">₹{paymentStats?.totalPaid?.toLocaleString() || 0}</div>
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
        </div>
    );
};

export default VendorPayments;
