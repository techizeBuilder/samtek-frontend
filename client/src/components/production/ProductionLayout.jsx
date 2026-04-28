import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Calendar,
  Play,
  FileText,
  CheckCircle,
  BarChart3,
  Menu,
  X,
  Factory,
  Clock,
  Users,
  Settings,
  Bell,
  Search,
  Package,
  Hash,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { NotificationBell } from '@/components/notifications/NotificationBell';

// Production module navigation items
const productionNavItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/production/dashboard',
    icon: LayoutDashboard,
    description: 'Production Overview'
  },
  {
    id: 'batch-planning',
    label: 'Batch Planning',
    path: '/production/batch-planning',
    icon: Calendar,
    description: 'Plan production batches'
  },
  {
    id: 'execution',
    label: 'Production Execution',
    path: '/production/execution',
    icon: Play,
    description: 'Execute batch production'
  },
  {
    id: 'register',
    label: 'Batch Register',
    path: '/production/register',
    icon: FileText,
    description: 'Production records'
  },
  {
    id: 'verification',
    label: 'Verification & Approval',
    path: '/production/verification',
    icon: CheckCircle,
    description: 'Verify production'
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/production/reports',
    icon: BarChart3,
    description: 'Production reports'
  },
  {
    id: 'production-group',
    label: 'Production Group',
    path: '/production/production-group',
    icon: Users,
    description: 'Manage production groups'
  },
  {
    id: 'quantity-batch',
    label: 'Quantity Batch',
    path: '/production/quantity-batch',
    icon: Package,
    description: 'Manage quantity batches'
  },
  {
    id: 'production-shift',
    label: 'Production Sheet',
    path: '/production/production-sheet',
    icon: Clock,
    description: 'Manage production sheets'
  }
];

export default function ProductionLayout({ children }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if notifications are enabled for this user's role
  const isNotificationEnabled = () => {
    if (!user || !settings?.notifications?.roleSettings) {
      return true; // Default to enabled if no settings
    }

    // Role key mapping
    const roleKeyMapping = {
      'Sales': 'salesPerson',
      'Unit Head': 'unitHead',
      'Unit Manager': 'unitManager', 
      'Production': 'production',
      'Accounts': 'accounts',
      'Superadmin': 'superAdmin'
    };

    const roleKey = roleKeyMapping[user.role];
    if (!roleKey) {
      return true; // Default to enabled for unknown roles
    }

    // Check if role notifications are enabled (default to true if not set)
    return settings.notifications.roleSettings[roleKey]?.enabled !== false;
  };

  // Get current active nav item
  const activeNavItem = productionNavItems.find(item => 
    location.startsWith(item.path)
  ) || productionNavItems[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Production Module Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Factory className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Production Module
                </h1>
                <p className="text-sm text-gray-600">
                  {activeNavItem.description}
                </p>
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            {/* Notifications - only show if enabled for user's role */}
            {isNotificationEnabled() && <NotificationBell />}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            </Button>
            <div className="text-sm text-gray-600">
              {user?.username} | {user?.role}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Factory className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Production
                    </h2>
                    <p className="text-xs text-gray-500">
                      Management System
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
              {productionNavItems.map((item) => {
                const isActive = location.startsWith(item.path);
                const Icon = item.icon;

                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto p-4 text-left",
                      isActive 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "hover:bg-gray-100:bg-gray-700"
                    )}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className={cn(
                        "p-2 rounded-lg flex-shrink-0",
                        isActive 
                          ? "bg-blue-500/20" 
                          : "bg-gray-100"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isActive 
                            ? "text-white" 
                            : "text-gray-600"
                        )} />
                      </div>
                      <div className="flex-1">
                        <div className={cn(
                          "font-medium text-sm",
                          isActive 
                            ? "text-white" 
                            : "text-gray-900"
                        )}>
                          {item.label}
                        </div>
                        <div className={cn(
                          "text-xs mt-1",
                          isActive 
                            ? "text-blue-100" 
                            : "text-gray-500"
                        )}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-blue-900">
                        Quick Stats
                      </div>
                      <div className="text-xs text-blue-600">
                        3 batches pending
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          <div className="min-h-screen">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}