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

function hashPasswordForTransit(password: string): string {
  return `sha256:${createHash('sha256').update(password).digest('hex')}`;
}

export async function login(
  serverUrl: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthResponse['user']; error?: string }> {
  try {
    const res = await net.fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: hashPasswordForTransit(password) }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: 'Login failed' }));
      return { success: false, error: data.message || `Login failed (${res.status})` };
    }

    const data: AuthResponse = await res.json();
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: hashPasswordForTransit(password) }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: 'Registration failed' }));
      return { success: false, error: data.message || `Registration failed (${res.status})` };
    }

    const data: AuthResponse = await res.json();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        throw new Error('Token refresh failed');
      }

      const data = await res.json();
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
