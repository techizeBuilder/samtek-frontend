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
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function PackingHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    startDate: '',
    endDate: '',
    status: 'all',
    groupId: ''
  });

  // Fetch packing history data
  const {
    data: historyData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['packingHistory', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await apiRequest('GET', `/api/packing/history?${queryParams}`);
      return response;
    },
    staleTime: 30000, // 30 seconds
    retry: 2,
    refetchOnWindowFocus: false
  });

  const reports = historyData?.data?.reports || [];
  const pagination = historyData?.data?.pagination || {};
  const summary = historyData?.data?.summary || {};

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      'completed': { 
        variant: 'default', 
        icon: CheckCircle2, 
        className: 'bg-green-100 text-green-800 hover:bg-green-200' 
      },
      'in_progress': { 
        variant: 'secondary', 
        icon: PlayCircle, 
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
      },
      'approved': { 
        variant: 'outline', 
        icon: Shield, 
        className: 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
      },
      'pending': { 
        variant: 'destructive', 
        icon: AlertCircle, 
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
      }
    };

    const config = statusConfig[status] || statusConfig['pending'];
    const IconComponent = config.icon;

    return (
      <Badge className={config.className}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status?.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      startDate: '',
      endDate: '',
      status: 'all',
      groupId: ''
    });
  };

  // Export functionality
  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Packing history export is being prepared...",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Packing History</h2>
            <p className="text-gray-600 mb-4">{error?.message || 'An error occurred'}</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Packing History</h1>
            <p className="text-gray-600">Track and analyze packing operations performance</p>
          </div>

        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sheets</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalSheets || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{summary.completedSheets || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.inProgressSheets || 0}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.approvedSheets || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  type="date"
                  id="startDate"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Packing History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Packing History
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Loading packing history...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No packing history found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sheet ID</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Items Count</TableHead>
                      <TableHead>Total Packed</TableHead>
                      <TableHead>Total Loss</TableHead>
                      <TableHead>Efficiency</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((sheet) => (
                      <TableRow key={sheet.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {sheet.sheetId || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sheet.group?.name || 'N/A'}</p>
                            {sheet.group?.description && (
                              <p className="text-sm text-gray-500">{sheet.group.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sheet.items?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-green-600" />
                            <span className="font-medium">{sheet.totalPacked || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-red-600">{sheet.totalLoss || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(sheet.efficiency || 0, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{sheet.efficiency || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-500" />
                            {formatDuration(sheet.timing?.totalDuration)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(sheet.status)}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(sheet.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                    {pagination.totalCount} entries
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-sm">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}