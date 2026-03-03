import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'category';
  server_id: string;
  category_id?: string;
  position: number;
  topic?: string;
}

export function useChannels(serverId: string | null) {
  return useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => api.get<Channel[]>(`/api/servers/${serverId}/channels`),
    enabled: !!serverId,
  });
}
