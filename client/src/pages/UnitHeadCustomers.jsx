import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unitHeadCustomerApi } from '@/api/customerService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Search,
  Filter,
  Eye,
  Users,
  MapPin,
  Phone,
  Mail,
  Building,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

const CUSTOMER_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'Yes', label: 'Active' },
  { value: 'No', label: 'Inactive' }
];

const CUSTOMER_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Retailer', label: 'Retailer' },
  { value: 'Wholesaler', label: 'Wholesaler' },
  { value: 'End User', label: 'End User' }
];

const initialFormData = {
  name: '',
  contactPerson: '',
  designation: '',
  category: 'Distributor',
  active: 'Yes',
  mobile: '',
  email: '',
  gstin: '',
  salesContact: 'unassigned',
  address1: '',
  googlePin: '',
  city: '',
  state: '',
  country: 'India',
  pin: '',
  creditLimit: 0,
  categoryNote: ''
};

// Customer Form Component
const CustomerForm = ({
  formData,
  salesPersons,
  salesPersonsLoading,
  salesPersonsError,
  onFormChange,
  onSubmit,
  onCancel,
  isLoading,
  submitText
}) => {
  return (
    <div className="space-y-6">
      {/* Primary Details Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Primary Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              placeholder="Enter customer name"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700">Contact Person</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => onFormChange('contactPerson', e.target.value)}
              placeholder="Mr"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="designation" className="text-sm font-medium text-gray-700">Designation</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => onFormChange('designation', e.target.value)}
              placeholder="Enter designation"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="salesContact" className="text-sm font-medium text-gray-700">Assign to Sales Person</Label>
            <Select value={formData.salesContact} onValueChange={(value) => onFormChange('salesContact', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select sales person to assign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">No Assignment</SelectItem>
                {salesPersonsLoading && (
                  <SelectItem value="loading" disabled>Loading sales persons...</SelectItem>
                )}
                {salesPersonsError && (
                  <SelectItem value="error" disabled>Error loading sales persons</SelectItem>
                )}
                {!salesPersonsLoading && !salesPersonsError && salesPersons.length === 0 && (
                  <SelectItem value="none" disabled>No sales persons found</SelectItem>
                )}
                {salesPersons.map(person => (
                  <SelectItem key={person._id} value={person._id}>
                    {person.fullName || person.username} ({person.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {salesPersonsLoading ? 'Loading...' :
                salesPersonsError ? `Error: ${salesPersonsError.message}` :
                  `${salesPersons.length} sales person(s) available`}
            </p>
          </div>
          <div>
            <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category</Label>
            <Select value={formData.category} onValueChange={(value) => onFormChange('category', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Distributor">Distributor</SelectItem>
                <SelectItem value="Retailer">Retailer</SelectItem>
                <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                <SelectItem value="End User">End User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="categoryNote" className="text-sm font-medium text-gray-700">Category Note</Label>
            <Input
              id="categoryNote"
              value={formData.categoryNote}
              onChange={(e) => onFormChange('categoryNote', e.target.value)}
              placeholder="Enter category note"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="active" className="text-sm font-medium text-gray-700">Active</Label>
            <Select value={formData.active} onValueChange={(value) => onFormChange('active', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Yes">Yes</SelectItem>
                <SelectItem value="No">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact Details Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Contact Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mobile" className="text-sm font-medium text-gray-700">Mobile *</Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) => onFormChange('mobile', e.target.value)}
              placeholder="Enter mobile number"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormChange('email', e.target.value)}
              placeholder="Enter email address"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="gstin" className="text-sm font-medium text-gray-700">GSTIN</Label>
            <Input
              id="gstin"
              value={formData.gstin}
              onChange={(e) => onFormChange('gstin', e.target.value)}
              placeholder="Enter GSTIN"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="address1" className="text-sm font-medium text-gray-700">Address 1</Label>
            <Input
              id="address1"
              value={formData.address1}
              onChange={(e) => onFormChange('address1', e.target.value)}
              placeholder="Enter address"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="googlePin" className="text-sm font-medium text-gray-700">Google Pin</Label>
            <Input
              id="googlePin"
              value={formData.googlePin}
              onChange={(e) => onFormChange('googlePin', e.target.value)}
              placeholder="Enter Google Pin"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => onFormChange('city', e.target.value)}
              placeholder="Enter city"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="state" className="text-sm font-medium text-gray-700">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => onFormChange('state', e.target.value)}
              placeholder="Enter state"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="country" className="text-sm font-medium text-gray-700">Country</Label>
            <Input
              value="India"
              disabled
              className="mt-1 bg-gray-100"
            />
          </div>
          <div>
            <Label htmlFor="pin" className="text-sm font-medium text-gray-700">PIN</Label>
            <Input
              id="pin"
              value={formData.pin}
              onChange={(e) => onFormChange('pin', e.target.value)}
              placeholder="Enter PIN code"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isLoading}
          className="min-w-24"
        >
          {isLoading ? "Processing..." : submitText}
        </Button>
      </div>
    </div>
  );
};

export default function UnitHeadCustomers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasFeatureAccess } = usePermissions();

  // Permission checks
  const canView = hasFeatureAccess('unitHead', 'customers', 'view');
  const canAdd = hasFeatureAccess('unitHead', 'customers', 'add');
  const canEdit = hasFeatureAccess('unitHead', 'customers', 'edit');
  const canDelete = hasFeatureAccess('unitHead', 'customers', 'delete');

  // States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    active: 'all',
    category: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Query for customers list
  const { data: customersResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/unit-head/customers', filters],
    queryFn: () => {
      const params = { ...filters };
      // Clean up filters for API
      if (params.active === 'all') delete params.active;
      if (params.category === 'all') delete params.category;
      return unitHeadCustomerApi.getAll(params);
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for sales persons dropdown
  const { data: salesPersonsResponse, isLoading: salesPersonsLoading, error: salesPersonsError } = useQuery({
    queryKey: ['/api/unit-head/sales-persons-list'],
    queryFn: unitHeadCustomerApi.getSalesPersons,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const customersData = customersResponse?.data?.customers || [];
  const summary = customersResponse?.data?.summary || {};
  const pagination = customersResponse?.data?.pagination || {};
  const salesPersons = salesPersonsResponse?.salesPersons || [];

  // Mutations for CRUD operations
  const createMutation = useMutation({
    mutationFn: unitHeadCustomerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/unit-head/customers']);
      toast({
        title: "Customer Created",
        description: "Customer has been created successfully",
      });
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create customer",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => unitHeadCustomerApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/unit-head/customers']);
      toast({
        title: "Customer Updated",
        description: "Customer has been updated successfully",
      });
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update customer",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: unitHeadCustomerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/unit-head/customers']);
      toast({
        title: "Customer Deleted",
        description: "Customer has been deleted successfully",
      });
      setIsDeleteAlertOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete customer",
        variant: "destructive",
      });
    }
  });

  // Event handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
    }));
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      contactPerson: customer.contactPerson || '',
      designation: customer.designation || '',
      category: customer.category || 'Distributor',
      active: customer.active || 'Yes',
      mobile: customer.mobile || '',
      email: customer.email || '',
      gstin: customer.gstin || '',
      salesContact: customer.salesContact?._id || 'unassigned',
      address1: customer.address1 || '',
      googlePin: customer.googlePin || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'India',
      pin: customer.pin || '',
      creditLimit: customer.creditLimit || 0,
      categoryNote: customer.categoryNote || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDeleteAlertOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    // Convert 'unassigned' to null for API
    const apiData = {
      ...formData,
      salesContact: formData.salesContact === 'unassigned' ? null : formData.salesContact
    };

    if (isEditModalOpen && selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer._id, data: apiData });
    } else {
      createMutation.mutate(apiData);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedCustomer) {
      deleteMutation.mutate(selectedCustomer._id);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper functions
  const getStatusBadge = (isActive) => {
    const active = isActive === 'Yes' || isActive === true;
    return active ? (
      <Badge className="bg-green-100 text-green-800">
        <UserCheck className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">
        <UserX className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Permission check
  if (!canView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>You don't have permission to view customers.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading customers: {String(error?.message || 'Unknown error')}</p>
              <Button onClick={refetch} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage customers and assign them to sales persons in your unit
          </p>
        </div>
        {canAdd && (
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Customer</DialogTitle>
                <DialogDescription>
                  Add a new customer and assign them to a sales person.
                </DialogDescription>
              </DialogHeader>
              <CustomerForm
                formData={formData}
                salesPersons={salesPersons}
                salesPersonsLoading={salesPersonsLoading}
                salesPersonsError={salesPersonsError}
                onFormChange={handleFormChange}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setIsCreateModalOpen(false);
                  setFormData(initialFormData);
                }}
                isLoading={createMutation.isPending}
                submitText="Create Customer"
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              All registered customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.activeCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Customers</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summary.inactiveCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently inactive customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cities Covered</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.cityDistribution?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Different cities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.active} onValueChange={(value) => handleFilterChange('active', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_STATUSES.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_CATEGORIES.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Items per page */}
            <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers List</CardTitle>
          <CardDescription>
            {pagination.total || 0} total customers found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading customers...</div>
          ) : customersData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found. {canAdd && "Click 'Create New Customer' to add the first customer."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Details</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Assigned Sales Person</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersData.map((customer) => (
                    <TableRow key={customer._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.contactPerson && (
                            <div className="text-sm text-muted-foreground">
                              Contact: {customer.contactPerson}
                            </div>
                          )}
                          {customer.city && (
                            <div className="text-sm text-muted-foreground flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              Location:  {customer.city}{customer.state && `, ${customer.state}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.mobile}
                          </div>
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {customer.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.salesContact ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {customer.salesContact.fullName || customer.salesContact.username}
                            </div>
                            <div className="text-muted-foreground">
                              {customer.salesContact.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.active)}</TableCell>
                      <TableCell>{formatDate(customer.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCustomer(customer)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-orange-600" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} total customers)
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                      disabled={filters.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                      disabled={filters.page >= pagination.pages}
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

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information and sales person assignment.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            formData={formData}
            salesPersons={salesPersons}
            salesPersonsLoading={salesPersonsLoading}
            salesPersonsError={salesPersonsError}
            onFormChange={handleFormChange}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedCustomer(null);
              setFormData(initialFormData);
            }}
            isLoading={updateMutation.isPending}
            submitText="Update Customer"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer
              <strong> {selectedCustomer?.name}</strong> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Customer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Basic Information</h3>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Customer Name</Label>
                    <p className="text-sm">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Contact Person</Label>
                    <p className="text-sm">{selectedCustomer.contactPerson || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm">{selectedCustomer.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedCustomer.active)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Assigned Sales Person</Label>
                    <p className="text-sm">
                      {selectedCustomer.salesContact
                        ? `${selectedCustomer.salesContact.fullName || selectedCustomer.salesContact.username} (${selectedCustomer.salesContact.email})`
                        : 'Not assigned to any sales person'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-lg">Contact Information</h3>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Mobile</Label>
                    <p className="text-sm">{selectedCustomer.mobile}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">GSTIN</Label>
                    <p className="text-sm">{selectedCustomer.gstin || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm">{selectedCustomer.address1 || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">City, State</Label>
                    <p className="text-sm">
                      {[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">PIN Code</Label>
                    <p className="text-sm">{selectedCustomer.pin || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm">{formatDate(selectedCustomer.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}