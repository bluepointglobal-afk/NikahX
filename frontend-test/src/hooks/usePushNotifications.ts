/**
 * NikahPlus Phase 2 - Push Notification Hook
 * Handles push notifications for matches and messages
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { 
  PushNotification, 
  NotificationType,
  PushNotificationOptions 
} from '../types';

interface UsePushNotificationsOptions {
  enableRealtime?: boolean;
  onNotificationReceived?: (notification: PushNotification) => void;
}

interface UsePushNotificationsReturn {
  notifications: PushNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  
  // Push token management
  registerPushToken: (token: string, provider: 'onesignal' | 'fcm' | 'apns') => Promise<void>;
  unregisterPushToken: () => Promise<void>;
  
  // Local notification handling
  showLocalNotification: (options: PushNotificationOptions) => void;
  
  // Permission
  requestPermission: () => Promise<boolean>;
  permissionStatus: NotificationPermission | null;
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, (data: Record<string, string>) => PushNotificationOptions> = {
  new_match: (data) => ({
    title: '🎉 New Match!',
    body: `You and ${data.matchName || 'someone'} have matched! Your walis will be notified.`,
    data: { type: 'new_match', match_id: data.matchId, action: 'open_match' },
    sound: 'match.wav',
  }),
  new_message: (data) => ({
    title: `💬 ${data.senderName || 'New Message'}`,
    body: data.messagePreview?.length > 100 
      ? data.messagePreview.slice(0, 97) + '...' 
      : data.messagePreview || 'You have a new message',
    data: { type: 'new_message', match_id: data.matchId, action: 'open_chat' },
    sound: 'message.wav',
  }),
  wali_approval: (data) => ({
    title: '🛡️ Approval Needed',
    body: `${data.wardName || 'Your ward'} has a new match awaiting your review.`,
    data: { type: 'wali_approval', match_id: data.matchId, action: 'open_wali_review' },
    sound: 'default',
  }),
  match_approved: (data) => ({
    title: '✅ Match Approved!',
    body: `Your match with ${data.matchName || 'someone'} has been approved. You can now message each other!`,
    data: { type: 'match_approved', match_id: data.matchId, action: 'open_chat' },
    sound: 'success.wav',
  }),
  match_declined: (data) => ({
    title: '❌ Match Declined',
    body: `A match was declined${data.reason ? `: ${data.reason}` : '.'}`,
    data: { type: 'match_declined', match_id: data.matchId },
    sound: 'default',
  }),
  match_request: (data) => ({
    title: '💝 New Match Request',
    body: `${data.senderName || 'Someone'} wants to connect with you.`,
    data: { type: 'match_request', sender_id: data.senderId, action: 'view_request' },
    sound: 'default',
  }),
};

export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setNotifications((data as PushNotification[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id || !options.enableRealtime) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as PushNotification;
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show browser notification if permitted
          if (permissionStatus === 'granted' && 'Notification' in window) {
            new Notification(newNotification.title, {
              body: newNotification.body,
              data: newNotification.data,
              icon: '/icon-192x192.png',
            });
          }

          options.onNotificationReceived?.(newNotification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, options.enableRealtime, options.onNotificationReceived, permissionStatus]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (updateError) throw updateError;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, [user]);

  const registerPushToken = useCallback(async (
    token: string,
    provider: 'onesignal' | 'fcm' | 'apns'
  ) => {
    if (!user?.id) return;

    try {
      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token,
          provider,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (upsertError) throw upsertError;
    } catch (err) {
      console.error('Failed to register push token:', err);
    }
  }, [user]);

  const unregisterPushToken = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error: deleteError } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Failed to unregister push token:', err);
    }
  }, [user]);

  const showLocalNotification = useCallback((options: PushNotificationOptions) => {
    if (permissionStatus === 'granted' && 'Notification' in window) {
      new Notification(options.title, {
        body: options.body,
        data: options.data,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge?.toString(),
      });
    } else {
      // Fallback: Show in-app toast or alert
      console.log('[Push Notification]', options.title, options.body);
    }
  }, [permissionStatus]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      return result === 'granted';
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return false;
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications,
    registerPushToken,
    unregisterPushToken,
    showLocalNotification,
    requestPermission,
    permissionStatus,
  };
}

// Helper function to create notification from template
export function createNotificationFromTemplate(
  type: NotificationType,
  data: Record<string, string>
): PushNotificationOptions {
  const template = NOTIFICATION_TEMPLATES[type];
  if (!template) {
    return {
      title: 'NikahPlus',
      body: 'You have a new notification',
      data: { type, ...data },
    };
  }
  return template(data);
}
