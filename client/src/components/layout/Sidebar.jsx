import React, { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { getMenuItemsByRole } from '@/config/moduleRoutes';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Shield, ChevronDown, ChevronRight, LogOut,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const [location] = useLocation();
  const searchString = useSearch(); // query string e.g. "status=Pending"
  const fullPath = searchString ? `${location}?${searchString}` : location;
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { hasModuleAccess, hasFeatureAccess } = usePermissions();
  const [expandedModules, setExpandedModules] = useState({});

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
    }));
  };

  let roleMenuItems = getMenuItemsByRole(user?.role);

  const normalizedRole = user?.role === 'Super Admin' ? 'Superadmin'
    : user?.role === 'HR-Admin' ? 'Hr Admin'
      : user?.role;

  // Company logo shown at the top of the Sidebar — dynamic per company
  // (whatever the Company Admin uploaded on My Company), falling back to the
  // default Samtek logo when the company hasn't uploaded one. Superadmin
  // always sees the default Samtek logo regardless of company.
  const isSuperAdminRole = normalizedRole === 'Superadmin';
  const { data: sidebarCompanyData } = useQuery({
    queryKey: ['sidebar-my-company', user?.companyId],
    queryFn: () => apiRequest('GET', `/api/super-admin/companies/${user.companyId}`),
    enabled: !isSuperAdminRole && !!user?.companyId,
    staleTime: 1000 * 60 * 10,
  });
  const companyLogoUrl = sidebarCompanyData?.company?.logoUrl;
  const sidebarLogoSrc = (!isSuperAdminRole && companyLogoUrl)
    ? `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '')}${companyLogoUrl}`
    : '/logo Semtek.webp';

  // Any "...Employee" role (Sales Employee, Production Employee, etc.) is treated
  // as employee-tier here too — same convention RoleBasedLayout.jsx/ProtectedRoute.jsx
  // already use — so their merged-in HRMS self-service submenus expand correctly.
  const isHrmsRole = user?.role === 'Manager' || user?.role === 'HR-Admin' || user?.role === 'Hr Admin' ||
    (user?.role || '').toLowerCase().endsWith('employee');
  const isManagerRole = user?.role === 'Manager';

  const shouldBypassSubmoduleCheck = isHrmsRole ||
    normalizedRole === 'Research & Development Head' ||
    normalizedRole === 'Research Development Employee' ||
    normalizedRole === 'Complaint Management Head' ||
    normalizedRole === 'Complaint Management Employee' ||
    normalizedRole === 'QC Head' ||
    normalizedRole === 'QC Employee' ||
    normalizedRole === 'Store Head' ||
    normalizedRole === 'Store Employee' ||
    normalizedRole === 'Company Admin';

  const isHeadRole = normalizedRole?.includes('Head') || normalizedRole === 'Manager' || normalizedRole === 'Superadmin' || normalizedRole === 'Hr Admin' || normalizedRole === 'Company Admin';

  // ==========================================
  // 🔥 UNIVERSAL PRE-FILTER 
  // ==========================================
  roleMenuItems = roleMenuItems.filter(item => {
    if (item.label === 'Task Management' && !isHeadRole) return false;

    // THE FIX: This now applies cleanly to ALL departments. 
    // Heads see "Training Management", Employees see "Training"
    if (item.label === 'Training Management' && !isHeadRole) return false;
    if (item.label === 'Training' && isHeadRole) return false;

    return true;
  });

  // 🔥 THE FIX: Unlock ONLY the Head's menu. 
  // The Employee's "Training" menu must keep its DB check so normal employees don't see it!
  roleMenuItems = roleMenuItems.map(item => {
    if (item.label === 'Training Management') {
      return { ...item, feature: undefined };
    }
    return item;
  });

  // ==========================================
  // ROLE SPECIFIC FILTERING
  // ==========================================
  let filteredMenuItems;

  if (normalizedRole === 'Superadmin') {
    filteredMenuItems = roleMenuItems;
  } else if (normalizedRole === 'Production' || normalizedRole === 'Production Employee' || normalizedRole === 'Production Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'production' || item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (
    normalizedRole === 'Packing' || normalizedRole === 'Packing Employee' || normalizedRole === 'Packing Head' ||
    normalizedRole === 'Dispatch' || normalizedRole === 'Dispatch Employee' || normalizedRole === 'Dispatch Head'
  ) {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'packing' || item.module === 'dispatches' || item.module === 'dispatch') {
        if (item.feature) {
          return hasFeatureAccess(item.module, item.feature, 'view') || hasFeatureAccess('dispatches', item.feature, 'view');
        }
        return true;
      }
      if (item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess('hrms', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Accounts' || normalizedRole === 'Account Employee' || normalizedRole === 'Accounts Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'accounts' || item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Sales' || normalizedRole === 'Sales Employee' || normalizedRole === 'Sales Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'sales' || item.module === 'customers' || item.module === 'marketing') {
        if (item.feature && item.module === 'sales') return hasFeatureAccess('sales', item.feature, 'view');
        return true;
      }
      if (item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess('hrms', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Hr Admin' || normalizedRole === 'Manager' || normalizedRole === 'Employee' || normalizedRole === 'Company Admin') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess('hrms', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Research & Development Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'rnd') {
        if (item.feature) return hasFeatureAccess('rnd', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Complaint Management Head') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'complaints') {
        if (item.feature) return hasFeatureAccess('complaints', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'QC Head' || normalizedRole === 'QC Employee') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'quality-control' || item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Store Head' || normalizedRole === 'Store Employee') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      // Store permissions are saved under 'Store' (Company Admin flow) or
      // 'store' (HR-Admin "Add Employee" flow) depending on how the account was created.
      if (item.module === 'Store' || item.module === 'store') {
        if (item.feature) {
          return hasFeatureAccess('Store', item.feature, 'view') || hasFeatureAccess('store', item.feature, 'view');
        }
        return true;
      }
      if (item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess('hrms', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Marketing Employee') {
    // Marketing Head deliberately stays out of this branch — it's untouched and
    // keeps going through the generic fallback below, which enforces the real
    // hasModuleAccess('marketing') permission check as before.
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'marketing' || item.module === 'hrms') {
        if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'MIS Admin') {
    filteredMenuItems = roleMenuItems.filter(item => {
      if (!item.module) return true;
      if (item.module === 'mis') {
        if (item.feature) return hasFeatureAccess('mis', item.feature, 'view');
        return true;
      }
      return false;
    });
  } else if (normalizedRole === 'Research Development Employee' || normalizedRole === 'Complaint Management Employee') {
    // These employee-tier roles are provisioned through a separate flow (HR-Admin's
    // "Add Employee" page) whose stored module name doesn't match the RD/Complaint
    // modules above, so fall back to showing their fixed menu unfiltered rather than
    // hiding everything for them.
    filteredMenuItems = roleMenuItems;
  } else {
    filteredMenuItems = roleMenuItems.filter(item => {
      const hasAccess = hasModuleAccess(item.module);
      if (!hasAccess) return false;
      if (item.feature) return hasFeatureAccess(item.module, item.feature, 'view');
      if (settings?.modules && settings.modules[item.module] === false) return false;
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
        "fixed inset-y-0 left-0 z-50 w-80 sm:w-72 bg-white/95 backdrop-blur-sm shadow-xl border-r border-slate-200 transition-all duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-3 border-b border-slate-200 bg-white">
            <div className="flex-1 flex items-center justify-center h-full py-2">
              <img
                src={sidebarLogoSrc}
                alt="Company Logo"
                className="h-full w-auto object-contain"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo Semtek.webp'; }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-500 hover:bg-slate-100 rounded-full w-8 h-8 flex-shrink-0"
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
                const isActive = fullPath === item.path ||
                  (item.module === 'dashboard' && location === '/') ||
                  (item.module === 'dashboard' && location === '/super-admin-dashboard') ||
                  (item.module === 'rnd' && location === '/r&d-dashboard') ||
                  (item.module === 'complaints' && location === '/complaints') ||
                  // Fabrication Master lives at its own route but isn't a sidebar
                  // item anymore — it's opened from Inventory, so Inventory stays
                  // highlighted while viewing it.
                  (item.path === '/r&d/inventory' && location === '/r&d/fabrication-master');
                const hasSubmodules = item.submodules && item.submodules.length > 0;
                const isExpanded = expandedModules[item.path];

                // 🔥 THE FIX: Always allow Training Management to reveal its submodules
                const hasAccessibleSubmodules = hasSubmodules &&
                  (item.label === 'Training Management' || shouldBypassSubmoduleCheck || item.submodules.some(sub => hasFeatureAccess(item.module, sub.feature, 'view')));

                return (
                  <div key={item.path} className="space-y-1">
                    {/* Main Module Button */}
                    <div className="flex items-center">
                      {hasAccessibleSubmodules ? (
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start h-12 sm:h-12 px-3 sm:px-4 transition-all duration-200 group relative overflow-hidden",
                            "text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50:from-blue-900/20:to-purple-900/20 hover:text-slate-900:text-slate-100"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleModule(item.path);
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
                        <Link href={item.path} className="flex-1">
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start h-12 sm:h-12 px-3 sm:px-4 transition-all duration-200 group relative overflow-hidden",
                              isActive
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                                : "text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50:from-blue-900/20:to-purple-900/20 hover:text-slate-900:text-slate-100"
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
                      )}
                    </div>

                    {/* Submodules */}
                    {hasAccessibleSubmodules && isExpanded && (
                      <div className="ml-6 sm:ml-8 space-y-1">
                        {item.submodules
                          // 🔥 THE FIX: Bypass DB checks for LMS submodules so they render perfectly for Heads
                          .filter(sub => item.label === 'Training Management' || shouldBypassSubmoduleCheck || hasFeatureAccess(item.module, sub.feature, 'view'))
                          .map((submodule) => {
                            const isSubActive = fullPath === submodule.path;
                            return (
                              <Link key={submodule.path} href={submodule.path}>
                                <Button
                                  variant={isSubActive ? "default" : "ghost"}
                                  size="sm"
                                  className={cn(
                                    "w-full justify-start h-9 sm:h-9 px-2 sm:px-3 transition-all duration-200",
                                    isSubActive
                                      ? "bg-blue-100 text-blue-800"
                                      : "text-slate-600 hover:bg-slate-100:bg-slate-800"
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
                      : "text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50:from-blue-900/20:to-purple-900/20 hover:text-slate-900:text-slate-100"
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
          <div className="p-4 border-t border-slate-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-700 hover:bg-red-50 hover:text-red-600:bg-red-900/20:text-red-400 transition-colors duration-200"
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
