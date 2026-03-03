import { createECDH, hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { net, BrowserWindow } from 'electron';
import { getServerUrl } from './store';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CryptoSession {
  sessionId: string;
  aesKey: Buffer;
  expiresAt: Date;
  serverUrl: string;
}

interface EncryptedEnvelope {
  _encrypted: true;
  v: 1;
  ct: string;
  iv: string;
}

interface KeyExchangeResponse {
  serverPublicKey: string;
  sessionId: string;
  expiresAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const HKDF_INFO = 'sgchat-payload-encryption-v1';
const AES_KEY_LENGTH = 32;    // 256 bits
const IV_LENGTH = 12;         // 96 bits
const TAG_LENGTH = 16;        // 128 bits
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes before expiry
const RETRY_DELAY_MS = 30_000;

const EXEMPT_PATHS = [
  '/health',
  '/api/health',
  '/api/version',
  '/api/crypto/exchange',
];

// ── Module State ───────────────────────────────────────────────────────────────

let currentSession: CryptoSession | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let negotiationPromise: Promise<CryptoSession | null> | null = null;

// ── Key Exchange ───────────────────────────────────────────────────────────────

export async function negotiateCryptoSession(): Promise<CryptoSession | null> {
  // Deduplicate concurrent negotiation calls
  if (negotiationPromise) return negotiationPromise;

  negotiationPromise = (async () => {
    try {
      const serverUrl = getServerUrl();
      if (!serverUrl) throw new Error('No server URL configured');

      // 1. Generate ephemeral ECDH P-256 keypair
      const ecdh = createECDH('prime256v1');
      ecdh.generateKeys();
      const clientPublicKey = ecdh.getPublicKey(); // 65 bytes uncompressed

      // 2. POST to /api/crypto/exchange
      const res = await net.fetch(`${serverUrl}/api/crypto/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientPublicKey: clientPublicKey.toString('base64'),
        }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          // Server doesn't support payload encryption
          console.log('[crypto] Server does not support payload encryption (404)');
          return null;
        }
        const errData = await res.json().catch(() => ({ message: 'Key exchange failed' }));
        throw new Error(errData.message || `Key exchange failed (${res.status})`);
      }

      const data: KeyExchangeResponse = await res.json();

      // 3. Compute shared secret via ECDH
      const serverPubKeyBuffer = Buffer.from(data.serverPublicKey, 'base64');
      const sharedSecret = ecdh.computeSecret(serverPubKeyBuffer);
      // ECDH private key is now unreachable (ecdh goes out of scope) → forward secrecy

      // 4. Derive AES-256 key via HKDF-SHA256
      const salt = Buffer.from(data.sessionId, 'utf8');
      const info = Buffer.from(HKDF_INFO, 'utf8');
      const aesKey = Buffer.from(
        hkdfSync('sha256', sharedSecret, salt, info, AES_KEY_LENGTH)
      );

      // 5. Zero out shared secret
      sharedSecret.fill(0);

      const session: CryptoSession = {
        sessionId: data.sessionId,
        aesKey,
        expiresAt: new Date(data.expiresAt),
        serverUrl,
      };

      currentSession = session;
      scheduleRefresh(session);
      notifyRenderer();

      console.log(`[crypto] Session negotiated: ${session.sessionId} (expires ${session.expiresAt.toISOString()})`);
      return session;
    } finally {
      negotiationPromise = null;
    }
  })();

  return negotiationPromise;
}

// ── Encrypt / Decrypt ──────────────────────────────────────────────────────────

export function encrypt(plaintext: any): EncryptedEnvelope {
  if (!currentSession) throw new Error('No active crypto session');

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', currentSession.aesKey, iv);

  const plaintextStr = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const encrypted = Buffer.concat([
    cipher.update(plaintextStr, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 16 bytes

  // Concatenate ciphertext + tag (server expects appended tag)
  const ctWithTag = Buffer.concat([encrypted, tag]);

  return {
    _encrypted: true,
    v: 1,
    ct: ctWithTag.toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decrypt(envelope: EncryptedEnvelope): any {
  if (!currentSession) throw new Error('No active crypto session');

  const ctWithTag = Buffer.from(envelope.ct, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');

  // Last 16 bytes are the auth tag
  const tag = ctWithTag.subarray(ctWithTag.length - TAG_LENGTH);
  const ciphertext = ctWithTag.subarray(0, ctWithTag.length - TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', currentSession.aesKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8'));
}

export function isEncryptedPayload(data: any): data is EncryptedEnvelope {
  return data && data._encrypted === true && data.v === 1 &&
    typeof data.ct === 'string' && typeof data.iv === 'string';
}

// ── Accessors ──────────────────────────────────────────────────────────────────

export function getSessionId(): string | null {
  return currentSession?.sessionId ?? null;
}

export function hasActiveSession(): boolean {
  if (!currentSession) return false;
  return currentSession.expiresAt.getTime() > Date.now();
}

export function isExemptPath(path: string): boolean {
  return EXEMPT_PATHS.some(exempt =>
    path === exempt || path.startsWith(exempt + '?')
  );
}

export function getKeyMaterial(): { key: string; sessionId: string } | null {
  if (!currentSession) return null;
  return {
    key: currentSession.aesKey.toString('base64'),
    sessionId: currentSession.sessionId,
  };
}

export function getSessionInfo(): { sessionId: string; expiresAt: string } | null {
  if (!currentSession) return null;
  return {
    sessionId: currentSession.sessionId,
    expiresAt: currentSession.expiresAt.toISOString(),
  };
}

// ── Session Lifecycle ──────────────────────────────────────────────────────────

export function clearCryptoSession(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  if (currentSession) {
    currentSession.aesKey.fill(0); // Zero out key material
    currentSession = null;
  }
}

export async function handleSessionExpired(): Promise<void> {
  clearCryptoSession();
  await negotiateCryptoSession();
}

function scheduleRefresh(session: CryptoSession): void {
  if (refreshTimer) clearTimeout(refreshTimer);

  const now = Date.now();
  const expiresMs = session.expiresAt.getTime();
  const refreshAt = expiresMs - REFRESH_MARGIN_MS;
  const delay = Math.max(refreshAt - now, 0);

  refreshTimer = setTimeout(async () => {
    try {
      await negotiateCryptoSession();
    } catch (err) {
      console.error('[crypto] Auto-refresh failed, retrying in 30s:', err);
      refreshTimer = setTimeout(() => {
        negotiateCryptoSession().catch(() => {});
      }, RETRY_DELAY_MS);
    }
  }, delay);
}

function notifyRenderer(): void {
  const keyMaterial = getKeyMaterial();
  if (!keyMaterial) return;
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send('crypto:sessionRefreshed', keyMaterial);
  }
}
