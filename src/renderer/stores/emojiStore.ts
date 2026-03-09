import { create } from 'zustand';

export interface CustomEmoji {
  id: string;
  shortcode: string;
  image_url: string;
  pack_id: string;
  animated?: boolean;
}

export interface EmojiPack {
  id: string;
  name: string;
  description?: string;
  server_id: string;
  enabled: boolean;
  emoji_count?: number;
  emojis?: CustomEmoji[];
}

export interface EmojiManifest {
  packs: EmojiPack[];
  emojis: CustomEmoji[];
  master_enabled: boolean;
}

interface EmojiState {
  /** Full manifest for the current server */
  manifest: EmojiManifest | null;
  /** ETag for caching */
  etag: string | null;
  /** Loading state */
  loading: boolean;

  setManifest: (manifest: EmojiManifest, etag?: string) => void;
  clearManifest: () => void;
  setLoading: (loading: boolean) => void;

  /** Find emoji by shortcode (no colons) */
  findByShortcode: (shortcode: string) => CustomEmoji | undefined;
  /** Search emojis by prefix */
  searchEmojis: (query: string) => CustomEmoji[];
  /** Get all enabled emojis */
  getEnabledEmojis: () => CustomEmoji[];
}

export const useEmojiStore = create<EmojiState>((set, get) => ({
  manifest: null,
  etag: null,
  loading: false,

  setManifest: (manifest, etag) => set({ manifest, etag, loading: false }),
  clearManifest: () => set({ manifest: null, etag: null }),
  setLoading: (loading) => set({ loading }),

  findByShortcode: (shortcode) => {
    const { manifest } = get();
    if (!manifest?.master_enabled) return undefined;
    return manifest.emojis.find((e) => e.shortcode === shortcode);
  },

  searchEmojis: (query) => {
    const { manifest } = get();
    if (!manifest?.master_enabled) return [];
    const enabledPackIds = new Set(manifest.packs.filter((p) => p.enabled).map((p) => p.id));
    const q = query.toLowerCase();
    return manifest.emojis
      .filter((e) => enabledPackIds.has(e.pack_id) && e.shortcode.toLowerCase().includes(q));
  },

  getEnabledEmojis: () => {
    const { manifest } = get();
    if (!manifest?.master_enabled) return [];
    const enabledPackIds = new Set(manifest.packs.filter((p) => p.enabled).map((p) => p.id));
    return manifest.emojis.filter((e) => enabledPackIds.has(e.pack_id));
  },
}));
