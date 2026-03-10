import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import type { Message } from './useMessages';

export interface Thread {
  id: string;
  name: string;
  channel_id: string;
  parent_message_id: string;
  created_by: string;
  created_at: string;
  archived: boolean;
  locked: boolean;
  reply_count?: number;
  last_message_at?: string;
}

export function useChannelThreads(channelId: string | null) {
  return useQuery({
    queryKey: ['threads', channelId],
    queryFn: async () => {
      const res = await api.get<{ threads: Thread[] }>(`/api/channels/${channelId}/threads`);
      return res.threads || [];
    },
    enabled: !!channelId,
  });
}

export function useThread(threadId: string | null) {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api.get<Thread>(`/api/threads/${threadId}`),
    enabled: !!threadId,
  });
}

export function useThreadMessages(threadId: string | null) {
  return useInfiniteQuery({
    queryKey: ['thread-messages', threadId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('before', pageParam);
      const res = await api.get<{ messages: Message[] }>(
        `/api/threads/${threadId}/messages?${params}`,
      );
      return (res.messages || []).map((msg) => ({
        ...msg,
        attachments: typeof msg.attachments === 'string'
          ? (() => { try { return JSON.parse(msg.attachments as unknown as string); } catch { return []; } })()
          : msg.attachments,
        reactions: typeof msg.reactions === 'string'
          ? (() => { try { return JSON.parse(msg.reactions as unknown as string); } catch { return []; } })()
          : msg.reactions,
      }));
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 50) return undefined;
      return lastPage[0]?.id;
    },
    enabled: !!threadId,
  });
}

export function useCreateThread() {
  return useMutation({
    mutationFn: ({ parent_message_id, channel_id, name }: { parent_message_id: string; channel_id: string; name: string }) =>
      api.post<Thread>('/api/threads', { parent_message_id, channel_id, name }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['threads', vars.channel_id] });
    },
  });
}

export function useSendThreadMessage(threadId: string) {
  return useMutation({
    mutationFn: ({ content, reply_to_id }: { content: string; reply_to_id?: string }) =>
      api.post(`/api/threads/${threadId}/messages`, { content, reply_to_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread-messages', threadId] });
    },
  });
}

export function useUpdateThread(threadId: string) {
  return useMutation({
    mutationFn: (updates: { archived?: boolean; locked?: boolean; name?: string }) =>
      api.patch(`/api/threads/${threadId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useDeleteThread() {
  return useMutation({
    mutationFn: (threadId: string) => api.delete(`/api/threads/${threadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
