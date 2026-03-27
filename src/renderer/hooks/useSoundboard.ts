import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SoundboardSound {
  id: string;
  name: string;
  emoji: string | null;
  sound_url: string;
  file_size_bytes: number;
  duration_ms: number;
  play_count: number;
  uploaded_by: string;
  uploader_username: string;
  server_id: string;
  created_at: string;
}

export interface SoundboardConfig {
  max_sounds: number;
  max_file_size_bytes: number;
  max_duration_ms: number;
  allowed_mime_types: string[];
  sounds_per_user: number;
}

interface SoundboardResponse {
  sounds: SoundboardSound[];
  config: SoundboardConfig;
}

// ── Default config fallback ──────────────────────────────────────────────────

const DEFAULT_CONFIG: SoundboardConfig = {
  max_sounds: 50,
  max_file_size_bytes: 5 * 1024 * 1024, // 5 MB
  max_duration_ms: 10000, // 10s
  allowed_mime_types: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4'],
  sounds_per_user: 10,
};

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch all soundboard sounds + config for a server */
export function useSoundboardFetch(serverId: string | null) {
  return useQuery({
    queryKey: ['soundboard', serverId],
    queryFn: async () => {
      const res = await api.get<SoundboardResponse>(`/api/servers/${serverId}/soundboard`);
      return {
        sounds: res.sounds || [],
        config: res.config || DEFAULT_CONFIG,
      };
    },
    enabled: !!serverId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/** Play a sound via server broadcast (all voice members hear it) */
export function useSoundboardPlay(serverId: string) {
  return useMutation({
    mutationFn: (soundId: string) =>
      api.post(`/api/servers/${serverId}/soundboard/${soundId}/play`),
    onSuccess: (_data, soundId) => {
      // Optimistic play count bump
      queryClient.setQueryData<SoundboardResponse>(
        ['soundboard', serverId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            sounds: old.sounds.map((s) =>
              s.id === soundId ? { ...s, play_count: s.play_count + 1 } : s,
            ),
          };
        },
      );
    },
  });
}

/** Upload a new sound to the soundboard */
export function useSoundboardUpload(serverId: string) {
  return useMutation({
    mutationFn: ({ file, name, emoji }: { file: File; name: string; emoji?: string }) => {
      const extra: Record<string, string> = { name };
      if (emoji) extra.emoji = emoji;
      return api.upload<SoundboardSound>(`/api/servers/${serverId}/soundboard`, file, extra);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundboard', serverId] });
    },
  });
}

/** Delete a sound from the soundboard */
export function useSoundboardDelete(serverId: string) {
  return useMutation({
    mutationFn: (soundId: string) =>
      api.delete(`/api/servers/${serverId}/soundboard/${soundId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundboard', serverId] });
    },
  });
}
