import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';

export default function Header({ onSidebarToggle, title = "Dashboard" }) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

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

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-background shadow-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onSidebarToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Sun className="h-5 w-5" />
          </Button>

          {/* Notifications - only show if enabled for user's role */}
          {isNotificationEnabled() && <NotificationBell />}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">
                    {user?.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.fullName}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
