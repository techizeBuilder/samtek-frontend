import React, { useState } from 'react';
import { Bell, Volume2, VolumeX, Search, Filter, Check, Trash2, AlertCircle, Package, ShoppingCart, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow, format } from 'date-fns';

// Icon mapping for notification types
const getNotificationIcon = (type) => {
  const iconMap = {
    'order': ShoppingCart,
    'inventory': Package,
    'customer': UserPlus,
    'system': AlertCircle,
    'general': Bell
  };
  
  return iconMap[type] || Bell;
};

// Priority color and styling
const getPriorityColor = (priority) => {
  const colorMap = {
    'low': 'text-slate-500 bg-slate-100',
    'medium': 'text-blue-500 bg-blue-100',
    'high': 'text-orange-500 bg-orange-100',
    'urgent': 'text-red-500 bg-red-100'
  };
  
  return colorMap[priority] || colorMap.medium;
};

const NotificationItem = ({ notification, onMarkAsRead, onNotificationClick }) => {
  const IconComponent = getNotificationIcon(notification.type);
  const priorityColors = getPriorityColor(notification.priority);
  
  const handleClick = () => {
    if (!notification.isReadByUser) {
      onMarkAsRead(notification._id);
    }
    onNotificationClick(notification);
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        !notification.isReadByUser 
          ? 'border-l-4 border-l-blue-500 bg-blue-50/50' 
          : 'hover:bg-slate-50'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 p-2 rounded-full ${priorityColors.split(' ').slice(-2).join(' ')}`}>
            <IconComponent className={`h-4 w-4 ${priorityColors.split(' ').slice(0, -2).join(' ')}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className={`font-medium text-sm leading-tight ${
                  !notification.isReadByUser 
                    ? 'text-slate-900' 
                    : 'text-slate-700'
                }`}>
                  {notification.title}
                </h3>
                <p className={`text-sm mt-1 leading-relaxed ${
                  !notification.isReadByUser
                    ? 'text-slate-600'
                    : 'text-slate-500'
                }`}>
                  {notification.message}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${priorityColors}`}
                >
                  {notification.priority}
                </Badge>
                {!notification.isReadByUser && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Badge variant="secondary" className="text-xs">
                  {notification.type}
                </Badge>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
              </div>
              
              <span className="text-xs text-slate-400">
                {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    soundEnabled,
    toggleSound,
    isConnected,
    refetch
  } = useNotifications({ 
    unreadOnly: activeTab === 'unread',
    limit: 50 
  });

  const handleNotificationClick = (notification) => {
    // Handle navigation based on notification type and data
    if (notification.data?.orderId) {
      window.location.href = `/sales/orders?highlight=${notification.data.orderId}`;
    } else if (notification.data?.customerId) {
      window.location.href = `/sales/my-customers?highlight=${notification.data.customerId}`;
    } else if (notification.data?.itemId) {
      window.location.href = `/inventory?highlight=${notification.data.itemId}`;
    }
  };

  // Filter notifications based on search and filters
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = searchQuery === '' || 
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </h1>
              <p className="text-slate-600 mt-1">
                Stay updated with real-time system notifications
                {!isConnected && (
                  <span className="text-red-500 ml-2">• Disconnected</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSound}
                className="flex items-center gap-2"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {soundEnabled ? 'Sound On' : 'Sound Off'}
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Mark All Read
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="order">Orders</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              All Notifications ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
                </h3>
                <p className="text-slate-600">
                  {searchQuery || typeFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'You\'re all caught up! New notifications will appear here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onNotificationClick={handleNotificationClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}