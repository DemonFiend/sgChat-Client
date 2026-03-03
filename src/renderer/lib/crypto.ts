// AES-256-GCM encrypt/decrypt for the renderer process using Web Crypto API.
// Key material is received from the main process via IPC.

interface EncryptedEnvelope {
  _encrypted: true;
  v: 1;
  ct: string;
  iv: string;
}

let aesKey: CryptoKey | null = null;
let sessionId: string | null = null;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Import raw AES-256-GCM key received from main process via IPC. */
export async function setKeyMaterial(
  keyBase64: string,
  cryptoSessionId: string
): Promise<void> {
  const rawKey = base64ToUint8Array(keyBase64);
  aesKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  );
  sessionId = cryptoSessionId;
  // Zero out the raw key array
  rawKey.fill(0);
}

export function getSessionId(): string | null {
  return sessionId;
}

export function hasActiveSession(): boolean {
  return aesKey !== null && sessionId !== null;
}

/** Encrypt a payload for Socket.IO transmission. */
export async function encrypt(plaintext: any): Promise<EncryptedEnvelope> {
  if (!aesKey) throw new Error('No crypto key loaded');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = encoder.encode(
    typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext)
  );

  // Web Crypto AES-GCM appends the auth tag to the ciphertext automatically
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    plaintextBytes
  );

  return {
    _encrypted: true,
    v: 1,
    ct: arrayBufferToBase64(ciphertextWithTag),
    iv: arrayBufferToBase64(iv),
  };
}

/** Decrypt an incoming encrypted envelope. */
export async function decrypt(envelope: EncryptedEnvelope): Promise<any> {
  if (!aesKey) throw new Error('No crypto key loaded');

  const ctWithTag = base64ToArrayBuffer(envelope.ct);
  const iv = base64ToArrayBuffer(envelope.iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    aesKey,
    ctWithTag
  );

  return JSON.parse(decoder.decode(decrypted));
}

/** Type guard to check if data is an encrypted envelope. */
export function isEncryptedEnvelope(data: any): data is EncryptedEnvelope {
  return data && data._encrypted === true && data.v === 1 &&
    typeof data.ct === 'string' && typeof data.iv === 'string';
}

export function clearSession(): void {
  aesKey = null;
  sessionId = null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
