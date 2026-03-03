import { useQuery, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
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
    queryFn: () => api.get<DMConversation[]>('/api/dms/'),
  });
}

export function useDMMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('before', pageParam);
      return api.get<Message[]>(`/api/dms/${conversationId}/messages?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 50) return undefined;
      return lastPage[lastPage.length - 1]?.id;
    },
    enabled: !!conversationId,
  });
}

export function useSendDM(conversationId: string) {
  return useMutation({
    mutationFn: (content: string) =>
      api.post(`/api/dms/${conversationId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    },
  });
}
