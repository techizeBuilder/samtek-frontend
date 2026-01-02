import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { customerApi } from '@/api/customerService';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  Eye,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  Building,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { showSmartToast, showSuccessToast } from '@/lib/toast-utils';

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [viewingCustomer, setViewingCustomer] = useState(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build query parameters for API
  const queryParams = {
    page: currentPage,
    limit: itemsPerPage,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  };

  if (searchTerm) queryParams.name = searchTerm;
  if (statusFilter !== 'All') {
    queryParams.status = statusFilter === 'Active' ? 'Yes' : 'No';
  }
  if (categoryFilter !== 'All') queryParams.customerType = categoryFilter;

  // Fetch customers with real API
  const { data: customersResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/customers', queryParams],
    queryFn: () => customerApi.getAll(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const customers = customersResponse?.customers || [];
  const pagination = customersResponse?.pagination || {};

  // Calculate stats from all customers
  const totalCustomers = pagination.total || customers.length;
  const activeCustomers = customers.filter(c => c.active === 'Yes').length;
  const distributorCustomers = customers.filter(c => c.category === 'Distributor').length;
  const retailerCustomers = customers.filter(c => c.category === 'Retailer').length;

  // Get unique values for filters
  const uniqueCities = [...new Set(customers.map(c => c.city).filter(Boolean))];
  const customerCategories = ['Distributor', 'Retailer', 'Wholesaler', 'End User'];

  const handleView = (customer) => {
    setViewingCustomer(customer);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-2">
            Manage your customer relationships
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">
                Total Customers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalCustomers}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">
                Active Customers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {activeCustomers}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">
                Distributors
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {distributorCustomers}
              </p>
            </div>
            <Building className="h-8 w-8 text-purple-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">
                Retailers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {retailerCustomers}
              </p>
            </div>
            <Users className="h-8 w-8 text-orange-600" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {customerCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setCategoryFilter('All');
                setCurrentPage(1);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Customers Table - Responsive */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Customer Name</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[160px]">Contact</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">Location</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-gray-500">Loading customers...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">No customers found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer._id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="sm:hidden space-y-1 mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span>{customer.mobile}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={customer.category === 'Distributor' ? 'default' : 'secondary'} className="text-xs">
                                {customer.category}
                              </Badge>
                              <Badge variant={customer.active === 'Yes' ? 'default' : 'secondary'} className="text-xs">
                                {customer.active === 'Yes' ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            <span>{customer.mobile}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {customer.city ? `${customer.city}${customer.state ? `, ${customer.state}` : ''}` : 'Not specified'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={customer.category === 'Distributor' ? 'default' : 'secondary'}>
                          {customer.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={customer.active === 'Yes' ? 'default' : 'secondary'}>
                          {customer.active === 'Yes' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleView(customer)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} customers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {pagination.pages}
                </span>
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
        </CardContent>
      </Card>



      {/* Customer Details Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Customer Details</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setViewingCustomer(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-lg mb-3 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer Name</p>
                    <p className="text-base font-semibold">{viewingCustomer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Contact Person</p>
                    <p className="text-base">{viewingCustomer.contactPerson || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Designation</p>
                    <p className="text-base">{viewingCustomer.designation || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Category</p>
                    <p className="text-base">{viewingCustomer.category}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <p className="text-base">{viewingCustomer.active === 'Yes' ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Sales Contact</p>
                    <p className="text-base">{viewingCustomer.salesContact?.username || viewingCustomer.salesContact || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-lg mb-3 flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Mobile Number</p>
                    <p className="text-base flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {viewingCustomer.mobile}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email Address</p>
                    <p className="text-base flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {viewingCustomer.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-lg mb-3 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">Address</p>
                    <p className="text-base">{viewingCustomer.address1 || 'No address provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">City</p>
                    <p className="text-base">{viewingCustomer.city || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">State</p>
                    <p className="text-base">{viewingCustomer.state || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">PIN Code</p>
                    <p className="text-base">{viewingCustomer.pin || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Country</p>
                    <p className="text-base">{viewingCustomer.country || 'India'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Google Pin Location</p>
                    <p className="text-base">{viewingCustomer.googlePin || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="border-b pb-4">
                <h4 className="font-semibold text-lg mb-3 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Business Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">GSTIN</p>
                    <p className="text-base font-mono">{viewingCustomer.gstin || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Category Note</p>
                    <p className="text-base">{viewingCustomer.categoryNote || 'No notes'}</p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div>
                <h4 className="font-semibold text-lg mb-3">System Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer ID</p>
                    <p className="text-base font-mono">{viewingCustomer._id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Created Date</p>
                    <p className="text-base">
                      {viewingCustomer.createdAt ? new Date(viewingCustomer.createdAt).toLocaleDateString() : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <Button onClick={() => setViewingCustomer(null)} className="min-w-[100px]">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}