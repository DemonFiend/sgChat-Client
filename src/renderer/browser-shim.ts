/**
 * Browser shim for window.electronAPI
 *
 * Enables the Mantine client to run in a regular browser (dev mode / preview)
 * by replacing Electron IPC calls with direct fetch + localStorage.
 *
 * Only loaded when window.electronAPI is not already defined (i.e., not in Electron).
 * Electron-native features (tray, screen share, mic NS, e2e, etc.) are no-ops.
 */

if (typeof window !== 'undefined' && !(window as any).electronAPI) {
  // ── Token store (in-memory, not localStorage for security) ──────────
  let _accessToken = '';
  let _refreshToken = '';
  let _userId = '';

  const LS_SERVER_URL = 'browser-shim:serverUrl';
  const LS_EMAIL = 'browser-shim:rememberedEmail';
  const LS_SERVERS = 'browser-shim:savedServers';
  const LS_FAVORITE = 'browser-shim:favoriteServer';

  function getServerUrl(): string {
    return localStorage.getItem(LS_SERVER_URL) || '';
  }

  /** SHA-256 hash matching main process hashPasswordForTransit */
  async function hashForTransit(password: string): Promise<string> {
    const encoded = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest('SHA-256', encoded);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256:${hex}`;
  }

  /**
   * In browser mode, API paths are relative (e.g. /api/users/me) and go
   * through the Vite dev server proxy to avoid CORS. The proxy target is
   * configured in vite.config.ts → server.proxy.
   */
  async function apiFetch(
    method: string,
    path: string,
    body?: any,
    token?: string,
  ): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
    const headers: Record<string, string> = {};
    if (token || _accessToken) {
      headers['Authorization'] = `Bearer ${token || _accessToken}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      // Use relative path — Vite proxy forwards to the QA server
      const res = await fetch(path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const contentType = res.headers.get('content-type');
      let data;
      if (contentType?.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        // Auto-refresh on 401
        if (res.status === 401 && _refreshToken) {
          try {
            const refreshRes = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: _refreshToken }),
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              _accessToken = refreshData.access_token;
              _refreshToken = refreshData.refresh_token || _refreshToken;
              // Retry original request with new token
              return apiFetch(method, path, body, _accessToken);
            }
          } catch { /* refresh failed, return original error */ }
        }

        return {
          ok: false,
          status: res.status,
          data,
          error:
            typeof data === 'object'
              ? data.message || data.error || `Request failed (${res.status})`
              : `Request failed (${res.status})`,
        };
      }

      return { ok: true, status: res.status, data };
    } catch (err: any) {
      return { ok: false, status: 0, data: null, error: err.message || 'Network error' };
    }
  }

  // ── No-op helpers ───────────────────────────────────────────────────
  const noop = () => {};
  const noopAsync = async () => {};
  const noopReturn = <T>(val: T) => async () => val;
  const noopListener = (_cb: any) => noop;

  // ── The shim ────────────────────────────────────────────────────────
  (window as any).electronAPI = {
    // Identity
    isElectron: false,
    platform: 'browser',

    // Window controls (no-ops in browser)
    minimize: noopAsync,
    maximize: noopAsync,
    close: () => window.close(),
    isMaximized: noopReturn(false),
    onMaximizedChange: noopListener,

    // Notifications (use browser Notification API)
    showNotification: async (title: string, body: string) => {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') new Notification(title, { body });
      }
    },
    flashFrame: noopAsync,

    // Global shortcuts (no-ops — Electron-only)
    onGlobalShortcut: noopListener,

    // Auto-start (no-ops)
    getAutoStart: noopReturn(false),
    setAutoStart: noopAsync,

    // Server config
    config: {
      getServerUrl: async () => getServerUrl(),
      setServerUrl: async (url: string) => localStorage.setItem(LS_SERVER_URL, url),
      hasServerUrl: async () => !!localStorage.getItem(LS_SERVER_URL),
      clearServerUrl: async () => localStorage.removeItem(LS_SERVER_URL),
      healthCheck: async (_url: string) => {
        try {
          // Use proxy — the URL is already configured in vite.config.ts proxy target
          const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
          if (!res.ok) return { ok: false, error: `Server returned ${res.status}` };
          const data = await res.json();
          return { ok: true, ...data };
        } catch (err: any) {
          return { ok: false, error: err.message || 'Cannot reach server' };
        }
      },
      getRememberedEmail: async () => localStorage.getItem(LS_EMAIL) || '',
      setRememberedEmail: async (email: string) => localStorage.setItem(LS_EMAIL, email),
    },

    // Saved servers
    servers: {
      getSaved: async () => {
        try { return JSON.parse(localStorage.getItem(LS_SERVERS) || '[]'); }
        catch { return []; }
      },
      save: async (server: any) => {
        const saved = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
        const idx = saved.findIndex((s: any) => s.url === server.url);
        if (idx >= 0) saved[idx] = server; else saved.push(server);
        localStorage.setItem(LS_SERVERS, JSON.stringify(saved));
      },
      remove: async (url: string) => {
        const saved = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
        localStorage.setItem(LS_SERVERS, JSON.stringify(saved.filter((s: any) => s.url !== url)));
      },
      switch: async (targetUrl: string) => {
        localStorage.setItem(LS_SERVER_URL, targetUrl);
        _accessToken = '';
        _refreshToken = '';
      },
      saveCurrentSession: noopAsync,
      getFavorite: async () => localStorage.getItem(LS_FAVORITE) || '',
      setFavorite: async (url: string) => localStorage.setItem(LS_FAVORITE, url),
      shouldSkipFavorite: async () => true,
    },

    // Auth
    auth: {
      login: async (serverUrl: string, email: string, password: string) => {
        localStorage.setItem(LS_SERVER_URL, serverUrl);
        try {
          const hashedPassword = await hashForTransit(password);
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: hashedPassword }),
          });

          const data = await res.json();

          if (!res.ok) {
            const result: any = {
              success: false,
              error: data.message || `Login failed (${res.status})`,
            };
            if (data.error_code) result.error_code = data.error_code;
            if (res.status === 429) {
              result.error_code = result.error_code || 'RATE_LIMITED';
              if (data.retry_after) result.retry_after = data.retry_after;
            }
            if (data.pending_approval) {
              result.pending_approval = true;
              result.error_code = result.error_code || 'PENDING_APPROVAL';
            }
            return result;
          }

          _accessToken = data.access_token;
          _refreshToken = data.refresh_token;
          _userId = data.user.id;
          return { success: true, user: data.user };
        } catch (err: any) {
          return { success: false, error: err.message || 'Network error' };
        }
      },

      register: async (
        serverUrl: string, username: string, email: string,
        password: string, inviteCode?: string,
      ) => {
        localStorage.setItem(LS_SERVER_URL, serverUrl);
        try {
          const hashedPassword = await hashForTransit(password);
          const body: any = { username, email, password: hashedPassword };
          if (inviteCode) body.invite_code = inviteCode;

          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const data = await res.json();
          if (!res.ok) {
            return { success: false, error: data.message || `Registration failed (${res.status})` };
          }
          if (data.pending_approval) {
            if (data.access_token) {
              _accessToken = data.access_token;
              _refreshToken = data.refresh_token;
              _userId = data.user?.id || '';
              return { success: true, pending_approval: true, user: data.user };
            }
            return { success: true, pending_approval: true };
          }
          _accessToken = data.access_token;
          _refreshToken = data.refresh_token;
          _userId = data.user.id;
          return { success: true, user: data.user };
        } catch (err: any) {
          return { success: false, error: err.message || 'Network error' };
        }
      },

      logout: async () => {
        _accessToken = '';
        _refreshToken = '';
        _userId = '';
      },

      hashPassword: hashForTransit,

      check: async () => {
        if (!_accessToken) return false;
        return true;
      },

      getSocketToken: async () => ({
        token: _accessToken || null,
        serverUrl: getServerUrl(),
        cryptoSessionId: null,
      }),

      refreshToken: async () => {
        const serverUrl = getServerUrl();
        if (!serverUrl || !_refreshToken) {
          return { success: false, error: 'No refresh token' };
        }
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: _refreshToken }),
          });
          if (!res.ok) {
            _accessToken = '';
            _refreshToken = '';
            return { success: false, error: 'Refresh failed' };
          }
          const data = await res.json();
          _accessToken = data.access_token;
          _refreshToken = data.refresh_token || _refreshToken;
          return { success: true, token: _accessToken };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    },

    // API proxy
    api: {
      request: (method: string, path: string, body?: any) => apiFetch(method, path, body),
      upload: async (
        path: string, fileBuffer: ArrayBuffer, fileName: string,
        mimeType: string, extraFields?: Record<string, string>,
      ) => {
        const formData = new FormData();
        if (extraFields) {
          for (const [key, val] of Object.entries(extraFields)) {
            formData.append(key, val);
          }
        }
        formData.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);

        try {
          const headers: Record<string, string> = {};
          if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

          const res = await fetch(path, {
            method: 'POST',
            headers,
            body: formData,
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            return { ok: false, status: res.status, data, error: data?.message || `Upload failed` };
          }
          return { ok: true, status: res.status, data };
        } catch (err: any) {
          return { ok: false, status: 0, data: null, error: err.message };
        }
      },
    },

    // Screen share (no-ops — Electron-only)
    screenShare: {
      getSources: noopReturn([]),
      onPickRequest: noopListener,
      selectSource: noop,
      onAudioModeSelected: noopListener,
    },

    // App audio (no-ops)
    appAudio: {
      onPcmData: noopListener,
      onSourceLost: noopListener,
      stop: noopAsync,
      isSupported: noopReturn(false),
    },

    // Clipboard (browser API)
    clipboard: {
      writeText: async (text: string) => navigator.clipboard.writeText(text),
      readText: async () => navigator.clipboard.readText(),
    },

    // Crash reporting (no-op in browser)
    crashReport: { submit: noopAsync },

    // Updates (no-ops)
    updates: {
      onUpdateAvailable: noopListener,
      dismiss: noopAsync,
      download: noopAsync,
    },

    // Shortcuts (no-ops)
    shortcuts: {
      update: noopAsync,
      set: noopAsync,
    },

    // E2E encryption (stubbed — requires Electron secure storage)
    // Returns valid shapes so stores don't crash on property access
    e2e: {
      init: async () => ({ deviceId: 'browser-no-e2e', created: false }),
      getKeyBundle: async () => ({
        deviceId: 'browser-no-e2e',
        deviceLabel: 'Browser (no E2E)',
        identityKey: '',
        signedPreKey: '',
        signedPreKeySignature: '',
        signedPreKeyId: 0,
        oneTimePreKeys: [],
      }),
      getDeviceId: async () => 'browser-no-e2e',
      hasKeys: noopReturn(false),
      getLocalOTPCount: noopReturn(0),
      generateOTPKeys: async () => [],
      encrypt: noopReturn(null),
      decrypt: noopReturn(null),
      hasSession: noopReturn(false),
      clearSession: noopAsync,
      clearAll: noopAsync,
    },

    // Mic noise suppression (no-ops)
    micNs: {
      sendPcm: noop,
      onProcessedPcm: noopListener,
      onFallback: noopListener,
      onLevelUpdate: noopListener,
      start: noopAsync,
      stop: noopAsync,
      setAggressiveness: noopAsync,
      isAvailable: noopReturn(false),
    },

    // Crypto (no-ops — browser mode skips payload encryption)
    crypto: {
      negotiate: noopAsync,
      getKeyMaterial: noopReturn(null),
      getSessionInfo: noopReturn(null),
      isActive: noopReturn(false),
      clear: noopAsync,
      onSessionRefreshed: noopListener,
    },
  };

  console.info('[browser-shim] electronAPI shimmed for browser mode');
}
