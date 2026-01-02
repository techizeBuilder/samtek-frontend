import { useLocation } from 'wouter';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  ShoppingCart,
  Package,
  Eye,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { showSmartToast } from '@/lib/toast-utils';
import { toast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { getCutoffTime, setCutoffTime, toggleCutoffTime } from '@/services/api';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'totalOrders', label: 'Total Orders' }
];

const initialFormData = {
  username: '',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: ''
};

export default function UnitHeadSales() {
  const [, setLocation] = useLocation();
  const [selectedSalesPerson, setSelectedSalesPerson] = useState(null);
  const [isOrdersDetailOpen, setIsOrdersDetailOpen] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  
  // CRUD Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  
  // Cutoff Time Modal State
  const [isCutoffModalOpen, setIsCutoffModalOpen] = useState(false);
  const [cutoffFormData, setCutoffFormData] = useState({
    cutoffTime: '',
    description: ''
  });
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Hooks
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  // Check permissions
  const canView = hasPermission('sales', 'view');
  const canAdd = hasPermission('sales', 'add');
  const canEdit = hasPermission('sales', 'edit');
  const canDelete = hasPermission('sales', 'delete');

  // Query for sales persons list
  const { data: salesPersonsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/unit-head/sales-persons', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      return apiRequest('GET', `/api/unit-head/sales-persons?${params.toString()}`);
    },
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error) => {
      showSmartToast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to fetch sales persons: ${error.message}`
      });
    }
  });

  // Query for specific sales person orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['/unit-head/sales-persons', selectedSalesPerson, 'orders', ordersPage],
    queryFn: () => apiRequest('GET', `/api/unit-head/sales-persons/${selectedSalesPerson}/orders?page=${ordersPage}&limit=10`),
    enabled: !!selectedSalesPerson,
    retry: 1
  });

  const salesPersons = salesPersonsData?.data?.salesPersons || [];
  const pagination = salesPersonsData?.data?.pagination || {};
  const summary = salesPersonsData?.data?.summary || {};
  const orders = ordersData?.data?.orders || [];
  const ordersStats = ordersData?.data?.statistics || {};

  // Calculate statistics from orders data as fallback
  const calculatedStats = React.useMemo(() => {
    if (!orders.length) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        successRate: 0
      };
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const approvedOrders = orders.filter(order => 
      ['approved', 'completed', 'in_production'].includes(order.status)
    ).length;
    const successRate = totalOrders > 0 ? Math.round((approvedOrders / totalOrders) * 100) : 0;

    return {
      totalOrders,
      totalRevenue,
      successRate
    };
  }, [orders]);

  // Use backend stats if available, otherwise use calculated stats
  const displayStats = {
    totalOrders: ordersStats.totalOrders ?? calculatedStats.totalOrders,
    totalRevenue: ordersStats.totalRevenue ?? calculatedStats.totalRevenue,
    successRate: ordersStats.successRate ?? calculatedStats.successRate
  };

  // CRUD Mutations
  const createMutation = useMutation({
    mutationFn: (data) => {
      console.log('Creating sales person with data:', data);
      return apiRequest('POST', '/api/unit-head/sales-persons', data);
    },
    onSuccess: (response) => {
      console.log('Create mutation success response:', response);
      // Handle successful response - check if response has success: true
      if (response && response.success) {
        toast({
          title: "? Success",
          description: response.message || 'Sales person created successfully',
          className: "border-green-200 bg-green-50 text-green-800",
          duration: 4000
        });
      } else {
        // Fallback for successful API call without success flag
        toast({
          title: "? Success",
          description: response?.message || 'Sales person created successfully',
          className: "border-green-200 bg-green-50 text-green-800",
          duration: 4000
        });
      }
      queryClient.invalidateQueries(['/unit-head/sales-persons']);
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      console.error('Create sales person error:', error);
      console.error('Error status:', error.status);
      console.error('Error message:', error.message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create sales person',
        duration: 5000
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest('PUT', `/api/unit-head/sales-persons/${id}`, data),
    onSuccess: (data) => {
      showSmartToast({
        variant: 'default',
        title: 'Success',
        description: data.message || 'Sales person updated successfully'
      });
      queryClient.invalidateQueries(['/unit-head/sales-persons']);
      setIsEditModalOpen(false);
      setSelectedSalesPerson(null);
      setFormData(initialFormData);
    },
    onError: (error) => {
      showSmartToast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update sales person'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/api/unit-head/sales-persons/${id}`),
    onSuccess: (data) => {
      showSmartToast({
        variant: 'default',
        title: 'Success',
        description: data.message || 'Sales person deleted successfully'
      });
      queryClient.invalidateQueries(['/unit-head/sales-persons']);
      setIsDeleteAlertOpen(false);
      setSelectedSalesPerson(null);
    },
    onError: (error) => {
      showSmartToast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete sales person'
      });
    }
  });

  // Cutoff Time Queries and Mutations
  const { data: cutoffData } = useQuery({
    queryKey: ['cutoff-time'],
    queryFn: () => getCutoffTime()
  });

  const setCutoffTimeMutation = useMutation({
    mutationFn: (data) => setCutoffTime(data),
    onSuccess: (response) => {
      console.log('Cutoff time mutation success:', response);
      try {
        toast({
          title: 'Success',
          description: 'Cutoff time updated successfully',
          variant: 'default'
        });
        setIsCutoffModalOpen(false);
        // Delay the query invalidation slightly
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['cutoff-time'] });
        }, 100);
      } catch (error) {
        console.error('Error in success handler:', error);
      }
    },
    onError: (error) => {
      console.error('Cutoff time mutation error:', error);
      try {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update cutoff time',
          variant: 'destructive'
        });
      } catch (toastError) {
        console.error('Error showing toast:', toastError);
      }
    }
  });

  const toggleCutoffTimeMutation = useMutation({
    mutationFn: () => toggleCutoffTime(),
    onSuccess: () => {
      try {
        toast({
          title: 'Success',
          description: 'Cutoff time status updated successfully',
          variant: 'default'
        });
        // Delay the query invalidation slightly
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['cutoff-time'] });
        }, 100);
      } catch (error) {
        console.error('Error in toggle success handler:', error);
      }
    },
    onError: (error) => {
      try {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update cutoff time status',
          variant: 'destructive'
        });
      } catch (toastError) {
        console.error('Error showing toggle toast:', toastError);
      }
    }
  });

  // Handler Functions
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };

  const handleFormChange = (field, value) => {
    // Input validation for specific fields
    if (field === 'mobile') {
      // Only allow numbers and limit to exactly 10 digits
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setFormData(prev => ({
          ...prev,
          [field]: numericValue
        }));
      }
      return;
    }
    
    if (field === 'pincode') {
      // Only allow numbers and limit to 6 digits
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 6) {
        setFormData(prev => ({
          ...prev,
          [field]: numericValue
        }));
      }
      return;
    }
    
    if (field === 'username') {
      // Only allow alphanumeric and underscore, no spaces
      const sanitizedValue = value.replace(/[^a-zA-Z0-9_]/g, '');
      setFormData(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));
      return;
    }
    
    // Default handling for other fields
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateSalesPerson = () => {
    if (!canAdd) return;
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEditSalesPerson = (salesPerson) => {
    if (!canEdit) return;
    setSelectedSalesPerson(salesPerson);
    setFormData({
      username: salesPerson.username || '',
      fullName: salesPerson.fullName || '',
      email: salesPerson.email || ''
    });
    setIsEditModalOpen(true);
  };

  const handleViewSalesPerson = (salesPerson) => {
    setSelectedSalesPerson(salesPerson);
    setIsViewModalOpen(true);
  };

  const handleDeleteSalesPerson = (salesPerson) => {
    if (!canDelete) return;
    setSelectedSalesPerson(salesPerson);
    setIsDeleteAlertOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // Required field validation
    const requiredFields = ['username', 'fullName', 'email'];
    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');
    
    if (missingFields.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: `Please fill in required fields: ${missingFields.join(', ')}`,
        duration: 5000
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        duration: 5000
      });
      return;
    }

    // Username validation - no spaces, special characters
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Username can only contain letters, numbers, and underscore',
        duration: 5000
      });
      return;
    }
    
    // Password validation for create mode
    if (isCreateModalOpen) {
      if (!formData.password || formData.password.trim() === '') {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Password is required',
          duration: 5000
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Passwords do not match',
          duration: 5000
        });
        return;
      }
      if (formData.password.length < 6) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Password must be at least 6 characters long',
          duration: 5000
        });
        return;
      }
    }
    
    if (isEditModalOpen && selectedSalesPerson) {
      // For edit, don't send password, permissions, or active status
      const { password, confirmPassword, permissions, ...editData } = formData;
      updateMutation.mutate({ id: selectedSalesPerson._id, data: editData });
    } else {
      // For create, don't send permissions - let backend set defaults
      const { confirmPassword, permissions, ...createData } = formData;
      createMutation.mutate(createData);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedSalesPerson) {
      deleteMutation.mutate(selectedSalesPerson._id);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'bg-blue-100 text-blue-800',
      'approved': 'bg-green-100 text-green-800',
      'in_production': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'rejected': 'bg-red-100 text-red-800'
    };

    const statusLabels = {
      'pending': 'Pending',
      'approved': 'Approved', 
      'in_production': 'In Production',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'rejected': 'Rejected'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const handleViewOrders = (salesPerson) => {
    setSelectedSalesPerson(salesPerson._id);
    setOrdersPage(1);
    setIsOrdersDetailOpen(true);
  };

  const handleCloseOrdersDetail = () => {
    setSelectedSalesPerson(null);
    setIsOrdersDetailOpen(false);
    setOrdersPage(1);
  };

  // Cutoff Time Handlers
  const handleOpenCutoffModal = () => {
    // Initialize form with existing data or defaults
    if (cutoffData?.data) {
      setCutoffFormData({
        time: cutoffData.data.cutoffTime || '',
        description: cutoffData.data.description || ''
      });
    } else {
      setCutoffFormData({
        time: '',
        description: ''
      });
    }
    setIsCutoffModalOpen(true);
  };

  const handleCutoffFormSubmit = (e) => {
    e.preventDefault();
    
    if (!cutoffFormData.time) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a cutoff time',
        variant: 'destructive'
      });
      return;
    }

    setCutoffTimeMutation.mutate(cutoffFormData);
  };

  const handleToggleCutoffStatus = () => {
    if (cutoffData?.data) {
      toggleCutoffTimeMutation.mutate();
    } else {
      toast({
        title: 'Error',
        description: 'Please set a cutoff time first',
        variant: 'destructive'
      });
    }
  };

  const handleCutoffFormChange = (field, value) => {
    setCutoffFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Utility Functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to view sales management.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading sales persons: {String(error?.message || 'Unknown error')}</p>
              <Button onClick={refetch} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Team</h1>
          <p className="text-muted-foreground">
            Manage sales persons and view their performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleOpenCutoffModal}
            className="relative"
          >
            <Clock className="w-4 h-4 mr-2" />
            Manage Cutoff Time
            {cutoffData?.data?.isActive && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
          </Button>
          {canAdd && (
             <Button onClick={handleCreateSalesPerson}>
               <Plus className="w-4 h-4 mr-2" />
               Add Sales Person
             </Button>
         )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Persons</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSalesPersons || 0}</div>
            <p className="text-xs text-muted-foreground">
              All sales team members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeSalesPersons || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active sales persons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.inactiveSalesPersons || 0}</div>
            <p className="text-xs text-muted-foreground">
              Inactive sales persons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              All sales orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, username, or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select 
              value={filters.sortBy} 
              onValueChange={(value) => handleFilterChange('sortBy', value)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={filters.sortOrder} 
              onValueChange={(value) => handleFilterChange('sortOrder', value)}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Persons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Team</CardTitle>
          <CardDescription>
            View and manage sales team performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesPersons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sales persons found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales Person</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg Order Value</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesPersons.map((salesPerson) => (
                    <TableRow key={salesPerson._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {salesPerson.fullName || salesPerson.username}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {salesPerson.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {salesPerson.totalOrders || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(salesPerson.totalRevenue)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(salesPerson.averageOrderValue)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="text-sm font-medium">
                            {salesPerson.successRate || 0}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {salesPerson.lastOrderDate ? formatDate(salesPerson.lastOrderDate) : 'No orders'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOrders(salesPerson)}
                            title="View Orders"
                          >
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSalesPerson(salesPerson)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-green-600" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSalesPerson(salesPerson)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-orange-600" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSalesPerson(salesPerson)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                  </div>
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
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

      {/* Orders Detail Dialog */}
      <Dialog open={isOrdersDetailOpen} onOpenChange={handleCloseOrdersDetail}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Sales Person Orders</DialogTitle>
            <DialogDescription>
              View detailed orders for the selected sales person
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Orders Statistics */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayStats.totalOrders}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(displayStats.totalRevenue)}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayStats.successRate}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Orders Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Code</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isOrdersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        <div className="animate-pulse">Loading orders...</div>
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-medium">
                          {order.orderCode}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.customer?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(order.totalAmount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
                        </TableCell>
                        <TableCell>
                          {formatDate(order.orderDate)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Orders Pagination */}
            <div className="flex justify-center">
              <div className="flex flex-col gap-2 items-center sm:flex-row sm:gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrdersPage(prev => Math.max(1, prev - 1))}
                  disabled={ordersPage === 1}
                  className="w-24"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium">Page {ordersPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrdersPage(prev => prev + 1)}
                  disabled={orders.length < 10}
                  className="w-24"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Sales Person Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={() => {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setFormData(initialFormData);
        setSelectedSalesPerson(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditModalOpen ? 'Edit Sales Person' : 'Add New Sales Person'}
            </DialogTitle>
            <DialogDescription>
              {isEditModalOpen 
                ? 'Update the sales person information below.' 
                : 'Fill in the details to create a new sales person.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleFormChange('username', e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleFormChange('fullName', e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>

              
              {/* Password fields - only show for create mode */}
              {isCreateModalOpen && (
                <>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </>
              )}
            </div>
            
            {/* Role Assignment - Fixed to Sales */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Role Assignment</Label>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Sales Person</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    This user will be assigned the Sales role with appropriate permissions.
                  </p>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setFormData(initialFormData);
                  setSelectedSalesPerson(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? 'Saving...' 
                  : (isEditModalOpen ? 'Update' : 'Create')
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Sales Person Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sales Person Details</DialogTitle>
          </DialogHeader>
          
          {selectedSalesPerson && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Username</Label>
                  <p className="text-sm text-muted-foreground">{selectedSalesPerson.username || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-medium">Full Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedSalesPerson.fullName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedSalesPerson.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="font-medium">Status</Label>
                  <Badge variant={selectedSalesPerson.active === 'Yes' ? 'default' : 'secondary'}>
                    {selectedSalesPerson.active === 'Yes' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <Label className="font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSalesPerson.createdAt ? formatDate(selectedSalesPerson.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSalesPerson?.fullName || selectedSalesPerson?.username}?
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cutoff Time Management Modal */}
      <Dialog open={isCutoffModalOpen} onOpenChange={setIsCutoffModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Cutoff Time</DialogTitle>
            <DialogDescription>
              Set the daily cutoff time after which sales persons cannot create or edit orders.
            </DialogDescription>
          </DialogHeader>
          
          {/* Current Status Banner */}
          {cutoffData?.data && (
            <div className={`p-3 rounded-lg mb-4 ${
              cutoffData.data.isActive 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">
                      Current Cutoff: {cutoffData.data.cutoffTime}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {cutoffData.data.description || 'No description provided'}
                  </p>
                </div>
                <Button
                  variant={cutoffData.data.isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={handleToggleCutoffStatus}
                  disabled={toggleCutoffTimeMutation.isPending}
                >
                  {toggleCutoffTimeMutation.isPending 
                    ? 'Updating...' 
                    : cutoffData.data.isActive 
                      ? 'Disable' 
                      : 'Enable'
                  }
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleCutoffFormSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cutoff-time">Cutoff Time</Label>
              <Input
                id="cutoff-time"
                type="time"
                value={cutoffFormData.time}
                onChange={(e) => handleCutoffFormChange('time', e.target.value)}
                required
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Sales persons won't be able to create or edit orders after this time
              </p>
            </div>
            
            <div>
              <Label htmlFor="cutoff-description">Description (Optional)</Label>
              <Input
                id="cutoff-description"
                type="text"
                placeholder="e.g., Daily cutoff for order processing"
                value={cutoffFormData.description}
                onChange={(e) => handleCutoffFormChange('description', e.target.value)}
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCutoffModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={setCutoffTimeMutation.isPending}
              >
                {setCutoffTimeMutation.isPending ? 'Saving...' : 'Save Cutoff Time'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
