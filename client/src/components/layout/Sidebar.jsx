import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  LayoutDashboard,
  Cog,
  Truck,
  TrendingUp,
  Calculator,
  Package,
  Users,
  Handshake,
  Receipt,
  Settings,
  LogOut,
  Factory,
  Shield,
  Building2,
  ChevronDown,
  ChevronRight,
  Building,
  PieChart,
  ShoppingCart,
  CreditCard,
  RotateCcw,
  Calendar,
  Play,
  FileText,
  CheckCircle,
  BarChart,
  Clock
} from 'lucide-react';

// Separate menu items for each role
const superAdminMenuItems = [
  {
    label: 'Super Admin Dashboard',
    path: '/super-admin-dashboard',
    icon: Shield,
    module: 'dashboard'
  },
  {
    label: 'Orders',
    path: '/super-admin/orders',
    icon: Receipt,
    module: 'orders'
  },
  {
    label: 'Sales',
    path: '/super-admin/sales',
    icon: TrendingUp,
    module: 'sales'
  },
  {
    label: 'Dispatches',
    path: '/super-admin/dispatches',
    icon: Truck,
    module: 'dispatches'
  },
  {
    label: 'Accounts',
    path: '/super-admin/accounts',
    icon: Calculator,
    module: 'accounts'
  },
  {
    label: 'Inventory',
    path: '/super-admin/inventory',
    icon: Package,
    module: 'inventory'
  },
  {
    label: 'Customers',
    path: '/super-admin/customers',
    icon: Users,
    module: 'customers'
  },
  {
    label: 'Companies',
    path: '/super-admin/companies',
    icon: Building2,
    module: 'companies'
  },
  {
    label: 'Role & Permissions',
    path: '/role-permission-management',
    icon: Shield,
    module: 'permissions'
  },
  {
    label: 'Settings',
    path: '/super-admin/settings',
    icon: Settings,
    module: 'settings'
  }
];

const unitHeadMenuItems = [
  {
    label: 'Dashboard',
    path: '/unit-head-dashboard',
    icon: LayoutDashboard,
    module: 'dashboard'
  },
  {
    label: 'Orders',
    path: '/unit-head/orders',
    icon: Receipt,
    module: 'orders'
  },
  {
    label: 'Sales',
    path: '/unit-head/sales',
    icon: TrendingUp,
    module: 'sales'
  },
  {
    label: 'Dispatches',
    path: '/unit-head/dispatches',
    icon: Truck,
    module: 'dispatches'
  },
  {
    label: 'Accounts',
    path: '/unit-head/accounts',
    icon: Calculator,
    module: 'accounts'
  },
  {
    label: 'Inventory',
    path: '/unit-head/inventory',
    icon: Package,
    module: 'inventory'
  },
  {
    label: 'Customers',
    path: '/unit-head/customers',
    icon: Users,
    module: 'customers'
  },
  {
    label: 'Production Group',
    path: '/unit-head/production-group',
    icon: Users,
    module: 'unitManager',
    feature: 'productionGroup'
  },
  {
    label: 'User Management',
    path: '/unit-head/role-permission-management',
    icon: Shield,
    module: 'userManagement'
  },
  {
    label: 'Settings',
    path: '/unit-head/settings',
    icon: Settings,
    module: 'settings'
  }
];

const unitManagerMenuItems = [
  {
    label: 'Dashboard',
    path: '/unit-manager/dashboard',
    icon: LayoutDashboard,
    module: 'dashboard'
  },
   {
    label: 'Sales Order List',
    path: '/unit-manager/sales-order-list',
    icon: TrendingUp,
    module: 'unitManager',
    feature: 'salesOrderList'
  },
  {
    label: 'Indent Summary ',
    path: '/unit-manager/indent-summary',
    icon: Shield,
    module: 'unitManager',
    feature: 'salesApproval'
  },
  {
    label: 'Production Group',
    path: '/unit-manager/production-group',
    icon: Users,
    module: 'unitManager',
    feature: 'productionGroup'
  },
  {
    label: 'Orders',
    path: '/orders',
    icon: Receipt,
    module: 'orders'
  },
  {
    label: 'Inventory',
    path: '/inventory',
    icon: Package,
    module: 'inventory'
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: Users,
    module: 'customers'
  }
];

const productionMenuItems = [
  {
    label: 'Dashboard',
    path: '/production/dashboard',
    icon: Factory,
    module: 'production'
  },
    {
    label: 'Production Sheet',
    path: '/production/production-sheet',
    icon: Clock,
    module: 'production',
    feature: 'productionSheet'
  },
  {
    label: 'Production Reports',
    path: '/production/reports',
    icon: BarChart,
    module: 'production',
    feature: 'productionReports'
  }
];

const packingMenuItems = [
  {
    label: 'Dashboard',
    path: '/packing-dashboard',
    icon: LayoutDashboard,
    module: 'packing',
    feature: 'dashboard'
  },
  {
    label: 'Packing Sheet',
    path: '/packing/packing-sheet',
    icon: FileText,
    module: 'packing',
    feature: 'packingSheet'
  }
];

const dispatchMenuItems = [
  {
    label: 'Dashboard',
    path: '/dispatch-dashboard',
    icon: LayoutDashboard,
    module: 'dashboard'
  },
  {
    label: 'Orders',
    path: '/orders',
    icon: Receipt,
    module: 'orders'
  }
];

const salesMenuItems = [
  {
    label: 'Dashboard',
    path: '/sales-dashboard',
    icon: LayoutDashboard,
    module: 'dashboard'
  },
  {
    label: 'My Orders',
    path: '/sales/orders',
    icon: ShoppingCart,
    module: 'sales',
    feature: 'orders'
  },
  {
    label: 'My Customers',
    path: '/sales/my-customers',
    icon: Users,
    module: 'sales',
    feature: 'myCustomers'
  },
  {
    label: 'My Dispatches',
    path: '/sales/my-deliveries',
    icon: Truck,
    module: 'sales',
    feature: 'myDeliveries'
  },
  {
    label: 'My Payments',
    path: '/sales/my-invoices',
    icon: CreditCard,
    module: 'sales',
    feature: 'myInvoices'
  },
  {
    label: 'Return/Damage',
    path: '/sales/refund-return',
    icon: RotateCcw,
    module: 'sales',
    feature: 'refundReturn'
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: Users,
    module: 'customers'
  }
];

const accountsMenuItems = [
  {
    label: 'Dashboard',
    path: '/accounts-dashboard',
    icon: LayoutDashboard,
    module: 'dashboard'
  },
  {
    label: 'Accounts',
    path: '/accounts',
    icon: Calculator,
    module: 'accounts',
    submodules: [
      { label: 'Payment Register', path: '/accounts/payments', feature: 'paymentRegister' },
      { label: 'Credit Notes', path: '/accounts/credits', feature: 'creditNotes' },
      { label: 'Ledger Report', path: '/accounts/ledger', feature: 'ledgerReport' }
    ]
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: Users,
    module: 'customers'
  }
];

// Function to get menu items based on role
const getMenuItemsByRole = (role) => {
  switch (role) {
    case 'Super Admin':
      return superAdminMenuItems;
    case 'Unit Head':
      return unitHeadMenuItems;
    case 'Unit Manager':
      return unitManagerMenuItems;
    case 'Production':
      return productionMenuItems;
    case 'Packing':
      return packingMenuItems;
    case 'Dispatch':
      return dispatchMenuItems;
    case 'Sales':
      return salesMenuItems;
    case 'Accounts':
      return accountsMenuItems;
    default:
      return [];
  }
};

// Profile menu item (always available)
const profileMenuItem = {
  label: 'Profile',
  path: '/profile',
  icon: Shield,
  module: null // Always accessible
};

export default function Sidebar({ isOpen, onClose }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { companyLogo, companyName, settings } = useSettings();
  const { hasModuleAccess, hasFeatureAccess } = usePermissions();
  const [expandedModules, setExpandedModules] = useState({});

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  const toggleModule = (moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };

  // Get menu items based on user role - much simpler and cleaner
  const roleMenuItems = getMenuItemsByRole(user?.role);
  
  // For Production role users, apply strict filtering to only show production items
  let filteredMenuItems;
  if (user?.role === 'Production') {
    // For Production users, only show production-related items and profile
    filteredMenuItems = roleMenuItems.filter(item => {
      // Always show items without module restriction (like profile)
      if (!item.module) return true;
      
      // Only show production module items
      if (item.module === 'production') {
        // If item has a specific feature requirement, check feature access
        if (item.feature) {
          const hasFeature = hasFeatureAccess(item.module, item.feature, 'view');
          return hasFeature;
        }
        return true;
      }
      
      return false; // Hide all non-production items for Production users
    });
  } else if (user?.role === 'Packing') {
    // For Packing users, only show packing-related items and profile
    filteredMenuItems = roleMenuItems.filter(item => {
      // Always show items without module restriction (like profile)
      if (!item.module) return true;
      
      // Only show packing module items
      if (item.module === 'packing') {
        // If item has a specific feature requirement, check feature access
        if (item.feature) {
          const hasFeature = hasFeatureAccess(item.module, item.feature, 'view');
          return hasFeature;
        }
        return true;
      }
      
      return false; // Hide all non-packing items for Packing users
    });
  } else {
    // For other roles, use the existing filtering logic
    filteredMenuItems = roleMenuItems.filter(item => {
      // Always show dashboard
      if (item.module === 'dashboard') return true;
      
      // Always show items without module restriction
      if (!item.module) return true;
      
      // Special handling for Unit Head role with unitManager module features
      if (user?.role === 'Unit Head' && item.module === 'unitManager' && item.feature) {
        // For Unit Head, check feature access directly without module access check
        const hasFeature = hasFeatureAccess(item.module, item.feature, 'view');
        return hasFeature;
      }
      
      // Check if user has access to the module
      const hasAccess = hasModuleAccess(item.module);
      if (!hasAccess) return false;
      
      // If item has a specific feature requirement, check feature access
      if (item.feature) {
        const hasFeature = hasFeatureAccess(item.module, item.feature, 'view');
        if (!hasFeature) return false;
      }
      
      // Check if module is enabled in settings
      if (settings?.modules && settings.modules[item.module] === false) {
        return false;
      }
      
      return true;
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 sm:w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-xl border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo and Company Name */}
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="relative flex-shrink-0">
                {companyLogo ? (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-lg transform hover:scale-110 transition-transform duration-200 border border-slate-200 dark:border-slate-600">
                    <img 
                      src={companyLogo} 
                      alt="Company Logo" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('Sidebar logo load error:', e);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
                              <path d="M2 17L12 22L22 17"></path>
                              <path d="M2 12L12 17L22 12"></path>
                            </svg>
                          </div>
                        `;
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-200">
                    <Factory className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                )}
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="min-w-0">
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate block">
                  {companyName}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Enterprise Suite</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full w-8 h-8"
              onClick={onClose}
            >
              ×
            </Button>
          </div>



          {/* Navigation Menu */}
          <ScrollArea className="flex-1 px-3 sm:px-4 py-4">
            <nav className="space-y-2">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || 
                  (item.module === 'dashboard' && location === '/') ||
                  (item.module === 'dashboard' && location === '/super-admin-dashboard');
                const hasSubmodules = item.submodules && item.submodules.length > 0;
                const isExpanded = expandedModules[item.module];
                const hasAccessibleSubmodules = hasSubmodules && 
                  item.submodules.some(sub => hasFeatureAccess(item.module, sub.feature, 'view'));
                
                return (
                  <div key={item.path} className="space-y-1">
                    {/* Main Module Button */}
                    <div className="flex items-center">
                      {/* Special handling for Sales module - dropdown only, no direct link */}
                      {item.module === 'sales' && hasAccessibleSubmodules ? (
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start h-12 sm:h-12 px-3 sm:px-4 transition-all duration-200 group relative overflow-hidden",
                            "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 hover:text-slate-900 dark:hover:text-slate-100"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleModule(item.module);
                          }}
                        >
                          <Icon className={cn(
                            "w-5 h-5 mr-2 sm:mr-3 transition-all duration-200 group-hover:scale-110"
                          )} />
                          <span className="font-medium text-sm sm:text-base">{item.label}</span>
                          <div className="ml-auto">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </Button>
                      ) : (
                        <>
                          <Link href={item.path} className="flex-1">
                            <Button
                              variant={isActive ? "default" : "ghost"}
                              className={cn(
                                "w-full justify-start h-12 sm:h-12 px-3 sm:px-4 transition-all duration-200 group relative overflow-hidden",
                                isActive
                                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 hover:text-slate-900 dark:hover:text-slate-100"
                              )}
                              onClick={onClose}
                            >
                              <Icon className={cn(
                                "w-5 h-5 mr-2 sm:mr-3 transition-all duration-200",
                                isActive ? "drop-shadow-sm" : "group-hover:scale-110"
                              )} />
                              <span className="font-medium text-sm sm:text-base">{item.label}</span>
                              {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
                              )}
                            </Button>
                          </Link>
                          
                          {/* Expand/Collapse Button for Submodules (for non-sales modules) */}
                          {hasAccessibleSubmodules && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 ml-1"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleModule(item.module);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Submodules */}
                    {hasAccessibleSubmodules && isExpanded && (
                      <div className="ml-6 sm:ml-8 space-y-1">
                        {item.submodules
                          .filter(sub => hasFeatureAccess(item.module, sub.feature, 'view'))
                          .map((submodule) => {
                            const isSubActive = location === submodule.path;
                            return (
                              <Link key={submodule.path} href={submodule.path}>
                                <Button
                                  variant={isSubActive ? "default" : "ghost"}
                                  size="sm"
                                  className={cn(
                                    "w-full justify-start h-9 sm:h-9 px-2 sm:px-3 transition-all duration-200",
                                    isSubActive
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  )}
                                  onClick={onClose}
                                >
                                  <span className="text-xs sm:text-sm">{submodule.label}</span>
                                </Button>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Profile - Always available */}
              <Separator className="my-4" />
              <Link href="/profile">
                <Button
                  variant={location === '/profile' ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-12 px-4 transition-all duration-200 group relative overflow-hidden",
                    location === '/profile'
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      : "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                  onClick={onClose}
                >
                  <Shield className={cn(
                    "w-5 h-5 mr-3 transition-all duration-200",
                    location === '/profile' ? "drop-shadow-sm" : "group-hover:scale-110"
                  )} />
                  <span className="font-medium">Profile</span>
                  {location === '/profile' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
                  )}
                </Button>
              </Link>
            </nav>
          </ScrollArea>

          {/* Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors duration-200"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
