import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Server {
  id: string;
  name: string;
  icon_url?: string;
  owner_id: string;
}

export function useServers() {
  return useQuery({
    queryKey: ['servers'],
    queryFn: () => api.get<Server[]>('/api/servers/'),
  });
}
