import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export interface MessageReaction {
  emoji: string;
  count: number;
  me: boolean;
}

export interface MessageReply {
  id: string;
  content: string;
  author: { id: string; username: string };
}

export interface Message {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  channel_id: string;
  created_at: string;
  updated_at?: string;
  reply_to_id?: string;
  reply_to?: MessageReply;
  reactions?: MessageReaction[];
  attachments?: Array<{ url: string; filename: string; content_type: string }>;
}

export function useMessages(channelId: string | null) {
  return useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('before', pageParam);
      return api.get<Message[]>(`/api/channels/${channelId}/messages?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 50) return undefined;
      return lastPage[lastPage.length - 1]?.id;
    },
    enabled: !!channelId,
  });
}

export function useSendMessage(channelId: string) {
  return useMutation({
    mutationFn: ({ content, reply_to_id }: { content: string; reply_to_id?: string }) =>
      api.post(`/api/channels/${channelId}/messages`, { content, reply_to_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

export function useEditMessage(channelId: string) {
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      api.put(`/api/channels/${channelId}/messages/${messageId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

export function useDeleteMessage(channelId: string) {
  return useMutation({
    mutationFn: (messageId: string) =>
      api.delete(`/api/channels/${channelId}/messages/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

export function useAddReaction(channelId: string) {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      api.post(`/api/channels/${channelId}/messages/${messageId}/reactions`, { emoji }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

export function useRemoveReaction(channelId: string) {
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      api.delete(`/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}
