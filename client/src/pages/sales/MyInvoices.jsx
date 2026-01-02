import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/api/salesService';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  DollarSign,
  Calendar,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  FileCheck,
  ChevronsUpDown,
  Check,
  Package,
  User,
  CreditCard
} from 'lucide-react';

// Dummy invoice data
const dummyInvoices = [
  {
    id: 'INV-2025-001',
    customerName: 'ABC Manufacturing Ltd',
    customerEmail: 'rajesh@abcmfg.com',
    orderNo: 'ORD-2025-001',
    invoiceDate: '2025-01-07',
    dueDate: '2025-02-06',
    amount: 125000,
    paidAmount: 125000,
    balanceAmount: 0,
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
    items: [
      { name: 'Steel Rods', quantity: 50, rate: 2000, amount: 100000, image: 'https://images.unsplash.com/photo-1587143618068-57e59a04ab18?w=150&h=150&fit=crop&crop=center', description: 'High quality steel rods for construction' },
      { name: 'Iron Sheets', quantity: 25, rate: 1000, amount: 25000, image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=150&h=150&fit=crop&crop=center', description: 'Galvanized iron sheets' }
    ],
    gstAmount: 22500,
    totalAmount: 147500,
    paymentDate: '2025-01-15',
    notes: 'Payment received on time',
    createdAt: '2025-01-07'
  },
  {
    id: 'INV-2025-002',
    customerName: 'XYZ Industries Corp',
    customerEmail: 'priya@xyzind.com',
    orderNo: 'ORD-2025-002',
    invoiceDate: '2025-01-08',
    dueDate: '2025-02-07',
    amount: 85000,
    paidAmount: 50000,
    balanceAmount: 35000,
    status: 'Partially Paid',
    paymentMethod: 'Cheque',
    items: [
      { name: 'Electronic Components', quantity: 100, rate: 750, amount: 75000, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=150&h=150&fit=crop&crop=center', description: 'High-grade electronic components' },
      { name: 'Circuit Boards', quantity: 15, rate: 667, amount: 10000, image: 'https://images.unsplash.com/photo-1635736835149-01bbc603c53b?w=150&h=150&fit=crop&crop=center', description: 'PCB circuit boards' }
    ],
    gstAmount: 15300,
    totalAmount: 100300,
    paymentDate: null,
    notes: 'Partial payment received',
    createdAt: '2025-01-08'
  },
  {
    id: 'INV-2025-003',
    customerName: 'PQR Steel Works',
    customerEmail: 'amit@pqrsteel.com',
    orderNo: 'ORD-2025-003',
    invoiceDate: '2025-01-09',
    dueDate: '2025-02-08',
    amount: 250000,
    paidAmount: 0,
    balanceAmount: 250000,
    status: 'Pending',
    paymentMethod: 'Bank Transfer',
    items: [
      { name: 'Heavy Machinery Parts', quantity: 8, rate: 25000, amount: 200000, image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=150&h=150&fit=crop&crop=center', description: 'Industrial machinery components' },
      { name: 'Steel Pipes', quantity: 200, rate: 250, amount: 50000, image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=150&h=150&fit=crop&crop=center', description: 'Galvanized steel pipes' }
    ],
    gstAmount: 45000,
    totalAmount: 295000,
    paymentDate: null,
    notes: 'Awaiting payment',
    createdAt: '2025-01-09'
  },
  {
    id: 'INV-2025-004',
    customerName: 'LMN Auto Parts',
    customerEmail: 'sneha@lmnauto.com',
    orderNo: 'ORD-2025-004',
    invoiceDate: '2025-01-08',
    dueDate: '2025-02-07',
    amount: 75000,
    paidAmount: 75000,
    balanceAmount: 0,
    status: 'Paid',
    paymentMethod: 'UPI',
    items: [
      { name: 'Car Engine Parts', quantity: 30, rate: 2000, amount: 60000 },
      { name: 'Brake Pads', quantity: 60, rate: 250, amount: 15000 }
    ],
    gstAmount: 13500,
    totalAmount: 88500,
    paymentDate: '2025-01-12',
    notes: 'Quick payment via UPI',
    createdAt: '2025-01-08'
  },
  {
    id: 'INV-2025-005',
    customerName: 'RST Electronics',
    customerEmail: 'vikram@rstelectronics.com',
    orderNo: 'ORD-2025-005',
    invoiceDate: '2025-01-10',
    dueDate: '2025-02-09',
    amount: 45000,
    paidAmount: 0,
    balanceAmount: 45000,
    status: 'Overdue',
    paymentMethod: 'Bank Transfer',
    items: [
      { name: 'LED Displays', quantity: 20, rate: 2000, amount: 40000 },
      { name: 'Control Panels', quantity: 10, rate: 500, amount: 5000 }
    ],
    gstAmount: 8100,
    totalAmount: 53100,
    paymentDate: null,
    notes: 'Payment overdue',
    createdAt: '2025-01-10'
  },
  {
    id: 'INV-2025-006',
    customerName: 'DEF Textiles Ltd',
    customerEmail: 'kavya@deftextiles.com',
    orderNo: 'ORD-2025-006',
    invoiceDate: '2025-01-09',
    dueDate: '2025-02-08',
    amount: 195000,
    paidAmount: 100000,
    balanceAmount: 95000,
    status: 'Partially Paid',
    paymentMethod: 'Bank Transfer',
    items: [
      { name: 'Textile Machinery', quantity: 3, rate: 60000, amount: 180000 },
      { name: 'Raw Materials', quantity: 500, rate: 30, amount: 15000 }
    ],
    gstAmount: 35100,
    totalAmount: 230100,
    paymentDate: null,
    notes: 'First installment received',
    createdAt: '2025-01-09'
  },
  {
    id: 'INV-2025-007',
    customerName: 'GHI Chemicals',
    customerEmail: 'rahul@ghichem.com',
    orderNo: 'ORD-2025-007',
    invoiceDate: '2025-01-11',
    dueDate: '2025-02-10',
    amount: 180000,
    paidAmount: 0,
    balanceAmount: 180000,
    status: 'Pending',
    paymentMethod: 'Cheque',
    items: [
      { name: 'Chemical Containers', quantity: 25, rate: 6000, amount: 150000 },
      { name: 'Safety Equipment', quantity: 40, rate: 750, amount: 30000 }
    ],
    gstAmount: 32400,
    totalAmount: 212400,
    paymentDate: null,
    notes: 'Cheque expected this week',
    createdAt: '2025-01-11'
  },
  {
    id: 'INV-2025-008',
    customerName: 'JKL Food Processing',
    customerEmail: 'anita@jklfood.com',
    orderNo: 'ORD-2025-008',
    invoiceDate: '2025-01-10',
    dueDate: '2025-02-09',
    amount: 120000,
    paidAmount: 0,
    balanceAmount: 120000,
    status: 'Cancelled',
    paymentMethod: 'Bank Transfer',
    items: [
      { name: 'Food Processing Equipment', quantity: 5, rate: 20000, amount: 100000 },
      { name: 'Packaging Materials', quantity: 1000, rate: 20, amount: 20000 }
    ],
    gstAmount: 21600,
    totalAmount: 141600,
    paymentDate: null,
    notes: 'Invoice cancelled due to order cancellation',
    createdAt: '2025-01-10'
  },
  {
    id: 'INV-2025-009',
    customerName: 'MNO Pharmaceuticals',
    customerEmail: 'suresh@mnopharma.com',
    orderNo: 'ORD-2025-009',
    invoiceDate: '2025-01-12',
    dueDate: '2025-02-11',
    amount: 220000,
    paidAmount: 0,
    balanceAmount: 220000,
    status: 'Pending',
    paymentMethod: 'Bank Transfer',
    items: [
      { name: 'Medical Equipment', quantity: 12, rate: 15000, amount: 180000 },
      { name: 'Lab Supplies', quantity: 200, rate: 200, amount: 40000 }
    ],
    gstAmount: 39600,
    totalAmount: 259600,
    paymentDate: null,
    notes: 'Corporate payment process initiated',
    createdAt: '2025-01-12'
  },
  {
    id: 'INV-2025-010',
    customerName: 'PQR Construction',
    customerEmail: 'meera@pqrconstruction.com',
    orderNo: 'ORD-2025-010',
    invoiceDate: '2025-01-09',
    dueDate: '2025-02-08',
    amount: 95000,
    paidAmount: 95000,
    balanceAmount: 0,
    status: 'Paid',
    paymentMethod: 'RTGS',
    items: [
      { name: 'Construction Materials', quantity: 100, rate: 800, amount: 80000 },
      { name: 'Tools', quantity: 25, rate: 600, amount: 15000 }
    ],
    gstAmount: 17100,
    totalAmount: 112100,
    paymentDate: '2025-01-11',
    notes: 'RTGS payment received',
    createdAt: '2025-01-09'
  }
];

// Dummy customer data for searchable dropdown
const dummyCustomers = [
  { id: 'C001', name: 'ABC Manufacturing Ltd', email: 'rajesh@abcmfg.com' },
  { id: 'C002', name: 'XYZ Industries', email: 'priya@xyzind.com' },
  { id: 'C003', name: 'DEF Electronics', email: 'amit@defelec.com' },
  { id: 'C004', name: 'Global Enterprises', email: 'sunita@globalent.com' },
  { id: 'C005', name: 'Tech Solutions', email: 'ravi@techsol.com' },
  { id: 'C006', name: 'Prime Industries', email: 'kavita@primeind.com' },
  { id: 'C007', name: 'GHI Chemicals', email: 'rahul@ghichem.com' },
  { id: 'C008', name: 'JKL Food Processing', email: 'anita@jklfood.com' },
  { id: 'C009', name: 'MNO Pharmaceuticals', email: 'suresh@mnopharma.com' },
  { id: 'C010', name: 'PQR Construction', email: 'meera@pqrconstruction.com' }
];

export default function MyInvoices() {
  // Permission hooks
  const permissions = useActionPermissions('sales', 'myInvoices');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // Build query parameters for API call
  const queryParams = {
    page: currentPage,
    limit: 10,
    search: searchTerm
  };
  if (statusFilter !== 'all') queryParams.paymentStatus = statusFilter;

  // Fetch invoices with company filtering via sales API
  const { data: invoicesResponse, isLoading, refetch } = useQuery({
    queryKey: ['/api/sales/my-invoices', queryParams],
    queryFn: () => salesApi.getMyInvoices(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const invoices = invoicesResponse?.invoices || [];
  const pagination = invoicesResponse?.pagination || {};

  // Handle filter changes and reset to page 1
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };
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
                You don't have permission to view My Invoices module.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    orderNo: '',
    invoiceDate: '',
    dueDate: '',
    amount: '',
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    notes: ''
  });

  // Searchable dropdown state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  // Server-side filtering is handled by the API, so we use the data directly
  const filteredInvoices = invoices;

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Partially Paid': return 'secondary';
      case 'Pending': return 'outline';
      case 'Overdue': return 'destructive';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="h-4 w-4" />;
      case 'Partially Paid': return <Clock className="h-4 w-4" />;
      case 'Pending': return <Clock className="h-4 w-4" />;
      case 'Overdue': return <AlertCircle className="h-4 w-4" />;
      case 'Cancelled': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      orderNo: '',
      invoiceDate: '',
      dueDate: '',
      amount: '',
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
      notes: ''
    });
  };

  const handleCreate = () => {
    const newInvoice = {
      id: `INV-2025-${(invoices.length + 1).toString().padStart(3, '0')}`,
      ...formData,
      status: 'Pending', // Default status for new invoices
      amount: parseFloat(formData.amount) || 0,
      paidAmount: 0,
      balanceAmount: parseFloat(formData.amount) || 0,
      items: [],
      gstAmount: (parseFloat(formData.amount) || 0) * 0.18,
      totalAmount: (parseFloat(formData.amount) || 0) * 1.18,
      paymentDate: null,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setInvoices([...invoices, newInvoice]);
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      orderNo: invoice.orderNo,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      amount: invoice.amount.toString(),
      paymentMethod: invoice.paymentMethod,
      status: invoice.status,
      notes: invoice.notes
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    const updatedInvoices = invoices.map(invoice =>
      invoice.id === selectedInvoice.id
        ? {
            ...invoice,
            ...formData,
            amount: parseFloat(formData.amount) || 0,
            balanceAmount: parseFloat(formData.amount) - invoice.paidAmount,
            gstAmount: (parseFloat(formData.amount) || 0) * 0.18,
            totalAmount: (parseFloat(formData.amount) || 0) * 1.18
          }
        : invoice
    );
    setInvoices(updatedInvoices);
    setIsEditModalOpen(false);
    setSelectedInvoice(null);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(invoices.filter(invoice => invoice.id !== id));
    }
  };

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handleStatusUpdate = (invoice) => {
    setSelectedInvoice(invoice);
    setNewStatus(invoice.status);
    setIsStatusModalOpen(true);
  };

  const updateInvoiceStatus = () => {
    const updatedInvoices = invoices.map(invoice =>
      invoice.id === selectedInvoice.id
        ? { ...invoice, status: newStatus }
        : invoice
    );
    setInvoices(updatedInvoices);
    setIsStatusModalOpen(false);
    setSelectedInvoice(null);
  };

  const generatePDF = (invoice) => {
    // Create a comprehensive PDF invoice
    const pdfContent = `
INVOICE
${invoice.id}

Bill To:
${invoice.customerName}
${invoice.customerEmail}

Invoice Date: ${invoice.invoiceDate}
Due Date: ${invoice.dueDate}
Order Number: ${invoice.orderNo}

ITEMS:
${invoice.items?.map(item => 
  `${item.name} - Qty: ${item.quantity} - Rate: ₹${item.rate} - Amount: ₹${item.amount}`
).join('\n') || 'No items'}

Base Amount: ₹${invoice.amount.toLocaleString()}
GST (18%): ₹${invoice.gstAmount.toLocaleString()}
Total Amount: ₹${invoice.totalAmount.toLocaleString()}

Payment Method: ${invoice.paymentMethod}
Status: ${invoice.status}

${invoice.notes ? `Notes: ${invoice.notes}` : ''}
    `;

    // Create and download the PDF
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Create form with isolated state to fix input focus issue
  const CreateInvoiceForm = () => {
    const [localFormData, setLocalFormData] = useState({
      customerName: '',
      customerEmail: '',
      orderNo: '',
      amount: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      paymentMethod: 'Bank Transfer',
      notes: ''
    });

    const handleSubmit = () => {
      if (!localFormData.customerName || !localFormData.orderNo || !localFormData.amount) {
        return;
      }
      
      const newInvoice = {
        id: `INV${(invoices.length + 1).toString().padStart(3, '0')}`,
        ...localFormData,
        status: 'Pending',
        totalAmount: parseFloat(localFormData.amount),
        paidAmount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setInvoices([...invoices, newInvoice]);
      setIsCreateModalOpen(false);
    };

    return <InvoiceFormUI formData={localFormData} setFormData={setLocalFormData} onSubmit={handleSubmit} onCancel={() => setIsCreateModalOpen(false)} submitText="Create Invoice" />;
  };

  // Edit form using existing formData state
  const EditInvoiceForm = () => (
    <InvoiceFormUI formData={formData} setFormData={setFormData} onSubmit={handleUpdate} onCancel={() => { setIsEditModalOpen(false); resetForm(); }} submitText="Update Invoice" />
  );

  const InvoiceFormUI = ({ formData, setFormData, onSubmit, onCancel, submitText }) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Customer Name *</Label>
          <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={customerSearchOpen}
                className="w-full justify-between"
              >
                {formData.customerName || "Select customer..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search customers..." />
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  {dummyCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.name}
                      onSelect={(currentValue) => {
                        const selectedCustomer = dummyCustomers.find(c => c.name.toLowerCase() === currentValue.toLowerCase());
                        if (selectedCustomer) {
                          setFormData({ 
                            ...formData, 
                            customerName: selectedCustomer.name,
                            customerEmail: selectedCustomer.email
                          });
                        }
                        setCustomerSearchOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          formData.customerName === customer.name ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-sm text-muted-foreground">{customer.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="customerEmail">Customer Email</Label>
          <Input
            id="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            placeholder="Enter customer email"
          />
        </div>
        <div>
          <Label htmlFor="orderNo">Order Number *</Label>
          <Input
            id="orderNo"
            value={formData.orderNo}
            onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
            placeholder="Enter order number"
          />
        </div>
        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="Enter invoice amount"
          />
        </div>
        <div>
          <Label htmlFor="invoiceDate">Invoice Date *</Label>
          <Input
            id="invoiceDate"
            type="date"
            value={formData.invoiceDate}
            onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
              <SelectItem value="RTGS">RTGS</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Partially Paid">Partially Paid</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Enter invoice notes"
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!formData.customerName || !formData.orderNo || !formData.amount}>
          {submitText}
        </Button>
      </div>
    </div>
  );

  // Calculate stats
  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
    paid: invoices.filter(inv => inv.status === 'Paid').length,
    pending: invoices.filter(inv => inv.status === 'Pending').length,
    overdue: invoices.filter(inv => inv.status === 'Overdue').length
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header - Blue Background with Icon and Title */}
      <div className="bg-blue-600 rounded-lg px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          <FileText className="h-5 w-5" />
          <h1 className="text-lg font-semibold">My Invoices</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <ActionButton 
                module="sales" 
                feature="myInvoices" 
                action="add"
                className="bg-white hover:bg-gray-50 text-blue-600 border-0 h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </ActionButton>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto mx-auto">
              <DialogHeader className="pb-3">
                <DialogTitle className="text-lg">Create New Invoice</DialogTitle>
                <DialogDescription className="text-sm">
                  Create a new invoice with customer details and payment information.
                </DialogDescription>
              </DialogHeader>
              <CreateInvoiceForm />
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="bg-white hover:bg-gray-50 text-blue-600 border-0 h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold">{invoices.filter(inv => inv.status === 'Partially Paid').length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
              </div>
              <FileCheck className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search invoices..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {/* Status Filter */}
      <div className="w-full">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Partially Paid">Approved</SelectItem>
            <SelectItem value="Paid">Completed</SelectItem>
            <SelectItem value="Overdue">Overdue</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice List Header */}
      <div className="bg-white rounded-lg">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Invoice List</h2>
        </div>
        
        {/* Table Header - Shown on desktop, hidden on mobile */}
        <div className="hidden md:grid px-4 py-3 border-b bg-gray-50 grid-cols-7 gap-4 text-sm font-medium text-gray-600">
          <div>CUSTOMER</div>
          <div>INVOICE ID</div>
          <div>ORDER NO</div>
          <div>AMOUNT</div>
          <div>DUE DATE</div>
          <div>STATUS</div>
          <div>ACTIONS</div>
        </div>

        {/* Invoice Items */}
        <div className="divide-y">
          {isLoading ? (
            <div className="px-4 py-8 text-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-500">Loading invoices...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="flex flex-col items-center">
                <p className="text-gray-500 text-lg font-medium">No invoices found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
              </div>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="px-4 py-4 hover:bg-gray-50">
              {/* Mobile Layout - List Format */}
              <div className="md:hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{invoice.customerName}</div>
                    <div className="text-sm text-gray-500">{invoice.id}</div>
                    <div className="text-sm text-gray-500">{invoice.invoiceDate} • Qty: {invoice.items?.length || 0}</div>
                  </div>
                  <Badge 
                    variant={getStatusVariant(invoice.status)} 
                    className={`inline-flex items-center gap-1 ${
                      invoice.status === 'Paid' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                      invoice.status === 'Pending' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                      invoice.status === 'Partially Paid' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' :
                      'bg-red-100 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    {invoice.status === 'Paid' ? 'Completed' :
                     invoice.status === 'Partially Paid' ? 'Approved' :
                     invoice.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-end space-x-1 mt-2">
                  {permissions.canView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(invoice)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(invoice)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generatePDF(invoice)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {permissions.canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusUpdate(invoice)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                      title="Update Status"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(invoice.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Desktop Layout - Table Format */}
              <div className="hidden md:grid grid-cols-7 gap-4 items-center">
                {/* Customer Column */}
                <div className="flex flex-col">
                  <div className="font-medium text-gray-900">{invoice.customerName}</div>
                  <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
                </div>

                {/* Invoice ID Column */}
                <div className="text-sm font-medium text-gray-900">{invoice.id}</div>

                {/* Order Number Column */}
                <div className="text-sm text-gray-700">{invoice.orderNo}</div>

                {/* Amount Column */}
                <div className="flex flex-col">
                  <div className="font-medium text-gray-900">₹{invoice.totalAmount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">+GST ₹{invoice.gstAmount.toLocaleString()}</div>
                </div>

                {/* Due Date Column */}
                <div className="flex flex-col">
                  <div className="text-sm text-gray-900">{invoice.dueDate}</div>
                  <div className="text-xs text-gray-500">{invoice.invoiceDate}</div>
                </div>

                {/* Status Column */}
                <div>
                  <Badge 
                    variant={getStatusVariant(invoice.status)} 
                    className={`inline-flex items-center gap-1 ${
                      invoice.status === 'Paid' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                      invoice.status === 'Pending' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                      invoice.status === 'Partially Paid' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' :
                      'bg-red-100 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    {invoice.status === 'Paid' ? 'Completed' :
                     invoice.status === 'Partially Paid' ? 'Approved' :
                     invoice.status}
                  </Badge>
                </div>

                {/* Actions Column */}
                <div className="flex items-center justify-end space-x-1">
                  {permissions.canView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(invoice)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(invoice)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generatePDF(invoice)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {permissions.canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusUpdate(invoice)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                      title="Update Status"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(invoice.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice - {selectedInvoice?.id}</DialogTitle>
            <DialogDescription>
              Update invoice details and modify payment information.
            </DialogDescription>
          </DialogHeader>
          <EditInvoiceForm />
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle>Invoice Details</DialogTitle>
                <DialogDescription>
                  View complete invoice information and payment status.
                </DialogDescription>
              </div>
              {selectedInvoice && (
                <Button
                  onClick={() => generatePDF(selectedInvoice)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Invoice ID</Label>
                  <p className="text-sm font-medium">{selectedInvoice.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Order Number</Label>
                  <p className="text-sm font-medium">{selectedInvoice.orderNo}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer</Label>
                  <p className="text-sm font-medium">{selectedInvoice.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.customerEmail}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Payment Method</Label>
                  <Badge variant="outline">{selectedInvoice.paymentMethod}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Invoice Date</Label>
                  <p className="text-sm font-medium">{selectedInvoice.invoiceDate}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Due Date</Label>
                  <p className="text-sm font-medium">{selectedInvoice.dueDate}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Base Amount</Label>
                  <p className="text-sm font-medium">₹{selectedInvoice.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">GST Amount</Label>
                  <p className="text-sm font-medium">₹{selectedInvoice.gstAmount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Amount</Label>
                  <p className="text-sm font-medium text-lg">₹{selectedInvoice.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Paid Amount</Label>
                  <p className="text-sm font-medium text-green-600">₹{selectedInvoice.paidAmount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Balance Amount</Label>
                  <p className="text-sm font-medium text-orange-600">₹{selectedInvoice.balanceAmount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={getStatusVariant(selectedInvoice.status)} className="flex items-center gap-1 w-fit">
                    {getStatusIcon(selectedInvoice.status)}
                    {selectedInvoice.status}
                  </Badge>
                </div>
                {selectedInvoice.paymentDate && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Payment Date</Label>
                    <p className="text-sm font-medium text-green-600">{selectedInvoice.paymentDate}</p>
                  </div>
                )}
                {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500 mb-3 block">Items</Label>
                    <div className="space-y-4">
                      {selectedInvoice.items.map((item, index) => (
                        <div key={index} className="flex items-start space-x-4 p-3 border rounded-lg">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-lg border"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=150&h=150&fit=crop&crop=center';
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                {item.description && (
                                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                                )}
                                <div className="text-sm text-gray-600 mt-1">
                                  Qty: {item.quantity} × ₹{item.rate?.toLocaleString() || 0}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">₹{item.amount.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedInvoice.notes && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Notes</Label>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Invoice Status</DialogTitle>
            <DialogDescription>
              Change the status of invoice {selectedInvoice?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Status</Label>
              <p className="text-sm text-gray-600">{selectedInvoice?.status}</p>
            </div>
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={updateInvoiceStatus}
              disabled={!newStatus || newStatus === selectedInvoice?.status}
            >
              Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}