import { createSignal, createRoot } from 'solid-js';
import { networkStore, getEffectiveUrl } from './network';
import { encryptPassword, decryptPassword, hashPasswordForTransit, type EncryptedCredential } from '../lib/crypto';
import { tauriGet, tauriSet, tauriDelete } from '../lib/tauri';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  custom_status: string | null;
  custom_status_expires_at: string | null;
  created_at: string;
  permissions?: UserPermissions;
}

export interface UserPermissions {
  administrator: boolean;
  manage_server: boolean;
  manage_channels: boolean;
  manage_roles: boolean;
  kick_members: boolean;
  ban_members: boolean;
  timeout_members: boolean;
  moderate_members: boolean;
  create_invites: boolean;
  change_nickname: boolean;
  manage_nicknames: boolean;
  view_audit_log: boolean;
  view_channel: boolean;
  send_messages: boolean;
  embed_links: boolean;
  attach_files: boolean;
  add_reactions: boolean;
  mention_everyone: boolean;
  manage_messages: boolean;
  read_message_history: boolean;
  connect: boolean;
  speak: boolean;
  video: boolean;
  stream: boolean;
  mute_members: boolean;
  deafen_members: boolean;
  move_members: boolean;
  disconnect_members: boolean;
  priority_speaker: boolean;
  use_voice_activity: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type AuthErrorReason = 'session_expired' | 'server_unreachable' | 'token_invalid';

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;
let proactiveRefreshInterval: ReturnType<typeof setInterval> | null = null;
let refreshToken: string | null = null;
const REFRESH_TOKEN_KEY = 'sgchat-refresh-token';

/**
 * Get the API URL — desktop always uses full remote URL.
 */
function getApiUrl(): string {
  const currentUrl = networkStore.currentUrl();
  return getEffectiveUrl(currentUrl);
}

function createAuthStore() {
  const [state, setState] = createSignal<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const [authError, setAuthError] = createSignal<AuthErrorReason | null>(null);

  const triggerAuthError = (reason: AuthErrorReason) => {
    if (authError() === null) {
      setAuthError(reason);
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const getAccessToken = (): string | null => {
    if (accessToken && Date.now() < tokenExpiresAt - 30000) {
      return accessToken;
    }
    return null;
  };

  const setTokens = (token: string, expiresIn: number = 900) => {
    accessToken = token;
    tokenExpiresAt = Date.now() + expiresIn * 1000;
  };

  const clearTokens = () => {
    accessToken = null;
    tokenExpiresAt = 0;
    stopProactiveRefresh();
  };

  const setRefreshToken = async (token: string) => {
    refreshToken = token;
    const encrypted = await encryptPassword(token);
    await tauriSet(REFRESH_TOKEN_KEY, encrypted);
  };

  const loadRefreshToken = async (): Promise<string | null> => {
    if (refreshToken) return refreshToken;
    const stored = await tauriGet<EncryptedCredential | null>(REFRESH_TOKEN_KEY, null);
    if (!stored) return null;
    try {
      refreshToken = await decryptPassword(stored);
      return refreshToken;
    } catch {
      await tauriDelete(REFRESH_TOKEN_KEY);
      return null;
    }
  };

  const clearRefreshToken = async () => {
    refreshToken = null;
    await tauriDelete(REFRESH_TOKEN_KEY);
  };

  const startProactiveRefresh = () => {
    stopProactiveRefresh();
    proactiveRefreshInterval = setInterval(async () => {
      if (tokenExpiresAt && Date.now() > tokenExpiresAt - 120000) {
        try {
          await refreshAccessToken();
          console.log('[Auth] Proactive token refresh successful');
        } catch (err) {
          console.error('[Auth] Proactive token refresh failed:', err);
        }
      }
    }, 60000);
  };

  const stopProactiveRefresh = () => {
    if (proactiveRefreshInterval) {
      clearInterval(proactiveRefreshInterval);
      proactiveRefreshInterval = null;
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      throw new Error('No network selected');
    }

    const hashedPassword = await hashPasswordForTransit(password);

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: hashedPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setTokens(data.access_token, 900);
    if (data.refresh_token) {
      await setRefreshToken(data.refresh_token);
    }
    startProactiveRefresh();

    setState({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    });

    return data.user;
  };

  const loginWithRememberMe = async (
    email: string,
    password: string,
    rememberMe: boolean
  ): Promise<User> => {
    const user = await login(email, password);
    const apiUrl = getApiUrl();

    if (rememberMe && apiUrl) {
      const encrypted = await encryptPassword(password);
      networkStore.saveAccountForNetwork(apiUrl, email, encrypted);
    } else if (apiUrl) {
      networkStore.saveAccountForNetwork(apiUrl, email, undefined);
    }

    return user;
  };

  const register = async (
    email: string,
    username: string,
    password: string
  ): Promise<User> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      throw new Error('No network selected');
    }

    const hashedPassword = await hashPasswordForTransit(password);

    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password: hashedPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    setTokens(data.access_token, 900);
    if (data.refresh_token) {
      await setRefreshToken(data.refresh_token);
    }
    startProactiveRefresh();

    setState({
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    });

    networkStore.saveAccountForNetwork(apiUrl, email, undefined);

    return data.user;
  };

  const refreshAccessToken = async (): Promise<string> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      throw new Error('No network selected');
    }

    const wasAuthenticated = state().isAuthenticated || accessToken !== null;

    const storedRefreshToken = await loadRefreshToken();
    if (!storedRefreshToken) {
      clearTokens();
      await clearRefreshToken();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      if (wasAuthenticated) {
        triggerAuthError('session_expired');
      }
      throw new Error('No refresh token available');
    }

    let response: Response;
    try {
      response = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefreshToken }),
      });
    } catch {
      clearTokens();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      if (wasAuthenticated) {
        triggerAuthError('server_unreachable');
      }
      throw new Error('Server unreachable');
    }

    if (!response.ok) {
      clearTokens();
      await clearRefreshToken();
      setState({ user: null, isAuthenticated: false, isLoading: false });
      if (wasAuthenticated) {
        triggerAuthError('session_expired');
      }
      throw new Error('Session expired');
    }

    const data = await response.json();
    setTokens(data.access_token, 900);
    if (data.refresh_token) {
      await setRefreshToken(data.refresh_token);
    }
    return data.access_token;
  };

  const logout = async (forgetDevice: boolean = false) => {
    const apiUrl = getApiUrl();
    const currentUser = state().user;

    try {
      if (apiUrl) {
        const storedRefreshToken = await loadRefreshToken();
        await fetch(`${apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ refresh_token: storedRefreshToken }),
        });
      }
    } catch {
      // Ignore errors on logout
    }

    if (forgetDevice && apiUrl && currentUser) {
      networkStore.clearStoredCredentials(apiUrl, currentUser.email);
    }

    clearTokens();
    await clearRefreshToken();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const checkAuth = async (): Promise<boolean> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const token = await refreshAccessToken();

      const response = await fetch(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const user = await response.json();
      setState({ user, isAuthenticated: true, isLoading: false });
      startProactiveRefresh();
      return true;
    } catch {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  };

  const setNotLoading = () => {
    setState((prev) => ({ ...prev, isLoading: false }));
  };

  const attemptAutoLogin = async (): Promise<boolean> => {
    const apiUrl = getApiUrl();
    if (!apiUrl) return false;

    const accounts = networkStore.getAccountsForNetwork(apiUrl);
    const accountWithCreds = accounts.find(
      (a) => a.encryptedPassword && a.rememberMe && !networkStore.isCredentialExpired(a)
    );

    if (!accountWithCreds || !accountWithCreds.encryptedPassword) {
      return false;
    }

    try {
      const password = await decryptPassword(accountWithCreds.encryptedPassword);
      await login(accountWithCreds.email, password);
      networkStore.saveAccountForNetwork(apiUrl, accountWithCreds.email, accountWithCreds.encryptedPassword);
      return true;
    } catch (error) {
      console.error('Auto-login failed:', error);
      networkStore.clearStoredCredentials(apiUrl, accountWithCreds.email);
      return false;
    }
  };

  const updateStatus = (status: User['status']) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, status } : null
    }));
  };

  const updateCustomStatus = (custom_status: string | null, expires_at?: string | null) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? {
        ...prev.user,
        custom_status,
        custom_status_expires_at: expires_at ?? null
      } : null
    }));
  };

  const clearExpiredCustomStatus = () => {
    const currentUser = state().user;
    if (currentUser?.custom_status_expires_at) {
      const expiresAt = new Date(currentUser.custom_status_expires_at);
      if (expiresAt <= new Date()) {
        setState(prev => ({
          ...prev,
          user: prev.user ? {
            ...prev.user,
            custom_status: null,
            custom_status_expires_at: null
          } : null
        }));
        return true;
      }
    }
    return false;
  };

  const refreshUser = async (): Promise<User | null> => {
    const apiUrl = getApiUrl();
    const token = getAccessToken();

    if (!apiUrl || !token) {
      return null;
    }

    try {
      const response = await fetch(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        });

      if (!response.ok) {
        return null;
      }

      const user = await response.json();
      setState(prev => ({ ...prev, user }));
      return user;
    } catch {
      return null;
    }
  };

  const updateAvatarUrl = (avatar_url: string | null) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, avatar_url } : null
    }));
  };

  return {
    state,
    authError,
    getAccessToken,
    login,
    loginWithRememberMe,
    register,
    logout,
    refreshAccessToken,
    checkAuth,
    setNotLoading,
    attemptAutoLogin,
    updateStatus,
    updateCustomStatus,
    clearExpiredCustomStatus,
    refreshUser,
    updateAvatarUrl,
    triggerAuthError,
    clearAuthError,
  };
}

export const authStore = createRoot(createAuthStore);
