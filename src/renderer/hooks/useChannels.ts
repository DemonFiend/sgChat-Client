import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ChannelType = 'text' | 'voice' | 'announcement' | 'music' | 'temp_voice_generator' | 'temp_voice';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  server_id: string;
  category_id?: string;
  position: number;
  topic?: string;
  bitrate?: number;
  user_limit?: number;
  is_afk_channel?: boolean;
}

export function useChannels(serverId: string | null) {
  return useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => api.get<Channel[]>(`/api/servers/${serverId}/channels`),
    enabled: !!serverId,
  });
}
