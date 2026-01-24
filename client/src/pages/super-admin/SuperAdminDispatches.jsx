import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  Package,
  Truck,
  Calendar,
  Building,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

const SuperAdminDispatches = () => {
  const { toast } = useToast();
  const [dispatches, setDispatches] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDispatches, setTotalDispatches] = useState(0);
  const [limit, setLimit] = useState(10);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    companyId: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    fetchDispatches();
    fetchCompanies();
  }, [currentPage, limit, filters]);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      console.log('🚚 Fetching super admin dispatches...');
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v && v !== 'all')
        )
      });

      const response = await fetch(`/api/super-admin/dispatches?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Dispatches response:', result);
      
      if (result.success) {
        setDispatches(result.data.dispatches || []);
        setStatistics(result.data.statistics || {});
        setCurrentPage(result.data.pagination.currentPage);
        setTotalPages(result.data.pagination.totalPages);
        setTotalDispatches(result.data.pagination.totalDispatches);
      }
    } catch (error) {
      console.error('❌ Error fetching dispatches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispatches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/super-admin/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setCompanies(result.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching companies:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      companyId: 'all',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  const handleViewDispatch = async (dispatchId) => {
    try {
      const response = await fetch(`/api/super-admin/dispatches/${dispatchId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedDispatch(result.data.dispatch);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      console.error('❌ Error fetching dispatch details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispatch details",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      dispatched: { color: 'bg-blue-100 text-blue-800', label: 'Dispatched' },
      delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  if (loading && dispatches.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading dispatches...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-8xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dispatch Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all dispatch records across companies</p>
        </div>
        <Button onClick={fetchDispatches} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="h-4 w-4 mr-2 text-blue-500" />
              Total Dispatches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalDispatches || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Truck className="h-4 w-4 mr-2 text-green-500" />
              Total Packed Qty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalPackedQty || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <RotateCcw className="h-4 w-4 mr-2 text-orange-500" />
              Return Qty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalReturnQty || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="h-4 w-4 mr-2 text-purple-500" />
              Available Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalAvailableStock || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search dispatches..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.companyId} onValueChange={(value) => handleFilterChange('companyId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company._id} value={company._id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dispatches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dispatch Records</span>
            <div className="text-sm text-gray-500">
              {totalDispatches} total dispatches
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Group</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Batch No</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Packed Qty</TableHead>
                  <TableHead>Available Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No dispatches found
                    </TableCell>
                  </TableRow>
                ) : (
                  dispatches.map((dispatch) => (
                    <TableRow key={dispatch._id}>
                      <TableCell className="font-medium">
                        {dispatch.productGroup || 'N/A'}
                      </TableCell>
                      <TableCell>{dispatch.productName || 'N/A'}</TableCell>
                      <TableCell>{dispatch.batchNo || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dispatch.company?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{dispatch.company?.city}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {dispatch.date 
                          ? new Date(dispatch.date).toLocaleDateString() 
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {dispatch.packedQuantityReadyForDispatch || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {dispatch.totalAvailableStock || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(dispatch.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDispatch(dispatch._id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalDispatches)} of {totalDispatches} dispatches
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dispatch Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispatch Details</DialogTitle>
            <DialogDescription>
              View detailed information about this dispatch record
            </DialogDescription>
          </DialogHeader>
          
          {selectedDispatch && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Package className="h-5 w-5 mr-2" />
                      Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Order Code:</span>
                      <p className="font-medium">{selectedDispatch.orderCode || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Batch No:</span>
                      <p className="font-medium">{selectedDispatch.batchNo || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <div className="mt-1">{getStatusBadge(selectedDispatch.status)}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Dispatch Date:</span>
                      <p className="font-medium">
                        {selectedDispatch.dispatchDate 
                          ? new Date(selectedDispatch.dispatchDate).toLocaleDateString() 
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Building className="h-5 w-5 mr-2" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Company Name:</span>
                      <p className="font-medium">{selectedDispatch.companyId?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">City:</span>
                      <p className="font-medium">{selectedDispatch.companyId?.city || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">State:</span>
                      <p className="font-medium">{selectedDispatch.companyId?.state || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <p className="font-medium">{selectedDispatch.companyId?.phone || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Customer Name:</span>
                      <p className="font-medium">{selectedDispatch.customerId?.name || selectedDispatch.customerName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Contact Person:</span>
                      <p className="font-medium">{selectedDispatch.customerId?.contactPerson || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <p className="font-medium flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {selectedDispatch.customerId?.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <p className="font-medium">{selectedDispatch.customerId?.email || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Quantity Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Packed Quantity:</span>
                      <p className="font-medium text-blue-600">{selectedDispatch.packedQty || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Return Quantity:</span>
                      <p className="font-medium text-orange-600">{selectedDispatch.returnQuantityYesterdayReturns || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Available Stock:</span>
                      <p className="font-medium text-green-600">{selectedDispatch.totalAvailableStock || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Previous Closing:</span>
                      <p className="font-medium">{selectedDispatch.previousClosing || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sales Person Information */}
              {selectedDispatch.salesPersonId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Sales Person Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Full Name:</span>
                        <p className="font-medium">{selectedDispatch.salesPersonId.fullName || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Username:</span>
                        <p className="font-medium">{selectedDispatch.salesPersonId.username || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Email:</span>
                        <p className="font-medium">{selectedDispatch.salesPersonId.email || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDispatches;