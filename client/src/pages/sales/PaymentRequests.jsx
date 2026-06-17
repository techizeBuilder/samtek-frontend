import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadApi } from '@/api/leadService';
import { apiRequest } from '@/api/index';
import { Badge } from '@/components/ui/badge';
import { Target, Building2, User, Hash, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const STATUS_CONFIG = {
  Paid:           { badge: 'bg-green-100 text-green-700 border-green-200',   bar: 'bg-green-500',  icon: CheckCircle2, label: 'Paid' },
  'Partially Paid':{ badge: 'bg-blue-100 text-blue-700 border-blue-200',     bar: 'bg-blue-500',   icon: TrendingUp,   label: 'Partially Paid' },
  Pending:        { badge: 'bg-amber-100 text-amber-700 border-amber-200',   bar: 'bg-amber-400',  icon: Clock,        label: 'Pending' },
  Rejected:       { badge: 'bg-red-100 text-red-700 border-red-200',         bar: 'bg-red-400',    icon: XCircle,      label: 'Rejected' },
};

const PaymentRequests = () => {
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['sales-payment-requests'],
    queryFn: () => leadApi.getAll({}),
  });

  const { data: leadPaymentsData } = useQuery({
    queryKey: ['sales-payment-requests-payments'],
    queryFn: () => {
      const token = localStorage.getItem('token');
      return apiRequest('/lead-payments', { headers: { Authorization: `Bearer ${token}` } });
    },
  });

  const leads = leadsData?.leads || [];
  const allPayments = leadPaymentsData?.payments || [];

  const paymentRequests = leads.filter(
    (l) => l.paymentCheckStatus && l.paymentCheckStatus !== 'Not Requested'
  );

  const getVerifiedAdvanced = (leadId) =>
    allPayments
      .filter((p) => {
        const pid = p.leadId?._id ? p.leadId._id.toString() : p.leadId?.toString();
        return pid === leadId.toString() && p.status === 'Verified';
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">My Payment Requests</h1>
          <p className="text-slate-500 mt-1 text-sm">Track the status of your payment check requests</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : paymentRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
            <Target className="h-14 w-14 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">No Payment Requests</h3>
            <p className="text-slate-400 mt-1 text-sm">You haven't requested any payment checks yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentRequests.map((lead) => {
              const status = lead.paymentCheckStatus || 'Pending';
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];
              const Icon = cfg.icon;
              const isPaidOrPartial = status === 'Paid' || status === 'Partially Paid';
              const dealValue = lead.dealValue || 0;
              const advanced = isPaidOrPartial ? getVerifiedAdvanced(lead._id) : 0;
              const pending = Math.max(0, dealValue - advanced);
              const progressPct = dealValue > 0 ? Math.min(100, Math.round((advanced / dealValue) * 100)) : 0;

              return (
                <div
                  key={lead._id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Coloured top accent */}
                  <div className={cn('h-1 w-full', cfg.bar)} />

                  <div className="p-5">
                    {/* Top row: lead info + status badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-800 text-base">{lead.companyName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <User className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{lead.contactPerson}</span>
                          <span className="text-slate-300">·</span>
                          <span>{lead.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-mono">{lead.leadCode}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge className={cn('flex items-center gap-1.5 border text-xs px-2.5 py-1', cfg.badge)}>
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </Badge>
                        {lead.status === 'Won' && (
                          <Badge className="bg-green-600 text-white text-xs">Deal Won</Badge>
                        )}
                      </div>
                    </div>

                    {/* Payment breakdown — only for Paid / Partially Paid */}
                    {isPaidOrPartial && (
                      <>
                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-400 font-medium mb-1">Deal Value</p>
                            <p className="text-sm font-bold text-slate-700">{formatCurrency(dealValue)}</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-xs text-green-500 font-medium mb-1">Advanced Paid</p>
                            <p className="text-sm font-bold text-green-700">{formatCurrency(advanced)}</p>
                          </div>
                          <div className="bg-amber-50 rounded-xl p-3">
                            <p className="text-xs text-amber-500 font-medium mb-1">Pending</p>
                            <p className="text-sm font-bold text-amber-700">{formatCurrency(pending)}</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {dealValue > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Payment Progress</span>
                              <span>{progressPct}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', cfg.bar)}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentRequests;
