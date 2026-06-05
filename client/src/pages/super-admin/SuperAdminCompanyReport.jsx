import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import {
  Building2,
  Users,
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Phone,
  Mail,
  User,
  DollarSign,
  FileText,
  Activity,
  Layers,
  Wrench,
  Clock,
  MapPin
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#64748b'];

const SuperAdminCompanyReport = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const companyId = params.id;

  // Fetch company report data
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['company-report', companyId],
    queryFn: () => api.getCompanyReport(companyId),
    enabled: !!companyId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !reportData || !reportData.success) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Failed to load company report</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          {error?.message || reportData?.message || 'An unexpected error occurred while fetching company data.'}
        </p>
        <Button onClick={() => setLocation('/super-admin/companies')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Companies
        </Button>
      </div>
    );
  }

  const { company, companyAdmin, report } = reportData;

  // Prepare chart data
  const leadChartData = report.leads.byStatus.map(item => ({
    name: item._id || 'Unknown',
    value: item.count
  }));

  const orderChartData = report.orders.byStatus.map(item => ({
    name: item._id || 'Unknown',
    count: item.count,
    amount: item.totalAmount
  }));

  const salesPieData = [
    { name: 'Paid', value: report.sales.paidAmount, color: '#10b981' },
    { name: 'Balance Due', value: report.sales.balanceAmount, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  const usersRoleData = report.users.byRole.map(item => ({
    name: item._id || 'No Role',
    count: item.count
  }));

  // Win rate calculation
  const winRate = report.leads.total > 0 
    ? ((report.leads.dealWon / report.leads.total) * 100).toFixed(1) 
    : '0.0';

  // Active shipments calculation
  const activeShipmentsCount = report.dispatch.byStatus
    ?.filter(s => ['Ready', 'Dispatched', 'In Transit'].includes(s._id))
    ?.reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50 min-h-screen print:bg-white print:p-0">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/super-admin/companies')}
          className="self-start text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Companies
        </Button>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card className="border border-blue-100 shadow-sm overflow-hidden bg-gradient-to-r from-blue-50 via-indigo-50/50 to-sky-100/50 text-slate-800">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="p-3 bg-blue-100/80 rounded-xl">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{company.name}</h1>
                  <p className="text-slate-600 text-sm flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> {company.unitName} &bull; {company.city}, {company.state}
                  </p>
                </div>
                <Badge className={`${company.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'} px-3 py-1 font-medium capitalize border ml-2 shadow-none`}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="text-xs font-mono text-blue-800 bg-blue-50/65 px-3 py-1.5 rounded-lg border border-blue-100/70 inline-block">
                Company ID: {company._id}
              </div>
            </div>

            {/* Admin Info Box */}
            <div className="bg-white/90 rounded-2xl p-5 border border-blue-200/80 shadow-sm space-y-3 min-w-[280px] lg:max-w-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-xs tracking-wider text-slate-500 uppercase">Company Admin</span>
              </div>
              {companyAdmin ? (
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="font-bold text-slate-900 text-base">{companyAdmin.fullName}</div>
                  <div className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
                    <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{companyAdmin.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
                    <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>{companyAdmin.mobile}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No admin account created for this company yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        
        {/* Total Sales Revenue */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</CardTitle>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              ₹{report.sales.totalAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Collected: <span className="text-emerald-600">₹{report.sales.paidAmount.toLocaleString('en-IN')}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Pending Balance: <span className="text-amber-600">₹{report.sales.balanceAmount.toLocaleString('en-IN')}</span>
            </p>
          </CardContent>
        </Card>

        {/* Lead Stats */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Lead Performance</CardTitle>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {report.leads.total} Leads
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Deals Won: <span className="text-indigo-600 font-semibold">{report.leads.dealWon}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Lead Win Rate: <span className="text-slate-800 font-bold">{winRate}%</span>
            </p>
          </CardContent>
        </Card>

        {/* Orders & Customers */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Orders & Clients</CardTitle>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {report.orders.total} Orders
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Total Customers: <span className="text-blue-600 font-semibold">{report.customers.total}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              Avg Order Value: <span className="text-slate-800 font-bold">
                ₹{report.orders.total > 0 ? Math.round(report.orders.totalAmount / report.orders.total).toLocaleString('en-IN') : 0}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Dispatch & Delivery KPI Card */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Dispatch & Delivery</CardTitle>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {report.dispatch.totalDispatchedItems} Items
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Total Shipments: <span className="text-slate-700 font-semibold">{report.dispatch.total}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Active Shipments: <span className="text-amber-600 font-bold">{activeShipmentsCount}</span>
            </p>
          </CardContent>
        </Card>

        {/* Staff & Inventory */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Staff & Inventory</CardTitle>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {report.users.total} Employees
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Inventory Items: <span className="text-slate-700 font-semibold">{report.inventory.totalItems}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 font-semibold">
              Low Stock Alert: {' '}
              {report.inventory.lowStockCount > 0 ? (
                <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 animate-pulse flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" /> {report.inventory.lowStockCount} Items
                </span>
              ) : (
                <span className="text-emerald-600">None</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="dashboard" className="w-full space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl w-full sm:w-auto flex flex-wrap gap-1 print:hidden">
          <TabsTrigger value="dashboard" className="rounded-lg font-medium px-4 py-2">
            Dashboard Overview
          </TabsTrigger>
          <TabsTrigger value="sales" className="rounded-lg font-medium px-4 py-2">
            Sales & Orders
          </TabsTrigger>
          <TabsTrigger value="operations" className="rounded-lg font-medium px-4 py-2">
            Production & Inventory
          </TabsTrigger>
          <TabsTrigger value="hrms" className="rounded-lg font-medium px-4 py-2">
            HR & Service Tickets
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Dashboard Overview (Visual Charts) */}
        <TabsContent value="dashboard" className="space-y-6 outline-none">
          
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            
            {/* Sales Revenue Breakdown Pie Chart */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="h-4.5 w-4.5 text-slate-500" /> Sales Revenue Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col items-center justify-center">
                {salesPieData.length > 0 ? (
                  <>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={salesPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {salesPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full text-center mt-2 border-t pt-4">
                      <div>
                        <div className="text-xs text-slate-500">Total Collected</div>
                        <div className="font-bold text-base text-emerald-600">
                          ₹{report.sales.paidAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Uncollected Balance</div>
                        <div className="font-bold text-base text-amber-600">
                          ₹{report.sales.balanceAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm italic">
                    No sales revenue data recorded
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Status Distribution Pie Chart */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-slate-500" /> Leads Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {leadChartData.length > 0 ? (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leadChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          dataKey="value"
                        >
                          {leadChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm italic">
                    No leads recorded
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Value and Count Bar Chart */}
            <Card className="border-none shadow-sm bg-white overflow-hidden md:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="h-4.5 w-4.5 text-slate-500" /> Order Revenue & Counts by Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {orderChartData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={orderChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis yAxisId="left" orientation="left" stroke="#6366f1" label={{ value: 'Revenue (₹)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" label={{ value: 'Order Count', angle: 90, position: 'insideRight' }} />
                        <Tooltip formatter={(value, name) => name === 'amount' ? `₹${value.toLocaleString('en-IN')}` : value} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="amount" name="Revenue Amount (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="count" name="Total Orders count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm italic">
                    No order status data available
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Tab 2: Sales & Orders Tables */}
        <TabsContent value="sales" className="space-y-6 outline-none">
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            
            {/* Orders breakdown */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="h-4.5 w-4.5 text-slate-500" /> Orders Breakdown by Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Count</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.orders.byStatus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-slate-500">
                          No orders registered.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.orders.byStatus.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-800 capitalize">{item._id || 'Pending'}</TableCell>
                          <TableCell className="text-center font-medium">{item.count}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900">₹{item.totalAmount?.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Sales collection summary */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="h-4.5 w-4.5 text-slate-500" /> Collection & Invoicing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-slate-500">Invoiced Amount</span>
                    <span className="font-bold text-slate-900">₹{report.sales.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-slate-500">Paid Amount (Received)</span>
                    <span className="font-bold text-emerald-600">₹{report.sales.paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-slate-500">Balance Due (Receivable)</span>
                    <span className="font-bold text-amber-600">₹{report.sales.balanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Collection Rate</span>
                    <span className="font-extrabold text-slate-900">
                      {report.sales.totalAmount > 0 
                        ? `${((report.sales.paidAmount / report.sales.totalAmount) * 100).toFixed(1)}%`
                        : '0.0%'
                      }
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Business Activity</div>
                  <div className="text-sm text-indigo-900">
                    The company has a total of <span className="font-bold">{report.sales.total}</span> sales transactions logged against <span className="font-bold">{report.customers.total}</span> unique customer accounts.
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Tab 3: Production & Inventory Details */}
        <TabsContent value="operations" className="space-y-6 outline-none">
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            
            {/* Inventory items summary */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Package className="h-4.5 w-4.5 text-slate-500" /> Inventory Stock Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unique SKUs</div>
                    <div className="text-2xl font-bold text-slate-800">{report.inventory.totalItems}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Stock Count</div>
                    <div className="text-2xl font-bold text-slate-800">{report.inventory.totalStock}</div>
                  </div>
                </div>

                {report.inventory.lowStockCount > 0 ? (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-rose-800">Critical: Low Stock Warning</div>
                      <div className="text-xs text-rose-600 mt-0.5">
                        There are <span className="font-bold">{report.inventory.lowStockCount}</span> items running below their threshold minimum quantity limit. Immediate restock recommended.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-emerald-800">Stock Levels Healthy</div>
                      <div className="text-xs text-emerald-600 mt-0.5">
                        All inventory items are currently safely above their set minimum safety buffer quantities.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production breakdown */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-slate-500" /> Production Output Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Production Stage</TableHead>
                      <TableHead className="text-right">Quantity Produced (Units)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.production.byStatus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-slate-500">
                          No production output logged for this company.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.production.byStatus.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-800 capitalize">{item._id || 'In Queue'}</TableCell>
                          <TableCell className="text-right font-medium">{item.count.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))
                    )}
                    {report.production.totalQtyProduced > 0 && (
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 font-bold border-t-2">
                        <TableCell>Total Quantity Produced</TableCell>
                        <TableCell className="text-right">{report.production.totalQtyProduced.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    )}
                    {report.production.totalProductionLoss > 0 && (
                      <TableRow className="bg-rose-50/50 hover:bg-rose-50/50 font-bold text-rose-700 border-t">
                        <TableCell>Total Production Loss</TableCell>
                        <TableCell className="text-right">{report.production.totalProductionLoss.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Dispatch breakdown */}
            <Card className="border-none shadow-sm bg-white overflow-hidden lg:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-slate-500" /> Dispatch Delivery Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch Status</TableHead>
                      <TableHead className="text-right">Shipments Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.dispatch.byStatus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-slate-500">
                          No shipments or deliveries logged.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.dispatch.byStatus.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-800 capitalize">{item._id || 'Packed'}</TableCell>
                          <TableCell className="text-right font-medium">{item.count}</TableCell>
                        </TableRow>
                      ))
                    )}
                    {report.dispatch.totalDispatchedItems > 0 && (
                      <TableRow className="bg-emerald-50/40 hover:bg-emerald-50/40 font-bold text-emerald-700 border-t-2">
                        <TableCell>Total Items Dispatched</TableCell>
                        <TableCell className="text-right">{report.dispatch.totalDispatchedItems}</TableCell>
                      </TableRow>
                    )}
                    {report.dispatch.total > 0 && (
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 font-bold border-t">
                        <TableCell>Total Dispatch Actions</TableCell>
                        <TableCell className="text-right">{report.dispatch.total}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* Tab 4: HR & Service Tickets Details */}
        <TabsContent value="hrms" className="space-y-6 outline-none">
          
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            
            {/* User roles breakdown */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-slate-500" /> Staff Distribution by Role
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 flex flex-col gap-4">
                {report.users.byRole.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    {report.users.byRole.map((item, idx) => {
                      const totalUsers = report.users.total || 1;
                      const percentage = Math.round((item.count / totalUsers) * 100);
                      const colors = [
                        'bg-indigo-600', 'bg-sky-500', 'bg-emerald-500', 
                        'bg-amber-500', 'bg-rose-500', 'bg-violet-500'
                      ];
                      const barColor = colors[idx % colors.length];
                      const textColors = [
                        'text-indigo-700 bg-indigo-50 border-indigo-100',
                        'text-sky-700 bg-sky-50 border-sky-100',
                        'text-emerald-700 bg-emerald-50 border-emerald-100',
                        'text-amber-700 bg-amber-50 border-amber-100',
                        'text-rose-700 bg-rose-50 border-rose-100',
                        'text-violet-700 bg-violet-50 border-violet-100'
                      ];
                      const badgeColor = textColors[idx % textColors.length];

                      return (
                        <div key={idx} className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-800 text-sm">{item._id || 'No Role Assigned'}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                {item.count} {item.count === 1 ? 'Staff' : 'Staff'}
                              </span>
                              <span className="text-xs text-slate-500 font-bold">{percentage}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`${barColor} h-full rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full text-center py-12 text-slate-400 italic">
                    No active staff users registered
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support complaints breakdown */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="h-4.5 w-4.5 text-slate-500" /> Customer Support Service Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket Status</TableHead>
                      <TableHead className="text-right">No. of Tickets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.complaints.byStatus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-slate-500">
                          No service tickets or complaints registered.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.complaints.byStatus.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-800 capitalize">{item._id || 'Open'}</TableCell>
                          <TableCell className="text-right font-medium">{item.count}</TableCell>
                        </TableRow>
                      ))
                    )}
                    {report.complaints.total > 0 && (
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 font-bold border-t-2">
                        <TableCell>Total Tickets Opened</TableCell>
                        <TableCell className="text-right">{report.complaints.total}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
      
      {/* Footer message on print only */}
      <div className="hidden print:block text-center text-xs text-slate-400 pt-8 border-t">
        System Generated Company Report &bull; Powered by Samtek ERP Suite &bull; {new Date().toLocaleDateString()}
      </div>

    </div>
  );
};

export default SuperAdminCompanyReport;
