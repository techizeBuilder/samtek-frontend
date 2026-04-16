import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/api/salesService';
import { ActionButton, useActionPermissions } from '@/components/permissions/ActionButton';
import { useAuth } from '@/hooks/useAuth';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Truck,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Package,
  Calendar,
  MapPin,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  ChevronsUpDown,
  Check
} from 'lucide-react';

// Dummy delivery data
const dummyDeliveries = [
  {
    id: 'D001',
    orderNo: 'ORD-2025-001',
    customerName: 'ABC Manufacturing Ltd',
    customerAddress: '123 Industrial Area, Phase 1, Mumbai, Maharashtra - 400001',
    deliveryDate: '2025-01-07',
    timeSlot: '09:00 AM - 12:00 PM',
    driverName: 'Ramesh Kumar',
    vehicleNo: 'MH-01-AB-1234',
    contactNumber: '+91 98765 43210',
    items: [
      { name: 'Steel Rods', quantity: 50, unit: 'Pcs' },
      { name: 'Iron Sheets', quantity: 25, unit: 'Sheets' }
    ],
    status: 'Delivered',
    priority: 'High',
    notes: 'Delivery completed successfully',
    deliveredAt: '2025-01-07 10:30 AM',
    createdAt: '2025-01-05'
  },
  {
    id: 'D002',
    orderNo: 'ORD-2025-002',
    customerName: 'XYZ Industries Corp',
    customerAddress: '456 Tech Park, Building B2, Pune, Maharashtra - 411001',
    deliveryDate: '2025-01-08',
    timeSlot: '02:00 PM - 05:00 PM',
    driverName: 'Suresh Patel',
    vehicleNo: 'MH-12-CD-5678',
    contactNumber: '+91 87654 32109',
    items: [
      { name: 'Electronic Components', quantity: 100, unit: 'Pcs' },
      { name: 'Circuit Boards', quantity: 15, unit: 'Boards' }
    ],
    status: 'In Transit',
    priority: 'Medium',
    notes: 'Handle with care - fragile items',
    deliveredAt: null,
    createdAt: '2025-01-06'
  },
  {
    id: 'D003',
    orderNo: 'ORD-2025-003',
    customerName: 'PQR Steel Works',
    customerAddress: '789 Steel Complex, Sector 5, Ahmedabad, Gujarat - 380001',
    deliveryDate: '2025-01-09',
    timeSlot: '10:00 AM - 01:00 PM',
    driverName: 'Vikram Singh',
    vehicleNo: 'GJ-01-EF-9012',
    contactNumber: '+91 76543 21098',
    items: [
      { name: 'Heavy Machinery Parts', quantity: 8, unit: 'Units' },
      { name: 'Steel Pipes', quantity: 200, unit: 'Meters' }
    ],
    status: 'Scheduled',
    priority: 'High',
    notes: 'Requires crane for unloading',
    deliveredAt: null,
    createdAt: '2025-01-07'
  },
  {
    id: 'D004',
    orderNo: 'ORD-2025-004',
    customerName: 'LMN Auto Parts',
    customerAddress: '321 Auto Hub, Unit 12, Hyderabad, Telangana - 500001',
    deliveryDate: '2025-01-08',
    timeSlot: '08:00 AM - 11:00 AM',
    driverName: 'Anil Kumar',
    vehicleNo: 'TS-09-GH-3456',
    contactNumber: '+91 65432 10987',
    items: [
      { name: 'Car Engine Parts', quantity: 30, unit: 'Parts' },
      { name: 'Brake Pads', quantity: 60, unit: 'Sets' }
    ],
    status: 'Delivered',
    priority: 'Medium',
    notes: 'Customer satisfied with delivery',
    deliveredAt: '2025-01-08 09:45 AM',
    createdAt: '2025-01-06'
  },
  {
    id: 'D005',
    orderNo: 'ORD-2025-005',
    customerName: 'RST Electronics',
    customerAddress: '654 Electronics Mall, Floor 3, Bangalore, Karnataka - 560001',
    deliveryDate: '2025-01-10',
    timeSlot: '01:00 PM - 04:00 PM',
    driverName: 'Manoj Sharma',
    vehicleNo: 'KA-03-IJ-7890',
    contactNumber: '+91 54321 09876',
    items: [
      { name: 'LED Displays', quantity: 20, unit: 'Units' },
      { name: 'Control Panels', quantity: 10, unit: 'Panels' }
    ],
    status: 'Pending',
    priority: 'Low',
    notes: 'Awaiting customer confirmation',
    deliveredAt: null,
    createdAt: '2025-01-07'
  },
  {
    id: 'D006',
    orderNo: 'ORD-2025-006',
    customerName: 'DEF Textiles Ltd',
    customerAddress: '987 Textile Park, Block C, Coimbatore, Tamil Nadu - 641001',
    deliveryDate: '2025-01-09',
    timeSlot: '11:00 AM - 02:00 PM',
    driverName: 'Rajesh Nair',
    vehicleNo: 'TN-11-KL-2468',
    contactNumber: '+91 43210 98765',
    items: [
      { name: 'Textile Machinery', quantity: 3, unit: 'Machines' },
      { name: 'Raw Materials', quantity: 500, unit: 'Kg' }
    ],
    status: 'In Transit',
    priority: 'High',
    notes: 'Priority delivery for production line',
    deliveredAt: null,
    createdAt: '2025-01-07'
  },
  {
    id: 'D007',
    orderNo: 'ORD-2025-007',
    customerName: 'GHI Chemicals',
    customerAddress: '147 Chemical Complex, Wing A, Vadodara, Gujarat - 390001',
    deliveryDate: '2025-01-11',
    timeSlot: '09:00 AM - 12:00 PM',
    driverName: 'Deepak Joshi',
    vehicleNo: 'GJ-06-MN-1357',
    contactNumber: '+91 32109 87654',
    items: [
      { name: 'Chemical Containers', quantity: 25, unit: 'Containers' },
      { name: 'Safety Equipment', quantity: 40, unit: 'Sets' }
    ],
    status: 'Scheduled',
    priority: 'High',
    notes: 'Handle chemicals with extreme care',
    deliveredAt: null,
    createdAt: '2025-01-08'
  },
  {
    id: 'D008',
    orderNo: 'ORD-2025-008',
    customerName: 'JKL Food Processing',
    customerAddress: '258 Food Park, Unit 8, Indore, Madhya Pradesh - 452001',
    deliveryDate: '2025-01-10',
    timeSlot: '07:00 AM - 10:00 AM',
    driverName: 'Satish Gupta',
    vehicleNo: 'MP-09-OP-9753',
    contactNumber: '+91 21098 76543',
    items: [
      { name: 'Food Processing Equipment', quantity: 5, unit: 'Units' },
      { name: 'Packaging Materials', quantity: 1000, unit: 'Pieces' }
    ],
    status: 'Cancelled',
    priority: 'Medium',
    notes: 'Cancelled due to customer request',
    deliveredAt: null,
    createdAt: '2025-01-07'
  },
  {
    id: 'D009',
    orderNo: 'ORD-2025-009',
    customerName: 'MNO Pharmaceuticals',
    customerAddress: '369 Pharma City, Tower B, Hyderabad, Telangana - 500038',
    deliveryDate: '2025-01-12',
    timeSlot: '02:00 PM - 05:00 PM',
    driverName: 'Ravi Kumar',
    vehicleNo: 'TS-07-QR-8642',
    contactNumber: '+91 10987 65432',
    items: [
      { name: 'Medical Equipment', quantity: 12, unit: 'Units' },
      { name: 'Lab Supplies', quantity: 200, unit: 'Items' }
    ],
    status: 'Scheduled',
    priority: 'High',
    notes: 'Temperature-controlled delivery required',
    deliveredAt: null,
    createdAt: '2025-01-08'
  },
  {
    id: 'D010',
    orderNo: 'ORD-2025-010',
    customerName: 'PQR Construction',
    customerAddress: '741 Construction Hub, Block 7, Chennai, Tamil Nadu - 600001',
    deliveryDate: '2025-01-09',
    timeSlot: '06:00 AM - 09:00 AM',
    driverName: 'Karthik Iyer',
    vehicleNo: 'TN-01-ST-1975',
    contactNumber: '+91 09876 54321',
    items: [
      { name: 'Construction Materials', quantity: 100, unit: 'Bags' },
      { name: 'Tools', quantity: 25, unit: 'Sets' }
    ],
    status: 'Delivered',
    priority: 'Medium',
    notes: 'Early morning delivery completed',
    deliveredAt: '2025-01-09 07:30 AM',
    createdAt: '2025-01-07'
  }
];

// Dummy customer data for searchable dropdown
const dummyCustomers = [
  { id: 'C001', name: 'ABC Manufacturing Ltd', address: '123 Industrial Area, Phase 1, Mumbai, Maharashtra - 400001' },
  { id: 'C002', name: 'XYZ Industries', address: '456 Tech Park, Sector 2, Pune, Maharashtra - 411001' },
  { id: 'C003', name: 'DEF Electronics', address: '789 Electronic City, Phase 3, Bangalore, Karnataka - 560001' },
  { id: 'C004', name: 'Global Enterprises', address: '321 Business District, Zone 1, Delhi, Delhi - 110001' },
  { id: 'C005', name: 'Tech Solutions', address: '654 IT Hub, Area 4, Gurgaon, Haryana - 122001' },
  { id: 'C006', name: 'Prime Industries', address: '987 Industrial Zone, Sector 5, Noida, Uttar Pradesh - 201301' },
  { id: 'C007', name: 'GHI Chemicals', address: '147 Chemical Complex, Wing A, Vadodara, Gujarat - 390001' },
  { id: 'C008', name: 'JKL Food Processing', address: '258 Food Park, Unit 8, Indore, Madhya Pradesh - 452001' },
  { id: 'C009', name: 'MNO Pharmaceuticals', address: '369 Pharma City, Tower B, Hyderabad, Telangana - 500038' },
  { id: 'C010', name: 'PQR Construction', address: '741 Construction Hub, Block 7, Chennai, Tamil Nadu - 600001' }
];

// Dummy order data for searchable dropdown  
const dummyOrders = [
  { id: 'ORD-2025-001', customerName: 'ABC Manufacturing Ltd', amount: 125000, items: 'Steel Rods, Iron Sheets' },
  { id: 'ORD-2025-002', customerName: 'XYZ Industries', amount: 89000, items: 'Aluminum Parts, Connectors' },
  { id: 'ORD-2025-003', customerName: 'DEF Electronics', amount: 156000, items: 'Circuit Boards, Components' },
  { id: 'ORD-2025-004', customerName: 'Global Enterprises', amount: 234000, items: 'Machinery Parts, Tools' },
  { id: 'ORD-2025-005', customerName: 'Tech Solutions', amount: 67000, items: 'Software Licenses, Hardware' },
  { id: 'ORD-2025-006', customerName: 'Prime Industries', amount: 198000, items: 'Raw Materials, Equipment' },
  { id: 'ORD-2025-007', customerName: 'GHI Chemicals', amount: 145000, items: 'Chemical Containers, Safety Equipment' },
  { id: 'ORD-2025-008', customerName: 'JKL Food Processing', amount: 76000, items: 'Food Processing Equipment, Packaging' },
  { id: 'ORD-2025-009', customerName: 'MNO Pharmaceuticals', amount: 189000, items: 'Medical Equipment, Lab Supplies' },
  { id: 'ORD-2025-010', customerName: 'PQR Construction', amount: 98000, items: 'Construction Materials, Tools' }
];

export default function MyDeliveries() {
  // Get user role from auth context
  const { user } = useAuth();
  const userRole = user?.role || 'Sales';
  const isAdmin = userRole === 'Super User' || userRole === 'Unit Head';
  
  // Permission hooks
  const originalPermissions = useActionPermissions('sales', 'myDeliveries');
  
  // Restrict delivery personnel to view-only access
  const isDeliveryPersonnel = userRole === 'Dispatch' || userRole === 'Delivery';
  const permissions = isDeliveryPersonnel ? {
    ...originalPermissions,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canView: originalPermissions.canView
  } : originalPermissions;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  // Build query parameters for API call
  const queryParams = {
    page: currentPage,
    limit: 10,
    search: searchTerm
  };
  if (statusFilter !== 'all') queryParams.status = statusFilter;

  // Fetch deliveries with company filtering via sales API
  const { data: deliveriesResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/sales/my-deliveries', queryParams],
    queryFn: () => salesApi.getMyDeliveries(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const deliveries = deliveriesResponse?.deliveries || [];
  const pagination = deliveriesResponse?.pagination || {};

  // Calculate stats from real data if available
  const stats = {
    total: pagination.total || 0,
    dispatched: deliveries.filter(d => d.status === 'dispatched' || d.status === 'approved').length,
    verified: deliveries.filter(d => d.status === 'verified').length,
    completed: deliveries.filter(d => d.status === 'completed').length
  };

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
                You don't have permission to view My Deliveries module.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  const [formData, setFormData] = useState({
    orderNo: '',
    customerName: '',
    customerAddress: '',
    deliveryDate: '',
    timeSlot: '09:00 AM - 12:00 PM',
    driverName: '',
    vehicleNo: '',
    contactNumber: '',
    notes: ''
  });

  // Searchable dropdown states
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);

  // Server-side filtering is handled by the API, so we use the data directly
  const filteredDeliveries = deliveries;

  // Handle filter changes and reset to page 1
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'default';
      case 'dispatched': return 'secondary';
      case 'verified': return 'outline';
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'dispatched': return <Truck className="h-4 w-4" />;
      case 'verified': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleView = (delivery) => {
    setSelectedDelivery(delivery);
    setIsViewModalOpen(true);
  };

  return (
    <div className="px-2 py-2 sm:p-4 lg:p-6 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="bg-blue-600 text-white px-3 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-md mx-0 sm:mx-0">
        {/* Mobile Layout */}
        <div className="flex sm:hidden items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <h1 className="text-lg font-semibold">My Deliveries</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm px-3 py-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Desktop Layout */}
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <Truck className="h-6 w-6" />
            <h1 className="text-xl font-semibold">My Deliveries</h1>
            <span className="hidden lg:inline text-blue-100 text-sm">Track and manage deliveries</span>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm px-3 py-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 px-0 sm:px-0">
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6 shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Total Dispatches</p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
            <div className="p-2 bg-blue-50 rounded-full">
              <Package className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6 shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Verified</p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.verified}</p>
            <div className="p-2 bg-amber-50 rounded-full">
              <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6 shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Dispatched</p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.dispatched}</p>
            <div className="p-2 bg-indigo-50 rounded-full">
              <Truck className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg p-3 sm:p-6 shadow-sm">
          <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Completed</p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.completed}</p>
            <div className="p-2 bg-green-50 rounded-full">
              <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" />
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
                placeholder="Search deliveries..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Deliveries Table */}
      <div className="bg-white border border-gray-200 rounded-lg sm:rounded-lg overflow-hidden mx-0 sm:mx-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50:bg-gray-800">
                <TableHead className="w-[120px]">DC Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Dispatch Date</TableHead>
                <TableHead className="hidden lg:table-cell">Vehicle Information</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-20">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <RefreshCw className="h-8 w-8 text-gray-400 mb-2 animate-spin" />
                      <p className="text-gray-500">Loading deliveries...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Package className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No deliveries found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery._id} className="hover:bg-gray-50:bg-gray-700 transition-colors">
                    <TableCell className="font-bold text-blue-600">{delivery.dcno}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{delivery.customer?.name || 'Unknown Customer'}</span>
                        <span className="text-xs text-gray-500">{delivery.customer?.area || delivery.customer?.city || ''}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="mr-2 h-3.5 w-3.5" />
                        {new Date(delivery.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      <div className="flex flex-col text-gray-600">
                        <div className="flex items-center">
                          <Truck className="mr-2 h-3.5 w-3.5" />
                          {delivery.vehicleNumber || 'N/A'}
                        </div>
                        {delivery.transporterName && <span className="text-xs ml-5.5">{delivery.transporterName}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Badge variant="outline" className="bg-gray-50">
                        {delivery.totalItems} {delivery.totalItems === 1 ? 'Item' : 'Items'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Badge variant={getStatusVariant(delivery.status)} className="capitalize px-2.5 py-0.5">
                          {delivery.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => handleView(delivery)}
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
      </div>


      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delivery Details</DialogTitle>
            <DialogDescription>
              View complete delivery information and tracking details.
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">DC Number</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{selectedDelivery.dcno}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dispatch Date</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{new Date(selectedDelivery.date || selectedDelivery.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400 text-xs font-bold uppercase">Customer Information</Label>
                    <div className="mt-2 text-sm">
                      <p className="font-bold text-gray-900">{selectedDelivery.customer?.name}</p>
                      <p className="text-gray-600 mt-1">{selectedDelivery.customer?.address}</p>
                      <p className="text-gray-600">{selectedDelivery.customer?.city}, {selectedDelivery.customer?.area}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs font-bold uppercase">Status</Label>
                    <div className="mt-2">
                       <Badge variant={getStatusVariant(selectedDelivery.status)} className="capitalize px-4 py-1 text-sm font-semibold">
                         {selectedDelivery.status}
                       </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-400 text-xs font-bold uppercase">Logistics Details</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center text-sm text-gray-700">
                        <Truck className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">Vehicle:</span>
                        <span className="ml-2">{selectedDelivery.vehicleNumber || 'Not Specified'}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">Transporter:</span>
                        <span className="ml-2">{selectedDelivery.transporterName || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  {selectedDelivery.notes && (
                    <div>
                      <Label className="text-gray-400 text-xs font-bold uppercase">Internal Notes</Label>
                      <p className="mt-2 text-sm text-gray-600 bg-amber-50 p-3 rounded-lg flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-600 flex-shrink-0" />
                        {selectedDelivery.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <Label className="text-gray-400 text-xs font-bold uppercase mb-3 block text-center bg-gray-100 py-1.5 rounded-t-lg">Dispatched Items ({selectedDelivery.items?.length})</Label>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDelivery.items?.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium text-gray-800">{item.productName}</TableCell>
                          <TableCell className="text-right font-bold text-indigo-600">
                            {item.quantity} <span className="text-xs font-medium text-gray-400 ml-1">Units</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}