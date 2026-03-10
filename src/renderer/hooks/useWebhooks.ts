import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export interface Webhook {
  id: string;
  name: string;
  token: string;
  channel_id: string;
  server_id: string;
  avatar_url?: string | null;
  created_by: string;
  created_at: string;
}

export function useWebhooks(serverId: string | null) {
  return useQuery({
    queryKey: ['webhooks', serverId],
    queryFn: async () => {
      const res = await api.get<{ webhooks: Webhook[] }>(`/api/webhooks?server_id=${serverId}`);
      return res.webhooks || [];
    },
    enabled: !!serverId,
  });
}

export function useCreateWebhook() {
  return useMutation({
    mutationFn: ({ name, channel_id, server_id }: { name: string; channel_id: string; server_id: string }) =>
      api.post<Webhook>('/api/webhooks', { name, channel_id, server_id }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', vars.server_id] });
    },
  });
}

export function useUpdateWebhook() {
  return useMutation({
    mutationFn: ({ id, serverId, ...updates }: { id: string; serverId: string; name?: string; channel_id?: string; avatar_url?: string }) =>
      api.patch<Webhook>(`/api/webhooks/${id}`, updates),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', vars.serverId] });
    },
  });
}

export function useDeleteWebhook() {
  return useMutation({
    mutationFn: ({ id, serverId }: { id: string; serverId: string }) =>
      api.delete(`/api/webhooks/${id}`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', vars.serverId] });
    },
  });
}
