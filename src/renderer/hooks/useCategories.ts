import { useQuery } from '@tanstack/react-query';
import { api, ensureArray } from '../lib/api';

export interface Category {
  id: string;
  name: string;
  server_id: string;
  position: number;
}

export function useCategories(serverId: string | null) {
  return useQuery({
    queryKey: ['categories', serverId],
    queryFn: async () => ensureArray<Category>(await api.get(`/api/servers/${serverId}/categories`)),
    enabled: !!serverId,
  });
}
