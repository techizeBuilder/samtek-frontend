import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  ReceiptText,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatINR = (value) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

const GSTAndTDS = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);

  const changeSearch = (value) => { setSearchTerm(value); setPage(1); };
  const changeFilterStatus = (value) => { setFilterStatus(value); setPage(1); };

  // Fetch dynamic tax summary — search/type/page are applied server-side to
  // the transaction log (see getTaxSummary); the GST/TDS totals above always
  // reflect the full, unfiltered set regardless of what page you're viewing.
  const { data: taxSummaryResponse, isLoading, error } = useQuery({
    queryKey: ['/api/accounts/tax/summary', searchTerm, filterStatus, page],
    queryFn: () => apiRequest('GET', `/api/accounts/tax/summary?page=${page}&limit=20&search=${encodeURIComponent(searchTerm)}&type=${filterStatus}`),
    keepPreviousData: true,
  });

  if (error) {
    return (
      <div className="p-10 text-center">
        <Card className="border-rose-200 bg-rose-50 p-6">
          <p className="text-rose-600 font-bold">Failed to load tax summary: {error.message}</p>
        </Card>
      </div>
    );
  }

  const taxData = taxSummaryResponse?.data || {
    outputGST: { cgst: 0, sgst: 0, igst: 0, total: 0 },
    inputGST: { cgst: 0, sgst: 0, igst: 0, total: 0 },
    tdsReceivable: 0,
    tdsPayable: 0,
    netGSTLiability: 0,
    transactions: [],
    pagination: {}
  };
  const pagination = taxData.pagination || {};

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
      case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pending':
      case 'Declared': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Overdue': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Search/type filtering now happens server-side (see queryFn above) — this
  // page's transactions are already the filtered, paginated slice.
  const filteredTransactions = taxData.transactions;

  const [isExporting, setIsExporting] = useState(false);

  // Export should cover every matching record, not just the current page —
  // fetches the full filtered set (same search/type filters) in one request
  // rather than exporting only whatever 20 rows happen to be on screen.
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await apiRequest('GET', `/api/accounts/tax/summary?page=1&limit=100000&search=${encodeURIComponent(searchTerm)}&type=${filterStatus}`);
      const allTransactions = res?.data?.transactions || [];

      const exportData = allTransactions.map(item => ({
        'Date': new Date(item.date).toLocaleDateString(),
        'Period': item.period,
        'Reference No': item.invoiceNo,
        'Classification': item.transactionType,
        'Tax Type': item.taxType,
        'GST Amount': item.gstAmount,
        'TDS Amount': item.tdsAmount,
        'Net Amount': item.netAmount,
        'Status': item.status || 'Verified'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TaxRecords");
      XLSX.writeFile(wb, `Tax_Compliance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl">
                <ReceiptText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">GST & TDS Compliance</h1>
            </div>
            <p className="text-slate-500 font-medium ml-12">Dynamic tax tracking and automated reporting system</p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Button
              variant="outline"
              className="flex-1 lg:flex-none border-slate-200 hover:bg-slate-50"
              onClick={handleExportExcel}
              disabled={isExporting || (pagination.total ?? filteredTransactions.length) === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Reports'}
            </Button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Net Liability Card */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <BarChart3 className="w-24 h-24" />
            </div>
            <CardContent className="p-7 relative z-10">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Net GST Liability</p>
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2 min-w-0">
                <h3 className="text-3xl xl:text-4xl font-black italic break-all min-w-0">{formatINR(taxData.netGSTLiability)}</h3>
                <Badge className="mb-1 bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shrink-0">Auto Compute</Badge>
              </div>
              <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-700/50">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Payable Year-End</p>
                  <p className="text-sm font-bold text-slate-200">Estimated</p>
                </div>
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output GST Card */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white group border-t-4 border-indigo-600">
            <CardContent className="p-7">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0">
                  <ArrowUpRight className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-right min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Output GST</p>
                  <p className="text-xl xl:text-2xl font-black text-slate-900 mt-1 break-all">{formatINR(taxData.outputGST.total)}</p>
                </div>
              </div>
              <div className="space-y-2 mt-6">
                <div className="flex justify-between gap-2 text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-bold shrink-0">CGST (9%)</span>
                  <span className="text-slate-900 font-black tracking-tight break-all text-right">{formatINR(taxData.outputGST.cgst)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-bold shrink-0">SGST (9%)</span>
                  <span className="text-slate-900 font-black tracking-tight break-all text-right">{formatINR(taxData.outputGST.sgst)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs py-1">
                  <span className="text-slate-500 font-bold shrink-0">IGST (18%)</span>
                  <span className="text-slate-900 font-black tracking-tight break-all text-right">{formatINR(taxData.outputGST.igst)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input GST Card */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white group border-t-4 border-emerald-500">
            <CardContent className="p-7">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="p-2.5 bg-emerald-50 rounded-xl shrink-0">
                  <ArrowDownRight className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="text-right min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Input GST</p>
                  <p className="text-xl xl:text-2xl font-black text-slate-900 mt-1 break-all">{formatINR(taxData.inputGST.total)}</p>
                </div>
              </div>
              <div className="space-y-2 mt-6">
                <div className="flex justify-between gap-2 text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-bold shrink-0">CGST (9%)</span>
                  <span className="text-slate-900 font-black tracking-tight break-all text-right">{formatINR(taxData.inputGST.cgst)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-bold shrink-0">SGST (9%)</span>
                  <span className="text-slate-900 font-black tracking-tight break-all text-right">{formatINR(taxData.inputGST.sgst)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs py-1">
                  <span className="text-slate-500 font-bold shrink-0">IGST (18%)</span>
                  <span className="text-slate-900 font-black tracking-tight break-all text-right">{formatINR(taxData.inputGST.igst)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TDS Card */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white group border-t-4 border-amber-500">
            <CardContent className="p-7">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="p-2.5 bg-amber-50 rounded-xl shrink-0">
                  <Percent className="w-6 h-6 text-amber-600" />
                </div>
                <div className="text-right min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">TDS Summary</p>
                  <p className="text-xl xl:text-2xl font-black text-slate-900 mt-1 break-all">{formatINR(taxData.tdsReceivable - taxData.tdsPayable)}</p>
                </div>
              </div>
              <div className="space-y-2 mt-6">
                <div className="flex justify-between gap-2 text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-bold shrink-0">TDS Receivable</span>
                  <span className="text-indigo-600 font-black tracking-tight break-all text-right">{formatINR(taxData.tdsReceivable)}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs py-1">
                  <span className="text-slate-500 font-bold shrink-0">TDS Payable</span>
                  <span className="text-rose-600 font-black tracking-tight break-all text-right">{formatINR(taxData.tdsPayable)}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Compliance Score</span>
                  <span className="text-[10px] font-black text-emerald-600 px-2 bg-emerald-50 rounded-full">EXCELLENT</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table Container */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tax records by invoice or period..."
                className="pl-11 h-12 bg-white border-0 shadow-sm rounded-xl"
                value={searchTerm}
                onChange={(e) => changeSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl overflow-x-auto no-scrollbar">
              {['All', 'Sales', 'Purchases'].map(type => (
                <Button
                  key={type}
                  variant="ghost"
                  className={cn(
                    "h-10 px-6 rounded-lg font-bold text-sm transition-all",
                    (type === 'All' && filterStatus === 'All') ||
                      (type === 'Sales' && filterStatus === 'Sales') ||
                      (type === 'Purchases' && filterStatus === 'Purchases')
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:bg-white/50"
                  )}
                  // Modified setFilter logic to handle Sales/Purchases specifically if needed
                  onClick={() => changeFilterStatus(type === 'All' ? 'All' : type)}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800">Tax Compliance Log</CardTitle>
                  <CardDescription className="text-slate-500">Live transaction monitoring for GST & TDS</CardDescription>
                </div>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold px-4 py-1.5">
                  {pagination.total ?? filteredTransactions.length} Total Records
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-20 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-slate-500 font-bold">Synchronizing tax records...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <th className="px-8 py-5 text-left">Date & Period</th>
                        <th className="px-8 py-5 text-left">Ref Number</th>
                        <th className="px-8 py-5 text-left">Classification</th>
                        <th className="px-8 py-5 text-left">Tax Type</th>
                        <th className="px-8 py-5 text-right">GST Detail</th>
                        <th className="px-8 py-5 text-right">TDS Info</th>
                        <th className="px-8 py-5 text-right">Net Payable</th>
                        <th className="px-8 py-5 text-center">Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-900 uppercase tracking-tight italic">
                              {new Date(item.date).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-slate-400 font-black tracking-widest">
                              P: {item.period}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <Badge className="bg-slate-100 text-slate-700 font-black border-slate-200">
                              {item.invoiceNo}
                            </Badge>
                          </td>
                          <td className="px-8 py-5">
                            <div className={cn(
                              "text-xs font-black uppercase px-2 py-1 rounded inline-block",
                              item.transactionType === 'Sales' ? "text-indigo-600 bg-indigo-50" : "text-emerald-600 bg-emerald-50"
                            )}>
                              {item.transactionType}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-500">
                              {item.taxType}
                            </Badge>
                          </td>
                          <td className="px-8 py-5 text-right font-black text-slate-900 tabular-nums">
                            {formatINR(item.gstAmount)}
                          </td>
                          <td className="px-8 py-5 text-right font-bold text-slate-500 tabular-nums">
                            {formatINR(item.tdsAmount)}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className="font-black text-indigo-600 tabular-nums italic">
                              {formatINR(item.netAmount)}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <Badge className={cn("font-black tracking-tighter shadow-sm", getStatusColor(item.status))}>
                              {item.status || 'Verified'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-20 text-center">
                            <div className="max-w-xs mx-auto space-y-3">
                              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                <BarChart3 className="w-8 h-8 opacity-50" />
                              </div>
                              <p className="text-slate-400 font-bold">No compliance records found for the selected filter.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 px-8 py-4 border-t border-slate-100">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-500 font-bold">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GSTAndTDS;
