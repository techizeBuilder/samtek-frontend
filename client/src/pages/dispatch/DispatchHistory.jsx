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
  Download,
  FileText,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
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
  X,
  Edit
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function DispatchHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter states
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    startDate: '',
    endDate: '',
    status: 'all',
    vehicleId: '',
    customerId: '',
    search: ''
  });

  // Modal state
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    deliveryDate: '',
    qtyIssued: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleViewDetails = (dispatch) => {
    setSelectedDispatch(dispatch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDispatch(null);
  };

  const handleUpdateClick = (dispatch) => {
    setSelectedDispatch(dispatch);
    setUpdateFormData({
      deliveryDate: dispatch.deliveryDate ? new Date(dispatch.deliveryDate).toISOString().split('T')[0] : '',
      qtyIssued: dispatch.qtyIssued || ''
    });
    setIsUpdateModalOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await apiRequest(
        'PUT',
        `/api/dispatches/update-delivery/${selectedDispatch.id}`,
        {
          deliveryDate: updateFormData.deliveryDate || null,
          qtyIssued: updateFormData.qtyIssued ? parseFloat(updateFormData.qtyIssued) : null
        }
      );

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Dispatch updated successfully',
        });
        setIsUpdateModalOpen(false);
        setUpdateFormData({ deliveryDate: '', qtyIssued: '' });
        refetch();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update dispatch',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch dispatch history data
  const {
    data: historyData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dispatchHistory', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          queryParams.append(key, value);
        }
      });
      const response = await apiRequest('GET', `/api/dispatches/history?${queryParams}`);
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
      'delivered': { 
        variant: 'default', 
        icon: CheckCircle2, 
        className: 'bg-green-100 text-green-800 hover:bg-green-200' 
      },
      'completed': { 
        variant: 'default', 
        icon: CheckCircle2, 
        className: 'bg-green-100 text-green-800 hover:bg-green-200' 
      },
      'dispatched': { 
        variant: 'default', 
        icon: Truck, 
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
      },
      'in_transit': { 
        variant: 'secondary', 
        icon: Truck, 
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
      },
      'verified': { 
        variant: 'secondary', 
        icon: CheckCircle2, 
        className: 'bg-teal-100 text-teal-800 hover:bg-teal-200' 
      },
      'approved': { 
        variant: 'secondary', 
        icon: CheckCircle2, 
        className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' 
      },
      'updated': { 
        variant: 'secondary', 
        icon: Activity, 
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
      },
      'pending': { 
        variant: 'destructive', 
        icon: AlertCircle, 
        className: 'bg-orange-100 text-orange-800 hover:bg-orange-200' 
      },
      'cancelled': { 
        variant: 'outline', 
        icon: XCircle, 
        className: 'bg-red-100 text-red-800 hover:bg-red-200' 
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
      vehicleId: '',
      customerId: ''
    });
  };

  // Export functionality
  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Dispatch history export is being prepared...",
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

  const formatCurrency = (amount) => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Dispatch History</h2>
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
            <h1 className="text-3xl font-bold text-gray-900">Dispatch History</h1>
            <p className="text-gray-600">Track and analyze dispatch operations performance</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Dispatches</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalDispatches || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{summary.deliveredDispatches || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Transit</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.inTransitDispatches || 0}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalValue || 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  type="text"
                  id="search"
                  placeholder="Search by DC No, Customer, Product..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
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
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch History Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dispatch History
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
                <span className="ml-2">Loading dispatch history...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No dispatch records found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters or check if any dispatches have been created</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DC ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Quantities & Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((dispatch) => (
                      <TableRow key={dispatch.id} className="hover:bg-gray-50">
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
                          <div>
                            {dispatch.customer?.name ? (
                              <>
                                <p className="font-medium">{dispatch.customer.name}</p>
                                {dispatch.customer.phone && (
                                  <p className="text-sm text-gray-500">{dispatch.customer.phone}</p>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-400">
                                <User className="w-4 h-4" />
                                <span>Not assigned</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                       
                        <TableCell>
                          <div>
                            {dispatch.salesPerson ? (
                              <>
                                <p className="font-medium">{dispatch.salesPerson.fullName || dispatch.salesPerson.username}</p>
                                {dispatch.salesPerson.username && dispatch.salesPerson.fullName && (
                                  <p className="text-sm text-gray-500">@{dispatch.salesPerson.username}</p>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-400">
                                <Users className="w-4 h-4" />
                                <span>Not assigned</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {dispatch.quantities && (
                              <>
                                {dispatch.quantities.totalIndent > 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Indent:</span>
                                    <span className="ml-1 font-medium">{dispatch.quantities.totalIndent.toFixed(2)}</span>
                                  </div>
                                )}
                                {dispatch.quantities.totalAvailable > 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Available:</span>
                                    <span className="ml-1 font-medium text-blue-600">{dispatch.quantities.totalAvailable.toFixed(2)}</span>
                                  </div>
                                )}
                                {dispatch.quantities.dispatched > 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Dispatched:</span>
                                    <span className="ml-1 font-medium text-green-600">{dispatch.quantities.dispatched.toFixed(2)}</span>
                                  </div>
                                )}
                                {dispatch.calculations?.excessShortage !== undefined && dispatch.calculations.excessShortage !== 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">{dispatch.calculations.excessShortage < 0 ? 'Shortage:' : 'Excess:'}</span>
                                    <span className={`ml-1 font-medium ${dispatch.calculations.excessShortage < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {Math.abs(dispatch.calculations.excessShortage).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {dispatch.calculations?.overallLoss !== undefined && dispatch.calculations.overallLoss !== 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Loss:</span>
                                    <span className="ml-1 font-medium text-orange-600">{Math.abs(dispatch.calculations.overallLoss).toFixed(2)}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {(!dispatch.quantities || 
                              (dispatch.quantities.totalIndent === 0 && 
                               dispatch.quantities.totalAvailable === 0 && 
                               dispatch.quantities.dispatched === 0)) && (
                              <span className="text-xs text-gray-400">No quantity data</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(dispatch.status || 'pending')}
                            {dispatch.verifiedBy && (
                              <div className="text-xs text-gray-500 mt-1">
                                ✓ Verified
                              </div>
                            )}
                            {dispatch.invoiceGenerated && (
                              <div className="text-xs text-green-600 mt-1">
                                📄 Invoice Generated
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDateTime(dispatch.date || dispatch.createdAt)}
                        </TableCell>
                        <TableCell>
                          {dispatch.deliveryDate ? formatDateTime(dispatch.deliveryDate) : (
                            <span className="text-gray-400">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(dispatch)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUpdateClick(dispatch)}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                            >
                              <Edit className="w-3 h-3" />
                              Update
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * (pagination.limit || 20)) + 1} to{' '}
                    {Math.min((pagination.currentPage || 1) * (pagination.limit || 20), pagination.totalCount || reports.length)} of{' '}
                    {pagination.totalCount || reports.length} entries
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((pagination.currentPage || 1) - 1)}
                      disabled={!(pagination.hasPrev || (pagination.currentPage > 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-sm">
                        Page {pagination.currentPage || 1} of {pagination.totalPages || 1}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
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
      </div>

      {/* Product Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Dispatch Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this dispatch entry
            </DialogDescription>
          </DialogHeader>

          {selectedDispatch && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">DC Number</p>
                  <p className="font-mono font-bold text-indigo-700">
                    {selectedDispatch.dcno || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getStatusBadge(selectedDispatch.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="font-medium">{formatDateTime(selectedDispatch.date || selectedDispatch.createdAt)}</p>
                </div>
                {selectedDispatch.batchNo && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Batch No</p>
                    <p className="font-mono text-sm">{selectedDispatch.batchNo}</p>
                  </div>
                )}
                {selectedDispatch.vehicleNumber && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Vehicle Number</p>
                    <p className="font-medium">{selectedDispatch.vehicleNumber}</p>
                  </div>
                )}
                {selectedDispatch.transporterName && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Transporter</p>
                    <p className="font-medium">{selectedDispatch.transporterName}</p>
                  </div>
                )}
              </div>

              {/* Customer Information */}
              {selectedDispatch.customer && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="font-medium">{selectedDispatch.customer.name}</p>
                      </div>
                      {selectedDispatch.customer.phone && (
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="font-medium">{selectedDispatch.customer.phone}</p>
                        </div>
                      )}
                      {selectedDispatch.customer.email && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="font-medium text-sm">{selectedDispatch.customer.email}</p>
                        </div>
                      )}
                      {selectedDispatch.customer.city && (
                        <div>
                          <p className="text-xs text-gray-500">City</p>
                          <p className="font-medium">{selectedDispatch.customer.city}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sales Person Information */}
              {selectedDispatch.salesPerson && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-600" />
                      Sales Person
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {selectedDispatch.salesPerson.fullName || selectedDispatch.salesPerson.username}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Product Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Product Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDispatch.product && selectedDispatch.product.name !== 'N/A' ? (
                      <>
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Products</p>
                          {(() => {
                            // Split products if they're concatenated
                            const productName = selectedDispatch.product.name;
                            const products = productName.includes('), ') 
                              ? productName.split('), ').map((p, i, arr) => i < arr.length - 1 ? p + ')' : p)
                              : [productName];
                            
                            return (
                              <div className="space-y-2">
                                {products.map((product, index) => (
                                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                                    <Package className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm font-medium">{product.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                          {selectedDispatch.product.code && (
                            <div>
                              <p className="text-xs text-gray-500">Product Code</p>
                              <p className="font-mono text-sm">{selectedDispatch.product.code}</p>
                            </div>
                          )}
                          {selectedDispatch.product.category && (
                            <div>
                              <p className="text-xs text-gray-500">Category</p>
                              <Badge className="bg-blue-100 text-blue-800">
                                {selectedDispatch.product.category}
                              </Badge>
                            </div>
                          )}
                          {selectedDispatch.product.unit && (
                            <div>
                              <p className="text-xs text-gray-500">Unit</p>
                              <p className="font-medium">{selectedDispatch.product.unit}</p>
                            </div>
                          )}
                        </div>
                        {selectedDispatch.packingSheet?.productGroup && 
                         selectedDispatch.packingSheet.productGroup !== 'N/A' && 
                         selectedDispatch.packingSheet.productGroup !== 'Ungrouped Items' && (
                          <div>
                            <p className="text-xs text-gray-500">Product Group</p>
                            <Badge className="bg-purple-100 text-purple-800">
                              📦 {selectedDispatch.packingSheet.productGroup}
                            </Badge>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400">No product information available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quantity Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    Quantity Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedDispatch.quantities?.packedQty !== undefined && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Packed Quantity</p>
                        <p className="text-xl font-bold text-blue-700">
                          {selectedDispatch.quantities.packedQty.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {selectedDispatch.quantities?.totalIndent !== undefined && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Total Indent</p>
                        <p className="text-xl font-bold text-purple-700">
                          {selectedDispatch.quantities.totalIndent.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {selectedDispatch.quantities?.totalAvailable !== undefined && (
                      <div className="p-3 bg-teal-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Total Available</p>
                        <p className="text-xl font-bold text-teal-700">
                          {selectedDispatch.quantities.totalAvailable.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {selectedDispatch.quantities?.dispatched !== undefined && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Dispatched</p>
                        <p className="text-xl font-bold text-green-700">
                          {selectedDispatch.quantities.dispatched.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {selectedDispatch.quantities?.closingStock !== undefined && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Closing Stock</p>
                        <p className="text-xl font-bold text-gray-700">
                          {selectedDispatch.quantities.closingStock.toFixed(2)}
                        </p>
                      </div>
                    )}
                    {selectedDispatch.quantities?.previousClosing !== undefined && (
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Previous Closing</p>
                        <p className="text-xl font-bold text-amber-700">
                          {selectedDispatch.quantities.previousClosing.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Loss & Shortage Details */}
              {(selectedDispatch.calculations?.excessShortage !== undefined || 
                selectedDispatch.calculations?.overallLoss !== undefined) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-red-600" />
                      Loss & Shortage Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedDispatch.calculations?.excessShortage !== undefined && (
                        <div className={`p-4 rounded-lg ${
                          selectedDispatch.calculations.excessShortage < 0 
                            ? 'bg-red-50' 
                            : 'bg-green-50'
                        }`}>
                          <p className="text-xs text-gray-600 mb-1">
                            {selectedDispatch.calculations.excessShortage < 0 ? 'Shortage' : 'Excess'}
                          </p>
                          <p className={`text-2xl font-bold ${
                            selectedDispatch.calculations.excessShortage < 0 
                              ? 'text-red-700' 
                              : 'text-green-700'
                          }`}>
                            {Math.abs(selectedDispatch.calculations.excessShortage).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {selectedDispatch.calculations?.overallLoss !== undefined && (
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Overall Loss</p>
                          <p className="text-2xl font-bold text-orange-700">
                            {Math.abs(selectedDispatch.calculations.overallLoss).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Remarks */}
              {selectedDispatch.remarks && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      Remarks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedDispatch.remarks}</p>
                  </CardContent>
                </Card>
              )}

              {/* Verification Info */}
              {(selectedDispatch.verifiedBy || selectedDispatch.lastUpdatedBy) && (
                <div className="border-t pt-4 text-sm text-gray-500">
                  {selectedDispatch.verifiedBy && (
                    <p>✓ Verified by: <span className="font-medium">{selectedDispatch.verifiedBy}</span></p>
                  )}
                  {selectedDispatch.lastUpdatedBy && (
                    <p>Last updated by: <span className="font-medium">{selectedDispatch.lastUpdatedBy}</span></p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Delivery Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Update Dispatch
            </DialogTitle>
            <DialogDescription>
              Update delivery date and quantity issued for this dispatch
            </DialogDescription>
          </DialogHeader>

          {selectedDispatch && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              {/* DC Number Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">DC Number</p>
                <p className="font-mono font-bold text-indigo-700">
                  {selectedDispatch.dcno || 'Not assigned'}
                </p>
              </div>

              {/* Delivery Date */}
              <div>
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  type="date"
                  id="deliveryDate"
                  value={updateFormData.deliveryDate}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Qty Issued */}
              <div>
                <Label htmlFor="qtyIssued">Quantity Issued</Label>
                <Input
                  type="number"
                  id="qtyIssued"
                  step="0.01"
                  placeholder="Enter quantity issued"
                  value={updateFormData.qtyIssued}
                  onChange={(e) => setUpdateFormData(prev => ({ ...prev, qtyIssued: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {selectedDispatch.qtyIssued?.toFixed(2) || '0.00'}
                </p>
              </div>

              {/* Current Values Display */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600">Current Delivery Date</p>
                  <p className="text-sm font-medium">
                    {selectedDispatch.deliveryDate 
                      ? new Date(selectedDispatch.deliveryDate).toLocaleDateString() 
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Packed Qty</p>
                  <p className="text-sm font-medium">
                    {selectedDispatch.quantities?.packedQty?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setUpdateFormData({ deliveryDate: '', qtyIssued: '' });
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Update
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}