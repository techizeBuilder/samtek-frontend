import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import pusherService from '../services/pusherService';
import { toast } from '@/hooks/use-toast';
import { playNotificationSound } from '../utils/soundUtils';

// API functions
const fetchNotifications = async (params = {}) => {
  const searchParams = new URLSearchParams(params);
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/notifications?${searchParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  
  return response.json();
};

const fetchUnreadCount = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/notifications/unread-count', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }
  
  return response.json();
};

const markAsReadAPI = async (notificationId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
  
  return response.json();
};

const markAllAsReadAPI = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/notifications/mark-all-read', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
  
  return response.json();
};

export const useNotifications = (params = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('notificationSound') !== 'false'
  );

  // Query for notifications
  const notificationsQuery = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => fetchNotifications(params),
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });

  // Query for unread count
  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    enabled: !!user,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Mutation for marking as read
  const markAsReadMutation = useMutation({
    mutationFn: markAsReadAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mutation for marking all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsReadAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount(0);
    }
  });

  // Play notification sound using improved utility
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    playNotificationSound();
  }, [soundEnabled]);

  // Handle real-time notifications
  const handleRealtimeNotification = useCallback((notification) => {
    console.log('Received real-time notification:', notification);

    // ✅ CLIENT-SIDE GUARD: Company isolation check
    // Agar notification kisi specific company ke liye hai aur user ki company alag hai,
    // toh ye notification ignore karo (backend fix ka backup)
    if (user && notification.targetCompanyId) {
      const userCompanyId = user.companyId?._id?.toString()
        || user.companyId?.toString()
        || user.company?.id?.toString()
        || null;
      if (userCompanyId && notification.targetCompanyId !== userCompanyId) {
        console.warn('[Notification Guard] Blocked notification from different company:', notification.targetCompanyId, '!= user company:', userCompanyId);
        return; // Ignore karo
      }
    }

    // ✅ CLIENT-SIDE GUARD: Role isolation check
    // Agar notification kisi specific role ke liye hai aur user ka role alag hai,
    // aur ye personal (targetUserId) nahi hai, toh ignore karo
    if (user && notification.targetRole && notification.targetRole !== 'all' && notification.targetRole !== null) {
      const userId = user.id || user._id;
      const isPersonal = notification.targetUserId &&
        (notification.targetUserId === userId?.toString() || notification.targetUserId?.toString() === userId?.toString());
      const isRoleMatch = notification.targetRole === user.role;
      if (!isPersonal && !isRoleMatch) {
        console.warn('[Notification Guard] Blocked notification for role:', notification.targetRole, '!= user role:', user.role);
        return; // Ignore karo
      }
    }

    // Play sound
    playSound();
    
    // Update local state
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.priority === 'urgent' ? 'destructive' : 'default',
    });
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [user, playSound, queryClient]);

  // Initialize Pusher connection
  useEffect(() => {
    if (user) {
      // Re-init Pusher whenever user changes (handles companyId availability after refresh)
      pusherService.init(user);
      pusherService.onNotification(handleRealtimeNotification);

      return () => {
        pusherService.offNotification(handleRealtimeNotification);
        pusherService.disconnect();
      };
    }
  }, [user?.id || user?._id, user?.companyId, handleRealtimeNotification]);

  // Update local state when queries resolve
  useEffect(() => {
    if (notificationsQuery.data?.notifications) {
      setNotifications(notificationsQuery.data.notifications);
    }
  }, [notificationsQuery.data]);

  useEffect(() => {
    if (unreadCountQuery.data?.unreadCount !== undefined) {
      const newCount = unreadCountQuery.data.unreadCount;
      
      // Play sound if unread count increased (new notification)
      if (newCount > unreadCount && unreadCount >= 0) {
        console.log(`Unread count increased from ${unreadCount} to ${newCount}, playing notification sound...`);
        if (soundEnabled) {
          playSound();
        }
      }
      
      setUnreadCount(newCount);
    }
  }, [unreadCountQuery.data, soundEnabled, unreadCount]);

  // Toggle sound preference
  const toggleSound = useCallback(() => {
    const newSoundEnabled = !soundEnabled;
    setSoundEnabled(newSoundEnabled);
    localStorage.setItem('notificationSound', newSoundEnabled.toString());
  }, [soundEnabled]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
      
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, isReadByUser: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      });
    }
  }, [markAsReadMutation]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => ({ ...n, isReadByUser: true }))
      );
      setUnreadCount(0);
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive'
      });
    }
  }, [markAllAsReadMutation]);

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    error: notificationsQuery.error || unreadCountQuery.error,
    refetch: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
    markAsRead,
    markAllAsRead,
    soundEnabled,
    toggleSound,
    isConnected: pusherService.isConnected,
    pagination: notificationsQuery.data?.pagination
  };
};