import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export interface Sticker {
  id: string;
  name: string;
  description?: string;
  url: string;
  server_id: string;
  created_by: string;
  created_at: string;
  file_size_bytes?: number;
}

export function useStickers(serverId: string | null) {
  return useQuery({
    queryKey: ['stickers', serverId],
    queryFn: async () => {
      const res = await api.get<{ stickers: Sticker[] }>(`/api/servers/${serverId}/stickers`);
      return res.stickers || [];
    },
    enabled: !!serverId,
  });
}

export function useUploadSticker(serverId: string) {
  return useMutation({
    mutationFn: ({ file, name, description }: { file: File; name: string; description?: string }) => {
      const extra: Record<string, string> = { name };
      if (description) extra.description = description;
      return api.upload<Sticker>(`/api/servers/${serverId}/stickers`, file, extra);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers', serverId] });
    },
  });
}

export function useDeleteSticker(serverId: string) {
  return useMutation({
    mutationFn: (stickerId: string) =>
      api.delete(`/api/servers/${serverId}/stickers/${stickerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers', serverId] });
    },
  });
}
