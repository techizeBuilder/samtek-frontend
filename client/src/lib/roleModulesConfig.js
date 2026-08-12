/**
 * Shared Module Permissions catalogue + defaults.
 *
 * Single source of truth for which ERP/HRMS modules exist, which module(s)
 * are assignable per role, and what a sensible default permission set looks
 * like for a role. Used by both Company Admin's "Roles & Permissions" page
 * (RolePermissionManagement.jsx) and HR-Admin's "Add Employee" page
 * (AddUser.tsx) so Department Head users get identical, working permissions
 * no matter which page creates them.
 */

export const MODULES = [
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
      { key: 'setting', label: 'Settings' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'sales',
    label: 'Sales',
    features: [
      { key: 'orders', label: 'My Orders' },
      { key: 'leads', label: 'Leads' },
      { key: 'paymentRequests', label: 'Payment Requests' },
      { key: 'myCustomers', label: 'My Customers' },
      { key: 'myDeliveries', label: 'My Dispatches' },
      { key: 'myInvoices', label: 'My Payments' },
      { key: 'returns', label: 'Returns' },
      { key: 'damages', label: 'Damages' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'dispatches',
    label: 'Dispatches',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'deliveryChallan', label: 'Delivery Challan' },
      { key: 'packagingQueue', label: 'Packaging Queue' },
      { key: 'packagingJobs', label: 'Packaging Jobs' },
      { key: 'dispatchPlanning', label: 'Dispatch Planning' },
      { key: 'activeDispatches', label: 'Active Dispatches' },
      { key: 'dispatchHistory', label: 'History' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'production',
    label: 'Production',
    features: [
      { key: 'orders', label: 'Orders' },
      { key: 'repairProduction', label: 'Repair Production' },
      { key: 'workPlanning', label: 'Work Planning' },
      { key: 'processQc', label: 'Process & QC' },
      { key: 'jobCards', label: 'Job Cards' },
      { key: 'manpower', label: 'Manpower' },
      { key: 'expenses', label: 'Expenses' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'packing',
    label: 'Packing',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'packingSheet', label: 'Packing Sheet' },
      { key: 'packingHistory', label: 'History' },
      { key: 'lms', label: 'LMS' }
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
      { key: 'settings', label: 'Settings' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'hrms',
    label: 'HRMS / Company Admin',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'employeeManagement', label: 'Employee Management' },
      { key: 'myCompany', label: 'My Company' },
      { key: 'pricingValue', label: 'Pricing Value' },
      { key: 'operatingUnits', label: 'Operating Units' },
      { key: 'departments', label: 'Departments' },
      { key: 'designations', label: 'Designations' },
      { key: 'rolePermissions', label: 'Roles & Permissions' },
      { key: 'taskManagement', label: 'Task Management' }
    ]
  },
  {
    name: 'rnd',
    label: 'Research & Development',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'approveRequests', label: 'Approve Requests' },
      { key: 'productMaster', label: 'Product Master' },
      { key: 'motorMaster', label: 'Motor Master' },
      { key: 'plantMaster', label: 'Plant Master' },
      { key: 'fabricationMaster', label: 'Fabrication Master' },
      { key: 'designApproval', label: 'Design Approval' },
      { key: 'bomManagement', label: 'BOM Management' },
      { key: 'toolProcess', label: 'Tool & Process' },
      { key: 'prototype', label: 'Prototype' },
      { key: 'changeManagement', label: 'Change Management' },
      { key: 'qualityParameters', label: 'Quality Parameters' },
      { key: 'documentation', label: 'Documentation' },
      { key: 'expenses', label: 'Expenses' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'complaints',
    label: 'Complaint Management',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'supportManagement', label: 'Support Management' },
      { key: 'technicians', label: 'Technicians' },
      { key: 'customerRecords', label: 'Customer Records' },
      { key: 'dealVerifications', label: 'Deal Verifications' },
      { key: 'deliveryConfirmation', label: 'Delivery Confirmation' },
      { key: 'installationSchedule', label: 'Installation Schedule' },
      { key: 'feedbackRatings', label: 'Feedback & Ratings' },
      { key: 'expenses', label: 'Expenses' }
    ]
  },
  {
    name: 'settings',
    label: 'Settings',
    features: [
      { key: 'general', label: 'General Settings' },
      { key: 'users', label: 'User Management' },
      { key: 'system', label: 'System Configuration' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'Store',
    label: 'Store',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'orders', label: 'Orders' },
      { key: 'inventory', label: 'Inventory' },
      { key: 'purchaseOrders', label: 'Purchase Orders' },
      { key: 'materialTransfers', label: 'Material Transfers' },
      { key: 'defectiveInventory', label: 'Defective Inventory' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'marketing',
    label: 'Marketing',
    features: [
      { key: 'library', label: 'Marketing Library' },
      { key: 'upload', label: 'Upload Content' },
      { key: 'categories', label: 'Category Management' },
      { key: 'reports', label: 'Reports' },
      { key: 'auditLogs', label: 'Audit Logs' },
      { key: 'notifications', label: 'Notifications' },
      { key: 'lms', label: 'LMS' }
    ]
  },
  {
    name: 'mis',
    label: 'MIS Admin',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'salesReport', label: 'Sales Reports' },
      { key: 'financeReport', label: 'Finance Reports' },
      { key: 'productionReport', label: 'Production Summary' },
      { key: 'inventoryReport', label: 'Inventory Reports' },
      { key: 'complaintReport', label: 'Complaint & Service' },
      { key: 'hrmsReport', label: 'HRMS Report' },
      { key: 'qualityReport', label: 'Quality Reports' },
    ]
  },
  {
    name: 'quality-control',
    label: 'Quality Control',
    features: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'qcJobs', label: 'QC Jobs' },
      { key: 'qcInspection', label: 'QC Inspection' },
      { key: 'qcInward', label: 'QC Inward' },
      { key: 'qcReports', label: 'QC Reports' },
      { key: 'lms', label: 'LMS' }
    ]
  }
];

// Which MODULES entries are relevant/assignable for each role.
// Keeps "Module Permissions" scoped to only what that role actually uses -
// e.g. nobody outside Superadmin can ever be granted the Superadmin module
// because 'Superadmin' never appears as a value here for any other role.
export const ROLE_MODULE_MAP = {
  'Superadmin': ['superAdmin', 'settings'],
  'HR-Admin': ['hrms'],
  'Company Admin': ['hrms'],
  'Production Head': ['production'],
  'Packing Head': ['packing'],
  'Dispatch Head': ['dispatches'],
  'Dispatch Employee': ['dispatches'],
  'Sales Head': ['sales'],
  'Accounts Head': ['accounts'],
  'Research & Development Head': ['rnd'],
  'Complaint Management Head': ['complaints'],
  'Store Head': ['Store'],
  'QC Head': ['quality-control'],
  'Marketing Head': ['marketing'],
  'MIS Admin': ['mis'],
  // Employee-tier department roles — same real module as their Head
  // counterpart, so their Module Permissions actually match the Sidebar.
  'Sales Employee': ['sales'],
  'Production Employee': ['production'],
  'Account Employee': ['accounts'],
  'Research Development Employee': ['rnd'],
  'Complaint Management Employee': ['complaints'],
  'Store Employee': ['Store'],
  'QC Employee': ['quality-control'],
  'Marketing Employee': ['marketing'],
};

export const PERMISSION_ACTIONS = ['view', 'add', 'edit', 'delete'];

/**
 * Sensible default (view/add/edit/delete) permission set for a role, seeded
 * as soon as that role is selected in a create/edit form.
 */
export const getDefaultModulesForRole = (role) => {
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

  // Least-privilege default for Employee-tier roles: can view and add, not
  // edit/delete. The admin creating them can adjust any toggle before saving.
  const employeeDefaultFeatures = (moduleName) =>
    (MODULES.find(m => m.name === moduleName)?.features || []).map(f => ({
      key: f.key,
      label: f.label,
      view: true,
      add: true,
      edit: false,
      delete: false
    }));

  // Full-access default for a Head role, reused for the combined
  // Packing-and-Dispatch Head across both its modules.
  const headDefaultFeatures = (moduleName) =>
    (MODULES.find(m => m.name === moduleName)?.features || []).map(f => ({
      key: f.key,
      label: f.label,
      view: true,
      add: true,
      edit: true,
      delete: true
    }));

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
            { key: 'setting', view: true, add: true, edit: true, delete: true },
            { key: 'lms', view: true, add: true, edit: true, delete: true }
          ]
        }
      ];
    case 'Production Head':
      return [
        {
          name: 'production',
          dashboard: true,
          features: [
            createFeaturePermissions('production', 'orders', { view: true, add: true, edit: true, delete: true, alter: true }),
            createFeaturePermissions('production', 'repairProduction', { view: true, add: true, edit: true, delete: true, alter: true }),
            createFeaturePermissions('production', 'workPlanning', { view: true, add: true, edit: true, delete: true, alter: true }),
            createFeaturePermissions('production', 'processQc', { view: true, add: true, edit: true, delete: true, alter: true }),
            createFeaturePermissions('production', 'jobCards', { view: true, add: true, edit: true, delete: true, alter: true }),
            createFeaturePermissions('production', 'manpower', { view: true, add: true, edit: true, delete: true, alter: true }),
            createFeaturePermissions('production', 'expenses', { view: true, add: true, edit: true, delete: true, alter: true }),
            { key: 'lms', label: 'LMS', view: true, add: false, edit: false, delete: false, alter: false }
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
            { key: 'leads', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'paymentRequests', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'myCustomers', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'myDeliveries', view: true, add: false, edit: false, delete: false, alter: false },
            { key: 'myInvoices', view: true, add: false, edit: false, delete: false, alter: false },
            { key: 'refundReturn', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'lms', label: 'LMS', view: true, add: false, edit: false, delete: false, alter: false }
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
            { key: 'packingSheet', view: true, add: true, edit: true, delete: true },
            { key: 'lms', label: 'LMS', view: true, add: false, edit: false, delete: false }
          ]
        }
      ];
    case 'Dispatch Head':
      return [{ name: 'dispatches', dashboard: true, features: headDefaultFeatures('dispatches') }];
    case 'Dispatch Employee':
      return [{ name: 'dispatches', dashboard: true, features: employeeDefaultFeatures('dispatches') }];
    case 'Accounts Head':
      return [
        {
          name: 'accounts',
          dashboard: true,
          features: (MODULES.find(m => m.name === 'accounts')?.features || []).map(f => ({
            key: f.key,
            label: f.label,
            view: true,
            add: true,
            edit: true,
            delete: true
          }))
        }
      ];
    case 'Marketing Head':
      return [
        {
          name: 'marketing',
          dashboard: true,
          features: [
            { key: 'library', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'upload', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'categories', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'reports', view: true, add: false, edit: false, delete: false, alter: false },
            { key: 'auditLogs', view: true, add: false, edit: false, delete: false, alter: false },
            { key: 'notifications', view: true, add: false, edit: false, delete: false, alter: false },
            { key: 'lms', label: 'LMS', view: true, add: false, edit: false, delete: false, alter: false }
          ]
        },
        {
          name: 'customers',
          dashboard: false,
          features: [
            { key: 'addEditView', view: true, add: false, edit: false, delete: false, alter: false }
          ]
        }
      ];
    case 'MIS Admin':
      return [
        {
          name: 'mis',
          dashboard: true,
          features: [
            { key: 'dashboard', label: 'Dashboard', view: true, add: false, edit: false, delete: false },
            { key: 'salesReport', label: 'Sales Reports', view: true, add: false, edit: false, delete: false },
            { key: 'financeReport', label: 'Finance Reports', view: true, add: false, edit: false, delete: false },
            { key: 'productionReport', label: 'Production Summary', view: true, add: false, edit: false, delete: false },
            { key: 'inventoryReport', label: 'Inventory Reports', view: true, add: false, edit: false, delete: false },
            { key: 'complaintReport', label: 'Complaint & Service', view: true, add: false, edit: false, delete: false },
            { key: 'hrmsReport', label: 'HRMS Report', view: true, add: false, edit: false, delete: false },
            { key: 'qualityReport', label: 'Quality Reports', view: true, add: false, edit: false, delete: false },
          ]
        }
      ];
    case 'QC Head':
      return [
        {
          name: 'quality-control',
          dashboard: true,
          features: [
            { key: 'dashboard', label: 'Dashboard', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'qcJobs', label: 'QC Jobs', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'qcInspection', label: 'QC Inspection', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'qcInward', label: 'QC Inward', view: true, add: true, edit: true, delete: true, alter: true },
            { key: 'qcReports', label: 'QC Reports', view: true, add: false, edit: false, delete: false, alter: false },
            { key: 'lms', label: 'LMS', view: true, add: false, edit: false, delete: false, alter: false }
          ]
        }
      ];
    case 'HR-Admin':
    case 'Company Admin':
      return [
        {
          name: 'hrms',
          dashboard: true,
          features: (MODULES.find(m => m.name === 'hrms')?.features || []).map(f => ({
            key: f.key,
            label: f.label,
            view: true,
            add: true,
            edit: true,
            delete: true
          }))
        }
      ];
    case 'Research & Development Head':
      return [
        {
          name: 'rnd',
          dashboard: true,
          features: (MODULES.find(m => m.name === 'rnd')?.features || []).map(f => ({
            key: f.key,
            label: f.label,
            view: true,
            add: true,
            edit: true,
            delete: true
          }))
        }
      ];
    case 'Complaint Management Head':
      return [
        {
          name: 'complaints',
          dashboard: true,
          features: (MODULES.find(m => m.name === 'complaints')?.features || []).map(f => ({
            key: f.key,
            label: f.label,
            view: true,
            add: true,
            edit: true,
            delete: true
          }))
        }
      ];
    case 'Store Head':
      return [
        {
          name: 'Store',
          dashboard: true,
          features: [
            { key: 'dashboard', view: true, add: true, edit: true, delete: true },
            { key: 'orders', view: true, add: true, edit: true, delete: true },
            { key: 'inventory', view: true, add: true, edit: true, delete: true },
            { key: 'purchaseOrders', view: true, add: true, edit: true, delete: true },
            { key: 'materialTransfers', view: true, add: true, edit: true, delete: true },
            { key: 'defectiveInventory', view: true, add: true, edit: true, delete: true },
            { key: 'lms', label: 'LMS', view: true, add: false, edit: false, delete: false }
          ]
        }
      ];

    // ── Employee-tier department roles ──────────────────────────────────
    case 'Sales Employee':
      return [{ name: 'sales', dashboard: true, features: employeeDefaultFeatures('sales') }];
    case 'Production Employee':
      return [{ name: 'production', dashboard: true, features: employeeDefaultFeatures('production') }];
    case 'Account Employee':
      return [{ name: 'accounts', dashboard: true, features: employeeDefaultFeatures('accounts') }];
    case 'Research Development Employee':
      return [{ name: 'rnd', dashboard: true, features: employeeDefaultFeatures('rnd') }];
    case 'Complaint Management Employee':
      return [{ name: 'complaints', dashboard: true, features: employeeDefaultFeatures('complaints') }];
    case 'Store Employee':
      return [{ name: 'Store', dashboard: true, features: employeeDefaultFeatures('Store') }];
    case 'QC Employee':
      return [{ name: 'quality-control', dashboard: true, features: employeeDefaultFeatures('quality-control') }];
    case 'Marketing Employee':
      return [{ name: 'marketing', dashboard: true, features: employeeDefaultFeatures('marketing') }];

    default:
      return [];
  }
};
