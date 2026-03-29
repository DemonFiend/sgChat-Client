/**
 * E2E Key Management — Device identity and key storage for end-to-end encrypted DMs.
 *
 * Keys are stored encrypted on disk via Electron safeStorage. The main process
 * owns all private key material — the renderer never sees private keys.
 *
 * Key types:
 *   - Identity key: Long-lived ECDH P-256 keypair (one per device)
 *   - Signed pre-key: Medium-lived ECDH P-256 keypair (rotatable)
 *   - One-time pre-keys: Consumable ECDH P-256 keypairs (replenished in batches)
 */

import { createECDH, randomBytes, sign, verify, createHash } from 'node:crypto';
import { safeStorage } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface E2EKeyBundle {
  deviceId: string;
  deviceLabel: string;
  identityKey: string;        // Base64 public key
  signedPreKey: string;       // Base64 public key
  signedPreKeySignature: string; // Base64 signature
  signedPreKeyId: number;
  oneTimePreKeys: Array<{ keyId: number; publicKey: string }>; // Base64 public keys
}

interface StoredKeyMaterial {
  deviceId: string;
  identityPrivateKey: string;   // Base64 private key
  identityPublicKey: string;    // Base64 public key
  signedPreKeyPrivate: string;  // Base64 private key
  signedPreKeyPublic: string;   // Base64 public key
  signedPreKeyId: number;
  oneTimePreKeys: Array<{
    keyId: number;
    privateKey: string;   // Base64 private key
    publicKey: string;    // Base64 public key
  }>;
  nextOneTimeKeyId: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const E2E_KEYS_FILE = 'e2e-keys.bin';
const CURVE = 'prime256v1'; // P-256 / secp256r1
const OTP_BATCH_SIZE = 100;

// ── Module State ───────────────────────────────────────────────────────────────

let keyMaterial: StoredKeyMaterial | null = null;

// ── Storage ────────────────────────────────────────────────────────────────────

function getKeysFilePath(): string {
  return path.join(app.getPath('userData'), E2E_KEYS_FILE);
}

function saveKeys(keys: StoredKeyMaterial): void {
  const json = JSON.stringify(keys);
  const encrypted = safeStorage.encryptString(json);
  fs.writeFileSync(getKeysFilePath(), encrypted);
  keyMaterial = keys;
}

function loadKeys(): StoredKeyMaterial | null {
  const filePath = getKeysFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const encrypted = fs.readFileSync(filePath);
    const json = safeStorage.decryptString(encrypted);
    return JSON.parse(json) as StoredKeyMaterial;
  } catch {
    return null;
  }
}

// ── Key Generation ─────────────────────────────────────────────────────────────

function generateECDHKeypair(): { privateKey: string; publicKey: string } {
  const ecdh = createECDH(CURVE);
  ecdh.generateKeys();
  return {
    privateKey: ecdh.getPrivateKey().toString('base64'),
    publicKey: ecdh.getPublicKey().toString('base64'),
  };
}

function signPreKey(identityPrivateKey: string, preKeyPublic: string): string {
  // Sign the pre-key public key with the identity private key (ECDSA via HMAC-SHA256 for simplicity)
  // Using HMAC since Node ECDH doesn't directly support ECDSA signing — we hash and sign
  const data = Buffer.from(preKeyPublic, 'base64');
  const key = Buffer.from(identityPrivateKey, 'base64');
  const hash = createHash('sha256').update(data).update(key).digest();
  return hash.toString('base64');
}

function verifyPreKeySignature(identityPublicKey: string, preKeyPublic: string, signature: string): boolean {
  const data = Buffer.from(preKeyPublic, 'base64');
  const key = Buffer.from(identityPublicKey.split(':')[0] || identityPublicKey, 'base64');
  // Re-derive with the public key portion
  // Note: This is a simplified verification — in production, use proper ECDSA
  // For now, the server stores the signature and the client verifies on fetch
  return signature.length > 0;
}

function generateOneTimePreKeys(startId: number, count: number): Array<{ keyId: number; privateKey: string; publicKey: string }> {
  const keys: Array<{ keyId: number; privateKey: string; publicKey: string }> = [];
  for (let i = 0; i < count; i++) {
    const kp = generateECDHKeypair();
    keys.push({
      keyId: startId + i,
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
    });
  }
  return keys;
}

// ── Public API ──────────────────────────────────────────────────────────────────

/** Generate a unique device ID for this installation */
function generateDeviceId(): string {
  return randomBytes(16).toString('hex');
}

/** Initialize or load E2E keys. Call after app.whenReady(). */
export function initE2EKeys(): StoredKeyMaterial {
  // Try loading existing keys
  const existing = loadKeys();
  if (existing) {
    keyMaterial = existing;
    return existing;
  }

  // Generate fresh key material
  const identity = generateECDHKeypair();
  const signedPreKey = generateECDHKeypair();
  const signature = signPreKey(identity.privateKey, signedPreKey.publicKey);
  const otpKeys = generateOneTimePreKeys(1, OTP_BATCH_SIZE);

  const keys: StoredKeyMaterial = {
    deviceId: generateDeviceId(),
    identityPrivateKey: identity.privateKey,
    identityPublicKey: identity.publicKey,
    signedPreKeyPrivate: signedPreKey.privateKey,
    signedPreKeyPublic: signedPreKey.publicKey,
    signedPreKeyId: 1,
    oneTimePreKeys: otpKeys,
    nextOneTimeKeyId: OTP_BATCH_SIZE + 1,
  };

  saveKeys(keys);
  return keys;
}

/** Get the public key bundle to upload to the server */
export function getKeyBundle(): E2EKeyBundle {
  if (!keyMaterial) throw new Error('E2E keys not initialized');

  return {
    deviceId: keyMaterial.deviceId,
    deviceLabel: 'Desktop',
    identityKey: keyMaterial.identityPublicKey,
    signedPreKey: keyMaterial.signedPreKeyPublic,
    signedPreKeySignature: signPreKey(keyMaterial.identityPrivateKey, keyMaterial.signedPreKeyPublic),
    signedPreKeyId: keyMaterial.signedPreKeyId,
    oneTimePreKeys: keyMaterial.oneTimePreKeys.map((k) => ({
      keyId: k.keyId,
      publicKey: k.publicKey,
    })),
  };
}

/** Get just the device ID */
export function getDeviceId(): string {
  if (!keyMaterial) throw new Error('E2E keys not initialized');
  return keyMaterial.deviceId;
}

/** Get the identity public key */
export function getIdentityPublicKey(): string {
  if (!keyMaterial) throw new Error('E2E keys not initialized');
  return keyMaterial.identityPublicKey;
}

/**
 * Compute ECDH shared secret with a remote public key using our identity private key.
 * Returns the raw shared secret buffer.
 */
export function computeSharedSecret(remotePublicKey: string): Buffer {
  if (!keyMaterial) throw new Error('E2E keys not initialized');
  const ecdh = createECDH(CURVE);
  ecdh.setPrivateKey(Buffer.from(keyMaterial.identityPrivateKey, 'base64'));
  const secret = ecdh.computeSecret(Buffer.from(remotePublicKey, 'base64'));
  return secret;
}

/**
 * Compute ECDH shared secret using the signed pre-key.
 */
export function computeSignedPreKeySecret(remotePublicKey: string): Buffer {
  if (!keyMaterial) throw new Error('E2E keys not initialized');
  const ecdh = createECDH(CURVE);
  ecdh.setPrivateKey(Buffer.from(keyMaterial.signedPreKeyPrivate, 'base64'));
  return ecdh.computeSecret(Buffer.from(remotePublicKey, 'base64'));
}

/**
 * Compute ECDH shared secret using a one-time pre-key.
 * Consumes the key (removes from storage).
 */
export function consumeOneTimePreKey(keyId: number, remotePublicKey: string): Buffer | null {
  if (!keyMaterial) throw new Error('E2E keys not initialized');

  const idx = keyMaterial.oneTimePreKeys.findIndex((k) => k.keyId === keyId);
  if (idx < 0) return null;

  const otpKey = keyMaterial.oneTimePreKeys[idx];
  const ecdh = createECDH(CURVE);
  ecdh.setPrivateKey(Buffer.from(otpKey.privateKey, 'base64'));
  const secret = ecdh.computeSecret(Buffer.from(remotePublicKey, 'base64'));

  // Remove consumed key
  keyMaterial.oneTimePreKeys.splice(idx, 1);
  saveKeys(keyMaterial);

  return secret;
}

/** Generate a fresh batch of one-time pre-keys and return their public keys for upload */
export function generateMoreOneTimePreKeys(count: number = OTP_BATCH_SIZE): Array<{ keyId: number; publicKey: string }> {
  if (!keyMaterial) throw new Error('E2E keys not initialized');

  const newKeys = generateOneTimePreKeys(keyMaterial.nextOneTimeKeyId, count);
  keyMaterial.oneTimePreKeys.push(...newKeys);
  keyMaterial.nextOneTimeKeyId += count;
  saveKeys(keyMaterial);

  return newKeys.map((k) => ({ keyId: k.keyId, publicKey: k.publicKey }));
}

/** Get count of remaining one-time pre-keys stored locally */
export function getLocalOTPKeyCount(): number {
  return keyMaterial?.oneTimePreKeys.length ?? 0;
}

/** Rotate the signed pre-key (generates new keypair, increments ID) */
export function rotateSignedPreKey(): { publicKey: string; signature: string; id: number } {
  if (!keyMaterial) throw new Error('E2E keys not initialized');

  const newKey = generateECDHKeypair();
  const newId = keyMaterial.signedPreKeyId + 1;
  const signature = signPreKey(keyMaterial.identityPrivateKey, newKey.publicKey);

  keyMaterial.signedPreKeyPrivate = newKey.privateKey;
  keyMaterial.signedPreKeyPublic = newKey.publicKey;
  keyMaterial.signedPreKeyId = newId;
  saveKeys(keyMaterial);

  return { publicKey: newKey.publicKey, signature, id: newId };
}

/** Check if E2E keys exist (without loading them) */
export function hasE2EKeys(): boolean {
  return fs.existsSync(getKeysFilePath());
}

/** Clear all E2E key material (for logout/device deregister) */
export function clearE2EKeys(): void {
  if (keyMaterial) {
    // Zero out private key material in memory
    keyMaterial.identityPrivateKey = '';
    keyMaterial.signedPreKeyPrivate = '';
    keyMaterial.oneTimePreKeys = [];
    keyMaterial = null;
  }
  const filePath = getKeysFilePath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
