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

export interface LoginResult {
  success: boolean;
  user?: AuthResponse['user'];
  error?: string;
  error_code?: string;
  retry_after?: string;
  pending_approval?: boolean;
}

export async function login(
  serverUrl: string,
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const res = await net.fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: authHeaders(),
      body: serializeBody({ email, password: hashPasswordForTransit(password) }),
    });

    if (!res.ok) {
      const data = await parseResponse(res).catch(() => ({ message: 'Login failed' }));
      const result: LoginResult = {
        success: false,
        error: data.message || `Login failed (${res.status})`,
      };

      // Propagate error_code from server response
      if (data.error_code) {
        result.error_code = data.error_code;
      }

      // Handle 429 rate limiting — parse Retry-After header or body field
      if (res.status === 429) {
        result.error_code = result.error_code || 'RATE_LIMITED';
        const retryHeader = res.headers.get('Retry-After');
        if (data.retry_after) {
          result.retry_after = data.retry_after;
        } else if (retryHeader) {
          // Retry-After can be seconds or an HTTP-date
          const seconds = parseInt(retryHeader, 10);
          if (!isNaN(seconds)) {
            result.retry_after = new Date(Date.now() + seconds * 1000).toISOString();
          } else {
            result.retry_after = new Date(retryHeader).toISOString();
          }
        }
      }

      // Handle pending approval
      if (data.pending_approval) {
        result.pending_approval = true;
        result.error_code = result.error_code || 'PENDING_APPROVAL';
      }

      return result;
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
  password: string,
  inviteCode?: string
): Promise<{ success: boolean; user?: AuthResponse['user']; error?: string; pending_approval?: boolean }> {
  try {
    const body: Record<string, string> = {
      username,
      email,
      password: hashPasswordForTransit(password),
    };
    if (inviteCode) {
      body.invite_code = inviteCode;
    }

    const res = await net.fetch(`${serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: authHeaders(),
      body: serializeBody(body),
    });

    if (!res.ok) {
      const data = await parseResponse(res).catch(() => ({ message: 'Registration failed' }));
      return { success: false, error: data.message || `Registration failed (${res.status})` };
    }

    const data = await parseResponse(res);

    // Server may return pending_approval — with or without tokens
    if (data.pending_approval) {
      // If server also issued tokens for the pending user, store them
      if (data.access_token && data.refresh_token && data.user) {
        setTokens(data.access_token, data.refresh_token, data.user.id);
        return { success: true, pending_approval: true, user: data.user };
      }
      return { success: true, pending_approval: true };
    }

    const authData = data as AuthResponse;
    setTokens(authData.access_token, authData.refresh_token, authData.user.id);
    return { success: true, user: authData.user };
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
