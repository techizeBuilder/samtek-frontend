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
  Download,
  FileText,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  DollarSign,
  Users,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function ProductionReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter states - default to show all data without date filtering
  const [filters, setFilters] = useState({
    startDate: '', // No default date - show all
    endDate: '', // No default date - show all
    status: 'all',
    page: 1,
    limit: 10
  });

  // Build query params
  const queryParams = new URLSearchParams({
    page: filters.page.toString(),
    limit: filters.limit.toString(),
    ...(filters.startDate && { fromDate: filters.startDate }),
    ...(filters.endDate && { toDate: filters.endDate }),
    ...(filters.status !== 'all' && { status: filters.status })
  });

  // Fetch production reports data
  const {
    data: reportsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['production-reports', filters],
    queryFn: () => apiRequest('GET', `/api/production/reports?${queryParams}`),
    staleTime: 30000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const productionData = reportsData?.data?.reports || [];
  const pagination = reportsData?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  };

  // Ensure reports is always an array
  const reports = Array.isArray(productionData) ? productionData : [];
  
  // Debug: Log the first report to see the structure
  if (reports.length > 0) {
    console.log('First report structure:', reports[0]);
    console.log('Item structure:', reports[0]?.item);
  }
  
  // Create summary from actual data
  const summary = {
    totalBatches: reports.length,
    completedBatches: reports.filter(r => r.status === 'completed').length,
    efficiency: reports.length > 0 
      ? Math.round(reports.reduce((sum, r) => sum + (parseFloat(r.production?.efficiency) || 0), 0) / reports.length)
      : 0,
    totalProduced: reports.reduce((sum, r) => sum + (parseInt(r.production?.qtyAchieved) || 0), 0),
    totalPlanned: reports.reduce((sum, r) => sum + (parseInt(r.production?.qtyPerBatch) || 0), 0),
    totalLoss: reports.reduce((sum, r) => sum + (parseInt(r.production?.productionLoss) || 0), 0),
    inProgressBatches: reports.filter(r => r.status === 'in_progress' || r.status === 'in-progress').length,
    pendingBatches: reports.filter(r => r.status === 'pending').length
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset page when other filters change
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: 'all',
      page: 1,
      limit: 20
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your production report is being prepared for download.",
    });
    // TODO: Implement actual export functionality
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status || 'Unknown'}</Badge>;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return timeStr;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (error) {
      return dateStr;
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error Loading Reports</h3>
          <p className="text-red-600 text-sm mt-1">
            {error.message}
          </p>
          <Button onClick={() => refetch()} className="mt-3 bg-red-600 hover:bg-red-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error Loading Production Reports
          </h3>
          <p className="text-gray-600 mb-4">
            {error.message || 'Failed to load production data'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Reports</h1>
          <p className="text-gray-600">View and analyze all production data history</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBatches || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary.completedBatches || 0} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.efficiency || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalProduced || 0} / {summary.totalPlanned || 0} units
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loss</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLoss || 0}</div>
            <p className="text-xs text-muted-foreground">
              Units lost in production
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.inProgressBatches || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary.pendingBatches || 0} pending start
            </p>
          </CardContent>
        </Card>
      </div> */}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="text-xs"
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                placeholder="Select start date"
              />
              {!filters.startDate && (
                <p className="text-xs text-muted-foreground mt-1">Leave empty to show all</p>
              )}
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                placeholder="Select end date"
              />
              {!filters.endDate && (
                <p className="text-xs text-muted-foreground mt-1">Leave empty to show all</p>
              )}
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
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
              <Label htmlFor="limit">Items per page</Label>
              <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Production Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production History</CardTitle>
          <p className="text-sm text-muted-foreground">
            {filters.startDate || filters.endDate ? (
              `Showing ${reports.length} of ${pagination.totalCount || 0} production records ${filters.startDate ? `from ${new Date(filters.startDate).toLocaleDateString()}` : ''} ${filters.endDate ? `to ${new Date(filters.endDate).toLocaleDateString()}` : ''}`
            ) : (
              `Showing ${reports.length} of ${pagination.totalCount || 0} total production records (all dates)`
            )}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading production data...</span>
            </div>
          ) : (!reports || reports.length === 0) ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Production Data</h3>
              <p className="text-muted-foreground">No production records found for the selected criteria.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Production Date</TableHead>
                      <TableHead>Planned Qty</TableHead>
                      <TableHead>Achieved Qty</TableHead>
                      <TableHead>Loss</TableHead>
                      <TableHead>Efficiency</TableHead>
                      <TableHead>Timing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Group</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports && reports.length > 0 ? reports.map((report, index) => (
                      <TableRow key={report.id || index}>
                        <TableCell className="font-medium">
                          {report.batchNo || `Batch ${report.batchNumber}` || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {report.item?.name || report.item?.description || 'Unknown Item'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {report.item?.category || 'No Category'} • {report.item?.unit || 'pieces'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(report.productionDate)}</TableCell>
                        <TableCell>{report.production?.qtyPerBatch || report.qtyPerBatch || 0}</TableCell>
                        <TableCell>{report.production?.qtyAchieved || report.qtyAchieved || 0}</TableCell>
                        <TableCell>{report.production?.productionLoss || report.productionLoss || 0}</TableCell>
                        <TableCell>
                          <Badge variant={(report.production?.efficiency || report.efficiency || 0) >= 90 ? "default" : "secondary"}>
                            {report.production?.efficiency || report.efficiency || 0}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Start: {formatTime(report.timing?.mouldingTime || report.mouldingTime)}</div>
                            <div>End: {formatTime(report.timing?.unloadingTime || report.unloadingTime)}</div>
                            {(report.timing?.duration || report.duration) && (
                              <div className="text-muted-foreground">
                                Duration: {report.timing?.duration || report.duration}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(report.status || 'completed')}
                        </TableCell>
                        <TableCell>
                          {report.group?.name ? (
                            <span className="text-sm">{report.group.name}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Ungrouped</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">No data available</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Enhanced Pagination */}
              {pagination.totalCount > filters.limit && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.currentPage - 1) * filters.limit) + 1} to {Math.min(pagination.currentPage * filters.limit, pagination.totalCount || 0)} of {pagination.totalCount || 0} records
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', 1)}
                      disabled={pagination.currentPage === 1 || isLoading}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else {
                          const start = Math.max(1, pagination.currentPage - 2);
                          const end = Math.min(pagination.totalPages, start + 4);
                          pageNum = start + i;
                          if (pageNum > end) return null;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => handleFilterChange('page', pageNum)}
                            disabled={isLoading}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                      disabled={!pagination.hasNext || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', pagination.totalPages)}
                      disabled={pagination.currentPage === pagination.totalPages || isLoading}
                    >
                      Last
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