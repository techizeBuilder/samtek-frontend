import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ActionButton, useActionPermissions } from '@/components/permissions/ActionButton';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Building,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  TrendingUp,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Dummy customer data
const dummyCustomers = [
  {
    id: 'C001',
    name: 'ABC Manufacturing Ltd',
    contactPerson: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh@abcmfg.com',
    address: '123 Industrial Area, Phase 1',
    area: 'Industrial Zone A',
    route: 'Route 1',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    gst: '27ABCDE1234F1Z5',
    category: 'Premium',
    creditLimit: 500000,
    outstandingAmount: 125000,
    status: 'Active',
    registrationDate: '2024-01-15',
    lastOrderDate: '2025-01-05'
  },
  {
    id: 'C002',
    name: 'XYZ Industries Corp',
    contactPerson: 'Priya Sharma',
    phone: '+91 87654 32109',
    email: 'priya@xyzind.com',
    address: '456 Tech Park, Building B2',
    area: 'Tech Park B',
    route: 'Route 2',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    gst: '27XYZAB5678G2W4',
    category: 'Standard',
    creditLimit: 300000,
    outstandingAmount: 75000,
    status: 'Active',
    registrationDate: '2024-02-20',
    lastOrderDate: '2025-01-03'
  },
  {
    id: 'C003',
    name: 'PQR Steel Works',
    contactPerson: 'Amit Patel',
    phone: '+91 76543 21098',
    email: 'amit@pqrsteel.com',
    address: '789 Steel Complex, Sector 5',
    area: 'Industrial Sector 5',
    route: 'Route 3',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    gst: '24PQRST9012H3Y6',
    category: 'Premium',
    creditLimit: 750000,
    outstandingAmount: 200000,
    status: 'Active',
    registrationDate: '2024-03-10',
    lastOrderDate: '2025-01-01'
  },
  {
    id: 'C004',
    name: 'LMN Auto Parts',
    contactPerson: 'Sneha Reddy',
    phone: '+91 65432 10987',
    email: 'sneha@lmnauto.com',
    address: '321 Auto Hub, Unit 12',
    area: 'Auto Hub',
    route: 'Route 1',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    gst: '36LMNOP3456K1U8',
    category: 'Standard',
    creditLimit: 400000,
    outstandingAmount: 150000,
    status: 'Active',
    registrationDate: '2024-04-05',
    lastOrderDate: '2024-12-30'
  },
  {
    id: 'C005',
    name: 'RST Electronics',
    contactPerson: 'Vikram Singh',
    phone: '+91 54321 09876',
    email: 'vikram@rstelectronics.com',
    address: '654 Electronics Mall, Floor 3',
    area: 'Electronics District',
    route: 'Route 2',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    gst: '29RSTUV6789L2V9',
    category: 'Basic',
    creditLimit: 200000,
    outstandingAmount: 45000,
    status: 'Active',
    registrationDate: '2024-05-12',
    lastOrderDate: '2024-12-28'
  },
  {
    id: 'C006',
    name: 'DEF Textiles Ltd',
    contactPerson: 'Kavya Nair',
    phone: '+91 43210 98765',
    email: 'kavya@deftextiles.com',
    address: '987 Textile Park, Block C',
    area: 'Textile Zone',
    route: 'Route 3',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641001',
    gst: '33DEFGH7890M3X1',
    category: 'Standard',
    creditLimit: 350000,
    outstandingAmount: 95000,
    status: 'Active',
    registrationDate: '2024-06-18',
    lastOrderDate: '2024-12-29'
  },
  {
    id: 'C007',
    name: 'GHI Chemicals',
    contactPerson: 'Rahul Joshi',
    phone: '+91 32109 87654',
    email: 'rahul@ghichem.com',
    address: '147 Chemical Complex, Wing A',
    area: 'Chemical Zone',
    route: 'Route 1',
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '390001',
    gst: '24GHIJK8901N4Y2',
    category: 'Premium',
    creditLimit: 600000,
    outstandingAmount: 180000,
    status: 'Active',
    registrationDate: '2024-07-25',
    lastOrderDate: '2024-12-31'
  },
  {
    id: 'C008',
    name: 'JKL Food Processing',
    contactPerson: 'Anita Gupta',
    phone: '+91 21098 76543',
    email: 'anita@jklfood.com',
    address: '258 Food Park, Unit 8',
    area: 'Food Processing Zone',
    route: 'Route 2',
    city: 'Indore',
    state: 'Madhya Pradesh',
    pincode: '452001',
    gst: '23JKLMN9012O5Z3',
    category: 'Standard',
    creditLimit: 280000,
    outstandingAmount: 65000,
    status: 'Active',
    registrationDate: '2024-08-30',
    lastOrderDate: '2024-12-27'
  },
  {
    id: 'C009',
    name: 'MNO Pharmaceuticals',
    contactPerson: 'Dr. Suresh Kumar',
    phone: '+91 10987 65432',
    email: 'suresh@mnopharma.com',
    address: '369 Pharma City, Tower B',
    area: 'Pharma District',
    route: 'Route 3',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500038',
    gst: '36MNOPQ0123P6A4',
    category: 'Premium',
    creditLimit: 550000,
    outstandingAmount: 220000,
    status: 'Inactive',
    registrationDate: '2024-09-15',
    lastOrderDate: '2024-12-25'
  },
  {
    id: 'C010',
    name: 'PQR Construction',
    contactPerson: 'Meera Iyer',
    phone: '+91 09876 54321',
    email: 'meera@pqrconstruction.com',
    address: '741 Construction Hub, Block 7',
    area: 'Construction Zone',
    route: 'Route 1',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    gst: '33PQRST1234Q7B5',
    category: 'Standard',
    creditLimit: 450000,
    outstandingAmount: 175000,
    status: 'Active',
    registrationDate: '2024-10-30',
    lastOrderDate: '2024-12-26'
  }
];

export default function MyCustomers() {
  // Permission hooks
  const permissions = useActionPermissions('sales', 'myCustomers');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // API Integration - Fetch customers
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['/api/customers'],
    enabled: permissions.canView
  });
  
  const customers = apiResponse?.customers || [];
  const stats = apiResponse?.stats || {};
  
  const [localCustomers, setLocalCustomers] = useState(dummyCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Early return if no view permission
  if (!permissions.canView) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Access Denied
              </h3>
              <p className="text-gray-600">
                You don't have permission to view My Customers module.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state - Updated to match API requirements
  const [formData, setFormData] = useState({
    customerName: '',
    contactName: '',
    mobile: '',
    email: '', // Optional
    addressLine1: '',
    city: '',
    state: '',
    country: 'India',
    pin: '',
    gstin: '', // Optional
    customerType: 'Retail',
    status: 'Active',
    notes: ''
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData) => {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(customerData)
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create customer');
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['/api/customers']);
      toast({
        title: "Success",
        description: result.message || "Customer created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    }
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, customerData }) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(customerData)
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update customer');
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['/api/customers']);
      toast({
        title: "Success",
        description: result.message || "Customer updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    }
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete customer');
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['/api/customers']);
      toast({
        title: "Success", 
        description: result.message || "Customer deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    }
  });

  // Get unique values for filters (fallback to local data while loading)
  const displayCustomers = customers.length > 0 ? customers : localCustomers;
  const categories = [...new Set(displayCustomers.map(c => c.customerType || c.category))];
  const routes = [...new Set(displayCustomers.map(c => c.route || 'Route 1'))];

  const filteredCustomers = displayCustomers.filter(customer => {
    const matchesSearch = 
      (customer.customerName || customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contactName || customer.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.mobile || customer.phone || '').includes(searchTerm) ||
      (customer.addressLine1 || customer.address || customer.area || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (customer.customerType || customer.category) === categoryFilter;
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesRoute = routeFilter === 'all' || (customer.route || 'Route 1') === routeFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesRoute;
  });

  const getCategoryVariant = (category) => {
    switch (category) {
      case 'Premium': return 'default';
      case 'Standard': return 'secondary';
      case 'Basic': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusVariant = (status) => {
    return status === 'Active' ? 'default' : 'destructive';
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      contactName: '',
      mobile: '',
      email: '',
      addressLine1: '',
      city: '',
      state: '',
      country: 'India',
      pin: '',
      gstin: '',
      customerType: 'Retail',
      status: 'Active',
      notes: ''
    });
  };

  const handleCreate = () => {
    createCustomerMutation.mutate(formData);
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      customerName: customer.customerName || customer.name || '',
      contactName: customer.contactName || customer.contactPerson || '',
      mobile: customer.mobile || customer.phone || '',
      email: customer.email || '',
      addressLine1: customer.addressLine1 || customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'India',
      pin: customer.pin || customer.pincode || '',
      gstin: customer.gstin || customer.gst || '',
      customerType: customer.customerType || customer.category || 'Retail',
      status: customer.status || 'Active',
      notes: customer.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    updateCustomerMutation.mutate({ 
      id: selectedCustomer._id || selectedCustomer.id, 
      customerData: formData 
    });
    setIsEditModalOpen(false);
    setSelectedCustomer(null);
    resetForm();
  };

  const handleDelete = (customer) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteCustomerMutation.mutate(customer._id || customer.id);
    }
  };

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  // Create form with isolated state to fix input focus issue
  const CreateCustomerForm = () => {
    const [localFormData, setLocalFormData] = useState({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      gst: '',
      geoLocation: ''
    });

    const handleSubmit = () => {
      if (!localFormData.name || !localFormData.contactPerson || !localFormData.phone) {
        return;
      }
      
      const newCustomer = {
        id: `C${(customers.length + 1).toString().padStart(3, '0')}`,
        ...localFormData,
        status: 'Active',
        category: 'Standard', // Default category
        route: 'Route 1', // Default route
        registrationDate: new Date().toISOString().split('T')[0],
        lastOrderDate: ''
      };
      
      setCustomers([...customers, newCustomer]);
      setIsCreateModalOpen(false);
    };

    return (
      <div className="space-y-6">
        {/* Primary Details Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Primary Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Customer Name</Label>
              <Input
                id="name"
                value={localFormData.name}
                onChange={(e) => setLocalFormData({ ...localFormData, name: e.target.value })}
                placeholder="Enter business name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="customerType" className="text-sm font-medium text-gray-700">Customer Type</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">Status</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gst" className="text-sm font-medium text-gray-700">GSTIN</Label>
              <Input
                id="gst"
                value={localFormData.gst}
                onChange={(e) => setLocalFormData({ ...localFormData, gst: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="mt-1"
              />
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
              <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700">Contact Name</Label>
              <Input
                id="contactPerson"
                value={localFormData.contactPerson}
                onChange={(e) => setLocalFormData({ ...localFormData, contactPerson: e.target.value })}
                placeholder="Enter Contact Name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Mobile</Label>
              <Input
                id="phone"
                value={localFormData.phone}
                onChange={(e) => setLocalFormData({ ...localFormData, phone: e.target.value })}
                placeholder="9005861923"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={localFormData.email}
                onChange={(e) => setLocalFormData({ ...localFormData, email: e.target.value })}
                placeholder="youremail@domain.in"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address Line 1</Label>
              <Input
                id="address"
                value={localFormData.address}
                onChange={(e) => setLocalFormData({ ...localFormData, address: e.target.value })}
                placeholder="8/2/15 Opposite to Central Bus Station"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
              <Input
                id="city"
                value={localFormData.city}
                onChange={(e) => setLocalFormData({ ...localFormData, city: e.target.value })}
                placeholder="8/2/15 Opposite to Central Bus Station"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state" className="text-sm font-medium text-gray-700">State</Label>
              <Input
                id="state"
                value={localFormData.state}
                onChange={(e) => setLocalFormData({ ...localFormData, state: e.target.value })}
                placeholder="8/2/15 Opposite to Central Bus Station"
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
              <Label htmlFor="pincode" className="text-sm font-medium text-gray-700">PIN</Label>
              <Input
                id="pincode"
                value={localFormData.pincode}
                onChange={(e) => setLocalFormData({ ...localFormData, pincode: e.target.value })}
                placeholder="512356"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Notes</h3>
          </div>
          <Textarea
            placeholder="Any added notes show up here. An example of multi-line comments if needed."
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsCreateModalOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!localFormData.name || !localFormData.contactPerson || !localFormData.phone}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Submit
          </Button>
        </div>
      </div>
    );
  };

  // Edit Customer Form Component
  const EditCustomerForm = () => {
    const [localFormData, setLocalFormData] = useState({
      name: selectedCustomer?.name || '',
      contactPerson: selectedCustomer?.contactPerson || '',
      phone: selectedCustomer?.phone || '',
      email: selectedCustomer?.email || '',
      address: selectedCustomer?.address || '',
      area: selectedCustomer?.area || '',
      city: selectedCustomer?.city || '',
      state: selectedCustomer?.state || '',
      pincode: selectedCustomer?.pincode || '',
      gst: selectedCustomer?.gst || '',
      geoLocation: selectedCustomer?.geoLocation || ''
    });

    const handleSubmit = () => {
      if (!localFormData.name || !localFormData.contactPerson || !localFormData.phone) {
        return;
      }
      
      const updatedCustomers = customers.map(customer => 
        customer.id === selectedCustomer.id 
          ? { ...customer, ...localFormData }
          : customer
      );
      
      setCustomers(updatedCustomers);
      setIsEditModalOpen(false);
    };

    return (
      <div className="space-y-6">
        {/* Primary Details Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Primary Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Customer Name</Label>
              <Input
                id="edit-name"
                value={localFormData.name}
                onChange={(e) => setLocalFormData({ ...localFormData, name: e.target.value })}
                placeholder="Enter business name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-customerType" className="text-sm font-medium text-gray-700">Customer Type</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-status" className="text-sm font-medium text-gray-700">Status</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-gst" className="text-sm font-medium text-gray-700">GSTIN</Label>
              <Input
                id="edit-gst"
                value={localFormData.gst}
                onChange={(e) => setLocalFormData({ ...localFormData, gst: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="mt-1"
              />
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
              <Label htmlFor="edit-contactPerson" className="text-sm font-medium text-gray-700">Contact Name</Label>
              <Input
                id="edit-contactPerson"
                value={localFormData.contactPerson}
                onChange={(e) => setLocalFormData({ ...localFormData, contactPerson: e.target.value })}
                placeholder="Enter Contact Name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">Mobile</Label>
              <Input
                id="edit-phone"
                value={localFormData.phone}
                onChange={(e) => setLocalFormData({ ...localFormData, phone: e.target.value })}
                placeholder="9005861923"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={localFormData.email}
                onChange={(e) => setLocalFormData({ ...localFormData, email: e.target.value })}
                placeholder="youremail@domain.in"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-address" className="text-sm font-medium text-gray-700">Address Line 1</Label>
              <Input
                id="edit-address"
                value={localFormData.address}
                onChange={(e) => setLocalFormData({ ...localFormData, address: e.target.value })}
                placeholder="8/2/15 Opposite to Central Bus Station"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-city" className="text-sm font-medium text-gray-700">City</Label>
              <Input
                id="edit-city"
                value={localFormData.city}
                onChange={(e) => setLocalFormData({ ...localFormData, city: e.target.value })}
                placeholder="8/2/15 Opposite to Central Bus Station"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-state" className="text-sm font-medium text-gray-700">State</Label>
              <Input
                id="edit-state"
                value={localFormData.state}
                onChange={(e) => setLocalFormData({ ...localFormData, state: e.target.value })}
                placeholder="8/2/15 Opposite to Central Bus Station"
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
              <Label htmlFor="edit-pincode" className="text-sm font-medium text-gray-700">PIN</Label>
              <Input
                id="edit-pincode"
                value={localFormData.pincode}
                onChange={(e) => setLocalFormData({ ...localFormData, pincode: e.target.value })}
                placeholder="512356"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Notes</h3>
          </div>
          <Textarea
            placeholder="Any added notes show up here. An example of multi-line comments if needed."
            rows={3}
            className="resize-none"
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsEditModalOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!localFormData.name || !localFormData.contactPerson || !localFormData.phone}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Submit
          </Button>
        </div>
      </div>
    );
  };

  // Calculate stats
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'Active').length,
    premium: customers.filter(c => c.category === 'Premium').length
  };

  return (
    <div className="px-2 py-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="bg-green-600 text-white px-3 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-md mx-0 sm:mx-0">
        {/* Mobile Layout */}
        <div className="flex sm:hidden items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <h1 className="text-lg font-semibold">My Customers</h1>
          </div>
          <div className="flex items-center space-x-2">
            {permissions.canAdd && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white text-green-600 hover:bg-green-50 text-sm px-3 py-2">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto" key="create-customer-modal">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Create New Customer</DialogTitle>
                    <DialogDescription>
                      Fill in the details to add a new customer.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateCustomerForm />
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm px-3 py-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Desktop Layout */}
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6" />
            <h1 className="text-xl font-semibold">My Customers</h1>
            <span className="hidden lg:inline text-green-100 text-sm">Manage customer relationships</span>
          </div>
          <div className="flex items-center space-x-3">
            {permissions.canAdd && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="bg-white text-green-600 hover:bg-green-50 text-sm px-3 py-2">
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Create Customer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto" key="create-customer-modal-desktop">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Create New Customer</DialogTitle>
                    <DialogDescription>
                      Fill in the details to add a new customer.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateCustomerForm />
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm px-3 py-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 px-0 sm:px-0">
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-sm sm:text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center">
              <Users className="h-3 w-3 sm:h-8 sm:w-8 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active</p>
              <p className="text-sm sm:text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center">
              <UserCheck className="h-3 w-3 sm:h-8 sm:w-8 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Premium</p>
              <p className="text-sm sm:text-2xl font-bold text-gray-900">{stats.premium}</p>
            </div>
            <div className="flex-shrink-0 flex items-center justify-center">
              <TrendingUp className="h-3 w-3 sm:h-8 sm:w-8 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6 mx-0 sm:mx-0">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6 mx-0 sm:mx-0">
        <h3 className="text-lg font-medium mb-3 sm:mb-4 px-0 sm:px-0">Customer List</h3>
        
        {/* Mobile Card View */}
        <div className="block sm:hidden">
          {/* Mobile Table Header */}
          <div className="flex items-center justify-between p-2 bg-gray-100 rounded-t-lg border-b border-gray-200 text-xs font-medium text-gray-600">
            <span className="flex-1">CUSTOMER</span>
            <span className="w-20 text-center">STATUS</span>
            <span className="w-24 text-center">ACTIONS</span>
          </div>
          
          {/* Mobile Cards */}
          <div className="space-y-0 border border-gray-200 border-t-0 rounded-b-lg overflow-hidden">
            {filteredCustomers.map((customer, index) => (
              <div key={customer.id} className={`p-2 ${index !== filteredCustomers.length - 1 ? 'border-b border-gray-200' : ''} bg-white hover:bg-gray-50:bg-gray-700`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {customer.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {customer.contactPerson} • {customer.phone}
                    </div>
                    <div className="text-xs text-gray-500">
                      {customer.city}, {customer.state}
                    </div>
                  </div>
                  <div className="w-20 flex justify-center">
                    <Badge 
                      variant={customer.status === 'Active' ? 'default' : 'destructive'}
                      className="text-xs px-2 py-1"
                    >
                      {customer.status}
                    </Badge>
                  </div>
                  <div className="w-24 flex justify-center space-x-1">
                    {permissions.canView && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                        onClick={() => handleView(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {permissions.canEdit && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-600"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {permissions.canDelete && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  {(permissions.canView || permissions.canEdit || permissions.canDelete) && (
                    <TableHead className="text-center">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-gray-50:bg-gray-800">
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.contactPerson}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {customer.phone}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {customer.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.city}, {customer.state}</div>
                        <div className="text-sm text-gray-500">{customer.area}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(customer.status)}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    {(permissions.canView || permissions.canEdit || permissions.canDelete) && (
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-1">
                          {permissions.canView && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 hover:bg-gray-100 hover:text-gray-600"
                              onClick={() => handleView(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canEdit && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 hover:bg-gray-100 hover:text-gray-600"
                              onClick={() => handleEdit(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {permissions.canDelete && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 hover:bg-gray-100 hover:text-gray-600"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer - {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              Update customer information and business details.
            </DialogDescription>
          </DialogHeader>
          <EditCustomerForm />
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View complete customer information and contact details.
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 sm:space-y-6">
              {/* Primary Details Section */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Primary Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Customer Name</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Category</Label>
                    <div className="mt-1">
                      <Badge variant={getCategoryVariant(selectedCustomer.category)}>
                        {selectedCustomer.category}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusVariant(selectedCustomer.status)}>
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">GST Number</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.gst || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Details Section */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Contact Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Contact Person</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.contactPerson}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Mobile</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Area</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.area}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Address</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.address}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Additional Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Registration Date</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.registrationDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Order Date</Label>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.lastOrderDate || 'No orders yet'}</p>
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