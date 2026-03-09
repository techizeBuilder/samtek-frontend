// THIS IS A CLEAN VERSION - replacing the problematic section
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UserPlus,
  Search,
  Filter,
  Edit,
  Key,
  Trash2,
  Eye,
  Plus,
  X,
  Users,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  Settings,
  Lock,
  EyeOff,
  Download,
  Upload,
  Building2 as Building2Icon,
  UserCheck,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';

// Unit Head specific modules and permissions - All unit roles they can manage
const UNIT_HEAD_MANAGEABLE_ROLES = [
  { value: 'Unit Manager', label: 'Unit Manager' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Production', label: 'Production' },
  { value: 'Accounts', label: 'Accounts' },
  { value: 'Dispatch', label: 'Dispatch' },
  { value: 'Packing', label: 'Packing' }
];

const UNIT_HEAD_MODULES = [
  {
    name: 'unitManager',
    label: 'Unit Manager',
    features: [
      { key: 'salesApproval', label: 'Sales Approval' },
      { key: 'salesOrderList', label: 'Sales Order List' },
      { key: 'productionGroup', label: 'Production Group' },
      { key: 'returns', label: 'Returns & Damage' }
    ]
  },
  {
    name: 'sales',
    label: 'Sales',
    features: [
      { key: 'orders', label: 'My Orders' },
      { key: 'myCustomers', label: 'My Customers' },
      { key: 'myDeliveries', label: 'My Dispatches' },
      { key: 'myInvoices', label: 'My Payments' },
      { key: 'returns', label: 'Returns & Damage' }
    ]
  },
  {
    name: 'production',
    label: 'Production',
    features: [
      { key: 'productionDashboard', label: 'Production Dashboard' },
      { key: 'productionReports', label: 'Production Reports' },
      { key: 'productionSheet', label: 'Production Sheet' }
    ]
  },
  {
    name: 'packing',
    label: 'Packing',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'packingSheet', label: 'Packing Sheet' },
      { key: 'packingHistory', label: 'History' }
    ]
  },
  {
    name: 'accounts',
    label: 'Accounts',
    features: [
      { key: 'transactions', label: 'Transactions' },
      { key: 'balanceSheet', label: 'Balance Sheet' },
      { key: 'reports', label: 'Financial Reports' },
      { key: 'payments', label: 'Payment Processing' }
    ]
  },
  {
    name: 'dispatch',
    label: 'Dispatch',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'deliveryChallan', label: 'Delivery Challan' },
      { key: 'dispatchHistory', label: 'History' }
    ]
  },
  {
    name: 'unitHead',
    label: 'Unit Head',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'orders', label: 'Orders' },
      { key: 'sales', label: 'Sales' },
      { key: 'dispatches', label: 'Dispatches' },
      { key: 'accounts', label: 'Accounts' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'customers', label: 'Customers' },
      { key: 'suppliers', label: 'Suppliers' },
      { key: 'purchases', label: 'Purchases' },
      { key: 'manufacturing', label: 'Manufacturing' },
      { key: 'userManagement', label: 'User Management' },
      { key: 'productionGroup', label: 'Production Group' }
    ]
  }
];

const PERMISSION_ACTIONS = ['view', 'add', 'edit', 'delete'];

// Convert database permission format to UI format
const convertDBPermissionsToUI = (dbPermissions) => {
  const uiPermissions = {};

  // Initialize the UI permission structure
  UNIT_HEAD_MODULES.forEach(module => {
    uiPermissions[module.name] = {};
    module.features.forEach(feature => {
      uiPermissions[module.name][feature.key] = {
        view: false,
        add: false,
        edit: false,
        delete: false
      };
    });
  });

  // If the database has module permissions, map them to UI structure
  if (dbPermissions?.modules && Array.isArray(dbPermissions.modules)) {
    dbPermissions.modules.forEach(modulePermission => {
      if (modulePermission.name && uiPermissions[modulePermission.name]) {
        if (modulePermission.features && Array.isArray(modulePermission.features)) {
          modulePermission.features.forEach(feature => {
            if (uiPermissions[modulePermission.name][feature.key]) {
              uiPermissions[modulePermission.name][feature.key] = {
                view: feature.view || false,
                add: feature.add || false,
                edit: feature.edit || false,
                delete: feature.delete || false
              };
            }
          });
        }
      }
    });
  }

  return uiPermissions;
};

// Convert UI permission format back to database format
// Get role-specific modules based on selected role
const getRoleSpecificModules = (selectedRole) => {
  switch (selectedRole) {
    case 'Unit Manager':
      return ['unitManager'];
    case 'Sales':
      return ['sales'];
    case 'Production':
      return ['production'];
    case 'Accounts':
      return ['accounts'];
    case 'Dispatch':
      return ['dispatch'];
    case 'Packing':
      return ['packing'];
    default:
      return [];
  }
};

const convertUIPermissionsToDB = (uiPermissions, selectedRole) => {
  const modules = [];
  const allowedModules = getRoleSpecificModules(selectedRole);

  // Only include modules that are appropriate for the selected role
  Object.keys(uiPermissions).forEach(moduleName => {
    // Skip modules that are not allowed for this role
    if (!allowedModules.includes(moduleName)) {
      return;
    }

    const moduleFeatures = [];
    const modulePermissions = uiPermissions[moduleName];

    Object.keys(modulePermissions).forEach(featureKey => {
      moduleFeatures.push({
        key: featureKey,
        view: modulePermissions[featureKey].view || false,
        add: modulePermissions[featureKey].add || false,
        edit: modulePermissions[featureKey].edit || false,
        delete: modulePermissions[featureKey].delete || false
      });
    });

    modules.push({
      name: moduleName,
      features: moduleFeatures
    });
  });

  return {
    role: 'unit_manager',
    canAccessAllUnits: false,
    modules
  };
};

// Get default permissions for each role type
const getDefaultPermissionsForRole = (role) => {
  const defaultPermissions = convertDBPermissionsToUI({});

  // Enable certain modules based on role
  switch (role) {
    case 'Sales':
      // Enable all sales features by default
      Object.keys(defaultPermissions.sales).forEach(featureKey => {
        defaultPermissions.sales[featureKey] = {
          view: true,
          add: true,
          edit: true,
          delete: true
        };
      });
      break;
    case 'Production':
      // Enable all production features by default
      Object.keys(defaultPermissions.production).forEach(featureKey => {
        defaultPermissions.production[featureKey] = {
          view: true,
          add: true,
          edit: true,
          delete: true
        };
      });
      break;
    case 'Accounts':
      // Enable all accounts features by default
      Object.keys(defaultPermissions.accounts).forEach(featureKey => {
        defaultPermissions.accounts[featureKey] = {
          view: true,
          add: true,
          edit: true,
          delete: true
        };
      });
      break;
    case 'Dispatch':
      // Enable all dispatch features by default
      Object.keys(defaultPermissions.dispatch).forEach(featureKey => {
        defaultPermissions.dispatch[featureKey] = {
          view: true,
          add: true,
          edit: true,
          delete: true
        };
      });
      break;
    case 'Packing':
      // Enable all packing features by default
      Object.keys(defaultPermissions.packing).forEach(featureKey => {
        defaultPermissions.packing[featureKey] = {
          view: true,
          add: true,
          edit: true,
          delete: true
        };
      });
      break;
    case 'Unit Manager':
    default:
      // Unit Manager gets limited access by default
      Object.keys(defaultPermissions.unitManager).forEach(featureKey => {
        defaultPermissions.unitManager[featureKey] = {
          view: true,
          add: false,
          edit: false,
          delete: false
        };
      });
      break;
  }

  return defaultPermissions;
};

const UnitHeadRolePermissionManagement = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    role: '', // No default role - user must select
    password: '',
    confirmPassword: '',
    permissions: convertDBPermissionsToUI({}),
    isActive: true
  });

  // State for Unit Head company info
  const [unitHeadCompanyInfo, setUnitHeadCompanyInfo] = useState(null);

  const queryClient = useQueryClient();

  // Get all unit users under this Unit Head (Unit Managers, Sales, Production, etc.)
  const { data: unitUsersData, isLoading, error } = useQuery({
    queryKey: ['unit-users', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        limit: 100
      });

      const response = await apiRequest('GET', `/api/unit-head/unit-users?${params}`);
      return response;
    }
  });

  // Fetch Unit Head company info
  const { data: unitHeadCompanyResponse } = useQuery({
    queryKey: ['/api/unit-head/company-info'],
    queryFn: () => apiRequest('GET', '/api/unit-head/company-info'),
    retry: false
  });

  // Update unitHeadCompanyInfo when data is fetched
  useEffect(() => {
    if (unitHeadCompanyResponse?.data) {
      setUnitHeadCompanyInfo(unitHeadCompanyResponse.data);
    }
  }, [unitHeadCompanyResponse]);

  // Create Unit Manager mutation
  const createUserMutation = useMutation({
    mutationFn: (userData) => apiRequest('POST', '/api/unit-head/unit-users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries(['unit-users']);
      showSuccessToast('User created successfully!');
      setIsAddingUser(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Create user error:', error);
      // Show clean error message without status code
      const errorMessage = error.message || 'Failed to create user';
      showSmartToast(errorMessage, 'error');
    }
  });

  // Update User mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, userData }) => apiRequest('PUT', `/api/unit-head/unit-users/${userId}`, userData),
    onSuccess: () => {
      queryClient.invalidateQueries(['unit-users']);
      showSuccessToast('User updated successfully!');
      setIsEditingUser(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Update user error:', error);
      // Show clean error message without status code
      const errorMessage = error.message || 'Failed to update user';
      showSmartToast(errorMessage, 'error');
    }
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }) => apiRequest('PUT', `/api/unit-head/unit-users/${userId}/password`, { newPassword }),
    onSuccess: () => {
      showSuccessToast('Password updated successfully!');
      setIsChangingPassword(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Update password error:', error);
      // Show clean error message without status code
      const errorMessage = error.message || 'Failed to update password';
      showSmartToast(errorMessage, 'error');
    }
  });

  // Delete User mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => apiRequest('DELETE', `/api/unit-head/unit-users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['unit-users']);
      showSuccessToast('User deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete user error:', error);
      // Show clean error message without status code
      const errorMessage = error.message || 'Failed to delete user';
      showSmartToast(errorMessage, 'error');
    }
  });

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      role: '', // No default role - user must select
      password: '',
      confirmPassword: '',
      permissions: convertDBPermissionsToUI({}),
      isActive: true
    });
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role, // Add this missing role field
      permissions: convertDBPermissionsToUI(user.permissions || {}),
      isActive: user.isActive,
      password: '',
      confirmPassword: ''
    });
    setIsEditingUser(true);
  };

  // Export users to Excel
  const handleExportUsers = () => {
    try {
      // Get users from component state
      const unitUsers = unitUsersData?.data?.users || [];

      // Prepare export data for Excel
      const exportData = unitUsers.map(user => ({
        'Username': user.username,
        'Email': user.email,
        'Full Name': user.fullName,
        'Role': user.role,
        'Unit': user.unit || '',
        'Company': user.companyId?.name || '',
        'Status': user.isActive ? 'Active' : 'Inactive',
        'Created Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '',
        'Last Login': user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Username
        { wch: 25 }, // Email
        { wch: 20 }, // Full Name
        { wch: 15 }, // Role
        { wch: 12 }, // Unit
        { wch: 20 }, // Company
        { wch: 10 }, // Status
        { wch: 15 }, // Created Date
        { wch: 15 }  // Last Login
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');

      // Download file
      XLSX.writeFile(wb, `unit_head_users_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      showSuccessToast('Export Successful', `Exported ${exportData.length} users to Excel file`);
    } catch (error) {
      console.error('Export error:', error);
      showSmartToast(error, 'Failed to export users');
    }
  };

  // Download sample template for import
  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          'Username': 'john.doe',
          'Email': 'john.doe@example.com',
          'Full Name': 'John Doe',
          'Role': 'Unit Manager',
          'Unit': 'Unit A',
          'Status': 'Active'
        },
        {
          'Username': 'jane.smith',
          'Email': 'jane.smith@example.com',
          'Full Name': 'Jane Smith',
          'Role': 'Sales',
          'Unit': 'Unit A',
          'Status': 'Active'
        }
      ];

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(sampleData);

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Username
        { wch: 25 }, // Email
        { wch: 20 }, // Full Name
        { wch: 15 }, // Role
        { wch: 12 }, // Unit
        { wch: 10 }  // Status
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users Template');

      // Download file
      XLSX.writeFile(wb, `user_import_template.xlsx`);

      showSuccessToast('Template Downloaded', 'Sample import template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      showSmartToast(error, 'Failed to download template');
    }
  };

  // Import users from Excel
  const handleImportUsers = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null); // Clear previous results

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const importedData = XLSX.utils.sheet_to_json(worksheet);

        if (!Array.isArray(importedData) || importedData.length === 0) {
          setImportResults({
            success: false,
            message: 'No data found in Excel file. Please check the file and try again.'
          });
          setIsImporting(false);
          return;
        }

        // Prepare users array for bulk import
        const usersToImport = importedData.map(row => ({
          username: row['Username'] || row['username'],
          email: row['Email'] || row['email'],
          fullName: row['Full Name'] || row['fullName'] || row['full name'],
          role: row['Role'] || row['role'],
          status: row['Status'] || row['status'] || 'Active'
        }));

        // Call bulk import API
        const result = await apiRequest('POST', '/api/unit-head/unit-users/bulk-import', {
          users: usersToImport
        });

        // Store results to display in dialog
        setImportResults(result);

        // Refresh users list if any successful imports
        if (result.data?.summary?.successful > 0) {
          queryClient.invalidateQueries(['unit-users']);

          // Show success toast only if all succeeded
          if (result.data.summary.failed === 0 && result.data.summary.skipped === 0) {
            showSuccessToast('Import Successful', `Successfully imported ${result.data.summary.successful} users!`);
          }
        }

        // Log to console for debugging
        console.log('📊 Import Results:', result);

      } catch (error) {
        console.error('Import error:', error);
        setImportResults({
          success: false,
          message: error.message || 'Failed to import users. Please try again.',
          error: true
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset file input
    event.target.value = '';
  };

  const handleDeleteUser = (user) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user "${String(user.fullName || user.username || '')}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      deleteUserMutation.mutate(user._id);
    }
  };

  const handlePermissionChange = (module, feature, action, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [feature]: {
            ...prev.permissions[module]?.[feature],
            [action]: checked
          }
        }
      }
    }));
  };

  const hasPermission = (module, feature, action) => {
    return formData.permissions[module]?.[feature]?.[action] || false;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.role) {
      showSmartToast({ message: 'Please select a role' }, 'Validation Error');
      return;
    }

    if (!formData.username.trim()) {
      showSmartToast({ message: 'Username is required' }, 'Validation Error');
      return;
    }

    if (!formData.email.trim()) {
      showSmartToast({ message: 'Email is required' }, 'Validation Error');
      return;
    }

    if (!formData.fullName.trim()) {
      showSmartToast({ message: 'Full Name is required' }, 'Validation Error');
      return;
    }

    // Validate Unit Head company assignment for Unit Manager creation
    if (isAddingUser && !unitHeadCompanyInfo) {
      showSmartToast({ message: 'Unit Head must have a company assigned to create users' }, 'Company Assignment Required');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      showSmartToast({ message: 'Passwords do not match' }, 'Password Validation Error');
      return;
    }

    if (isAddingUser) {
      const userData = {
        ...formData,
        permissions: convertUIPermissionsToDB(formData.permissions, formData.role)
      };
      createUserMutation.mutate(userData);
    } else if (isEditingUser) {
      const updateData = { ...formData };
      delete updateData.password;
      delete updateData.confirmPassword;

      if (updateData.permissions) {
        updateData.permissions = convertUIPermissionsToDB(updateData.permissions, updateData.role);
      }

      updateUserMutation.mutate({ userId: selectedUser._id, userData: updateData });
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();

    if (!formData.password || formData.password.length < 6) {
      showSmartToast('Password must be at least 6 characters long', 'error');
      return;
    }

    updatePasswordMutation.mutate({
      userId: selectedUser._id,
      newPassword: formData.password
    });
  };

  const unitUsers = unitUsersData?.data?.users || [];
  const summary = unitUsersData?.data?.summary || {};
  const currentUnit = unitUsersData?.data?.unit || '';

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Error loading data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-gray-600">Manage unit personnel and their permissions for {currentUnit}</p>
        </div>
        <div className="flex gap-2">
          {/* Export Button */}
          <Button
            onClick={handleExportUsers}
            variant="outline"
            disabled={unitUsers.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>

          {/* Import Button */}
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>

          {/* Add User Button */}
          <Button
            onClick={() => {
              resetForm();
              setIsAddingUser(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </div>



      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Details</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : unitUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No users found. Add your first user to get started.
                  </TableCell>
                </TableRow>
              ) : (
                unitUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{String(user.fullName || '')}</p>
                          <p className="text-sm text-gray-500">@{String(user.username || '')}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{String(user.email || '')}</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{String(user.companyId?.name || 'No Company')}</p>
                        <p className="text-xs text-gray-500">{String(user.companyId?.city || '')}, {String(user.companyId?.state || '')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'Unit Manager' ? 'default' : 'secondary'}>
                        {String(user.role || '')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.permissions?.modules?.length > 0 ? (
                          user.permissions.modules.map((module) => {
                            const moduleInfo = UNIT_HEAD_MODULES.find(m => m.name === module.name);
                            const enabledFeatures = module.features?.filter(f => f.view || f.add || f.edit || f.delete); return enabledFeatures?.map((feature) => {
                              const featureInfo = moduleInfo?.features.find(f => f.key === feature.key);
                              const permissions = [];
                              if (feature.view) permissions.push('View');
                              if (feature.add) permissions.push('Add');
                              if (feature.edit) permissions.push('Edit');
                              if (feature.delete) permissions.push('Delete');

                              return permissions.length > 0 ? (
                                <Badge
                                  key={`${module.name}-${feature.key}`}
                                  variant="outline"
                                  className="text-xs"
                                  title={`${featureInfo?.label || feature.key}: ${permissions.join(', ')}`}
                                >
                                  {featureInfo?.label || feature.key}
                                </Badge>
                              ) : null;
                            });
                          })
                        ) : (
                          <Badge variant="secondary" className="text-xs">No permissions assigned</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setFormData({ ...formData, password: '', confirmPassword: '' });
                            setIsChangingPassword(true);
                          }}
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={isAddingUser || isEditingUser} onOpenChange={(open) => {
        if (!open) {
          setIsAddingUser(false);
          setIsEditingUser(false);
          setSelectedUser(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAddingUser ? 'Add New User' : 'Edit User'}
            </DialogTitle>
            <DialogDescription>
              {isAddingUser
                ? 'Create a new user and set their role and permissions'
                : 'Update user details, role and permissions'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      if (newRole) {
                        const defaultPermissions = getDefaultPermissionsForRole(newRole);
                        setFormData({
                          ...formData,
                          role: newRole,
                          permissions: defaultPermissions
                        });
                      } else {
                        setFormData({
                          ...formData,
                          role: '',
                          permissions: convertDBPermissionsToUI({})
                        });
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Please select role</option>
                    {UNIT_HEAD_MANAGEABLE_ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Company/Location field - read-only for Unit Head */}
              <div>
                <Label htmlFor="companyLocation">Company/Location</Label>
                <Input
                  id="companyLocation"
                  value={
                    unitHeadCompanyInfo
                      ? `${String(unitHeadCompanyInfo.companyName || unitHeadCompanyInfo.name || '')} - ${String(unitHeadCompanyInfo.city || '')}, ${String(unitHeadCompanyInfo.state || '')}`
                      : 'No company assigned'
                  }
                  readOnly
                  className={`cursor-not-allowed ${unitHeadCompanyInfo ? 'bg-gray-50' : 'bg-red-50 text-red-600'
                    }`}
                  placeholder="Company/Location (Auto-assigned)"
                />
                {!unitHeadCompanyInfo && (
                  <p className="text-sm text-red-600 mt-1">
                    Unit Head must have a company assigned to create users
                  </p>
                )}
              </div>

              {isAddingUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Module Permissions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Module Permissions
                </h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allEnabled = {};
                      const allowedModules = getRoleSpecificModules(formData.role);

                      UNIT_HEAD_MODULES
                        .filter(module => allowedModules.includes(module.name))
                        .forEach(module => {
                          allEnabled[module.name] = {};
                          module.features.forEach(feature => {
                            allEnabled[module.name][feature.key] = {
                              view: true,
                              add: true,
                              edit: true,
                              delete: true
                            };
                          });
                        });
                      setFormData(prev => ({
                        ...prev,
                        permissions: allEnabled
                      }));
                    }}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    Enable All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allDisabled = {};
                      const allowedModules = getRoleSpecificModules(formData.role);

                      UNIT_HEAD_MODULES
                        .filter(module => allowedModules.includes(module.name))
                        .forEach(module => {
                          allDisabled[module.name] = {};
                          module.features.forEach(feature => {
                            allDisabled[module.name][feature.key] = {
                              view: false,
                              add: false,
                              edit: false,
                              delete: false
                            };
                          });
                        });
                      setFormData(prev => ({
                        ...prev,
                        permissions: allDisabled
                      }));
                    }}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    Disable All
                  </Button>
                </div>
              </div>

              <div className="bg-white border rounded-lg">
                <div className="p-4">
                  {/* Get filtered modules and features */}
                  {(() => {
                    const filteredModules = UNIT_HEAD_MODULES
                      .filter(module => {
                        // Show relevant modules based on selected role
                        if (formData.role === 'Unit Manager') return module.name === 'unitManager';
                        if (formData.role === 'Sales') return module.name === 'sales';
                        if (formData.role === 'Production') return module.name === 'production';
                        if (formData.role === 'Accounts') return module.name === 'accounts';
                        if (formData.role === 'Dispatch') return module.name === 'dispatch';
                        if (formData.role === 'Packing') return module.name === 'packing';
                        return false; // Don't show any modules by default for unknown roles
                      });

                    const allFeatures = filteredModules.flatMap(module =>
                      module.features.map(feature => ({ module, feature }))
                    );

                    // Only show header if there are features to display
                    if (allFeatures.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">Dashboard access only</p>
                          <p className="text-xs text-gray-400">No additional features configured for this role</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="grid grid-cols-5 gap-4 mb-4 pb-2 border-b">
                          <div className="font-medium text-sm text-gray-600">Feature</div>
                          <div className="text-center font-medium text-sm text-gray-600 flex items-center justify-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </div>
                          <div className="text-center font-medium text-sm text-gray-600 flex items-center justify-center gap-1">
                            <Plus className="w-4 h-4" />
                            <span>Add</span>
                          </div>
                          <div className="text-center font-medium text-sm text-gray-600 flex items-center justify-center gap-1">
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </div>
                          <div className="text-center font-medium text-sm text-gray-600 flex items-center justify-center gap-1">
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </div>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {allFeatures.map(({ module, feature }) => (
                            <div key={`${module.name}-${feature.key}`} className="grid grid-cols-5 gap-4 items-center py-2 hover:bg-gray-50 rounded">
                              <div className="font-medium text-sm">{feature.label}</div>
                              <div className="flex justify-center">
                                <Switch
                                  checked={hasPermission(module.name, feature.key, 'view')}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.name, feature.key, 'view', checked)
                                  }
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </div>
                              <div className="flex justify-center">
                                <Switch
                                  checked={hasPermission(module.name, feature.key, 'add')}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.name, feature.key, 'add', checked)
                                  }
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </div>
                              <div className="flex justify-center">
                                <Switch
                                  checked={hasPermission(module.name, feature.key, 'edit')}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.name, feature.key, 'edit', checked)
                                  }
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </div>
                              <div className="flex justify-center">
                                <Switch
                                  checked={hasPermission(module.name, feature.key, 'delete')}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.name, feature.key, 'delete', checked)
                                  }
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                className="data-[state=checked]:bg-green-600"
              />
              <div className="flex-1">
                <Label htmlFor="isActive" className="text-sm font-medium">Active User</Label>
                <p className="text-xs text-gray-500">
                  {formData.isActive
                    ? "User can login and access assigned modules"
                    : "User account is disabled and cannot login"
                  }
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingUser(false);
                  setIsEditingUser(false);
                  setSelectedUser(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
              >
                {createUserMutation.isPending || updateUserMutation.isPending
                  ? 'Processing...'
                  : (isAddingUser ? 'Create User' : 'Update User')
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={(open) => {
        if (!open) {
          setIsChangingPassword(false);
          setSelectedUser(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update password for {String(selectedUser?.fullName || '')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsChangingPassword(false);
                  setSelectedUser(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Users Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setImportResults(null); // Clear results when closing
          setIsImporting(false);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Users
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file to import multiple users at once
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Import Results Display */}
            {importResults && (
              <div className={`border rounded-lg p-4 ${importResults.error
                  ? 'bg-red-50 border-red-200'
                  : importResults.data?.summary?.failed > 0 || importResults.data?.summary?.skipped > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  {importResults.error ? (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-900">Import Failed</span>
                    </>
                  ) : importResults.data?.summary?.failed > 0 ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <span className="text-yellow-900">Import Completed with Issues</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-900">Import Successful</span>
                    </>
                  )}
                </h4>

                {/* Simple error message */}
                {importResults.error && importResults.message && (
                  <p className="text-sm text-red-800">{importResults.message}</p>
                )}

                {/* Summary Stats */}
                {importResults.data?.summary && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-white rounded p-2 text-center border">
                      <div className="text-xs text-gray-600">Total</div>
                      <div className="text-lg font-bold text-gray-900">{importResults.data.summary.total}</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center border border-green-300">
                      <div className="text-xs text-green-600">Success</div>
                      <div className="text-lg font-bold text-green-700">{importResults.data.summary.successful}</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center border border-yellow-300">
                      <div className="text-xs text-yellow-600">Skipped</div>
                      <div className="text-lg font-bold text-yellow-700">{importResults.data.summary.skipped}</div>
                    </div>
                    <div className="bg-white rounded p-2 text-center border border-red-300">
                      <div className="text-xs text-red-600">Failed</div>
                      <div className="text-lg font-bold text-red-700">{importResults.data.summary.failed}</div>
                    </div>
                  </div>
                )}

                {/* Failed Records */}
                {importResults.data?.details?.failed && importResults.data.details.failed.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-semibold text-red-900 mb-2">Failed Records:</h5>
                    <div className="bg-white rounded border border-red-200 max-h-48 overflow-y-auto">
                      {importResults.data.details.failed.map((item, idx) => (
                        <div key={idx} className="p-2 border-b border-red-100 last:border-0 text-xs">
                          <div className="flex items-start gap-2">
                            <Badge variant="destructive" className="text-xs">Row {item.row}</Badge>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.username} ({item.email})</div>
                              <div className="text-red-700 mt-1">{item.error}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skipped Records */}
                {importResults.data?.details?.skipped && importResults.data.details.skipped.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-semibold text-yellow-900 mb-2">Skipped Records (Duplicates):</h5>
                    <div className="bg-white rounded border border-yellow-200 max-h-32 overflow-y-auto">
                      {importResults.data.details.skipped.map((item, idx) => (
                        <div key={idx} className="p-2 border-b border-yellow-100 last:border-0 text-xs">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Row {item.row}</Badge>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{item.username} ({item.email})</div>
                              <div className="text-yellow-700 mt-1">{item.reason}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Records Summary */}
                {importResults.data?.details?.success && importResults.data.details.success.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-semibold text-green-900">
                      ✅ {importResults.data.details.success.length} users imported successfully
                    </h5>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Import Instructions:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Download the template file below</li>
                <li>Fill in user details (Username, Email, Full Name, Role, Status)</li>
                <li>Required fields: Username, Email, Role</li>
                <li>Default password: Welcome@123</li>
                <li>Status: Active or Inactive</li>
                <li>Upload the completed file</li>
              </ul>
            </div>

            {/* Available Roles */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Available Roles:</h4>
              <div className="flex flex-wrap gap-2">
                {UNIT_HEAD_MANAGEABLE_ROLES.map(role => (
                  <Badge key={role.value} variant="secondary">
                    {role.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Download Template Button */}
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template File
            </Button>

            {/* File Upload */}
            <div>
              <Label htmlFor="import-file" className="text-base font-semibold">
                Upload Excel File
              </Label>
              <div className="mt-2">
                <input
                  type="file"
                  id="import-file"
                  accept=".xlsx,.xls"
                  onChange={handleImportUsers}
                  disabled={isImporting}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: .xlsx, .xls
              </p>
              {isImporting && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Importing users...</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportResults(null);
                setIsImporting(false);
              }}
            >
              Close
            </Button>
            {importResults && !isImporting && (
              <Button
                onClick={() => setImportResults(null)}
                variant="default"
              >
                Import Another File
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnitHeadRolePermissionManagement;