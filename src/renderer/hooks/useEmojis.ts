import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ensureArray } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useEmojiStore, type EmojiManifest, type EmojiPack, type CustomEmoji } from '../stores/emojiStore';
import { useEffect } from 'react';

/** Normalize a single emoji from the API — maps url/asset_key to image_url */
function normalizeEmoji(e: any): CustomEmoji {
  return {
    id: e.id,
    shortcode: e.shortcode,
    image_url: e.image_url || e.url || e.asset_key || '',
    pack_id: e.pack_id,
    animated: e.animated,
  };
}

/** Normalize manifest response — handles wrapped shapes and field name differences */
function normalizeManifest(raw: any): EmojiManifest | null {
  if (!raw || typeof raw !== 'object') return null;

  let packs: any[] | undefined;
  let emojis: any[] | undefined;
  let masterEnabled: boolean | undefined;

  // Direct shape: { packs, emojis, ... }
  if (Array.isArray(raw.packs)) {
    packs = raw.packs;
    emojis = Array.isArray(raw.emojis) ? raw.emojis : [];
    masterEnabled = raw.master_enabled ?? raw.emoji_packs_enabled;
  } else {
    // Wrapped: { manifest: { ... } } or { data: { ... } }
    for (const key of ['manifest', 'data']) {
      const inner = raw[key];
      if (inner && typeof inner === 'object' && Array.isArray(inner.packs)) {
        packs = inner.packs;
        emojis = Array.isArray(inner.emojis) ? inner.emojis : [];
        masterEnabled = inner.master_enabled ?? inner.emoji_packs_enabled;
        break;
      }
    }
  }

  if (!packs) {
    if (localStorage.getItem('sgchat-dev-mode') === 'true') {
      console.warn('[useEmojiManifest] Unexpected manifest shape:', raw);
    }
    return null;
  }

  return {
    packs: packs,
    emojis: (emojis || []).map(normalizeEmoji),
    master_enabled: masterEnabled ?? true,
  };
}

/** Fetch and cache the emoji manifest for a server */
export function useEmojiManifest(serverId: string | null) {
  const setManifest = useEmojiStore((s) => s.setManifest);
  const setLoading = useEmojiStore((s) => s.setLoading);

  const query = useQuery({
    queryKey: ['emoji-manifest', serverId],
    queryFn: () => api.get<any>(`/api/servers/${serverId}/emojis/manifest`),
    enabled: !!serverId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      const manifest = normalizeManifest(query.data);
      if (manifest) setManifest(manifest);
    }
    if (query.isLoading) setLoading(true);
  }, [query.data, query.isLoading, setManifest, setLoading]);

  return query;
}

/** Get emoji packs for a server */
export function useEmojiPacks(serverId: string | null) {
  return useQuery({
    queryKey: ['emoji-packs', serverId],
    queryFn: async () => {
      const raw = await api.get<any>(`/api/servers/${serverId}/emoji-packs`);
      const packs = ensureArray<EmojiPack>(raw.packs ?? raw);
      // The manifest has the full emoji list — enrich packs with emoji_count from it
      const manifest = useEmojiStore.getState().manifest;
      if (manifest) {
        for (const pack of packs) {
          if (!pack.emoji_count && (!pack.emojis || pack.emojis.length === 0)) {
            const manifestPack = manifest.packs.find((p) => p.id === pack.id);
            if (manifestPack?.emoji_count) {
              pack.emoji_count = manifestPack.emoji_count;
            } else {
              // Count from manifest emojis list
              const count = manifest.emojis.filter((e) => e.pack_id === pack.id).length;
              if (count > 0) pack.emoji_count = count;
            }
          }
        }
      }
      return packs;
    },
    enabled: !!serverId,
  });
}

/** Get individual pack details with emojis */
export function useEmojiPackDetail(serverId: string | null, packId: string | null) {
  return useQuery({
    queryKey: ['emoji-pack-detail', serverId, packId],
    queryFn: async () => {
      const data = await api.get<any>(`/api/servers/${serverId}/emoji-packs/${packId}`);
      // Normalize emoji field names (url/asset_key → image_url)
      if (data.emojis && data.emojis.length > 0) {
        data.emojis = data.emojis.map(normalizeEmoji);
      } else {
        // Fall back to manifest
        const manifest = useEmojiStore.getState().manifest;
        if (manifest) {
          data.emojis = manifest.emojis.filter((e: CustomEmoji) => e.pack_id === packId);
        }
      }
      return data as EmojiPack & { emojis?: CustomEmoji[] };
    },
    enabled: !!serverId && !!packId,
  });
}

/** Get default/bundled packs available to install */
export function useDefaultEmojiPacks(serverId: string | null) {
  return useQuery({
    queryKey: ['emoji-packs-defaults', serverId],
    queryFn: async () => {
      const raw = await api.get<any>(`/api/servers/${serverId}/emoji-packs/defaults`);
      // Server returns { categories: [...] } — unwrap
      return ensureArray<{ key: string; name: string; description: string; emoji_count: number; preview_urls: string[] }>(
        raw.categories ?? raw
      );
    },
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
