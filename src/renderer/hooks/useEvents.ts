import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export type RSVPStatus = 'interested' | 'tentative' | 'not_interested';

export interface ServerEvent {
  id: string;
  server_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  color?: string;
  visibility: 'public' | 'members' | 'role';
  visibility_role_id?: string;
  status: 'scheduled' | 'active' | 'cancelled' | 'completed';
  created_by: string;
  creator_username?: string;
  created_at: string;
  rsvp_counts?: { interested: number; tentative: number; not_interested: number };
  my_rsvp?: RSVPStatus | null;
}

export function useServerEvents(serverId: string | null, month?: string) {
  const m = month || getCurrentMonth();
  return useQuery({
    queryKey: ['events', serverId, m],
    queryFn: async () => {
      const res = await api.get<{ events: ServerEvent[] }>(`/api/servers/${serverId}/events?month=${m}`);
      return res.events || [];
    },
    enabled: !!serverId,
    staleTime: 60_000,
  });
}

export function useEventHistory(serverId: string | null, month?: string) {
  const m = month || getCurrentMonth();
  return useQuery({
    queryKey: ['events-history', serverId, m],
    queryFn: async () => {
      const res = await api.get<{ events: ServerEvent[] }>(`/api/servers/${serverId}/events/history?month=${m}`);
      return res.events || [];
    },
    enabled: !!serverId,
  });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useCreateEvent(serverId: string) {
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      start_time: string;
      end_time?: string;
      location?: string;
      color?: string;
      visibility?: string;
      visibility_role_id?: string;
    }) => api.post(`/api/servers/${serverId}/events`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', serverId] });
    },
  });
}

export function useUpdateEvent(serverId: string) {
  return useMutation({
    mutationFn: ({ eventId, ...data }: { eventId: string; title?: string; description?: string; start_time?: string; end_time?: string; location?: string; color?: string }) =>
      api.patch(`/api/servers/${serverId}/events/${eventId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', serverId] });
    },
  });
}

export function useCancelEvent(serverId: string) {
  return useMutation({
    mutationFn: (eventId: string) =>
      api.post(`/api/servers/${serverId}/events/${eventId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', serverId] });
    },
  });
}

export function useDeleteEvent(serverId: string) {
  return useMutation({
    mutationFn: (eventId: string) =>
      api.delete(`/api/servers/${serverId}/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', serverId] });
    },
  });
}

export function useRsvpEvent(serverId: string) {
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: RSVPStatus }) =>
      api.put(`/api/servers/${serverId}/events/${eventId}/rsvp`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', serverId] });
      queryClient.invalidateQueries({ queryKey: ['events-history', serverId] });
    },
  });
}
