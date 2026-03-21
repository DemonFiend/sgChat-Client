import { useQuery } from '@tanstack/react-query';
import { api, ensureArray } from '../lib/api';

export type ChannelType = 'text' | 'voice' | 'announcement' | 'music' | 'temp_voice_generator' | 'temp_voice' | 'stage';

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
  voice_relay_policy?: string;
  preferred_relay_id?: string;
  voice_participants?: Array<{
    id: string;
    username: string;
    avatar_url?: string;
    is_muted?: boolean;
    is_deafened?: boolean;
  }>;
}

export function useChannels(serverId: string | null) {
  return useQuery({
    queryKey: ['channels', serverId],
    queryFn: async () => ensureArray<Channel>(await api.get(`/api/servers/${serverId}/channels`)),
    enabled: !!serverId,
  });
}
