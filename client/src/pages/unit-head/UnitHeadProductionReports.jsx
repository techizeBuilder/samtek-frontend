import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Filter,
  Package,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Factory,
  Calendar,
  CheckCircle,
  Clock,
  BarChart2
} from 'lucide-react';

const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function UnitHeadProductionReports() {
  const [filters, setFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    status: 'all',
    page: 1,
    limit: 20
  });

  const queryParams = new URLSearchParams({
    page: filters.page.toString(),
    limit: filters.limit.toString(),
    ...(filters.startDate && { fromDate: filters.startDate }),
    ...(filters.endDate && { toDate: filters.endDate }),
    ...(filters.status !== 'all' && { status: filters.status })
  });

  const {
    data: reportsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unitHeadProductionReports', filters],
    queryFn: () => apiRequest('GET', `/api/production/reports?${queryParams}`),
    staleTime: 30000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const productionData = reportsData?.data?.reports || [];
  const pagination = reportsData?.pagination || {
    currentPage: 1, totalPages: 1, totalCount: 0,
    hasNext: false, hasPrev: false
  };
  const reports = Array.isArray(productionData) ? productionData : [];

  const summary = {
    totalBatches: reports.length,
    completedBatches: reports.filter(r => r.status === 'completed').length,
    inProgressBatches: reports.filter(r => r.status === 'in_progress' || r.status === 'in-progress').length,
    totalProduced: reports.reduce((sum, r) => sum + (parseInt(r.production?.qtyAchieved) || 0), 0),
    totalPlanned: reports.reduce((sum, r) => sum + (parseInt(r.production?.qtyPerBatch) || 0), 0),
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      status: 'all',
      page: 1,
      limit: 20
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in-progress':
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><Activity className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'paused':
        return <Badge className="bg-orange-100 text-orange-800">Paused</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status || 'Unknown'}</Badge>;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    try { return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return timeStr; }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    catch { return dateStr; }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 mb-3">{error.message}</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="w-6 h-6 text-blue-600" />
            Production Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">View and analyse production data</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalBatches}</p>
              </div>
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{summary.completedBatches}</p>
              </div>
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Progress</p>
                <p className="text-2xl font-bold text-sky-600 mt-1">{summary.inProgressBatches}</p>
              </div>
              <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Produced / Planned</p>
                <p className="text-lg font-bold text-purple-600 mt-1">
                  {summary.totalProduced} <span className="text-sm text-gray-400">/ {summary.totalPlanned}</span>
                </p>
              </div>
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">
                <Calendar className="w-3 h-3 inline mr-1" />
                Start Date
              </Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Status</Label>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Per Page</Label>
              <Select value={filters.limit.toString()} onValueChange={(v) => handleFilterChange('limit', parseInt(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-gray-500">
              Reset to Today
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            Production History
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            <Badge variant="secondary" className="ml-auto text-xs">
              {pagination.totalCount || reports.length} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-500">Loading production data...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No Production Data</p>
              <p className="text-sm text-gray-400 mt-1">No production records found for the selected criteria</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Batch No</TableHead>
                      <TableHead className="font-semibold">Item</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold text-right">Planned</TableHead>
                      <TableHead className="font-semibold text-right">Achieved</TableHead>
                      <TableHead className="font-semibold text-right">Loss</TableHead>
                      <TableHead className="font-semibold text-center">Efficiency</TableHead>
                      <TableHead className="font-semibold">Timing</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Group</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report, index) => (
                      <TableRow key={report.id || index} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-mono font-medium text-sm">
                          {report.batchNo || `B-${report.batchNumber}` || '—'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {report.item?.name || report.item?.description || 'Unknown Item'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {report.item?.category || ''} {report.item?.unit ? `• ${report.item.unit}` : ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(report.productionDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {report.production?.qtyPerBatch || report.qtyPerBatch || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          {report.production?.qtyAchieved || report.qtyAchieved || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-500">
                          {report.production?.productionLoss || report.productionLoss || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              (report.production?.efficiency || report.efficiency || 0) >= 90
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }
                          >
                            {report.production?.efficiency || report.efficiency || 0}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5 text-gray-600">
                            <div>Start: {formatTime(report.timing?.mouldingTime || report.mouldingTime)}</div>
                            <div>End: {formatTime(report.timing?.unloadingTime || report.unloadingTime)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status || 'completed')}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {report.group?.name || <span className="text-gray-400 text-xs">Ungrouped</span>}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalCount > filters.limit && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                  <div className="text-sm text-gray-500">
                    Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
                    {Math.min(pagination.currentPage * filters.limit, pagination.totalCount || 0)} of{' '}
                    {pagination.totalCount || 0} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      {pagination.currentPage} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                      disabled={!pagination.hasNext || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
