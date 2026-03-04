import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Category {
  id: string;
  name: string;
  server_id: string;
  position: number;
}

export function useCategories(serverId: string | null) {
  return useQuery({
    queryKey: ['categories', serverId],
    queryFn: () => api.get<Category[]>(`/api/servers/${serverId}/categories`),
    enabled: !!serverId,
  });
}
