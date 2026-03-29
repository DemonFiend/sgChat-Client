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
      return ensureArray<Message>(await api.get(`/api/dms/${conversationId}/messages?${params}`));
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
