import { createSignal, createRoot } from 'solid-js';
import type { EncryptedCredential } from '../lib/crypto';
import { tauriGet, tauriSet } from '../lib/tauri';

export type { EncryptedCredential } from '../lib/crypto';

export interface NetworkAccount {
  email: string;
  lastUsed: string;
  encryptedPassword?: EncryptedCredential;
  rememberMe?: boolean;
  storedAt?: string;
}

export interface Network {
  url: string;
  name: string;
  accounts: NetworkAccount[];
  lastConnected: string | null;
  isFavorite: boolean;
  isDefault: boolean;
}

export interface ServerInfo {
  name: string;
  version: string;
  status: string;
}

export type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

const STORAGE_KEYS = {
  networks: 'sgchat-networks',
  autoLogin: 'sgchat-auto-login',
  lastNetworkUrl: 'sgchat-last-network',
};

const MAX_RECENT_NETWORKS = 10;
const MAX_ACCOUNTS_PER_NETWORK = 5;
const CREDENTIAL_TTL_DAYS = 30;

/**
 * Get the effective API URL for making requests.
 * Desktop client always uses the full remote URL (no proxy).
 */
export function getEffectiveUrl(inputUrl: string | null): string {
  if (!inputUrl) return import.meta.env.VITE_API_URL || '';
  return inputUrl.replace(/\/+$/, '');
}

function createNetworkStore() {
  // Signals — initialized with defaults, hydrated async from Tauri store
  const [networks, setNetworks] = createSignal<Network[]>([]);
  const [autoLogin, setAutoLoginSignal] = createSignal(false);
  const [currentUrl, setCurrentUrl] = createSignal<string | null>(null);
  const [connectionStatus, setConnectionStatus] = createSignal<ConnectionStatus>('idle');
  const [serverInfo, setServerInfo] = createSignal<ServerInfo | null>(null);
  const [connectionError, setConnectionError] = createSignal<string | null>(null);
  const [hydrated, setHydrated] = createSignal(false);

  // Derived state
  const currentNetwork = () => networks().find((n) => n.url === currentUrl()) || null;
  const defaultNetwork = () => networks().find((n) => n.isDefault) || null;
  const favoriteNetworks = () => networks().filter((n) => n.isFavorite);
  const recentNetworks = () =>
    networks()
      .filter((n) => !n.isFavorite && n.lastConnected)
      .sort((a, b) => {
        if (!a.lastConnected) return 1;
        if (!b.lastConnected) return -1;
        return new Date(b.lastConnected).getTime() - new Date(a.lastConnected).getTime();
      })
      .slice(0, MAX_RECENT_NETWORKS);

  /**
   * Hydrate store from Tauri persistent storage.
   * Must be called on app init before using the store.
   */
  const hydrate = async () => {
    const storedNetworks = await tauriGet<Network[]>(STORAGE_KEYS.networks, []);
    const storedAutoLogin = await tauriGet<boolean>(STORAGE_KEYS.autoLogin, false);
    const storedLastUrl = await tauriGet<string | null>(STORAGE_KEYS.lastNetworkUrl, null);

    setNetworks(storedNetworks);
    setAutoLoginSignal(storedAutoLogin);
    setCurrentUrl(storedLastUrl);
    setHydrated(true);
  };

  // Persist networks
  const persistNetworks = (newNetworks: Network[]) => {
    setNetworks(newNetworks);
    tauriSet(STORAGE_KEYS.networks, newNetworks);
  };

  // Test connection to a network
  const testConnection = async (url: string): Promise<ServerInfo | null> => {
    setConnectionStatus('testing');
    setConnectionError(null);
    setServerInfo(null);

    const normalizedUrl = url.replace(/\/+$/, '');

    // Block insecure HTTP connections in production builds (localhost exempted for dev/self-hosted)
    const isProduction = import.meta.env.PROD;
    const isHttp = normalizedUrl.startsWith('http://');
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(normalizedUrl);

    if (isProduction && isHttp && !isLocalhost) {
      setConnectionError('Insecure connection: Use HTTPS for security.');
      setConnectionStatus('failed');
      return null;
    }

    const effectiveUrl = getEffectiveUrl(normalizedUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${effectiveUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'ok') {
        throw new Error('Server health check failed');
      }

      const info: ServerInfo = {
        name: data.name || 'Unknown Server',
        version: data.version || 'Unknown',
        status: data.status,
      };

      setServerInfo(info);
      setConnectionStatus('connected');
      setCurrentUrl(normalizedUrl);
      tauriSet(STORAGE_KEYS.lastNetworkUrl, normalizedUrl);

      return info;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setConnectionError(message.includes('abort') ? 'Connection timed out' : message);
      setConnectionStatus('failed');
      return null;
    }
  };

  const addOrUpdateNetwork = (url: string, updates: Partial<Omit<Network, 'url'>>) => {
    const normalizedUrl = url.replace(/\/+$/, '');
    const existing = networks().find((n) => n.url === normalizedUrl);

    if (existing) {
      persistNetworks(
        networks().map((n) =>
          n.url === normalizedUrl ? { ...n, ...updates } : n
        )
      );
    } else {
      const newNetwork: Network = {
        url: normalizedUrl,
        name: updates.name || serverInfo()?.name || 'Unknown Server',
        accounts: updates.accounts || [],
        lastConnected: updates.lastConnected || null,
        isFavorite: updates.isFavorite || false,
        isDefault: updates.isDefault || false,
      };

      let updatedNetworks = networks();
      if (newNetwork.isDefault) {
        updatedNetworks = updatedNetworks.map((n) => ({ ...n, isDefault: false }));
      }

      persistNetworks([...updatedNetworks, newNetwork]);
    }
  };

  const isCredentialExpired = (account: NetworkAccount): boolean => {
    if (!account.storedAt || !account.encryptedPassword) return true;
    const storedDate = new Date(account.storedAt).getTime();
    const now = Date.now();
    const ttlMs = CREDENTIAL_TTL_DAYS * 24 * 60 * 60 * 1000;
    return now - storedDate > ttlMs;
  };

  const saveAccountForNetwork = (
    url: string,
    email: string,
    encryptedPassword?: EncryptedCredential
  ) => {
    const normalizedUrl = url.replace(/\/+$/, '');
    const network = networks().find((n) => n.url === normalizedUrl);
    const now = new Date().toISOString();

    const newAccount: NetworkAccount = {
      email,
      lastUsed: now,
      encryptedPassword,
      rememberMe: !!encryptedPassword,
      storedAt: encryptedPassword ? now : undefined,
    };

    if (!network) {
      addOrUpdateNetwork(normalizedUrl, {
        name: serverInfo()?.name || 'Unknown Server',
        accounts: [newAccount],
        lastConnected: now,
      });
      return;
    }

    const existingAccount = network.accounts.find((a) => a.email === email);
    let updatedAccounts: NetworkAccount[];

    if (existingAccount) {
      const updatedAccount: NetworkAccount = {
        ...newAccount,
        encryptedPassword: encryptedPassword ?? existingAccount.encryptedPassword,
        rememberMe: encryptedPassword !== undefined ? !!encryptedPassword : existingAccount.rememberMe,
        storedAt: encryptedPassword ? now : existingAccount.storedAt,
      };
      updatedAccounts = [
        updatedAccount,
        ...network.accounts.filter((a) => a.email !== email),
      ];
    } else {
      updatedAccounts = [
        newAccount,
        ...network.accounts,
      ].slice(0, MAX_ACCOUNTS_PER_NETWORK);
    }

    persistNetworks(
      networks().map((n) =>
        n.url === normalizedUrl
          ? { ...n, accounts: updatedAccounts, lastConnected: new Date().toISOString() }
          : n
      )
    );
  };

  const toggleFavorite = (url: string) => {
    const normalizedUrl = url.replace(/\/+$/, '');
    persistNetworks(
      networks().map((n) =>
        n.url === normalizedUrl ? { ...n, isFavorite: !n.isFavorite } : n
      )
    );
  };

  const setAsDefault = (url: string | null) => {
    if (!url) {
      persistNetworks(networks().map((n) => ({ ...n, isDefault: false })));
      return;
    }

    const normalizedUrl = url.replace(/\/+$/, '');
    persistNetworks(
      networks().map((n) => ({
        ...n,
        isDefault: n.url === normalizedUrl,
      }))
    );
  };

  const removeNetwork = (url: string) => {
    const normalizedUrl = url.replace(/\/+$/, '');
    persistNetworks(networks().filter((n) => n.url !== normalizedUrl));
  };

  const setAutoLogin = (enabled: boolean) => {
    setAutoLoginSignal(enabled);
    tauriSet(STORAGE_KEYS.autoLogin, enabled);
  };

  const getAccountsForNetwork = (url: string) => {
    const normalizedUrl = url.replace(/\/+$/, '');
    return networks().find((n) => n.url === normalizedUrl)?.accounts || [];
  };

  const clearConnection = () => {
    setCurrentUrl(null);
    setServerInfo(null);
    setConnectionStatus('idle');
    setConnectionError(null);
    tauriSet(STORAGE_KEYS.lastNetworkUrl, null);
  };

  const clearStoredCredentials = (url: string, email: string) => {
    const normalizedUrl = url.replace(/\/+$/, '');
    persistNetworks(
      networks().map((n) =>
        n.url === normalizedUrl
          ? {
              ...n,
              accounts: n.accounts.map((a) =>
                a.email === email
                  ? { ...a, encryptedPassword: undefined, rememberMe: false, storedAt: undefined }
                  : a
              ),
            }
          : n
      )
    );
  };

  const clearAllStoredCredentials = () => {
    persistNetworks(
      networks().map((n) => ({
        ...n,
        accounts: n.accounts.map((a) => ({
          ...a,
          encryptedPassword: undefined,
          rememberMe: false,
          storedAt: undefined,
        })),
      }))
    );
  };

  return {
    networks,
    currentUrl,
    currentNetwork,
    defaultNetwork,
    favoriteNetworks,
    recentNetworks,
    connectionStatus,
    serverInfo,
    connectionError,
    autoLogin,
    hydrated,

    hydrate,
    testConnection,
    addOrUpdateNetwork,
    saveAccountForNetwork,
    toggleFavorite,
    setAsDefault,
    removeNetwork,
    setAutoLogin,
    getAccountsForNetwork,
    clearConnection,
    setCurrentUrl,
    isCredentialExpired,
    clearStoredCredentials,
    clearAllStoredCredentials,
  };
}

export const networkStore = createRoot(createNetworkStore);
