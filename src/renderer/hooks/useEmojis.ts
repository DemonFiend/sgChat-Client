import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useEmojiStore, type EmojiManifest, type EmojiPack } from '../stores/emojiStore';
import { useEffect } from 'react';

/** Fetch and cache the emoji manifest for a server */
export function useEmojiManifest(serverId: string | null) {
  const setManifest = useEmojiStore((s) => s.setManifest);
  const setLoading = useEmojiStore((s) => s.setLoading);

  const query = useQuery({
    queryKey: ['emoji-manifest', serverId],
    queryFn: () => api.get<EmojiManifest>(`/api/servers/${serverId}/emojis/manifest`),
    enabled: !!serverId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setManifest(query.data);
    if (query.isLoading) setLoading(true);
  }, [query.data, query.isLoading, setManifest, setLoading]);

  return query;
}

/** Get emoji packs for a server */
export function useEmojiPacks(serverId: string | null) {
  return useQuery({
    queryKey: ['emoji-packs', serverId],
    queryFn: () => api.get<EmojiPack[]>(`/api/servers/${serverId}/emoji-packs`),
    enabled: !!serverId,
  });
}

/** Get default/bundled packs available to install */
export function useDefaultEmojiPacks(serverId: string | null) {
  return useQuery({
    queryKey: ['emoji-packs-defaults', serverId],
    queryFn: () => api.get<Array<{ key: string; name: string; description: string; emoji_count: number; preview_urls: string[] }>>(
      `/api/servers/${serverId}/emoji-packs/defaults`
    ),
    enabled: !!serverId,
  });
}

/** Create a new emoji pack */
export function useCreateEmojiPack(serverId: string) {
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post(`/api/servers/${serverId}/emoji-packs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji-packs', serverId] });
      queryClient.invalidateQueries({ queryKey: ['emoji-manifest', serverId] });
    },
  });
}

/** Update an emoji pack */
export function useUpdateEmojiPack(serverId: string) {
  return useMutation({
    mutationFn: ({ packId, ...data }: { packId: string; name?: string; description?: string; enabled?: boolean }) =>
      api.patch(`/api/servers/${serverId}/emoji-packs/${packId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji-packs', serverId] });
      queryClient.invalidateQueries({ queryKey: ['emoji-manifest', serverId] });
    },
  });
}

/** Delete an emoji pack */
export function useDeleteEmojiPack(serverId: string) {
  return useMutation({
    mutationFn: (packId: string) =>
      api.delete(`/api/servers/${serverId}/emoji-packs/${packId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji-packs', serverId] });
      queryClient.invalidateQueries({ queryKey: ['emoji-manifest', serverId] });
    },
  });
}

/** Add an emoji to a pack (upload) */
export function useAddEmoji(serverId: string) {
  return useMutation({
    mutationFn: ({ packId, file }: { packId: string; file: File }) =>
      api.upload(`/api/servers/${serverId}/emoji-packs/${packId}/emojis`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji-packs', serverId] });
      queryClient.invalidateQueries({ queryKey: ['emoji-manifest', serverId] });
    },
  });
}

/** Delete an emoji */
export function useDeleteEmoji(serverId: string) {
  return useMutation({
    mutationFn: (emojiId: string) =>
      api.delete(`/api/servers/${serverId}/emojis/${emojiId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji-packs', serverId] });
      queryClient.invalidateQueries({ queryKey: ['emoji-manifest', serverId] });
    },
  });
}

/** Install a default/bundled pack */
export function useInstallDefaultPack(serverId: string) {
  return useMutation({
    mutationFn: (key: string) =>
      api.post(`/api/servers/${serverId}/emoji-packs/install-default`, { key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji-packs', serverId] });
      queryClient.invalidateQueries({ queryKey: ['emoji-manifest', serverId] });
      queryClient.invalidateQueries({ queryKey: ['emoji-packs-defaults', serverId] });
    },
  });
}

/** Toggle master emoji packs enable/disable */
export function useToggleMasterEmoji(serverId: string) {
  return useMutation({
    mutationFn: (enabled: boolean) =>
      api.patch(`/api/servers/${serverId}/emoji-packs/settings`, { master_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emoji-manifest', serverId] });
    },
  });
}
