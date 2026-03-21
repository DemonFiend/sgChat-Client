import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import type { Notification } from '../stores/notificationStore';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ notifications: Notification[]; has_more: boolean }>('/api/notifications');
      return res.notifications || [];
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.patch(`/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: () => api.post('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  return useMutation({
    mutationFn: (notificationId: string) =>
      api.delete(`/api/notifications/${notificationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
