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

// Navigate to relevant page based on notification type, data and user role
// (NotificationsPage bhi isi ko use karta hai — routing ek hi jagah rahe)
export const getNavigationUrl = (notification, userRole = '') => {
  const { type, data, title, icon } = notification;
  const isSalesRole = ['Sales', 'Sales Employee', 'Sales Head'].includes(userRole);
  const isStoreRole = ['Store', 'Store Head', 'Store Employee'].includes(userRole);
  const isAccountsRole = ['Accounts', 'Accounts Head', 'Account Employee'].includes(userRole);
  const isDispatchRole = ['Dispatch', 'Dispatch Head', 'Dispatch Employee'].includes(userRole);
  const isMarketingHead = userRole === 'Marketing Head';

  if (type === 'complaint' && (
    title?.toLowerCase().includes('deal') ||
    title?.toLowerCase().includes('verification') ||
    icon === 'shield'
  )) {
    return '/complaints/deal-verifications';
  }

  // HRMS task assignment ("New Task Assigned" etc.) — each department has its
  // own "My Tasks" inbox, there's no single shared route like the complaints
  // dashboard this used to (incorrectly) fall through to. Checked early so the
  // role-based catch-alls below (e.g. Store) never intercept it.
  if (type === 'task') {
    const deptRouteMap = {
      'Production': '/production/my-task',
      'Packing': '/packing/my-task',
      'Dispatch': '/dispatch/my-task',
      'Accounts': '/accounts/my-task',
      'Sales': '/sales/my-task',
      'R&D': '/r&d/my-task',
      'Store': '/store/my-task',
      'QC': '/qc/my-task',
    };
    if (data?.department && deptRouteMap[data.department]) return deptRouteMap[data.department];

    // Fall back to the recipient's own role when the notification has no department on it.
    if (userRole?.includes('Production')) return '/production/my-task';
    if (userRole?.includes('Packing')) return '/packing/my-task';
    if (userRole?.includes('Dispatch')) return '/dispatch/my-task';
    if (userRole?.includes('Account')) return '/accounts/my-task';
    if (userRole?.includes('Sales')) return '/sales/my-task';
    if (userRole?.includes('Research') || userRole?.includes('R&D')) return '/r&d/my-task';
    if (userRole?.includes('Store')) return '/store/my-task';
    if (userRole?.includes('QC')) return '/qc/my-task';
    if (userRole === 'Manager') return '/hrms/Manager/my-task';
    if (userRole === 'Employee') return '/hrms/Employee/my-task';
    return '/notifications';
  }

  // Marketing content requests — role decides which screen opens
  if (type === 'marketing') {
    if (isMarketingHead) return '/marketing/sales-requests';
    if (isSalesRole) return '/sales/marketing-requests';
    return '/notifications';
  }

  // Payment notifications — Sales has its own Payment Requests screen
  if (type === 'payment') {
    if (isSalesRole) return '/sales/payment-requests';
    return '/accounts/payment-verifications';
  }

  // Store users land in their own module, never in Sales/Accounts pages
  if (isStoreRole) {
    if (type === 'inventory' || data?.itemId) return '/store/inventory';
    if (type === 'purchase') return '/store/purchases/requests';
    return '/store/orders';
  }

  // Sales Order Form Submitted — Accounts reviews it on its own Order Forms
  // screen, not the Sales module's order list (the generic orderId fallback
  // below would otherwise send them there).
  if (isAccountsRole && type === 'account' && title?.toLowerCase().includes('order form')) {
    return '/accounts/sales/order-forms';
  }

  if (data?.orderId) return `/sales/orders?highlight=${data.orderId}`;
  if (type === 'lead' && data?.leadId) return `/sales/leads?highlight=${data.leadId}`;
  if (type === 'account' && data?.orderCode) return `/accounts/sales/packed-orders`;
  if (type === 'purchase') return `/accounts/purchases/requests`;
  if (type === 'production') return `/production/orders`;
  if (type === 'store') return `/store/orders`;
  // "Packing Completed" is sent to Dispatch AND Accounts — Accounts has no
  // access to the Dispatch module, so route them to their own packed-orders
  // (NOC/payment clearance) screen instead. Dispatch needs to go plan the
  // newly packed item's dispatch, not the generic active-dispatch list.
  if (type === 'dispatch' && title?.toLowerCase().includes('packing completed')) {
    return isAccountsRole ? '/accounts/sales/packed-orders' : '/dispatch/planning';
  }
  if (type === 'dispatch') return isAccountsRole ? '/accounts/sales/packed-orders' : `/dispatch/active`;
  // "QC Passed" is sent to Dispatch too (item is ready to be queued for
  // packaging) — Dispatch has no access to the QC module, so route them to
  // their own Packaging Queue instead of the QC Jobs screen.
  if (type === 'qc') return isDispatchRole ? '/packaging/queue' : `/qc/jobs`;
  if (type === 'complaint') return `/complaints/dashboard`;
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
    const url = getNavigationUrl(notification, user?.role);
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
