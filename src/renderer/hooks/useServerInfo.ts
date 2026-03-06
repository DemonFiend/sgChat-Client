import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

// P3: Server version display (GET /api/version)
export function useServerVersion() {
  return useQuery({
    queryKey: ['server-version'],
    queryFn: () => api.get<{ version: string; node?: string }>('/api/version'),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// P3: Server time sync (GET /api/server/time)
export function useServerTime() {
  return useQuery({
    queryKey: ['server-time'],
    queryFn: () => api.get<{ time: string; timezone?: string }>('/api/server/time'),
    refetchInterval: 300_000, // 5 minutes
  });
}

// P3: User preferences (GET/PATCH /users/me/preferences)
export function useUserPreferences() {
  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: () => api.get<Record<string, any>>('/api/users/me/preferences'),
  });
}

export function useUpdateUserPreferences() {
  return useMutation({
    mutationFn: (prefs: Record<string, any>) =>
      api.patch('/api/users/me/preferences', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });
}

// P3: Channel read state (GET /channels/:id/read-state)
export function useChannelReadState(channelId: string | null) {
  return useQuery({
    queryKey: ['channel-read-state', channelId],
    queryFn: () => api.get<{ last_read_at?: string; unread_count?: number }>(`/api/channels/${channelId}/read-state`),
    enabled: !!channelId,
  });
}

// P3: DM voice status (GET /dms/:id/voice/status)
export function useDMVoiceStatus(dmId: string | null) {
  return useQuery({
    queryKey: ['dm-voice-status', dmId],
    queryFn: () => api.get<{ active: boolean; participants?: any[] }>(`/api/dms/${dmId}/voice/status`),
    enabled: !!dmId,
    refetchInterval: 30_000,
  });
}

// P3: DM storage stats (GET /dms/:id/storage-stats)
export function useDMStorageStats(dmId: string | null) {
  return useQuery({
    queryKey: ['dm-storage-stats', dmId],
    queryFn: () => api.get<any>(`/api/dms/${dmId}/storage-stats`),
    enabled: !!dmId,
  });
}

// P3: Reactions list (GET /messages/:id/reactions)
export function useReactionsList(messageId: string | null) {
  return useQuery({
    queryKey: ['reactions', messageId],
    queryFn: () => api.get<any[]>(`/api/messages/${messageId}/reactions`),
    enabled: !!messageId,
  });
}

// P3: DM export system
export function useDMExports(dmId: string | null) {
  return useQuery({
    queryKey: ['dm-exports', dmId],
    queryFn: () => api.get<any[]>(`/api/dms/${dmId}/exports`),
    enabled: !!dmId,
  });
}

export function useCreateDMExport() {
  return useMutation({
    mutationFn: (dmId: string) => api.post(`/api/dms/${dmId}/export`),
    onSuccess: (_data, dmId) => {
      queryClient.invalidateQueries({ queryKey: ['dm-exports', dmId] });
    },
  });
}

// P3: Channel archive segments
export function useChannelSegments(channelId: string | null) {
  return useQuery({
    queryKey: ['channel-segments', channelId],
    queryFn: () => api.get<any[]>(`/api/channels/${channelId}/segments`),
    enabled: !!channelId,
  });
}

export function useSegmentMessages(channelId: string | null, segmentId: string | null) {
  return useQuery({
    queryKey: ['segment-messages', channelId, segmentId],
    queryFn: () => api.get<any[]>(`/api/channels/${channelId}/segments/${segmentId}/messages`),
    enabled: !!channelId && !!segmentId,
  });
}

// P3: URL embed previews (GET /messages/:id/preview)
export function useMessagePreview(messageId: string | null) {
  return useQuery({
    queryKey: ['message-preview', messageId],
    queryFn: () => api.get<any>(`/api/messages/${messageId}/preview`),
    enabled: !!messageId,
    staleTime: 5 * 60 * 1000,
  });
}

// P3: Push notification token (POST /users/me/push-token)
export function useRegisterPushToken() {
  return useMutation({
    mutationFn: (token: string) =>
      api.post('/api/users/me/push-token', { token }),
  });
}

// P3: Verify reset token (GET /api/auth/verify-reset-token)
export function useVerifyResetToken(token: string | null) {
  return useQuery({
    queryKey: ['verify-reset-token', token],
    queryFn: () => api.get<{ valid: boolean }>(`/api/auth/verify-reset-token?token=${token}`),
    enabled: !!token,
  });
}
