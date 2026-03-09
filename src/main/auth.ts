import { net } from 'electron';
import { createHash } from 'crypto';
import {
  getServerUrl,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isAuthenticated as checkAuth,
} from './store';
import {
  encrypt, decrypt, isEncryptedPayload,
  hasActiveSession, getSessionId,
} from './crypto';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
    status?: string;
  };
}

interface AuthError {
  error: boolean;
  message: string;
  status?: number;
}

let refreshPromise: Promise<string> | null = null;

export function hashPasswordForTransit(password: string): string {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}

/** Alias exposed to renderer via IPC */
export const hashPassword = hashPasswordForTransit;

/** Build headers for an auth request, adding crypto session if active. */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (hasActiveSession()) {
    headers['X-Crypto-Session'] = getSessionId()!;
  }
  return headers;
}

/** Serialize request body, encrypting if crypto session is active. */
function serializeBody(body: any): string {
  if (hasActiveSession()) {
    return JSON.stringify(encrypt(body));
  }
  return JSON.stringify(body);
}

/** Parse response, decrypting if encrypted. */
async function parseResponse(res: Response): Promise<any> {
  const data = await res.json();
  if (isEncryptedPayload(data)) {
    return decrypt(data);
  }
  return data;
}

export async function login(
  serverUrl: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthResponse['user']; error?: string }> {
  try {
    const res = await net.fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: authHeaders(),
      body: serializeBody({ email, password: hashPasswordForTransit(password) }),
    });

    if (!res.ok) {
      const data = await parseResponse(res).catch(() => ({ message: 'Login failed' }));
      return { success: false, error: data.message || `Login failed (${res.status})` };
    }

    const data: AuthResponse = await parseResponse(res);
    setTokens(data.access_token, data.refresh_token, data.user.id);
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function register(
  serverUrl: string,
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthResponse['user']; error?: string }> {
  try {
    const res = await net.fetch(`${serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: authHeaders(),
      body: serializeBody({ username, email, password: hashPasswordForTransit(password) }),
    });

    if (!res.ok) {
      const data = await parseResponse(res).catch(() => ({ message: 'Registration failed' }));
      return { success: false, error: data.message || `Registration failed (${res.status})` };
    }

    const data: AuthResponse = await parseResponse(res);
    setTokens(data.access_token, data.refresh_token, data.user.id);
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function refreshAccessToken(): Promise<string> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const serverUrl = getServerUrl();
      const refreshToken = getRefreshToken();

      if (!serverUrl || !refreshToken) {
        throw new Error('No server URL or refresh token');
      }

      const res = await net.fetch(`${serverUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: authHeaders(),
        body: serializeBody({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        throw new Error('Token refresh failed');
      }

      const data = await parseResponse(res);
      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token || refreshToken;
      const { getUserId } = await import('./store');
      setTokens(newAccessToken, newRefreshToken, getUserId());
      return newAccessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function logout(): void {
  clearTokens();
}

export function getToken(): string {
  return getAccessToken();
}

export function isLoggedIn(): boolean {
  return checkAuth();
}
