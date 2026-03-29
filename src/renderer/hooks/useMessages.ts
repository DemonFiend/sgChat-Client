import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { api, ensureArray } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
  me: boolean;
  /** 'unicode' or 'custom' — defaults to 'unicode' for backwards compat */
  type?: 'unicode' | 'custom';
  /** For custom reactions: emoji ID */
  emoji_id?: string;
  /** For custom reactions: image URL */
  image_url?: string;
  /** For custom reactions: shortcode */
  shortcode?: string;
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
    display_name: string;
    avatar_url: string | null;
    role_color: string | null;
  } | null;
  channel_id: string;
  created_at: string;
  edited_at: string | null;
  reply_to_id: string | null;
  reply_to?: MessageReply;
  reactions: MessageReaction[];
  attachments: Array<{ id: string; url: string; filename: string; size: number; mime_type: string }>;
  system_event: string | null;
  pinned?: boolean;
  is_tts?: boolean;
  is_encrypted?: boolean;
  encrypted_content?: string;
}

export function useMessages(channelId: string | null) {
  return useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('before', pageParam);
      const res = await api.get<{ messages: Message[]; hash: string }>(
        `/api/channels/${channelId}/messages?${params}`,
      );
      // Server may return attachments/reactions as JSON strings — normalize to arrays
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
      return lastPage[0]?.id; // oldest message in the ASC page — fetch messages before it
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
    mutationFn: ({ messageId, emoji, type, emojiId }: { messageId: string; emoji: string; type?: 'unicode' | 'custom'; emojiId?: string }) => {
      if (type === 'custom' && emojiId) {
        return api.post(`/api/channels/${channelId}/messages/${messageId}/reactions`, {
          reaction: { type: 'custom', emojiId },
        });
      }
      return api.post(`/api/channels/${channelId}/messages/${messageId}/reactions`, { emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

export function useRemoveReaction(channelId: string) {
  return useMutation({
    mutationFn: ({ messageId, emoji, type, emojiId }: { messageId: string; emoji: string; type?: 'unicode' | 'custom'; emojiId?: string }) => {
      if (type === 'custom' && emojiId) {
        return api.delete(`/api/channels/${channelId}/messages/${messageId}/reactions`, {
          reaction: { type: 'custom', emojiId },
        });
      }
      return api.delete(`/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });
}

export function usePinnedMessages(channelId: string | null) {
  return useQuery({
    queryKey: ['pinned-messages', channelId],
    queryFn: async () => ensureArray<Message>(await api.get(`/api/channels/${channelId}/pinned`)),
    enabled: !!channelId,
  });
}

export function usePinMessage(channelId: string) {
  return useMutation({
    mutationFn: (messageId: string) =>
      api.post(`/api/channels/${channelId}/messages/${messageId}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', channelId] });
    },
  });
}

export function useUnpinMessage(channelId: string) {
  return useMutation({
    mutationFn: (messageId: string) =>
      api.delete(`/api/channels/${channelId}/messages/${messageId}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', channelId] });
    },
  });
}
