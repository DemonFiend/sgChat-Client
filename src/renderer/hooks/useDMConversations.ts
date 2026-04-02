import { useQuery, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { api, ensureArray } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import type { Message } from './useMessages';

export interface DMConversation {
  id: string;
  participants: Array<{
    id: string;
    username: string;
    avatar_url?: string;
  }>;
  last_message?: Message;
  updated_at: string;
}

export function useDMConversations() {
  return useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => ensureArray<DMConversation>(await api.get('/api/dms/')),
  });
}

export function useDMMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('before', pageParam);
      const raw = ensureArray<any>(await api.get(`/api/dms/${conversationId}/messages?${params}`));
      // Server DM endpoint returns flat fields (author_id, username, avatar_url)
      // instead of a nested author object — normalize to match Message interface
      return raw.map((msg): Message => ({
        ...msg,
        author: msg.author ?? (msg.author_id ? {
          id: msg.author_id,
          username: msg.username || msg.author_username || 'Unknown',
          display_name: msg.display_name || msg.author_display_name || msg.username || msg.author_username || 'Unknown',
          avatar_url: msg.avatar_url || msg.author_avatar_url || null,
          role_color: msg.role_color || msg.author_role_color || null,
        } : null),
        reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      }));
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 50) return undefined;
      return lastPage[0]?.id; // oldest message in the ASC page — fetch messages before it
    },
    enabled: !!conversationId,
  });
}

interface SendDMPayload {
  content: string;
  is_encrypted?: boolean;
  encrypted_content?: string;
}

export function useSendDM(conversationId: string) {
  return useMutation({
    mutationFn: (payload: string | SendDMPayload) => {
      const body = typeof payload === 'string'
        ? { content: payload }
        : payload;
      return api.post(`/api/dms/${conversationId}/messages`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });
}
