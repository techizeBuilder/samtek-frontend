import React, { useState } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  DollarSign,
  CreditCard,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  Check,
  ChevronsUpDown
} from 'lucide-react';

// Dummy ledger data
const dummyLedgerEntries = [
  {
    id: 'LED-001',
    date: '2025-01-07',
    customerName: 'ABC Manufacturing Ltd',
    description: 'Invoice INV-2025-001 - Steel Rods & Iron Sheets',
    invoiceNo: 'INV-2025-001',
    transactionType: 'Invoice',
    debitAmount: 147500,
    creditAmount: 0,
    balance: 147500,
    status: 'Cleared',
    paymentDate: '2025-01-15',
    paymentMethod: 'Bank Transfer',
    reference: 'REF-001',
    notes: 'Payment received on time'
  },
  {
    id: 'LED-002',
    date: '2025-01-15',
    customerName: 'ABC Manufacturing Ltd',
    description: 'Payment received for INV-2025-001',
    invoiceNo: 'INV-2025-001',
    transactionType: 'Payment',
    debitAmount: 0,
    creditAmount: 147500,
    balance: 0,
    status: 'Cleared',
    paymentDate: '2025-01-15',
    paymentMethod: 'Bank Transfer',
    reference: 'PAY-001',
    notes: 'Full payment received'
  },
  {
    id: 'LED-003',
    date: '2025-01-08',
    customerName: 'XYZ Industries Corp',
    description: 'Invoice INV-2025-002 - Electronic Components',
    invoiceNo: 'INV-2025-002',
    transactionType: 'Invoice',
    debitAmount: 100300,
    creditAmount: 0,
    balance: 100300,
    status: 'Partial',
    paymentDate: null,
    paymentMethod: 'Cheque',
    reference: 'REF-002',
    notes: 'Partial payment pending'
  },
  {
    id: 'LED-004',
    date: '2025-01-12',
    customerName: 'XYZ Industries Corp',
    description: 'Partial payment for INV-2025-002',
    invoiceNo: 'INV-2025-002',
    transactionType: 'Payment',
    debitAmount: 0,
    creditAmount: 50000,
    balance: 50300,
    status: 'Partial',
    paymentDate: '2025-01-12',
    paymentMethod: 'Cheque',
    reference: 'PAY-002',
    notes: 'First installment received'
  },
  {
    id: 'LED-005',
    date: '2025-01-09',
    customerName: 'PQR Steel Works',
    description: 'Invoice INV-2025-003 - Heavy Machinery Parts',
    invoiceNo: 'INV-2025-003',
    transactionType: 'Invoice',
    debitAmount: 295000,
    creditAmount: 0,
    balance: 295000,
    status: 'Pending',
    paymentDate: null,
    paymentMethod: 'Bank Transfer',
    reference: 'REF-003',
    notes: 'Awaiting payment'
  },
  {
    id: 'LED-006',
    date: '2025-01-08',
    customerName: 'LMN Auto Parts',
    description: 'Invoice INV-2025-004 - Car Engine Parts',
    invoiceNo: 'INV-2025-004',
    transactionType: 'Invoice',
    debitAmount: 88500,
    creditAmount: 0,
    balance: 88500,
    status: 'Cleared',
    paymentDate: '2025-01-12',
    paymentMethod: 'UPI',
    reference: 'REF-004',
    notes: 'Quick payment via UPI'
  },
  {
    id: 'LED-007',
    date: '2025-01-12',
    customerName: 'LMN Auto Parts',
    description: 'Payment received for INV-2025-004',
    invoiceNo: 'INV-2025-004',
    transactionType: 'Payment',
    debitAmount: 0,
    creditAmount: 88500,
    balance: 0,
    status: 'Cleared',
    paymentDate: '2025-01-12',
    paymentMethod: 'UPI',
    reference: 'PAY-004',
    notes: 'UPI payment processed'
  },
  {
    id: 'LED-008',
    date: '2025-01-10',
    customerName: 'RST Electronics',
    description: 'Invoice INV-2025-005 - LED Displays',
    invoiceNo: 'INV-2025-005',
    transactionType: 'Invoice',
    debitAmount: 53100,
    creditAmount: 0,
    balance: 53100,
    status: 'Overdue',
    paymentDate: null,
    paymentMethod: 'Bank Transfer',
    reference: 'REF-005',
    notes: 'Payment overdue by 3 days'
  },
  {
    id: 'LED-009',
    date: '2025-01-09',
    customerName: 'DEF Textiles Ltd',
    description: 'Invoice INV-2025-006 - Textile Machinery',
    invoiceNo: 'INV-2025-006',
    transactionType: 'Invoice',
    debitAmount: 230100,
    creditAmount: 0,
    balance: 230100,
    status: 'Partial',
    paymentDate: null,
    paymentMethod: 'Bank Transfer',
    reference: 'REF-006',
    notes: 'Awaiting remaining payment'
  },
  {
    id: 'LED-010',
    date: '2025-01-14',
    customerName: 'DEF Textiles Ltd',
    description: 'First installment for INV-2025-006',
    invoiceNo: 'INV-2025-006',
    transactionType: 'Payment',
    debitAmount: 0,
    creditAmount: 100000,
    balance: 130100,
    status: 'Partial',
    paymentDate: '2025-01-14',
    paymentMethod: 'Bank Transfer',
    reference: 'PAY-006',
    notes: 'First installment received'
  },
  {
    id: 'LED-011',
    date: '2025-01-11',
    customerName: 'GHI Chemicals',
    description: 'Invoice INV-2025-007 - Chemical Containers',
    invoiceNo: 'INV-2025-007',
    transactionType: 'Invoice',
    debitAmount: 212400,
    creditAmount: 0,
    balance: 212400,
    status: 'Pending',
    paymentDate: null,
    paymentMethod: 'Cheque',
    reference: 'REF-007',
    notes: 'Cheque expected this week'
  },
  {
    id: 'LED-012',
    date: '2025-01-10',
    customerName: 'JKL Food Processing',
    description: 'Invoice INV-2025-008 - Food Processing Equipment (Cancelled)',
    invoiceNo: 'INV-2025-008',
    transactionType: 'Adjustment',
    debitAmount: 0,
    creditAmount: 141600,
    balance: 0,
    status: 'Cancelled',
    paymentDate: null,
    paymentMethod: 'N/A',
    reference: 'ADJ-001',
    notes: 'Invoice cancelled due to order cancellation'
  },
  {
    id: 'LED-013',
    date: '2025-01-12',
    customerName: 'MNO Pharmaceuticals',
    description: 'Invoice INV-2025-009 - Medical Equipment',
    invoiceNo: 'INV-2025-009',
    transactionType: 'Invoice',
    debitAmount: 259600,
    creditAmount: 0,
    balance: 259600,
    status: 'Pending',
    paymentDate: null,
    paymentMethod: 'Bank Transfer',
    reference: 'REF-009',
    notes: 'Corporate payment process initiated'
  },
  {
    id: 'LED-014',
    date: '2025-01-09',
    customerName: 'PQR Construction',
    description: 'Invoice INV-2025-010 - Construction Materials',
    invoiceNo: 'INV-2025-010',
    transactionType: 'Invoice',
    debitAmount: 112100,
    creditAmount: 0,
    balance: 112100,
    status: 'Cleared',
    paymentDate: '2025-01-11',
    paymentMethod: 'RTGS',
    reference: 'REF-010',
    notes: 'RTGS payment received'
  },
  {
    id: 'LED-015',
    date: '2025-01-11',
    customerName: 'PQR Construction',
    description: 'Payment received for INV-2025-010',
    invoiceNo: 'INV-2025-010',
    transactionType: 'Payment',
    debitAmount: 0,
    creditAmount: 112100,
    balance: 0,
    status: 'Cleared',
    paymentDate: '2025-01-11',
    paymentMethod: 'RTGS',
    reference: 'PAY-010',
    notes: 'RTGS payment processed'
  }
];

export default function MyLedger() {
  // Permission hooks
  const permissions = useActionPermissions('sales', 'myLedger');
  
  const [ledgerEntries, setLedgerEntries] = useState(dummyLedgerEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

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
                You don't have permission to view My Ledger module.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    customerName: '',
    description: '',
    invoiceNo: '',
    transactionType: 'Invoice',
    debitAmount: '',
    creditAmount: '',
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    reference: '',
    notes: ''
  });

  // Get unique customers for filter
  const customers = [...new Set(ledgerEntries.map(entry => entry.customerName))];
  
  // Customer data for dropdown
  const [customersList] = useState([
    { id: 'CUST001', name: 'ABC Manufacturing Ltd' },
    { id: 'CUST002', name: 'XYZ Corporation' },
    { id: 'CUST003', name: 'PQR Construction' },
    { id: 'CUST004', name: 'LMN Manufacturing' },
    { id: 'CUST005', name: 'DEF Trading' },
    { id: 'CUST006', name: 'GHI Enterprises' },
    { id: 'CUST007', name: 'JKL Solutions' },
    { id: 'CUST008', name: 'MNO Industries' },
    { id: 'CUST009', name: 'STU Corporation' },
    { id: 'CUST010', name: 'VWX Manufacturing' }
  ]);

  // Customer search state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const filteredEntries = ledgerEntries.filter(entry => {
    const matchesSearch = 
      entry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = customerFilter === 'all' || entry.customerName === customerFilter;
    const matchesTransactionType = transactionTypeFilter === 'all' || entry.transactionType === transactionTypeFilter;
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const today = new Date();
      const entryDate = new Date(entry.date);
      
      switch (dateFilter) {
        case 'today':
          matchesDate = entryDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          matchesDate = entryDate >= weekAgo && entryDate <= today;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          matchesDate = entryDate >= monthAgo && entryDate <= today;
          break;
      }
    }

    return matchesSearch && matchesCustomer && matchesTransactionType && matchesStatus && matchesDate;
  });

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Cleared': return 'default';
      case 'Pending': return 'outline';
      case 'Partial': return 'secondary';
      case 'Overdue': return 'destructive';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getTransactionTypeVariant = (type) => {
    switch (type) {
      case 'Invoice': return 'default';
      case 'Payment': return 'secondary';
      case 'Adjustment': return 'outline';
      default: return 'outline';
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'Invoice': return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'Payment': return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'Adjustment': return <Edit className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      customerName: '',
      description: '',
      invoiceNo: '',
      transactionType: 'Invoice',
      debitAmount: '',
      creditAmount: '',
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
      reference: '',
      notes: ''
    });
  };

  const handleCreate = () => {
    const newEntry = {
      id: `LED-${(ledgerEntries.length + 1).toString().padStart(3, '0')}`,
      ...formData,
      debitAmount: parseFloat(formData.debitAmount) || 0,
      creditAmount: parseFloat(formData.creditAmount) || 0,
      balance: (parseFloat(formData.debitAmount) || 0) - (parseFloat(formData.creditAmount) || 0),
      paymentDate: formData.transactionType === 'Payment' ? formData.date : null
    };
    setLedgerEntries([...ledgerEntries, newEntry]);
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      date: entry.date,
      customerName: entry.customerName,
      description: entry.description,
      invoiceNo: entry.invoiceNo,
      transactionType: entry.transactionType,
      debitAmount: entry.debitAmount.toString(),
      creditAmount: entry.creditAmount.toString(),
      paymentMethod: entry.paymentMethod,
      status: entry.status,
      reference: entry.reference,
      notes: entry.notes
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = () => {
    const updatedEntries = ledgerEntries.map(entry =>
      entry.id === selectedEntry.id
        ? {
            ...entry,
            ...formData,
            debitAmount: parseFloat(formData.debitAmount) || 0,
            creditAmount: parseFloat(formData.creditAmount) || 0,
            balance: (parseFloat(formData.debitAmount) || 0) - (parseFloat(formData.creditAmount) || 0),
            paymentDate: formData.transactionType === 'Payment' ? formData.date : null
          }
        : entry
    );
    setLedgerEntries(updatedEntries);
    setIsEditModalOpen(false);
    setSelectedEntry(null);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this ledger entry?')) {
      setLedgerEntries(ledgerEntries.filter(entry => entry.id !== id));
    }
  };

  const handleView = (entry) => {
    setSelectedEntry(entry);
    setIsViewModalOpen(true);
  };

  // Create form with isolated state to fix input focus issue
  const CreateLedgerForm = () => {
    const [localFormData, setLocalFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      description: '',
      invoiceNo: '',
      transactionType: 'Invoice',
      debitAmount: '',
      creditAmount: '',
      paymentMethod: 'Bank Transfer',
      status: 'Pending',
      reference: '',
      notes: ''
    });
    const [localCustomerSearchOpen, setLocalCustomerSearchOpen] = useState(false);

    const handleSubmit = () => {
      if (!localFormData.date || !localFormData.customerName || !localFormData.description) {
        return;
      }
      
      const newEntry = {
        id: `LED${(ledgerEntries.length + 1).toString().padStart(3, '0')}`,
        ...localFormData,
        debitAmount: parseFloat(localFormData.debitAmount) || 0,
        creditAmount: parseFloat(localFormData.creditAmount) || 0,
        balance: (parseFloat(localFormData.debitAmount) || 0) - (parseFloat(localFormData.creditAmount) || 0),
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setLedgerEntries([...ledgerEntries, newEntry]);
      setIsCreateModalOpen(false);
    };

    return <LedgerFormUI 
      formData={localFormData} 
      setFormData={setLocalFormData} 
      customerSearchOpen={localCustomerSearchOpen}
      setCustomerSearchOpen={setLocalCustomerSearchOpen}
      onSubmit={handleSubmit} 
      onCancel={() => setIsCreateModalOpen(false)} 
      submitText="Add Entry" 
    />;
  };

  // Edit form using existing formData state
  const EditLedgerForm = () => {
    const [editCustomerSearchOpen, setEditCustomerSearchOpen] = useState(false);
    
    return <LedgerFormUI 
      formData={formData} 
      setFormData={setFormData} 
      customerSearchOpen={editCustomerSearchOpen}
      setCustomerSearchOpen={setEditCustomerSearchOpen}
      onSubmit={handleUpdate} 
      onCancel={() => { setIsEditModalOpen(false); resetForm(); }} 
      submitText="Update Entry" 
    />;
  };

  const LedgerFormUI = ({ formData, setFormData, customerSearchOpen, setCustomerSearchOpen, onSubmit, onCancel, submitText }) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Transaction Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="customerName">Customer Name *</Label>
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
                <CommandInput placeholder="Search customer..." />
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  {customersList.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.name}
                      onSelect={(currentValue) => {
                        const selectedCustomer = customersList.find(c => c.name.toLowerCase() === currentValue.toLowerCase());
                        if (selectedCustomer) {
                          setFormData({ 
                            ...formData, 
                            customerName: selectedCustomer.name
                          });
                        }
                        setCustomerSearchOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          formData.customerName?.toLowerCase() === customer.name.toLowerCase() ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {customer.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter transaction description"
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="invoiceNo">Invoice/Reference Number</Label>
          <Input
            id="invoiceNo"
            value={formData.invoiceNo}
            onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
            placeholder="Enter invoice number"
          />
        </div>
        <div>
          <Label htmlFor="transactionType">Transaction Type</Label>
          <Select value={formData.transactionType} onValueChange={(value) => setFormData({ ...formData, transactionType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select transaction type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Invoice">Invoice</SelectItem>
              <SelectItem value="Payment">Payment</SelectItem>
              <SelectItem value="Adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="debitAmount">Debit Amount</Label>
          <Input
            id="debitAmount"
            type="number"
            value={formData.debitAmount}
            onChange={(e) => setFormData({ ...formData, debitAmount: e.target.value })}
            placeholder="Enter debit amount"
          />
        </div>
        <div>
          <Label htmlFor="creditAmount">Credit Amount</Label>
          <Input
            id="creditAmount"
            type="number"
            value={formData.creditAmount}
            onChange={(e) => setFormData({ ...formData, creditAmount: e.target.value })}
            placeholder="Enter credit amount"
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
              <SelectItem value="N/A">N/A</SelectItem>
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
              <SelectItem value="Cleared">Cleared</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="Enter reference"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Enter notes"
            rows={3}
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!formData.date || !formData.customerName || !formData.description}>
          {submitText}
        </Button>
      </div>
    </div>
  );

  // Calculate stats
  const stats = {
    total: ledgerEntries.length,
    totalDebit: ledgerEntries.reduce((sum, entry) => sum + entry.debitAmount, 0),
    totalCredit: ledgerEntries.reduce((sum, entry) => sum + entry.creditAmount, 0),
    pendingAmount: ledgerEntries.filter(entry => entry.status === 'Pending').reduce((sum, entry) => sum + entry.balance, 0),
    overdueAmount: ledgerEntries.filter(entry => entry.status === 'Overdue').reduce((sum, entry) => sum + entry.balance, 0)
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Responsive Header */}
      <div className="bg-indigo-600 text-white px-4 sm:px-6 py-4 rounded-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            <h1 className="text-lg sm:text-xl font-semibold">My Ledger</h1>
            <span className="hidden lg:inline text-indigo-100 text-sm">Track transactions and balances</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm px-3 py-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <ActionButton 
                  module="sales" 
                  feature="myLedger" 
                  action="add"
                  variant="secondary"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 text-sm px-3 py-2"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Entry</span>
                </ActionButton>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
                <DialogHeader>
                  <DialogTitle>Add New Ledger Entry</DialogTitle>
                  <DialogDescription>
                    Create a new ledger entry with transaction details and customer information.
                  </DialogDescription>
                </DialogHeader>
                <CreateLedgerForm />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Debit</p>
                <p className="text-2xl font-bold text-red-600">₹{(stats.totalDebit / 100000).toFixed(1)}L</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credit</p>
                <p className="text-2xl font-bold text-green-600">₹{(stats.totalCredit / 100000).toFixed(1)}L</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">₹{(stats.pendingAmount / 100000).toFixed(1)}L</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-purple-600">₹{(stats.overdueAmount / 100000).toFixed(1)}L</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search ledger entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Invoice">Invoice</SelectItem>
                <SelectItem value="Payment">Payment</SelectItem>
                <SelectItem value="Adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Cleared">Cleared</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  {(permissions.canView || permissions.canEdit || permissions.canDelete) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-gray-50:bg-gray-800">
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {entry.date}
                        </div>
                        <div className="text-sm text-gray-500">{entry.reference}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.customerName}</div>
                        {entry.invoiceNo && (
                          <div className="text-sm text-gray-500">{entry.invoiceNo}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={entry.description}>
                        {entry.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTransactionTypeVariant(entry.transactionType)} className="flex items-center gap-1 w-fit">
                        {getTransactionIcon(entry.transactionType)}
                        {entry.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${entry.debitAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {entry.debitAmount > 0 ? `₹${entry.debitAmount.toLocaleString()}` : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${entry.creditAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {entry.creditAmount > 0 ? `₹${entry.creditAmount.toLocaleString()}` : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${entry.balance > 0 ? 'text-orange-600' : entry.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        ₹{Math.abs(entry.balance).toLocaleString()}
                        {entry.balance > 0 && <span className="text-xs ml-1">(Dr)</span>}
                        {entry.balance < 0 && <span className="text-xs ml-1">(Cr)</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(entry.status)}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    {(permissions.canView || permissions.canEdit || permissions.canDelete) && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {permissions.canView && (
                              <DropdownMenuItem onClick={() => handleView(entry)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            )}
                            {permissions.canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {permissions.canDelete && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(entry.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Ledger Entry - {selectedEntry?.id}</DialogTitle>
            <DialogDescription>
              Update ledger entry details and modify transaction information.
            </DialogDescription>
          </DialogHeader>
          <EditLedgerForm />
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ledger Entry Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Entry ID</Label>
                  <p className="text-sm font-medium">{selectedEntry.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date</Label>
                  <p className="text-sm font-medium">{selectedEntry.date}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Customer</Label>
                  <p className="text-sm font-medium">{selectedEntry.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Invoice/Reference</Label>
                  <p className="text-sm font-medium">{selectedEntry.invoiceNo || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm">{selectedEntry.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Transaction Type</Label>
                  <Badge variant={getTransactionTypeVariant(selectedEntry.transactionType)} className="flex items-center gap-1 w-fit">
                    {getTransactionIcon(selectedEntry.transactionType)}
                    {selectedEntry.transactionType}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Payment Method</Label>
                  <p className="text-sm font-medium">{selectedEntry.paymentMethod}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Debit Amount</Label>
                  <p className="text-sm font-medium text-red-600">₹{selectedEntry.debitAmount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Credit Amount</Label>
                  <p className="text-sm font-medium text-green-600">₹{selectedEntry.creditAmount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Balance</Label>
                  <p className={`text-sm font-medium ${selectedEntry.balance > 0 ? 'text-orange-600' : selectedEntry.balance < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    ₹{Math.abs(selectedEntry.balance).toLocaleString()}
                    {selectedEntry.balance > 0 && <span className="text-xs ml-1">(Dr)</span>}
                    {selectedEntry.balance < 0 && <span className="text-xs ml-1">(Cr)</span>}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={getStatusVariant(selectedEntry.status)}>
                    {selectedEntry.status}
                  </Badge>
                </div>
                {selectedEntry.paymentDate && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Payment Date</Label>
                    <p className="text-sm font-medium text-green-600">{selectedEntry.paymentDate}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-500">Reference</Label>
                  <p className="text-sm font-medium">{selectedEntry.reference}</p>
                </div>
                {selectedEntry.notes && (
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-gray-500">Notes</Label>
                    <p className="text-sm">{selectedEntry.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}