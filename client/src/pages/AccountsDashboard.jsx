import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  PieChart,
  BarChart3,
  Calendar,
  Wallet,
  RefreshCw,
  Building2,
  Loader2
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthContext } from '@/contexts/AuthContext';

// ── Skeleton loader ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="border-l-4 border-l-gray-200">
      <CardHeader className="pb-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-32 mb-1" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-20" />
      </CardContent>
    </Card>
  );
}

function SkeletonSection() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Overdue':   return 'bg-red-100 text-red-800 border-red-200';
    case 'Due Soon':  return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Pending':   return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Paid':      return 'bg-green-100 text-green-800 border-green-200';
    default:          return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTransactionColor = (type) => {
  switch (type) {
    case 'Credit':  return 'text-green-600';
    case 'Debit':   return 'text-red-600';
    case 'Invoice': return 'text-blue-600';
    default:        return 'text-gray-600';
  }
};

const getAlertIcon = (type) => {
  switch (type) {
    case 'overdue':        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'budget':         return <DollarSign className="h-4 w-4 text-yellow-500" />;
    case 'approval':       return <Clock className="h-4 w-4 text-orange-500" />;
    case 'reconciliation': return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:               return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'High':   return 'bg-red-100 text-red-800';
    case 'Medium': return 'bg-yellow-100 text-yellow-800';
    case 'Low':    return 'bg-green-100 text-green-800';
    default:       return 'bg-gray-100 text-gray-800';
  }
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AccountsDashboard() {
  const { user } = useAuthContext();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [warning, setWarning] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Derive company display name from logged-in user
  const companyName = user?.company?.name
    || user?.company?.unitName
    || user?.unit
    || 'Your Company';

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else { setLoading(true); setError(null); setWarning(null); }

    try {
      console.log('📊 Fetching accounts dashboard... user role:', user?.role);
      const response = await api.getAccountsDashboardData();
      console.log('📊 Dashboard API response:', response);
      if (response?.success && response?.data) {
        setData(response.data);
        setError(null);
        if (response.warning) setWarning(response.warning);
      } else {
        throw new Error(response?.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('AccountsDashboard fetch error:', err);
      console.error('  → HTTP status:', err?.status);
      console.error('  → Server message:', err?.data?.message);
      console.error('  → Debug info:', err?.data?.debug);
      const msg = err?.data?.message || err?.message || 'Could not load dashboard data.';
      const status = err?.status ? ` (HTTP ${err.status})` : '';
      // Show role info if it's a 403
      const roleHint = err?.status === 403
        ? ` — Your role "${user?.role}" may not have access. Required: Accounts, Admin, Unit Head, etc.`
        : '';
      setError(`${msg}${status}${roleHint}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Debug: log current user role ──────────────────────────────────────────
  useEffect(() => {
    if (user) {
      console.log('🧑 Logged-in user:', { role: user.role, companyId: user.companyId || user.company?.id });
    }
  }, [user]);

  // ── Shorthand aliases ──────────────────────────────────────────────────────
  const stats       = data?.financialStats     || {};
  const revBreak    = data?.revenueBreakdown   || [];
  const expCats     = data?.expenseCategories  || [];
  const pendingTxns = data?.pendingTransactions || [];
  const recentTxns  = data?.recentTransactions || [];
  const alerts      = data?.accountsAlerts     || [];
  const qTargets    = data?.quarterlyTargets   || [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="h-10 w-10" />
              Accounts Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-2 text-emerald-100">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">{companyName}</span>
              {user?.role && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {user.role}
                </Badge>
              )}
            </div>
            <p className="text-emerald-100 mt-1 text-sm">
              Financial overview, cash flow management &amp; accounting operations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              {refreshing
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Calendar className="h-4 w-4 mr-2" />
              This Year
            </Button>
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchData()}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Warning Banner ─────────────────────────────────────────────────── */}
      {warning && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <span className="text-sm font-medium">{warning}</span>
        </div>
      )}

      {/* ── Key Financial Metrics ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth ?? 0}% vs last month
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(stats.netProfit || 0) < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(stats.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margin: {stats.profitMargin ?? 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending Invoices</CardTitle>
                <FileText className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingInvoices ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.overduePayments ?? 0} overdue
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Cash Flow</CardTitle>
                <CreditCard className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.cashFlow)}</div>
                <p className="text-xs text-muted-foreground">Available bank balance</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Revenue & Expense Breakdown ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Revenue Breakdown
            </CardTitle>
            <CardDescription>Revenue by payment status (current year)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonSection /> : revBreak.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No revenue data available yet.</p>
            ) : (
              <div className="space-y-4">
                {revBreak.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">{item.category}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                        <Badge variant={item.growth >= 0 ? 'default' : 'destructive'}>
                          {item.growth >= 0
                            ? <TrendingUp className="h-3 w-3 mr-1" />
                            : <TrendingDown className="h-3 w-3 mr-1" />}
                          {item.growth >= 0 ? '+' : ''}{item.growth}%
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{item.percentage}% of total</span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Expense Categories
            </CardTitle>
            <CardDescription>Budget utilisation by category (current year)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonSection /> : expCats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No expense data available yet.</p>
            ) : (
              <div className="space-y-4">
                {expCats.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">{item.category}</h3>
                      <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{item.percentage}% of total</span>
                        <span>{((item.amount / item.budget) * 100).toFixed(1)}% of budget</span>
                      </div>
                      <Progress value={(item.amount / item.budget) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pending Transactions & Quarterly Targets ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pending Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Transactions
            </CardTitle>
            <CardDescription>Outstanding invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonSection /> : pendingTxns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No pending transactions. 🎉
              </p>
            ) : (
              <div className="space-y-4">
                {pendingTxns.map((transaction) => (
                  <div key={transaction.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-sm">{transaction.id}</h3>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                      <Badge variant="outline">{transaction.type}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.client || transaction.vendor}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                      <span className="text-gray-500">Due: {transaction.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quarterly Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Quarterly Targets
            </CardTitle>
            <CardDescription>Progress against financial goals</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonSection /> : qTargets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No targets configured.</p>
            ) : (
              <div className="space-y-4">
                {qTargets.map((target) => (
                  <div key={target.metric} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm">{target.metric}</h3>
                      <Badge variant={target.current >= target.target ? 'default' : 'secondary'}>
                        {target.current >= target.target ? 'Achieved' : 'In Progress'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          Current:{' '}
                          {target.unit === '₹' ? formatCurrency(target.current) : `${target.current}${target.unit}`}
                        </span>
                        <span>
                          Target:{' '}
                          {target.unit === '₹' ? formatCurrency(target.target) : `${target.target}${target.unit}`}
                        </span>
                      </div>
                      <Progress
                        value={Math.min((target.current / (target.target || 1)) * 100, 100)}
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Transactions & Alerts ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonSection /> : recentTxns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No recent transactions found.</p>
            ) : (
              <div className="space-y-4">
                {recentTxns.map((transaction) => (
                  <div key={transaction.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'Credit' ? 'bg-green-100' :
                      transaction.type === 'Debit'  ? 'bg-red-100'   : 'bg-blue-100'
                    }`}>
                      {transaction.type === 'Credit'  && <TrendingUp   className="h-4 w-4 text-green-600" />}
                      {transaction.type === 'Debit'   && <TrendingDown className="h-4 w-4 text-red-600" />}
                      {transaction.type === 'Invoice' && <FileText     className="h-4 w-4 text-blue-600" />}
                      {transaction.type === 'Journal' && <FileText     className="h-4 w-4 text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                        </span>
                        <span className="text-xs text-gray-500">{transaction.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounts Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Accounts Alerts
            </CardTitle>
            <CardDescription>Important notifications and reminders</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <SkeletonSection /> : alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No alerts at this time.</p>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getPriorityColor(alert.priority)}>
                          {alert.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}