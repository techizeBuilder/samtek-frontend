import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, ClipboardList, Calendar, Cog, FileText, Users,
  BarChart3, Menu, X, Factory, Clock, Settings, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const productionNavItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/production/dashboard', icon: LayoutDashboard, description: 'Production overview' },
  { id: 'orders', label: 'Orders', path: '/production/orders', icon: ClipboardList, description: 'Machine manufacturing orders' },
  { id: 'work-planning', label: 'Work Planning', path: '/production/work-planning', icon: Calendar, description: 'Daily & weekly plans' },
  { id: 'process-execution', label: 'Process & QC', path: '/production/process-execution', icon: Cog, description: 'Process flow & QC approval' },
  { id: 'job-cards', label: 'Job Cards', path: '/production/job-cards', icon: FileText, description: 'Printable job cards' },
  { id: 'manpower', label: 'Manpower', path: '/production/manpower', icon: Users, description: 'Team tracking & skills' },
  { id: 'reports', label: 'Reports', path: '/production/reports', icon: BarChart3, description: 'Production reports' },
];

export default function ProductionLayout({ children }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isNotificationEnabled = () => {
    if (!user || !settings?.notifications?.roleSettings) return true;
    const roleKeyMapping = {
      'Sales': 'salesPerson', 'Unit Head': 'unitHead', 'Unit Manager': 'unitManager',
      'Production': 'production', 'Accounts': 'accounts', 'Superadmin': 'superAdmin',
    };
    const roleKey = roleKeyMapping[user.role];
    if (!roleKey) return true;
    return settings.notifications.roleSettings[roleKey]?.enabled !== false;
  };

  const activeNavItem = productionNavItems.find(item => location.startsWith(item.path)) || productionNavItems[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Factory className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Production Module</h1>
                <p className="text-sm text-gray-600">{activeNavItem.description}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm"><Search className="h-4 w-4" /></Button>
            {isNotificationEnabled() && <NotificationBell />}
            <Button variant="ghost" size="sm"><Settings className="h-4 w-4" /></Button>
            <div className="text-sm text-gray-600">{user?.username} | {user?.role}</div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Factory className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Production</h2>
                    <p className="text-xs text-gray-500">Management System</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {productionNavItems.map((item) => {
                const isActive = location.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <div className={cn('p-1.5 rounded-lg flex-shrink-0', isActive ? 'bg-blue-500/30' : 'bg-gray-100')}>
                      <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-gray-600')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('font-medium text-sm', isActive ? 'text-white' : 'text-gray-900')}>{item.label}</div>
                      <div className={cn('text-xs truncate', isActive ? 'text-blue-100' : 'text-gray-500')}>{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200">
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-900">Machine Mfg.</div>
                    <div className="text-xs text-blue-600">Planning & Execution</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
