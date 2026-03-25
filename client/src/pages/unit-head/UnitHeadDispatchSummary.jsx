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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Filter,
  BarChart3,
  TrendingUp,
  Package,
  Truck,
  Users,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  Eye,
  Calendar,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function UnitHeadDispatchSummary() {
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    status: 'all',
    search: ''
  });

  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (dispatch) => {
    setSelectedDispatch(dispatch);
    setIsModalOpen(true);
  };

  const {
    data: historyData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unitHeadDispatchHistory', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          queryParams.append(key, value);
        }
      });
      return await apiRequest('GET', `/api/dispatches/history?${queryParams}`);
    },
    staleTime: 30000,
    retry: 2,
    refetchOnWindowFocus: false
  });

  const reports = historyData?.data?.reports || [];
  const pagination = historyData?.data?.pagination || {};
  const summary = historyData?.data?.summary || {};

  const getStatusBadge = (status) => {
    const statusConfig = {
      'delivered': { icon: CheckCircle2, className: 'bg-green-100 text-green-800' },
      'completed': { icon: CheckCircle2, className: 'bg-green-100 text-green-800' },
      'dispatched': { icon: Truck, className: 'bg-blue-100 text-blue-800' },
      'in_transit': { icon: Truck, className: 'bg-blue-100 text-blue-800' },
      'verified': { icon: CheckCircle2, className: 'bg-teal-100 text-teal-800' },
      'approved': { icon: CheckCircle2, className: 'bg-indigo-100 text-indigo-800' },
      'updated': { icon: Activity, className: 'bg-yellow-100 text-yellow-800' },
      'pending': { icon: AlertCircle, className: 'bg-orange-100 text-orange-800' },
      'cancelled': { icon: XCircle, className: 'bg-red-100 text-red-800' }
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
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      status: 'all',
      search: ''
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-3">{error?.message || 'Failed to load dispatch history'}</p>
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
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Dispatch Summary
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track today's dispatch operations</p>
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
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalDispatches || 0}</p>
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
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Delivered</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{summary.deliveredDispatches || 0}</p>
              </div>
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">In Transit</p>
                <p className="text-2xl font-bold text-sky-600 mt-1">{summary.inTransitDispatches || 0}</p>
              </div>
              <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Value</p>
                <p className="text-lg font-bold text-purple-600 mt-1">{formatCurrency(summary.totalValue || 0)}</p>
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
                <Search className="w-3 h-3 inline mr-1" />
                Search
              </Label>
              <Input
                placeholder="DC No, Customer, Product..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="h-9"
              />
            </div>
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
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Dispatch Records
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            <Badge variant="secondary" className="ml-auto text-xs">{reports.length} records</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-gray-500">Loading dispatch records...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No dispatch records found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting the date range or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">DC ID</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Sales Person</TableHead>
                      <TableHead className="font-semibold">Quantities</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Delivery Date</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((dispatch) => (
                      <TableRow key={dispatch.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">
                          {dispatch.dcno ? (
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-mono text-sm">
                              {dispatch.dcno}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {dispatch.customer?.name ? (
                            <>
                              <p className="font-medium text-sm">{dispatch.customer.name}</p>
                              {dispatch.customer.phone && (
                                <p className="text-xs text-gray-500">{dispatch.customer.phone}</p>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <User className="w-3 h-3" />
                              Not assigned
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {dispatch.salesPerson ? (
                            <p className="text-sm font-medium">
                              {dispatch.salesPerson.fullName || dispatch.salesPerson.username}
                            </p>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <Users className="w-3 h-3" />
                              Not assigned
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            {dispatch.quantities?.totalIndent > 0 && (
                              <div><span className="text-gray-500">Indent:</span> <span className="font-medium">{dispatch.quantities.totalIndent.toFixed(2)}</span></div>
                            )}
                            {dispatch.quantities?.dispatched > 0 && (
                              <div><span className="text-gray-500">Dispatched:</span> <span className="font-medium text-green-600">{dispatch.quantities.dispatched.toFixed(2)}</span></div>
                            )}
                            {(!dispatch.quantities || (!dispatch.quantities.totalIndent && !dispatch.quantities.dispatched)) && (
                              <span className="text-gray-400">No data</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(dispatch.status || 'pending')}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDateTime(dispatch.date || dispatch.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {dispatch.deliveryDate
                            ? formatDateTime(dispatch.deliveryDate)
                            : <span className="text-gray-400">Pending</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(dispatch)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.currentPage - 1) * (pagination.limit || 20)) + 1} to{' '}
                  {Math.min((pagination.currentPage || 1) * (pagination.limit || 20), pagination.totalCount || reports.length)} of{' '}
                  {pagination.totalCount || reports.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handlePageChange((pagination.currentPage || 1) - 1)}
                    disabled={!(pagination.hasPrev || (pagination.currentPage > 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handlePageChange((pagination.currentPage || 1) + 1)}
                    disabled={!(pagination.hasNext || (pagination.currentPage < pagination.totalPages))}
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

      {/* View Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Dispatch Details
            </DialogTitle>
            <DialogDescription>Complete dispatch information</DialogDescription>
          </DialogHeader>
          {selectedDispatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">DC Number</p>
                  <p className="font-mono font-bold text-indigo-700">{selectedDispatch.dcno || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getStatusBadge(selectedDispatch.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="font-medium text-sm">{formatDateTime(selectedDispatch.date || selectedDispatch.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Delivery Date</p>
                  <p className="font-medium text-sm">
                    {selectedDispatch.deliveryDate ? formatDateTime(selectedDispatch.deliveryDate) : 'Pending'}
                  </p>
                </div>
              </div>
              {selectedDispatch.customer && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selectedDispatch.customer.name}</p></div>
                    {selectedDispatch.customer.phone && <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{selectedDispatch.customer.phone}</p></div>}
                    {selectedDispatch.customer.city && <div><p className="text-xs text-gray-500">City</p><p className="font-medium">{selectedDispatch.customer.city}</p></div>}
                  </CardContent>
                </Card>
              )}
              {selectedDispatch.product && selectedDispatch.product.name !== 'N/A' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      Product
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium text-sm">{selectedDispatch.product.name}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
