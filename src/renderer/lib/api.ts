// Thin typed wrapper over the Electron IPC API proxy.
// All REST calls go: renderer → IPC → main process → server (with JWT injection).

import { useAuthStore } from '../stores/authStore';

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

const electronAPI = (window as any).electronAPI;

async function request<T = any>(method: string, path: string, body?: any): Promise<T> {
  const raw = await electronAPI.api.request(method, path, body);

  // Dev-mode diagnostics: log when response shape is unexpected
  if (localStorage.getItem('sgchat-dev-mode') === 'true') {
    if (!raw || typeof raw !== 'object' || !('ok' in raw)) {
      console.warn(`[api] ${method} ${path} — IPC returned unexpected shape (no ApiResponse wrapper):`, typeof raw, raw);
    } else if (raw.ok && raw.data != null && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
      const keys = Object.keys(raw.data);
      if (keys.some((k: string) => Array.isArray(raw.data[k]))) {
        console.debug(`[api] ${method} ${path} — response.data is object {${keys.join(', ')}}, not a bare array`);
      }
    }
  }

  const res = raw as ApiResponse<T>;
  if (!res.ok) {
    throw new ApiError(res.error || `Request failed (${res.status})`, res.status, res.data);
  }
  return res.data;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Safely coerce an API response to an array. Handles cases where the server
 * or encryption layer returns a wrapped object instead of a bare array.
 * Checks for common wrapper shapes: { data: [] }, { items: [] }, or
 * returns the first array-valued property found on the object.
 */
export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    // Try common wrapper keys
    const obj = value as Record<string, unknown>;
    for (const key of ['data', 'items', 'results']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
    // Fallback: first array-valued property
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val as T[];
    }
  }
  return [];
}

/**
 * Resolve a server-relative asset URL (e.g. emoji image) to an absolute URL
 * that works in <img> tags. The renderer runs on app:// protocol so relative
 * paths like /uploads/emojis/abc.png won't reach the server without this.
 */
export function resolveAssetUrl(url: string | undefined | null): string {
  if (!url) return '';
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const serverUrl = useAuthStore.getState().serverUrl;
  if (!serverUrl) return url;
  // Ensure no double slashes
  const base = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  /** GET that guarantees an array return — safely unwraps wrapped responses */
  getArray: <T = any>(path: string) => request('GET', path).then((d) => ensureArray<T>(d)),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  patch: <T = any>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string, body?: any) => request<T>('DELETE', path, body),

  upload: async <T = any>(path: string, file: File, extraFields?: Record<string, string>): Promise<T> => {
    const buffer = await file.arrayBuffer();
    const res: ApiResponse<T> = await electronAPI.api.upload(path, buffer, file.name, file.type, extraFields);
    if (!res.ok) {
      throw new ApiError(res.error || 'Upload failed', res.status, res.data);
    }
    return res.data;
  },
};
