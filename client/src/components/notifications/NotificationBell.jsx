import React, { useState } from 'react';
import {
  Bell, Volume2, VolumeX, Check, AlertCircle, Package, ShoppingCart,
  UserPlus, Target, CreditCard, Factory, Truck, Shield, MessageSquare,
  ClipboardList, Users, Calendar, Clock, Receipt, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

// Icon mapping for all notification types
const getNotificationIcon = (type) => {
  const iconMap = {
    'order': ShoppingCart,
    'inventory': Package,
    'store': Package,
    'customer': UserPlus,
    'lead': Target,
    'payment': CreditCard,
    'account': CreditCard,
    'purchase': ShoppingCart,
    'production': Factory,
    'dispatch': Truck,
    'qc': Shield,
    'complaint': MessageSquare,
    'task': ClipboardList,
    'hrms': Users,
    'leave': Calendar,
    'attendance': Clock,
    'payroll': Receipt,
    'rd': ClipboardList,
    'marketing': Star,
    'mis': AlertCircle,
    'system': AlertCircle,
    'general': Bell,
  };
  return iconMap[type] || Bell;
};

const getPriorityColor = (priority) => {
  const colorMap = {
    'low': 'text-slate-500',
    'medium': 'text-blue-500',
    'high': 'text-orange-500',
    'urgent': 'text-red-500'
  };
  return colorMap[priority] || 'text-blue-500';
};

// Navigate to relevant page based on notification type and data
const getNavigationUrl = (notification) => {
  const { type, data } = notification;
  if (data?.orderId) return `/sales/orders?highlight=${data.orderId}`;
  if (type === 'lead' && data?.leadId) return `/sales/leads?highlight=${data.leadId}`;
  if (type === 'payment' && data?.leadId) return `/accounts/lead-payments`;
  if (type === 'payment') return `/accounts/payment-verifications`;
  if (type === 'account' && data?.orderCode) return `/accounts/sales/packed-orders`;
  if (type === 'purchase') return `/accounts/purchases/requests`;
  if (type === 'production') return `/production/orders`;
  if (type === 'store') return `/store/orders`;
  if (type === 'dispatch') return `/dispatch/active`;
  if (type === 'qc') return `/qc/jobs`;
  if (type === 'complaint' || type === 'task') return `/complaints/dashboard`;
  if (type === 'leave') return `/hrms/SuperAdmin/leave-requests`;
  if (type === 'attendance') return `/hrms/SuperAdmin/attendance-requests`;
  if (type === 'payroll') return `/hrms/SuperAdmin/payroll/payslips`;
  if (type === 'hrms') return `/hrms/SuperAdmin/employees`;
  if (data?.customerId) return `/customers`;
  if (data?.itemId) return `/store/inventory`;
  return '/notifications';
};

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const {
    notifications, unreadCount, isLoading,
    markAsRead, markAllAsRead, soundEnabled, toggleSound, isConnected
  } = useNotifications({ limit: 10 });

  const handleNotificationClick = async (notification) => {
    if (!notification.isReadByUser) {
      await markAsRead(notification._id);
    }
    const url = getNavigationUrl(notification);
    if (url !== window.location.pathname) {
      window.location.href = url;
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-slate-500 hover:text-slate-700">
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
            <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-red-500 rounded-full" title="Disconnected" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleSound} className="h-6 w-6 p-0" title={soundEnabled ? 'Mute' : 'Unmute'}>
              {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-6 text-xs px-2">
                <Check className="h-3 w-3 mr-1" /> Mark all
              </Button>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            {notifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type);
              const priorityColor = getPriorityColor(notification.priority);
              return (
                <div key={notification._id}>
                  <DropdownMenuItem
                    className={`flex items-start gap-3 p-3 cursor-pointer ${
                      !notification.isReadByUser ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${priorityColor}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight truncate ${!notification.isReadByUser ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-xs mt-0.5 leading-tight line-clamp-2 ${!notification.isReadByUser ? 'text-slate-600' : 'text-slate-500'}`}>
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isReadByUser && (
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
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
          <a href="/notifications" className="flex items-center justify-center text-sm text-blue-600 cursor-pointer py-2">
            View all notifications
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
