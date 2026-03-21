/**
 * Transport Encryption — ECDH P-256 key exchange + AES-256-GCM
 *
 * Handles ephemeral key exchange with relay servers and provides
 * encrypt/decrypt for relay-level transport payloads. Each session
 * gets independent forward secrecy via fresh ECDH keypairs.
 *
 * This is separate from the existing crypto.ts which handles
 * session-key-based Socket.IO encryption from the main process.
 * transportCrypto is for direct relay-to-client encryption.
 */

// ── Constants ────────────────────────────────────────────────────

const HKDF_INFO = 'sgchat-transport-v1';
const IV_BYTES = 12;

// ── Types ────────────────────────────────────────────────────────

export interface EncryptedPayload {
  _encrypted: true;
  v: 1;
  ct: string; // base64 ciphertext
  iv: string; // base64 IV
}

export interface TransportSession {
  sessionId: string;
  expiresAt: number;
}

// ── Module State ─────────────────────────────────────────────────

let cryptoSessionId: string | null = null;
let aesKey: CryptoKey | null = null;
let sessionExpiresAt = 0;
let negotiationPromise: Promise<void> | null = null;

// ── Public API ───────────────────────────────────────────────────

/**
 * Ensure a transport crypto session exists with the given relay.
 * Performs ECDH key exchange if needed. Deduplicates concurrent calls.
 */
export async function ensureTransportSession(relayUrl: string): Promise<void> {
  // Already have a valid session (with 5-min buffer)
  if (aesKey && cryptoSessionId && Date.now() < sessionExpiresAt - 5 * 60 * 1000) {
    return;
  }

  // Dedup concurrent negotiations
  if (negotiationPromise) return negotiationPromise;

  negotiationPromise = negotiate(relayUrl).finally(() => {
    negotiationPromise = null;
  });

  return negotiationPromise;
}

/** Get the current transport session ID (for request headers) */
export function getTransportSessionId(): string | null {
  return cryptoSessionId;
}

/** Check if we have an active transport session */
export function hasTransportSession(): boolean {
  return aesKey !== null && cryptoSessionId !== null && Date.now() < sessionExpiresAt;
}

/** Clear the transport crypto session */
export function clearTransportSession(): void {
  cryptoSessionId = null;
  aesKey = null;
  sessionExpiresAt = 0;
}

/** Get session info (for diagnostics) */
export function getTransportSession(): TransportSession | null {
  if (!cryptoSessionId) return null;
  return { sessionId: cryptoSessionId, expiresAt: sessionExpiresAt };
}

/**
 * Encrypt plaintext for transport to a relay.
 * Throws if no transport session is active.
 */
export async function encryptTransport(plaintext: string): Promise<EncryptedPayload> {
  if (!aesKey) throw new Error('No transport crypto session');

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  );

  return {
    _encrypted: true,
    v: 1,
    ct: arrayBufferToBase64(ct),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt an encrypted payload from a relay.
 * Throws if no transport session is active or decryption fails.
 */
export async function decryptTransport(encrypted: EncryptedPayload): Promise<string> {
  if (!aesKey) throw new Error('No transport crypto session');

  const ct = base64ToUint8Array(encrypted.ct);
  const iv = base64ToUint8Array(encrypted.iv);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ct);
  return new TextDecoder().decode(plaintext);
}

/** Type guard for encrypted payloads */
export function isEncryptedPayload(data: unknown): data is EncryptedPayload {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as any)._encrypted === true &&
    (data as any).v === 1 &&
    typeof (data as any).ct === 'string' &&
    typeof (data as any).iv === 'string'
  );
}

// ── Key Exchange (Private) ───────────────────────────────────────

async function negotiate(relayUrl: string): Promise<void> {
  // 1. Generate ephemeral ECDH P-256 keypair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );

  // 2. Export client public key as base64
  const clientPubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const clientPubB64 = arrayBufferToBase64(clientPubRaw);

  // 3. Key exchange with relay (unencrypted bootstrap)
  const normalizedUrl = relayUrl.replace(/\/+$/, '');
  const response = await fetch(`${normalizedUrl}/crypto/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientPublicKey: clientPubB64 }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Transport key exchange failed: ${response.status}`);
  }

  const { serverPublicKey, sessionId, expiresAt } = await response.json();

  // 4. Import server public key
  const serverPubBytes = base64ToUint8Array(serverPublicKey);
  const serverPubKey = await crypto.subtle.importKey(
    'raw',
    serverPubBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // 5. Derive shared bits
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: serverPubKey },
    keyPair.privateKey,
    256,
  );

  // 6. HKDF to derive AES-256-GCM key
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);

  aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(sessionId),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  cryptoSessionId = sessionId;
  sessionExpiresAt = new Date(expiresAt).getTime();
}

// ── Helpers ──────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
