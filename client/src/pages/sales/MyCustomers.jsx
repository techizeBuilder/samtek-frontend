import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { salesApi } from '@/api/salesService';
import { customerApi } from '@/api/customerService';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  RefreshCw,
  TrendingUp,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

const MyCustomers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasFeatureAccess } = usePermissions();

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Check permissions
  const canView = hasFeatureAccess('sales', 'myCustomers', 'view');
  const canAdd = hasFeatureAccess('sales', 'myCustomers', 'add');
  const canEdit = hasFeatureAccess('sales', 'myCustomers', 'edit');
  const canDelete = hasFeatureAccess('sales', 'myCustomers', 'delete');

  // Build query parameters for API
  const queryParams = {
    page: currentPage,
    limit: itemsPerPage,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  if (searchTerm) queryParams.name = searchTerm;
  if (statusFilter !== 'All') {
    // Map frontend filter values to backend values
    queryParams.status = statusFilter === 'Active' ? 'Yes' : 'No';
  }
  if (categoryFilter !== 'All') queryParams.customerType = categoryFilter;

  // Fetch customers with pagination and filtering (sales-specific API with company filtering)
  const { data: customersResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/sales/my-customers', queryParams],
    queryFn: () => salesApi.getMyCustomers(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const customersData = customersResponse?.customers || [];
  const pagination = customersResponse?.pagination || {};

  // Stats (from API response or calculate from current page)
  const totalCustomers = pagination.total || customersData.length;
  const activeCustomers = customersData.filter(c => c.active === 'Yes').length;
  const distributorCustomers = customersData.filter(c => c.category === 'Distributor').length;

  // Reset page when filters change
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/sales/my-customers']);
      queryClient.invalidateQueries(['/api/sales/customers']);
      toast({
        title: "Customer Deleted",
        description: "Customer has been deleted successfully",
      });
      setIsDeleteModalOpen(false);
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

  // Action handlers
  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCustomer) {
      deleteMutation.mutate(selectedCustomer._id);
    }
  };

  // Permission check
  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view customers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer database</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">All registered customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers}</div>
            <p className="text-xs text-muted-foreground">Currently active accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distributors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{distributorCustomers}</div>
            <p className="text-xs text-muted-foreground">Distributor customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name, email, phone..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            <SelectItem value="Distributor">Distributor</SelectItem>
            <SelectItem value="Retailer">Retailer</SelectItem>
            <SelectItem value="Wholesaler">Wholesaler</SelectItem>
            <SelectItem value="End User">End User</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {canAdd && (
            <CreateCustomerDialog
              isOpen={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
              onSuccess={() => {
                queryClient.invalidateQueries(['/api/sales/my-customers']);
                queryClient.invalidateQueries(['/api/sales/customers']);
                toast({
                  title: "Customer Created",
                  description: "Customer has been created successfully",
                });
              }}
            />
          )}
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6}>
                      <div className="animate-pulse bg-gray-200 h-4 rounded w-full"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : customersData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No customers found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customersData.map((customer) => (
                  <TableRow key={customer._id}>
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-500 md:hidden">
                        {customer.mobile} • {customer.email}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.mobile}
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline">{customer.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">
                        <div>{customer.city}, {customer.state}</div>
                        <div className="text-gray-500">{customer.pin}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.active === 'Yes' ? 'default' : 'secondary'}>
                        {customer.active === 'Yes' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewCustomer(customer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteCustomer(customer)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} customers
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (pageNum > pagination.pages) return null;
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
              disabled={currentPage === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* View Customer Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View complete customer information
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Name</Label>
                  <p className="text-sm">{selectedCustomer.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Contact Person</Label>
                  <p className="text-sm">{selectedCustomer.contactPerson || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Mobile</Label>
                  <p className="text-sm">{selectedCustomer.mobile}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-sm">{selectedCustomer.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Category</Label>
                  <Badge variant="outline">{selectedCustomer.category}</Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Badge variant={selectedCustomer.active === 'Yes' ? 'default' : 'secondary'}>
                    {selectedCustomer.active === 'Yes' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">GSTIN</Label>
                  <p className="text-sm">{selectedCustomer.gstin || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Address</Label>
                  <p className="text-sm">{selectedCustomer.address1 || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">City</Label>
                  <p className="text-sm">{selectedCustomer.city || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">State</Label>
                  <p className="text-sm">{selectedCustomer.state || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">PIN</Label>
                  <p className="text-sm">{selectedCustomer.pin || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Google Pin</Label>
                  <p className="text-sm">{selectedCustomer.googlePin || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Country</Label>
                  <p className="text-sm">{selectedCustomer.country || 'India'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Designation</Label>
                  <p className="text-sm">{selectedCustomer.designation || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Category Note</Label>
                  <p className="text-sm">{selectedCustomer.categoryNote || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Sales Contact</Label>
                  <p className="text-sm">{selectedCustomer.salesContact?.username || selectedCustomer.salesContact || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                <p className="text-sm text-gray-600">{selectedCustomer.mobile}</p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Customer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Modal */}
      {selectedCustomer && (
        <EditCustomerDialog
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          customer={selectedCustomer}
          onSuccess={() => {
            queryClient.invalidateQueries(['/api/sales/my-customers']);
            queryClient.invalidateQueries(['/api/sales/customers']);
            toast({
              title: "Customer Updated",
              description: "Customer has been updated successfully",
            });
            setIsEditModalOpen(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
};

// Create Customer Dialog Component
const CreateCustomerDialog = ({ isOpen, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    designation: '',
    category: 'Distributor',
    categoryNote: '',
    active: 'Yes',
    mobile: '',
    email: '',
    gstin: '',
    address1: '',
    googlePin: '',
    city: '',
    state: '',
    country: 'India',
    pin: '',
    salesContact: '',
    entityType: 'Others',
    tdsSection: 'None'
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.log('Full API Error Object:', error);
      console.log('Error validationErrors:', error.validationErrors);
      console.log('Error allErrorMessages:', error.allErrorMessages);

      // Check if error has validationErrors (processed by API)
      if (error?.validationErrors && typeof error.validationErrors === 'object') {
        const fieldErrors = error.validationErrors;

        // Set field errors for inline display
        setErrors(fieldErrors);

        // Use allErrorMessages if available, otherwise build from validationErrors
        const toastMessages = error.allErrorMessages && error.allErrorMessages.length > 0
          ? error.allErrorMessages
          : Object.entries(fieldErrors).map(([field, message]) => message);

        // Show all validation errors in toast
        toast({
          title: "Validation Errors",
          description: toastMessages.join(". "),
          variant: "destructive",
          duration: 15000, // Longer for multiple messages
        });

        console.log('Set field errors:', fieldErrors);
        console.log('Toast will show:', toastMessages.join(". "));
      } else {
        // Fallback for other error types
        toast({
          title: "Error",
          description: error?.message || "Failed to create customer",
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      designation: '',
      category: 'Distributor',
      categoryNote: '',
      active: 'Yes',
      mobile: '',
      email: '',
      gstin: '',
      address1: '',
      googlePin: '',
      city: '',
      state: '',
      country: 'India',
      pin: '',
      salesContact: '',
      entityType: 'Others',
      tdsSection: 'None'
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setErrors({});
    createMutation.mutate(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new customer.
          </DialogDescription>
        </DialogHeader>

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
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter customer name"
                  className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.name}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder="Mr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="designation" className="text-sm font-medium text-gray-700">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  placeholder="Enter designation"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
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
                  onChange={(e) => handleInputChange('categoryNote', e.target.value)}
                  placeholder="Enter category note"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="active" className="text-sm font-medium text-gray-700">Active</Label>
                <Select value={formData.active} onValueChange={(value) => handleInputChange('active', value)}>
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
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  placeholder="Enter mobile number"
                  className={`mt-1 ${errors.mobile ? 'border-red-500' : ''}`}
                />
                {errors.mobile && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.mobile}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.email}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="gstin" className="text-sm font-medium text-gray-700">GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  placeholder="Enter GSTIN"
                  className={`mt-1 ${errors.gstin ? 'border-red-500' : ''}`}
                />
                {errors.gstin && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.gstin}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="address1" className="text-sm font-medium text-gray-700">Address 1</Label>
                <Input
                  id="address1"
                  value={formData.address1}
                  onChange={(e) => handleInputChange('address1', e.target.value)}
                  placeholder="Enter address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="googlePin" className="text-sm font-medium text-gray-700">Google Pin</Label>
                <Input
                  id="googlePin"
                  value={formData.googlePin}
                  onChange={(e) => handleInputChange('googlePin', e.target.value)}
                  placeholder="Enter Google Pin"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter city"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
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
                  onChange={(e) => handleInputChange('pin', e.target.value)}
                  placeholder="Enter PIN code"
                  className={`mt-1 ${errors.pin ? 'border-red-500' : ''}`}
                />
                {errors.pin && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.pin}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="salesContact" className="text-sm font-medium text-gray-700">Sales Contact</Label>
                <Input
                  id="salesContact"
                  value={formData.salesContact}
                  onChange={(e) => handleInputChange('salesContact', e.target.value)}
                  placeholder="Enter sales contact"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="entityType" className="text-sm font-medium text-gray-700">Entity Type</Label>
                <Select value={formData.entityType} onValueChange={(value) => handleInputChange('entityType', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="HUF">HUF</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Firm">Firm</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tdsSection" className="text-sm font-medium text-gray-700">TDS Section</Label>
                <Select value={formData.tdsSection} onValueChange={(value) => handleInputChange('tdsSection', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select TDS section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="194C">Section 194C (Contract)</SelectItem>
                    <SelectItem value="194J">Section 194J (Prof.)</SelectItem>
                    <SelectItem value="194Q">Section 194Q (Goods Sale)</SelectItem>
                    <SelectItem value="206C_1H">Section 206C(1H)</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-w-24"
            >
              {isSubmitting ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Edit Customer Dialog Component
const EditCustomerDialog = ({ isOpen, onOpenChange, customer, onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    contactPerson: customer?.contactPerson || '',
    designation: customer?.designation || '',
    category: customer?.category || 'Distributor',
    categoryNote: customer?.categoryNote || '',
    active: customer?.active || 'Yes',
    mobile: customer?.mobile || '',
    email: customer?.email || '',
    gstin: customer?.gstin || '',
    address1: customer?.address1 || '',
    googlePin: customer?.googlePin || '',
    city: customer?.city || '',
    state: customer?.state || '',
    country: 'India',
    pin: customer?.pin || '',
    salesContact: customer?.salesContact?.username || customer?.salesContact || '',
    entityType: customer?.entityType || 'Others',
    tdsSection: customer?.tdsSection || 'None'
  });

  // Update form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        contactPerson: customer.contactPerson || '',
        designation: customer.designation || '',
        category: customer.category || 'Distributor',
        categoryNote: customer.categoryNote || '',
        active: customer.active || 'Yes',
        mobile: customer.mobile || '',
        email: customer.email || '',
        gstin: customer.gstin || '',
        address1: customer.address1 || '',
        googlePin: customer.googlePin || '',
        city: customer.city || '',
        state: customer.state || '',
        country: 'India',
        pin: customer.pin || '',
        salesContact: customer.salesContact?.username || customer.salesContact || '',
        entityType: customer.entityType || 'Others',
        tdsSection: customer.tdsSection || 'None'
      });
      setErrors({});
    }
  }, [customer]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (updateData) => customerApi.update(customer._id, updateData),
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.log('Edit API Error Object:', error);
      console.log('Error validationErrors:', error.validationErrors);
      console.log('Error allErrorMessages:', error.allErrorMessages);

      if (error?.validationErrors && typeof error.validationErrors === 'object') {
        const fieldErrors = error.validationErrors;
        setErrors(fieldErrors);

        const toastMessages = error.allErrorMessages && error.allErrorMessages.length > 0
          ? error.allErrorMessages
          : Object.entries(fieldErrors).map(([field, message]) => message);

        toast({
          title: "Validation Errors",
          description: toastMessages.join(". "),
          variant: "destructive",
          duration: 15000,
        });
      } else {
        toast({
          title: "Error",
          description: error?.message || "Failed to update customer",
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    }
  });

  const handleSubmit = () => {
    setIsSubmitting(true);
    setErrors({});
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleCancel = () => {
    setFormData({
      name: customer?.name || '',
      contactPerson: customer?.contactPerson || '',
      designation: customer?.designation || '',
      category: customer?.category || 'Distributor',
      categoryNote: customer?.categoryNote || '',
      active: customer?.active || 'Yes',
      mobile: customer?.mobile || '',
      email: customer?.email || '',
      gstin: customer?.gstin || '',
      address1: customer?.address1 || '',
      googlePin: customer?.googlePin || '',
      city: customer?.city || '',
      state: customer?.state || '',
      country: 'India',
      pin: customer?.pin || '',
      salesContact: customer?.salesContact?.username || customer?.salesContact || ''
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Primary Details Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Primary Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter customer name"
                  className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.name}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="edit-contactPerson" className="text-sm font-medium text-gray-700">Contact Person</Label>
                <Input
                  id="edit-contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder="Mr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-designation" className="text-sm font-medium text-gray-700">Designation</Label>
                <Input
                  id="edit-designation"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  placeholder="Enter designation"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-category" className="text-sm font-medium text-gray-700">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
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
                <Label htmlFor="edit-categoryNote" className="text-sm font-medium text-gray-700">Category Note</Label>
                <Input
                  id="edit-categoryNote"
                  value={formData.categoryNote}
                  onChange={(e) => handleInputChange('categoryNote', e.target.value)}
                  placeholder="Enter category note"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-active" className="text-sm font-medium text-gray-700">Active</Label>
                <Select value={formData.active} onValueChange={(value) => handleInputChange('active', value)}>
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
                <Label htmlFor="edit-mobile" className="text-sm font-medium text-gray-700">Mobile *</Label>
                <Input
                  id="edit-mobile"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  placeholder="Enter mobile number"
                  className={`mt-1 ${errors.mobile ? 'border-red-500' : ''}`}
                />
                {errors.mobile && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.mobile}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.email}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="edit-gstin" className="text-sm font-medium text-gray-700">GSTIN</Label>
                <Input
                  id="edit-gstin"
                  value={formData.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  placeholder="Enter GSTIN"
                  className={`mt-1 ${errors.gstin ? 'border-red-500' : ''}`}
                />
                {errors.gstin && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.gstin}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="edit-address1" className="text-sm font-medium text-gray-700">Address 1</Label>
                <Input
                  id="edit-address1"
                  value={formData.address1}
                  onChange={(e) => handleInputChange('address1', e.target.value)}
                  placeholder="Enter address"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-googlePin" className="text-sm font-medium text-gray-700">Google Pin</Label>
                <Input
                  id="edit-googlePin"
                  value={formData.googlePin}
                  onChange={(e) => handleInputChange('googlePin', e.target.value)}
                  placeholder="Enter Google Pin"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-city" className="text-sm font-medium text-gray-700">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Enter city"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-state" className="text-sm font-medium text-gray-700">State</Label>
                <Input
                  id="edit-state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="Enter state"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-country" className="text-sm font-medium text-gray-700">Country</Label>
                <Input
                  value="India"
                  disabled
                  className="mt-1 bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="edit-pin" className="text-sm font-medium text-gray-700">PIN</Label>
                <Input
                  id="edit-pin"
                  value={formData.pin}
                  onChange={(e) => handleInputChange('pin', e.target.value)}
                  placeholder="Enter PIN code"
                  className={`mt-1 ${errors.pin ? 'border-red-500' : ''}`}
                />
                {errors.pin && (
                  <div className="flex items-start gap-2 mt-1">
                    <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-500 text-xs leading-tight">{errors.pin}</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="edit-salesContact" className="text-sm font-medium text-gray-700">Sales Contact</Label>
                <Input
                  id="edit-salesContact"
                  value={formData.salesContact}
                  onChange={(e) => handleInputChange('salesContact', e.target.value)}
                  placeholder="Enter sales contact"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-entityType" className="text-sm font-medium text-gray-700">Entity Type</Label>
                <Select value={formData.entityType} onValueChange={(value) => handleInputChange('entityType', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="HUF">HUF</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Firm">Firm</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-tdsSection" className="text-sm font-medium text-gray-700">TDS Section</Label>
                <Select value={formData.tdsSection} onValueChange={(value) => handleInputChange('tdsSection', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select TDS section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="194C">Section 194C (Contract)</SelectItem>
                    <SelectItem value="194J">Section 194J (Prof.)</SelectItem>
                    <SelectItem value="194Q">Section 194Q (Goods Sale)</SelectItem>
                    <SelectItem value="206C_1H">Section 206C(1H)</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="min-w-24"
            >
              {isSubmitting ? "Updating..." : "Update Customer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MyCustomers;