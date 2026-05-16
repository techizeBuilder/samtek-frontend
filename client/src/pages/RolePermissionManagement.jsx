import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Settings,
  Lock,
  EyeOff,
  Search,
  X
} from 'lucide-react';
import { showSuccessToast, showSmartToast } from '@/lib/toast-utils';
import { useAuth } from '@/hooks/useAuth';
// Role and Module Configuration
const ROLES = [
  { value: 'Superadmin', label: 'Superadmin' },
  { value: 'HR-Admin', label: 'HR Admin' },
  { value: 'Company Admin', label: 'Company Admin' },
  { value: 'Production Head', label: 'Production Head' },
  { value: 'Packing Head', label: 'Packing Head' },
  { value: 'Dispatch Head', label: 'Dispatch Head' },
  { value: 'Sales Head', label: 'Sales Head' },
  { value: 'Accounts Head', label: 'Accounts Head' },
  { value: 'Research & Development Head', label: 'Research & Development Head' },
  { value: 'Complaint Management Head', label: 'Complaint Management Head' },
  { value: 'Store Head', label: 'Store Head' },
];

const UNITS = [
  { value: 'Unit A', label: 'Unit A' },
  { value: 'Unit B', label: 'Unit B' },
  { value: 'Unit C', label: 'Unit C' },
  { value: 'Main Office', label: 'Main Office' }
];

const MODULES = [
  {
    name: 'superAdmin',
    label: 'Superadmin',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'orders', label: 'Orders' },
      { key: 'production', label: 'Production' },
      { key: 'dispatches', label: 'Dispatches' },
      { key: 'sales', label: 'Sales' },
      { key: 'accounts', label: 'Accounts' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'customers', label: 'Customers' },
      { key: 'companies', label: 'Companies' },
      { key: 'rolePermissions', label: 'Role Permissions' },
      { key: 'userManagement', label: 'User Management' },
      { key: 'setting', label: 'Settings' }
    ]
  },
  // {
  //   name: 'dashboard',
  //   label: 'Dashboard',
  //   features: [
  //     { key: 'overview', label: 'Overview' },
  //     { key: 'analytics', label: 'Analytics' },
  //     { key: 'reports', label: 'Reports' }
  //   ]
  // },
  // {
  //   name: 'orders',
  //   label: 'Orders',
  //   features: [
  //     { key: 'allOrders', label: 'All Orders' },
  //     { key: 'createOrder', label: 'Create Order' },
  //     { key: 'orderReports', label: 'Order Reports' }
  //   ]
  // },
  {
    name: 'sales',
    label: 'Sales',
    features: [
      { key: 'orders', label: 'My Orders' },
      { key: 'myCustomers', label: 'My Customers' },
      { key: 'myDeliveries', label: 'My Dispatches' },
      { key: 'myInvoices', label: 'My Payments' },
      { key: 'returns', label: 'Returns' },
      { key: 'damages', label: 'Damages' }
    ]
  },
  {
    name: 'dispatches',
    label: 'Dispatches',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'deliveryChallan', label: 'Delivery Challan' },
      { key: 'dispatchHistory', label: 'History' }
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
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'chartOfAccounts', label: 'Chart of Accounts' },
      { key: 'sales', label: 'Sales' },
      { key: 'purchases', label: 'Purchases' },
      { key: 'gstAndTds', label: 'GST & TDS' },
      { key: 'damageAndExpiry', label: 'Damage & Expiry' },
      { key: 'salesmanSettlement', label: 'Salesman Settlement' },
      { key: 'bankAndCash', label: 'Bank & Cash' },
      { key: 'interUnit', label: 'Inter-Unit' },
      { key: 'reports', label: 'Reports' },
      { key: 'settings', label: 'Settings' }
    ]
  },
  // {
  //   name: 'inventory',
  //   label: 'Inventory',
  //   features: [
  //     { key: 'items', label: 'Items' },
  //     { key: 'categories', label: 'Categories' },
  //     { key: 'stockIn', label: 'Stock In' },
  //     { key: 'stockOut', label: 'Stock Out' }
  //   ]
  // },
  // {
  //   name: 'customers',
  //   label: 'Customers',
  //   features: [
  //     { key: 'allCustomers', label: 'All Customers' },
  //     { key: 'createCustomer', label: 'Create Customer' },
  //     { key: 'customerReports', label: 'Customer Reports' }
  //   ]
  // },
  {
    name: 'settings',
    label: 'Settings',
    features: [
      { key: 'general', label: 'General Settings' },
      { key: 'users', label: 'User Management' },
      { key: 'system', label: 'System Configuration' }
    ]
  },
  {
    name: 'Store',
    label: 'Store',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'orders', label: 'Orders' }
    ]
  }
];

const DEFAULT_PERMISSIONS = {
  role: '',
  unit: '',
  canAccessAllUnits: false,
  modules: []
};

const PERMISSION_ACTIONS = ['view', 'add', 'edit', 'delete'];

export default function RolePermissionManagement() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: '',
    unit: '',
    companyId: '', // Ensure this is always a string, not array
    isActive: true,
    permissions: { ...DEFAULT_PERMISSIONS }
  });

  const queryClient = useQueryClient();

  // Fetch users with pagination and filtering
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['/api/users', currentPage, pageSize, debouncedSearchTerm, roleFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter })
      });
      return apiRequest('GET', `/api/users?${params.toString()}`);
    },
    enabled: true,
    retry: 1
  });

  // Fetch companies for dropdown
  const { data: companiesResponse, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/super-admin/companies/dropdown'],
    queryFn: () => apiRequest('GET', '/api/super-admin/companies/dropdown'),
    enabled: true,
    retry: 1
  });

  const users = usersResponse?.users || [];
  const totalUsers = usersResponse?.pagination?.total || 0;
  const totalPages = usersResponse?.pagination?.pages || 1;
  const rawCompanies = companiesResponse?.companies || [];

  // Filter companies based on user role
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'Superadmin' || currentUser?.role === 'Super Admin';
  const isCompanyAdmin = currentUser?.role === 'Company Admin';

  const companies = isSuperAdmin ? rawCompanies : rawCompanies.filter(c => c.value === currentUser?.companyId);

  const filteredRoles = ROLES.filter(role => {
    if (isSuperAdmin) return true;

    // Hide Superadmin role from others
    if (role.value === 'Superadmin' || role.value === 'Super Admin') return false;

    // If Company Admin, they should see everything they are allowed to manage
    // including Store Head as requested
    if (isCompanyAdmin) {
      return true; // Showing all for now as requested
    }

    if (currentUser?.role === 'HR-Admin') {
      return true; // Showing all for now as requested
    }

    return true;
  });

  // Auto-set companyId for non-SuperAdmins when opening create dialog
  useEffect(() => {
    if (isCreateDialogOpen && !isSuperAdmin && currentUser?.companyId) {
      setFormData(prev => ({ ...prev, companyId: currentUser.companyId }));
    }
  }, [isCreateDialogOpen, isSuperAdmin, currentUser]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, roleFilter, statusFilter]);

  // Debug companies data
  console.log('Companies data from API:', companies);
  console.log('First company structure:', companies[0]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData) => apiRequest('POST', '/api/users', userData),
    onSuccess: () => {
      showSuccessToast('User Created', 'User has been created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      showSmartToast(error, 'Failed to create user');
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...userData }) => apiRequest('PUT', `/api/users/${id}`, userData),
    onSuccess: () => {
      showSuccessToast('User Updated', 'User has been updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      showSmartToast(error, 'Failed to update user');
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => apiRequest('DELETE', `/api/users/${userId}`),
    onSuccess: () => {
      showSuccessToast('User Deleted', 'User has been deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error) => {
      showSmartToast(error, 'Failed to delete user');
    }
  });

  const resetForm = () => {
    const newFormData = {
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: '',
      unit: '',
      companyId: '', // Reset company selection
      isActive: true,
      permissions: {
        role: '',
        unit: '',
        canAccessAllUnits: false,
        modules: []
      }
    };
    setFormData(newFormData);
    setSelectedUser(null);
  }; const handleCreateUser = () => {
    // Validate required fields
    if (!formData.username || !formData.email || !formData.password || !formData.role) {
      showSmartToast({ message: 'Username, email, password, and role are required' }, 'Validation Error');
      return;
    }

    // Ensure permissions structure is properly formatted
    const userData = {
      ...formData,
      companyId: formData.companyId || null, // Include company assignment (optional))
      permissions: {
        role: formData.role.toLowerCase().replace(' ', '_'),
        unit: formData.unit || '',
        canAccessAllUnits: formData.permissions.canAccessAllUnits,
        modules: formData.permissions.modules || []
      }
    };

    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = () => {
    // Validate required fields
    if (!formData.username || !formData.email || !formData.role) {
      showSmartToast({ message: 'Username, email, and role are required' }, 'Validation Error');
      return;
    }

    const updateData = {
      ...formData,
      companyId: formData.companyId || null // Include company assignment (optional)
    };
    if (!updateData.password) {
      delete updateData.password;
    }

    updateUserMutation.mutate({ id: selectedUser._id, ...updateData });
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      fullName: user.fullName || '',
      role: user.role,
      unit: user.unit || '',
      companyId: typeof (user.companyId?._id) === 'string' ? user.companyId._id : '', // Ensure string, include company assignment
      isActive: user.isActive,
      permissions: user.permissions || { ...DEFAULT_PERMISSIONS }
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      deleteUserMutation.mutate(user._id);
    }
  };

  // Handle password update dialog
  const handlePasswordUpdate = (user) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordDialogOpen(true);
  };

  // Validation toast helper
  const showValidationToast = (errors, title) => {
    const errorMessages = errors.map(err => err.message).join(', ');
    showSmartToast({ message: errorMessages }, title || 'Validation Error');
  };

  // Handle password form submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      showValidationToast([
        { path: ['newPassword'], message: 'New password is required' },
        { path: ['confirmPassword'], message: 'Password confirmation is required' }
      ], 'Password Update');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showValidationToast([
        { path: ['confirmPassword'], message: 'Passwords do not match' }
      ], 'Password Update');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showValidationToast([
        { path: ['newPassword'], message: 'Password must be at least 6 characters long' }
      ], 'Password Update');
      return;
    }

    updatePasswordMutation.mutate({
      userId: selectedUser._id,
      newPassword: passwordForm.newPassword
    });
  };

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }) => apiRequest('PUT', `/api/users/${userId}/password`, { newPassword }),
    onSuccess: () => {
      showSuccessToast('Password Updated', 'User password has been updated successfully');
      setIsPasswordDialogOpen(false);
      setSelectedUser(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      showSmartToast(error, 'Failed to update password');
    }
  });

  const setRoleDefaultPermissions = (role) => {
    // Set default permissions based on role
    const rolePermissions = {
      role: role.toLowerCase().replace(' ', '_'),
      unit: formData.unit,
      canAccessAllUnits: role === 'Superadmin',
      modules: getDefaultModulesForRole(role)
    };

    setFormData(prevData => ({
      ...prevData,
      role: role,
      permissions: rolePermissions
    }));
  };

  // Helper function to get features from actual permissions or fallback to MODULES
  const getModuleFeatures = (moduleName) => {
    const permissionModule = formData.permissions?.modules?.find(m => m.name === moduleName);
    const moduleConfig = MODULES.find(m => m.name === moduleName);

    if (permissionModule && permissionModule.features && permissionModule.features.length > 0) {
      // Enrich permission features with labels from MODULES configuration
      return permissionModule.features.map(permFeature => {
        const configFeature = moduleConfig?.features?.find(f => f.key === permFeature.key);
        return {
          ...permFeature,
          label: configFeature?.label || permFeature.key
        };
      });
    }

    // Fallback to MODULES if no permission data
    return moduleConfig?.features || [];
  };

  const getDefaultModulesForRole = (role) => {
    // Helper function to get feature with label
    const enrichFeatureWithLabel = (moduleFeatures, featureKey) => {
      const moduleFeature = moduleFeatures.find(f => f.key === featureKey);
      return moduleFeature ? moduleFeature.label : featureKey;
    };

    // Helper function to create feature with permissions and label
    const createFeaturePermissions = (moduleName, featureKey, permissions) => ({
      key: featureKey,
      label: (() => {
        const module = MODULES.find(m => m.name === moduleName);
        const feature = module?.features.find(f => f.key === featureKey);
        return feature?.label || featureKey;
      })(),
      ...permissions
    });

    // Return default modules based on role
    switch (role) {
      case 'Superadmin':
        return [
          {
            name: 'superAdmin',
            dashboard: true,
            features: [
              { key: 'dashboard', view: true, add: true, edit: true, delete: true },
              { key: 'orders', view: true, add: true, edit: true, delete: true },
              { key: 'production', view: true, add: true, edit: true, delete: true },
              { key: 'dispatches', view: true, add: true, edit: true, delete: true },
              { key: 'sales', view: true, add: true, edit: true, delete: true },
              { key: 'accounts', view: true, add: true, edit: true, delete: true },
              { key: 'inventory', view: true, add: true, edit: true, delete: true },
              { key: 'customers', view: true, add: true, edit: true, delete: true },
              { key: 'companies', view: true, add: true, edit: true, delete: true },
              { key: 'rolePermissions', view: true, add: true, edit: true, delete: true },
              { key: 'userManagement', view: true, add: true, edit: true, delete: true },
              { key: 'setting', view: true, add: true, edit: true, delete: true }
            ]
          }
        ];
      case 'Production Head':
        return [
          {
            name: 'production',
            dashboard: true,
            features: [
              createFeaturePermissions('production', 'productionDashboard', { view: true, add: true, edit: true, delete: true, alter: true }),
              createFeaturePermissions('production', 'productionReports', { view: true, add: true, edit: true, delete: true, alter: true }),
              createFeaturePermissions('production', 'productionGroup', { view: true, add: true, edit: true, delete: true, alter: true }),
              createFeaturePermissions('production', 'productionSheet', { view: true, add: true, edit: true, delete: true, alter: true })
            ]
          }
        ];
      case 'Sales Head':
        return [
          {
            name: 'sales',
            dashboard: true,
            features: [
              { key: 'orders', view: true, add: true, edit: true, delete: true, alter: true },
              { key: 'myCustomers', view: true, add: true, edit: true, delete: true, alter: true },
              { key: 'myDeliveries', view: true, add: false, edit: false, delete: false, alter: false },
              { key: 'myInvoices', view: true, add: false, edit: false, delete: false, alter: false },
              { key: 'refundReturn', view: true, add: true, edit: true, delete: true, alter: true }
            ]
          }
        ];
      case 'Packing Head':
        return [
          {
            name: 'packing',
            dashboard: true,
            features: [
              { key: 'dashboard', view: true, add: true, edit: true, delete: true },
              { key: 'packingSheet', view: true, add: true, edit: true, delete: true }
            ]
          }
        ];
      case 'Dispatch Head':
        return [
          {
            name: 'dispatches',
            dashboard: true,
            features: [
              { key: 'dashboard', view: true, add: true, edit: true, delete: true },
              { key: 'deliveryChallan', view: true, add: true, edit: true, delete: true },
              { key: 'dispatchHistory', view: true, add: true, edit: true, delete: true }
            ]
          }
        ];
      case 'Accounts Head':
        return [
          {
            name: 'accounts',
            dashboard: true,
            features: [
              { key: 'transactions', view: true, add: true, edit: true, delete: true },
              { key: 'balanceSheet', view: true, add: true, edit: true, delete: true },
              { key: 'reports', view: true, add: true, edit: true, delete: true }
            ]
          }
        ];
      default:
        return [];
    }
  };

  const updateModulePermission = (moduleName, enabled) => {
    if (enabled) {
      // When enabling a module, add it with all features enabled
      const moduleConfig = MODULES.find(m => m.name === moduleName);
      const newModule = {
        name: moduleName,
        dashboard: true,
        features: moduleConfig?.features.map(f => ({
          key: f.key,
          label: f.label,
          view: true,
          add: true,
          edit: true,
          delete: true
        })) || []
      };

      const updatedModules = [...formData.permissions.modules.filter(m => m.name !== moduleName), newModule];

      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          modules: updatedModules
        }
      });
    } else {
      // When disabling a module, remove it completely
      const updatedModules = formData.permissions.modules.filter(m => m.name !== moduleName);

      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          modules: updatedModules
        }
      });
    }
  };

  const updateFeaturePermission = (moduleName, featureKey, action, value) => {
    const updatedModules = formData.permissions.modules.map(module => {
      if (module.name === moduleName) {
        return {
          ...module,
          features: module.features.map(feature => {
            if (feature.key === featureKey) {
              return { ...feature, [action]: value };
            }
            return feature;
          })
        };
      }
      return module;
    });

    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        modules: updatedModules
      }
    });
  };

  const isModuleEnabled = (moduleName) => {
    return formData.permissions.modules.some(m => m.name === moduleName);
  };

  const getFeaturePermission = (moduleName, featureKey, action) => {
    const module = formData.permissions.modules.find(m => m.name === moduleName);
    const feature = module?.features.find(f => f.key === featureKey);
    return feature?.[action] || false;
  };

  const handleCanAccessAllUnitsChange = (checked) => {
    if (checked) {
      // Enable all modules with full permissions
      const allModulesWithFullPermissions = MODULES.map(module => ({
        name: module.name,
        dashboard: true,
        features: module.features.map(feature => ({
          key: feature.key,
          view: true,
          add: true,
          edit: true,
          delete: true
        }))
      }));

      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          canAccessAllUnits: true,
          modules: allModulesWithFullPermissions
        }
      });
    } else {
      // Disable all modules
      setFormData({
        ...formData,
        permissions: {
          ...formData.permissions,
          canAccessAllUnits: false,
          modules: []
        }
      });
    }
  };

  const giveAllPermissions = () => {
    // Enable all modules with all permissions
    const allModulesWithFullPermissions = MODULES.map(module => ({
      name: module.name,
      dashboard: true,
      features: module.features.map(feature => ({
        key: feature.key,
        view: true,
        add: true,
        edit: true,
        delete: true
      }))
    }));

    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        canAccessAllUnits: true,
        modules: allModulesWithFullPermissions
      }
    });
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'Superadmin': return 'default';
      case 'Unit Head': return 'secondary';
      case 'Production': return 'outline';
      case 'Sales': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Role & Permission Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage user roles and permissions. Total users: {totalUsers}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Create New User
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                Create New User
              </DialogTitle>
              <DialogDescription className="text-sm">
                Configure user details and module-level permissions
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="test"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="test@gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="test"
                  />
                </div>
                {/* Company/Location field removed from Super Admin interface */}
                {/* Super Admins use the company dropdown below to assign companies to users */}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => {
                      setFormData({ ...formData, role: value });
                      setRoleDefaultPermissions(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Company/Location Selection - Optional */}
              <div className="space-y-2">
                <Label htmlFor="company">Company Assignment</Label>
                <Select
                  disabled={!isSuperAdmin}
                  value={formData.companyId}
                  onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                >
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.value} value={company.value}>
                        {company.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCompanyAdmin && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Restricted to your assigned company
                  </p>
                )}
              </div>



              {/* Module Permissions */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Module Permissions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={giveAllPermissions}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Give All Permissions
                  </Button>
                </div>
                <div className="space-y-4 mt-4">
                  {MODULES
                    .filter(module => {
                      // Show Settings module only for Super Admin users
                      if (module.name === 'settings') {
                        return formData.role === 'Superadmin';
                      }
                      return true;
                    })
                    .map((module) => {
                      const moduleEnabled = isModuleEnabled(module.name);
                      return (
                        <Card key={module.name} className={moduleEnabled ? 'border-blue-200' : 'border-gray-200'}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={moduleEnabled}
                                  onCheckedChange={(checked) => updateModulePermission(module.name, checked)}
                                />
                                <Label className="text-base font-medium capitalize">{module.label}</Label>
                              </div>
                            </div>
                          </CardHeader>

                          {moduleEnabled && (
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                {getModuleFeatures(module.name).length > 0 && (
                                  <>
                                    <div className="hidden lg:grid grid-cols-5 gap-4 text-sm font-medium text-center border-b pb-2">
                                      <div>Feature</div>
                                      <div className="flex flex-col items-center">
                                        <Eye className="h-4 w-4 mb-1" />
                                        <span>View</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <Plus className="h-4 w-4 mb-1" />
                                        <span>Add</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <Edit className="h-4 w-4 mb-1" />
                                        <span>Edit</span>
                                      </div>
                                      <div className="flex flex-col items-center">
                                        <Trash2 className="h-4 w-4 mb-1" />
                                        <span>Delete</span>
                                      </div>
                                    </div>

                                    {/* Mobile Header */}
                                    <div className="lg:hidden text-sm font-medium text-center border-b pb-2">
                                      Module Permissions
                                    </div>
                                  </>
                                )}

                                {getModuleFeatures(module.name).length === 0 && (
                                  <div className="text-center py-4 text-gray-500">
                                    <p className="text-sm">Dashboard access only</p>
                                    <p className="text-xs text-gray-400">No additional features configured</p>
                                  </div>
                                )}

                                {getModuleFeatures(module.name).map((feature) => (
                                  <div key={feature.key}>
                                    {/* Desktop Layout */}
                                    <div className="hidden lg:grid grid-cols-5 gap-4 items-center py-2">
                                      <div className="text-sm font-medium">{feature.label}</div>
                                      {PERMISSION_ACTIONS.map((action) => (
                                        <div key={action} className="flex justify-center">
                                          <Switch
                                            checked={getFeaturePermission(module.name, feature.key, action)}
                                            onCheckedChange={(checked) =>
                                              updateFeaturePermission(module.name, feature.key, action, checked)
                                            }
                                            size="sm"
                                          />
                                        </div>
                                      ))}
                                    </div>

                                    {/* Mobile Layout */}
                                    <div className="lg:hidden border border-gray-200 rounded-lg p-3 mb-3">
                                      <div className="font-medium text-sm mb-2">{feature.label}</div>
                                      <div className="grid grid-cols-2 gap-3">
                                        {PERMISSION_ACTIONS.map((action) => (
                                          <div key={action} className="flex items-center justify-between">
                                            <span className="text-sm capitalize">{action}</span>
                                            <Switch
                                              checked={getFeaturePermission(module.name, feature.key, action)}
                                              onCheckedChange={(checked) =>
                                                updateFeaturePermission(module.name, feature.key, action, checked)
                                              }
                                              size="sm"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending || !formData.username || !formData.email || !formData.password || !formData.role}
                  className="w-full sm:w-auto"
                >
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>


            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" className="text-sm font-medium">Search Users</Label>
                <div className="relative">
                  <Input
                    id="search"
                    placeholder="Search by username, email, or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-1 pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div>
                <Label htmlFor="roleFilter" className="text-sm font-medium">Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {filteredRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="statusFilter" className="text-sm font-medium">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pageSize" className="text-sm font-medium">Items per page</Label>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(searchTerm || (roleFilter && roleFilter !== 'all') || (statusFilter && statusFilter !== 'all')) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchTerm}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {roleFilter && roleFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Role: {roleFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setRoleFilter('all')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {statusFilter && statusFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusFilter}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setStatusFilter('all')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                    setRoleFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users & Permissions Overview
          </CardTitle>
          <CardDescription>
            Review user accounts with their role-based permission structures
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || (roleFilter && roleFilter !== 'all') || (statusFilter && statusFilter !== 'all')
                    ? "Try adjusting your search or filter criteria"
                    : "Get started by creating your first user"
                  }
                </p>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm min-w-[180px]">User</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm min-w-[100px]">Role</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm min-w-[150px]">Company/Location</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm min-w-[80px]">Status</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm min-w-[200px]">Module Permissions</th>
                      <th className="text-center py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b hover:bg-gray-50:bg-gray-800/50">
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <div className="flex flex-col">
                            <div className="font-medium text-xs sm:text-sm break-words">
                              <span className="text-gray-500 text-xs mr-1">@</span>{user.username}
                            </div>
                            {user.fullName && user.fullName.trim() && !user.fullName.includes('No full name') && (
                              <div className="text-xs text-gray-600 break-words">
                                <span className="text-gray-400 mr-1">Name:</span>{user.fullName}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground break-words">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <div className="text-xs break-words">
                            {user.companyId ? (
                              <div className="flex flex-col">
                                <span className="font-medium break-words">{user.companyId.name || user.companyId.unitName}</span>
                                <span className="text-muted-foreground break-words">{user.companyId.city}, {user.companyId.state}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">No specific location</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 sm:py-4 px-2 sm:px-4">
                          <div className="flex flex-wrap gap-1 max-w-[150px] sm:max-w-[200px]">
                            {user.permissions && user.permissions.modules ? (
                              user.permissions.modules.slice(0, 2).map((module) => (
                                <Badge key={module.name} variant="outline" className="text-xs">
                                  {module.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500">Role-based permissions</span>
                            )}
                            {user.permissions?.modules?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.permissions.modules.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 sm:py-4 px-1 sm:px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePasswordUpdate(user)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Update Password"
                            >
                              <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              title="Edit User"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete User"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {users.map((user) => (
                  <div key={user._id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="space-y-3">
                      {/* User Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-medium text-sm text-gray-900 break-words">
                            <span className="text-gray-500 text-xs mr-1">@</span>{user.username}
                          </div>
                          {user.fullName && user.fullName.trim() && !user.fullName.includes('No full name') && (
                            <div className="text-xs text-gray-600 break-words mt-1">
                              <span className="text-gray-400 mr-1">Name:</span>{user.fullName}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 break-words mt-1">
                            {user.email}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePasswordUpdate(user)}
                            className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50:bg-blue-900/20"
                            title="Update Password"
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-50:bg-gray-700"
                            title="Edit User"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50:bg-red-900/20"
                            title="Delete User"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Role and Status */}
                      <div className="flex gap-1 sm:gap-2 flex-wrap">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Module Permissions */}
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-2">
                          Module Permissions
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions && user.permissions.modules ? (
                            user.permissions.modules.slice(0, 4).map((module) => (
                              <Badge key={module.name} variant="outline" className="text-xs">
                                {module.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">
                              Role-based permissions
                            </span>
                          )}
                          {user.permissions?.modules?.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.permissions.modules.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && users.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
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
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit User: {selectedUser?.fullName || selectedUser?.username}
            </DialogTitle>
            <DialogDescription>
              Update user details and module-level permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => {
                  setFormData({ ...formData, role: value });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Company/Location Selection - Optional */}
            <div>
              <Label htmlFor="edit-company" className="text-sm font-medium">Company/Location (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select a company/location for users who need access to specific units
              </p>
              <select
                value={formData.companyId || 'none'}
                onChange={(e) => {
                  console.log('Edit Select value changed:', e.target.value);
                  const newCompanyId = e.target.value === 'none' ? '' : e.target.value;
                  console.log('Setting edit companyId to:', newCompanyId);
                  setFormData({ ...formData, companyId: newCompanyId });
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">No specific company</option>
                {companies.map((company) => (
                  <option key={company.value} value={company.value}>
                    {company.label || `${company.name} - ${company.city}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
            </div>

            {/* Module Permissions - Same as create form */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Module Permissions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={giveAllPermissions}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Give All Permissions
                </Button>
              </div>
              <div className="space-y-4 mt-4">
                {MODULES
                  .filter(module => {
                    // Show Settings module only for Super Admin users
                    if (module.name === 'settings') {
                      return formData.role === 'Superadmin';
                    }
                    return true;
                  })
                  .map((module) => {
                    const moduleEnabled = isModuleEnabled(module.name);
                    return (
                      <Card key={module.name} className={moduleEnabled ? 'border-blue-200' : 'border-gray-200'}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={moduleEnabled}
                                onCheckedChange={(checked) => updateModulePermission(module.name, checked)}
                              />
                              <Label className="text-base font-medium capitalize">{module.label}</Label>
                            </div>
                          </div>
                        </CardHeader>

                        {moduleEnabled && (
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              <div className="hidden lg:grid grid-cols-5 gap-4 text-sm font-medium text-center border-b pb-2">
                                <div>Feature</div>
                                <div className="flex flex-col items-center">
                                  <Eye className="h-4 w-4 mb-1" />
                                  <span>View</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <Plus className="h-4 w-4 mb-1" />
                                  <span>Add</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <Edit className="h-4 w-4 mb-1" />
                                  <span>Edit</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <Trash2 className="h-4 w-4 mb-1" />
                                  <span>Delete</span>
                                </div>
                              </div>

                              {/* Mobile Header */}
                              <div className="lg:hidden text-sm font-medium text-center border-b pb-2">
                                Module Permissions
                              </div>

                              {module.features.map((feature) => (
                                <div key={feature.key}>
                                  {/* Desktop Layout */}
                                  <div className="hidden lg:grid grid-cols-5 gap-4 items-center py-2">
                                    <div className="text-sm font-medium">{feature.label}</div>
                                    {PERMISSION_ACTIONS.map((action) => (
                                      <div key={action} className="flex justify-center">
                                        <Switch
                                          checked={getFeaturePermission(module.name, feature.key, action)}
                                          onCheckedChange={(checked) =>
                                            updateFeaturePermission(module.name, feature.key, action, checked)
                                          }
                                          size="sm"
                                        />
                                      </div>
                                    ))}
                                  </div>

                                  {/* Mobile Layout */}
                                  <div className="lg:hidden border border-gray-200 rounded-lg p-3 mb-3">
                                    <div className="font-medium text-sm mb-2">{feature.label}</div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {PERMISSION_ACTIONS.map((action) => (
                                        <div key={action} className="flex items-center justify-between">
                                          <span className="text-sm capitalize">{action}</span>
                                          <Switch
                                            checked={getFeaturePermission(module.name, feature.key, action)}
                                            onCheckedChange={(checked) =>
                                              updateFeaturePermission(module.name, feature.key, action, checked)
                                            }
                                            size="sm"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending} className="w-full sm:w-auto">
                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Update Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Update Password
            </DialogTitle>
            <DialogDescription>
              Update password for {selectedUser?.fullName || selectedUser?.username}
              <br />
              <span className="text-sm text-gray-500">({selectedUser?.email})</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value
                  })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value
                  })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}