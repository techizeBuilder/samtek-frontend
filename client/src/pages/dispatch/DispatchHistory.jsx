import React, { useState, useMemo } from 'react';
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
  Edit,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';

export default function DispatchHistory() {
  const { user } = useAuth();
  const { hasFeatureAccess } = usePermissions();
  const canUpdate = hasFeatureAccess('dispatches', 'dashboard', 'edit');
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

  // Expanded DC groups
  const [expandedGroups, setExpandedGroups] = useState({});

  // Modal state — selectedGroup holds an array of dispatches for the same DC No.
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    deliveryDate: '',
    qtyIssued: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Toggle expand/collapse for a DC group
  const toggleGroup = (dcno) => {
    setExpandedGroups(prev => ({ ...prev, [dcno]: !prev[dcno] }));
  };

  const handleViewDetails = (group) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
  };

  const handleUpdateClick = (group) => {
    setSelectedGroup(group);
    // Pre-fill delivery date from first item in group
    const first = group.items[0];
    setUpdateFormData({
      deliveryDate: first.deliveryDate ? new Date(first.deliveryDate).toISOString().split('T')[0] : '',
      qtyIssued: ''
    });
    setIsUpdateModalOpen(true);
  };

  // Update ALL items in the group with same deliveryDate
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // Update each dispatch item in the group
      const promises = selectedGroup.items.map(dispatch =>
        apiRequest(
          'PUT',
          `/api/dispatches/update-delivery/${dispatch.id}`,
          {
            deliveryDate: updateFormData.deliveryDate || null,
            qtyIssued: updateFormData.qtyIssued ? parseFloat(updateFormData.qtyIssued) : null
          }
        )
      );

      await Promise.all(promises);

      toast({
        title: 'Success',
        description: `DC ${selectedGroup.dcno}: All ${selectedGroup.items.length} item(s) updated successfully`,
      });
      setIsUpdateModalOpen(false);
      setUpdateFormData({ deliveryDate: '', qtyIssued: '' });
      refetch();
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
    staleTime: 30000,
    retry: 2,
    refetchOnWindowFocus: false
  });

  const reports = historyData?.data?.reports || [];
  const pagination = historyData?.data?.pagination || {};
  const summary = historyData?.data?.summary || {};

  // ─────────────────────────────────────────────────
  // GROUP reports by DC No.
  // ─────────────────────────────────────────────────
  const groupedReports = useMemo(() => {
    const map = new Map();

    reports.forEach(dispatch => {
      const key = dispatch.dcno || `__NO_DC_${dispatch.id}`;
      if (!map.has(key)) {
        map.set(key, {
          dcno: dispatch.dcno || null,
          key,
          items: [],
          // Aggregate quantities
          totalIndent: 0,
          totalAvailable: 0,
          totalDispatched: 0,
          // Take first item values for shared fields
          customer: dispatch.customer,
          salesPerson: dispatch.salesPerson,
          status: dispatch.status,
          date: dispatch.date || dispatch.createdAt,
          deliveryDate: dispatch.deliveryDate,
          verifiedBy: dispatch.verifiedBy,
          invoiceGenerated: dispatch.invoiceGenerated,
        });
      }
      const group = map.get(key);
      group.items.push(dispatch);

      // Aggregate quantities
      group.totalIndent += dispatch.quantities?.totalIndent || 0;
      group.totalAvailable += dispatch.quantities?.totalAvailable || 0;
      group.totalDispatched += dispatch.quantities?.dispatched || 0;

      // Update shared fields - use latest/first found
      if (!group.customer && dispatch.customer) group.customer = dispatch.customer;
      if (!group.salesPerson && dispatch.salesPerson) group.salesPerson = dispatch.salesPerson;
      // Use the latest delivery date
      if (dispatch.deliveryDate && (!group.deliveryDate || new Date(dispatch.deliveryDate) > new Date(group.deliveryDate))) {
        group.deliveryDate = dispatch.deliveryDate;
      }
      // invoiceGenerated - true if any item has it
      if (dispatch.invoiceGenerated) group.invoiceGenerated = true;
    });

    return Array.from(map.values());
  }, [reports]);

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
      customerId: '',
      search: ''
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

  // Download grouped invoice — one single PDF for all items in the DC group
  const handleDownloadInvoice = async (group) => {
    try {
      if (!group.dcno) {
        toast({
          title: 'No DC Number',
          description: 'Invoice can only be downloaded for dispatches with a valid DC Number.',
          variant: 'destructive'
        });
        return;
      }

      toast({ title: 'Preparing download', description: `Generating combined invoice for DC ${group.dcno}...` });

      const token = localStorage.getItem('token');

      // Single API call: POST /api/dispatches/generate-invoice-by-dc  { dcNo }
      // Returns one PDF that lists ALL items for this DC No.
      const res = await fetch('/api/dispatches/generate-invoice-by-dc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/pdf',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ dcNo: group.dcno })
      });

      if (!res.ok) {
        let errMsg = `${res.status} ${res.statusText}`;
        try {
          const json = await res.json();
          errMsg = json.message || JSON.stringify(json);
        } catch (e) {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-DC-${group.dcno}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        description: `Combined invoice for DC ${group.dcno} (${group.items.length} items) is downloading`
      });
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to download invoice', variant: 'destructive' });
      console.error('Invoice download error:', error);
    }
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
            <p className="text-gray-600">Track and analyze dispatch operations — grouped by DC No.</p>
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
                  <p className="text-sm font-medium text-gray-600">DC Groups</p>
                  <p className="text-2xl font-bold text-indigo-600">{groupedReports.length}</p>
                </div>
                <Layers className="h-8 w-8 text-indigo-500" />
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

        {/* Dispatch History Table — Grouped by DC No. */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dispatch History
                <Badge variant="outline" className="ml-2 text-indigo-700 border-indigo-300">
                  Grouped by DC No.
                </Badge>
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
            ) : groupedReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No dispatch records found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters or check if any dispatches have been created</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-50">
                      <TableHead className="w-8"></TableHead>
                      <TableHead>DC No.</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Quantities</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedReports.map((group) => {
                      const isExpanded = !!expandedGroups[group.key];
                      return (
                        <React.Fragment key={group.key}>
                          {/* ── DC Group Header Row ── */}
                          <TableRow
                            className="hover:bg-indigo-50 cursor-pointer bg-white border-l-4 border-l-indigo-400"
                            onClick={() => toggleGroup(group.key)}
                          >
                            {/* Expand toggle */}
                            <TableCell className="p-2">
                              <button
                                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                                onClick={(e) => { e.stopPropagation(); toggleGroup(group.key); }}
                              >
                                {isExpanded
                                  ? <ChevronUp className="w-4 h-4" />
                                  : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </TableCell>

                            {/* DC No. */}
                            <TableCell className="font-medium">
                              {group.dcno ? (
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-mono text-sm font-bold">
                                  {group.dcno}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">Not assigned</span>
                              )}
                            </TableCell>

                            {/* Customer */}
                            <TableCell>
                              <div>
                                {group.customer?.name ? (
                                  <>
                                    <p className="font-medium">{group.customer.name}</p>
                                    {group.customer.phone && (
                                      <p className="text-sm text-gray-500">{group.customer.phone}</p>
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

                            {/* Sales Person */}
                            <TableCell>
                              <div>
                                {group.salesPerson ? (
                                  <>
                                    <p className="font-medium">{group.salesPerson.fullName || group.salesPerson.username}</p>
                                    {group.salesPerson.username && group.salesPerson.fullName && (
                                      <p className="text-sm text-gray-500">@{group.salesPerson.username}</p>
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

                            {/* Items count */}
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Package className="w-3 h-3 mr-1" />
                                {group.items.length} item{group.items.length > 1 ? 's' : ''}
                              </Badge>
                            </TableCell>

                            {/* Aggregated quantities */}
                            <TableCell>
                              <div className="space-y-1">
                                {group.totalIndent > 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Indent:</span>
                                    <span className="ml-1 font-medium">{group.totalIndent.toFixed(2)}</span>
                                  </div>
                                )}
                                {group.totalAvailable > 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Available:</span>
                                    <span className="ml-1 font-medium text-blue-600">{group.totalAvailable.toFixed(2)}</span>
                                  </div>
                                )}
                                {group.totalDispatched > 0 && (
                                  <div className="text-xs">
                                    <span className="text-gray-500">Dispatched:</span>
                                    <span className="ml-1 font-medium text-green-600">{group.totalDispatched.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <div className="space-y-1">
                                {getStatusBadge(group.status || 'pending')}
                                {group.verifiedBy && (
                                  <div className="text-xs text-gray-500 mt-1">✓ Verified</div>
                                )}
                                {group.invoiceGenerated && (
                                  <div className="text-xs text-green-600 mt-1">📄 Invoice Generated</div>
                                )}
                              </div>
                            </TableCell>

                            {/* Date */}
                            <TableCell>{formatDateTime(group.date)}</TableCell>

                            {/* Delivery Date */}
                            <TableCell>
                              {group.deliveryDate ? formatDateTime(group.deliveryDate) : (
                                <span className="text-gray-400">Pending</span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(group)}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadInvoice(group)}
                                  className="flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Invoice
                                </Button>
                                {canUpdate && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdateClick(group)}
                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Edit className="w-3 h-3" />
                                    Update
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* ── Expanded Sub-rows: individual items in the group ── */}
                          {isExpanded && group.items.map((dispatch, idx) => (
                            <TableRow
                              key={dispatch.id}
                              className="bg-slate-50 hover:bg-slate-100 border-l-4 border-l-slate-200"
                            >
                              <TableCell></TableCell>
                              {/* DC No. (same, greyed out) */}
                              <TableCell>
                                <span className="text-xs text-gray-400 font-mono pl-4">└ Item {idx + 1}</span>
                              </TableCell>
                              {/* Product name */}
                              <TableCell colSpan={2}>
                                <div className="flex items-center gap-2">
                                  <Package className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                  <span className="text-sm font-medium">
                                    {dispatch.product?.name && dispatch.product.name !== 'N/A'
                                      ? dispatch.product.name
                                      : dispatch.packingSheet?.productGroup || 'N/A'}
                                  </span>
                                  {dispatch.batchNo && (
                                    <Badge variant="outline" className="text-xs text-gray-500">
                                      {dispatch.batchNo}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              {/* Empty items cell */}
                              <TableCell></TableCell>
                              {/* Per-item quantities */}
                              <TableCell>
                                <div className="space-y-0.5">
                                  {dispatch.quantities?.totalIndent > 0 && (
                                    <div className="text-xs">
                                      <span className="text-gray-400">Indent:</span>
                                      <span className="ml-1">{dispatch.quantities.totalIndent.toFixed(2)}</span>
                                    </div>
                                  )}
                                  {dispatch.quantities?.dispatched > 0 && (
                                    <div className="text-xs">
                                      <span className="text-gray-400">Dispatched:</span>
                                      <span className="ml-1 text-green-600">{dispatch.quantities.dispatched.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              {/* Status per item */}
                              <TableCell>{getStatusBadge(dispatch.status || 'pending')}</TableCell>
                              {/* Date */}
                              <TableCell className="text-xs text-gray-500">{formatDateTime(dispatch.date || dispatch.createdAt)}</TableCell>
                              {/* Delivery Date */}
                              <TableCell className="text-xs text-gray-500">
                                {dispatch.deliveryDate ? formatDateTime(dispatch.deliveryDate) : <span className="text-gray-300">—</span>}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * (pagination.limit || 20)) + 1} to{' '}
                    {Math.min((pagination.currentPage || 1) * (pagination.limit || 20), pagination.totalCount || reports.length)} of{' '}
                    {pagination.totalCount || reports.length} entries ({groupedReports.length} DC groups)
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

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* View Details Modal — shows ALL items in the DC group           */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Dispatch Details
              {selectedGroup?.dcno && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-mono text-lg">
                  DC: {selectedGroup.dcno}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete information for DC group — {selectedGroup?.items?.length || 0} item(s)
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6">
              {/* DC Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">DC Number</p>
                  <p className="font-mono font-bold text-indigo-700 text-lg">
                    {selectedGroup.dcno || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getStatusBadge(selectedGroup.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="font-medium text-sm">{formatDateTime(selectedGroup.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Items</p>
                  <p className="font-bold text-blue-700">{selectedGroup.items.length}</p>
                </div>
              </div>

              {/* Customer Information */}
              {selectedGroup.customer && (
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
                        <p className="font-medium">{selectedGroup.customer.name}</p>
                      </div>
                      {selectedGroup.customer.phone && (
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="font-medium">{selectedGroup.customer.phone}</p>
                        </div>
                      )}
                      {selectedGroup.customer.email && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="font-medium text-sm">{selectedGroup.customer.email}</p>
                        </div>
                      )}
                      {selectedGroup.customer.city && (
                        <div>
                          <p className="text-xs text-gray-500">City</p>
                          <p className="font-medium">{selectedGroup.customer.city}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sales Person */}
              {selectedGroup.salesPerson && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-600" />
                      Sales Person
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {selectedGroup.salesPerson.fullName || selectedGroup.salesPerson.username}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* All Items Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" />
                    All Items in DC {selectedGroup.dcno}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Batch No.</TableHead>
                        <TableHead>Indent Qty</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Dispatched</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedGroup.items.map((dispatch, idx) => (
                        <TableRow key={dispatch.id}>
                          <TableCell className="text-gray-500 text-sm">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              <span className="font-medium text-sm">
                                {dispatch.product?.name && dispatch.product.name !== 'N/A'
                                  ? dispatch.product.name
                                  : dispatch.packingSheet?.productGroup || 'N/A'}
                              </span>
                            </div>
                            {dispatch.product?.category && (
                              <Badge className="mt-1 bg-blue-50 text-blue-700 text-xs">{dispatch.product.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-gray-600">{dispatch.batchNo || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{dispatch.quantities?.totalIndent?.toFixed(2) || '0.00'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-blue-600 font-medium">{dispatch.quantities?.totalAvailable?.toFixed(2) || '0.00'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-green-600 font-medium">{dispatch.quantities?.dispatched?.toFixed(2) || '0.00'}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(dispatch.status || 'pending')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Totals Row */}
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-gray-500">Total Indent</p>
                      <p className="font-bold text-indigo-700">{selectedGroup.totalIndent.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Available</p>
                      <p className="font-bold text-blue-700">{selectedGroup.totalAvailable.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Dispatched</p>
                      <p className="font-bold text-green-700">{selectedGroup.totalDispatched.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery & Verification */}
              {(selectedGroup.deliveryDate || selectedGroup.verifiedBy) && (
                <div className="border-t pt-4 text-sm text-gray-500 space-y-1">
                  {selectedGroup.deliveryDate && (
                    <p>📅 Delivery Date: <span className="font-medium text-gray-700">{formatDateTime(selectedGroup.deliveryDate)}</span></p>
                  )}
                  {selectedGroup.verifiedBy && (
                    <p>✓ Verified by: <span className="font-medium">{selectedGroup.verifiedBy}</span></p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* Update Delivery Modal — updates ALL items in the DC group      */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Update DC Group
            </DialogTitle>
            <DialogDescription>
              Update delivery date for all items in DC{' '}
              <span className="font-mono font-bold text-indigo-700">{selectedGroup?.dcno || 'N/A'}</span>
              {' '}({selectedGroup?.items?.length || 0} item{selectedGroup?.items?.length !== 1 ? 's' : ''})
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              {/* DC Number Info */}
              <div className="p-3 bg-indigo-50 rounded-lg">
                <p className="text-xs text-gray-500">DC Number</p>
                <p className="font-mono font-bold text-indigo-700 text-lg">
                  {selectedGroup.dcno || 'Not assigned'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This update will apply to all {selectedGroup.items.length} item(s) in this DC group.
                </p>
              </div>

              {/* Items summary */}
              <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
                {selectedGroup.items.map((dispatch, idx) => (
                  <div key={dispatch.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3 text-purple-500 flex-shrink-0" />
                      <span className="font-medium">
                        {dispatch.product?.name && dispatch.product.name !== 'N/A'
                          ? dispatch.product.name
                          : dispatch.packingSheet?.productGroup || `Item ${idx + 1}`}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">{dispatch.quantities?.dispatched?.toFixed(2) || '0'} dispatched</span>
                  </div>
                ))}
              </div>

              {/* Delivery Date */}
              <div>
                <Label htmlFor="deliveryDate">Delivery Date (applies to all items)</Label>
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
                <Label htmlFor="qtyIssued">Quantity Issued (per item)</Label>
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
                  Leave blank to keep existing quantity for each item.
                </p>
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
                      Updating {selectedGroup.items.length} item(s)…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Update All ({selectedGroup.items.length})
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