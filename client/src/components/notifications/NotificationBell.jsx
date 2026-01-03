import React, { useState } from 'react';
import { Bell, Volume2, VolumeX, Check, Trash2, AlertCircle, Package, ShoppingCart, UserPlus } from 'lucide-react';
import { testNotificationSound } from '../../utils/soundUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { formatDistanceToNow } from 'date-fns';

// Icon mapping for notification types
const getNotificationIcon = (type, icon) => {
  const iconMap = {
    'order': ShoppingCart,
    'inventory': Package,
    'customer': UserPlus,
    'system': AlertCircle,
    'general': Bell
  };
  
  return iconMap[type] || Bell;
};

// Priority color mapping
const getPriorityColor = (priority) => {
  const colorMap = {
    'low': 'text-slate-500',
    'medium': 'text-blue-500',
    'high': 'text-orange-500',
    'urgent': 'text-red-500'
  };
  
  return colorMap[priority] || colorMap.medium;
};

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { settings } = useSettings();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    soundEnabled,
    toggleSound,
    isConnected 
  } = useNotifications({ limit: 10 });

  // Check if notifications are enabled for this user's role
  const isNotificationEnabled = () => {
    if (!user || !settings?.notifications?.roleSettings) {
      console.log('NotificationBell: No user or no roleSettings, defaulting to enabled', { user: user?.role, settings: settings?.notifications?.roleSettings });
      return true; // Default to enabled if no settings
    }

    // Role key mapping
    const roleKeyMapping = {
      'Sales': 'salesPerson',
      'Unit Head': 'unitHead',
      'Unit Manager': 'unitManager', 
      'Production': 'production',
      'Accounts': 'accounts',
      'Super Admin': 'superAdmin'
    };

    const roleKey = roleKeyMapping[user.role];
    if (!roleKey) {
      console.log('NotificationBell: Unknown role, defaulting to enabled', { role: user.role });
      return true; // Default to enabled for unknown roles
    }

    // Check if role notifications are enabled (default to true if not set)
    const enabled = settings.notifications.roleSettings[roleKey]?.enabled !== false;
    console.log('NotificationBell: Role notification check', { 
      role: user.role, 
      roleKey, 
      enabled, 
      roleSettings: settings.notifications.roleSettings[roleKey],
      allRoleSettings: settings.notifications.roleSettings
    });
    return enabled;
  };

  // Don't render notification bell if notifications are disabled for this role
  if (!isNotificationEnabled()) {
    console.log('NotificationBell: Hiding notification bell for role', user.role);
    return null;
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.isReadByUser) {
      await markAsRead(notification._id);
    }
    
    // Handle navigation based on notification type and data
    if (notification.data?.orderId) {
      window.location.href = `/sales/orders?highlight=${notification.data.orderId}`;
    } else if (notification.data?.customerId) {
      window.location.href = `/sales/my-customers?highlight=${notification.data.customerId}`;
    } else if (notification.data?.itemId) {
      window.location.href = `/inventory?highlight=${notification.data.itemId}`;
    }
    
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-slate-500 hover:text-slate-700"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-red-500 rounded-full" 
                 title="Disconnected from real-time notifications" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="h-6 w-6 p-0"
              title={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {soundEnabled ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-6 text-xs px-2"
                title="Mark all as read"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            No notifications yet
          </div>
        ) : (
          <ScrollArea className="h-80">
            {notifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type, notification.icon);
              const priorityColor = getPriorityColor(notification.priority);
              
              return (
                <div key={notification._id}>
                  <DropdownMenuItem
                    className={`flex items-start gap-3 p-3 cursor-pointer ${
                      !notification.isReadByUser 
                        ? 'bg-blue-50 border-l-2 border-l-blue-500' 
                        : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${priorityColor}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${
                            !notification.isReadByUser 
                              ? 'text-slate-900' 
                              : 'text-slate-700'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-1 leading-tight ${
                            !notification.isReadByUser
                              ? 'text-slate-600'
                              : 'text-slate-500'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                        
                        {!notification.isReadByUser && (
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-400 mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </DropdownMenuItem>
                  
                  {index < notifications.length - 1 && <Separator />}
                </div>
              );
            })}
          </ScrollArea>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <a 
            href="/notifications" 
            className="flex items-center justify-center text-sm text-blue-600 cursor-pointer"
          >
            View all notifications
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};