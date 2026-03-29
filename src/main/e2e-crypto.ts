/**
 * E2E Crypto Engine — X3DH key exchange + Double Ratchet for DM encryption.
 *
 * All operations run in the main process. The renderer calls via IPC:
 *   - e2e:encrypt(recipientId, plaintext) → encrypted envelope
 *   - e2e:decrypt(senderId, envelope) → plaintext
 *
 * Protocol: Simplified X3DH + symmetric ratchet (AES-256-GCM with per-message keys).
 * Forward secrecy is provided by HKDF-based key derivation chains.
 */

import { createECDH, hkdfSync, randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { safeStorage } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import { computeSharedSecret, computeSignedPreKeySecret, consumeOneTimePreKey, getDeviceId, getIdentityPublicKey } from './e2e-keys';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RatchetState {
  /** Root key — derives new chain keys on each DH ratchet step */
  rootKey: string;         // Base64 32 bytes
  /** Sending chain key — derives per-message encryption keys */
  sendChainKey: string;    // Base64 32 bytes
  /** Receiving chain key — derives per-message decryption keys */
  recvChainKey: string;    // Base64 32 bytes
  /** Our current ephemeral ECDH keypair for the ratchet */
  ourEphemeralPrivate: string;  // Base64
  ourEphemeralPublic: string;   // Base64
  /** Their latest ephemeral public key */
  theirEphemeralPublic: string; // Base64
  /** Their identity public key */
  theirIdentityKey: string;     // Base64
  /** Message counters */
  sendCounter: number;
  recvCounter: number;
}

export interface E2EEncryptedEnvelope {
  /** Protocol version */
  v: 2;
  /** Sender device ID */
  did: string;
  /** Sender identity key (for session establishment) */
  ik: string;
  /** Ephemeral public key (for X3DH initial message or ratchet) */
  ek: string;
  /** Used one-time pre-key ID (only in initial message, -1 if none) */
  opk: number;
  /** Ciphertext (AES-256-GCM encrypted, base64) */
  ct: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Message number in the sending chain */
  n: number;
}

interface RecipientKeyBundle {
  deviceId: string;
  identityKey: string;
  signedPreKey: string;
  signedPreKeySignature: string;
  signedPreKeyId: number;
  oneTimePreKey?: { keyId: number; publicKey: string };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CURVE = 'prime256v1';
const HKDF_E2E_INFO = 'sgchat-e2e-v1';
const AES_KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SESSIONS_FILE = 'e2e-sessions.bin';

// ── Session Storage ────────────────────────────────────────────────────────────

let sessions: Map<string, RatchetState> = new Map();

function getSessionsFilePath(): string {
  return path.join(app.getPath('userData'), SESSIONS_FILE);
}

function saveSessions(): void {
  const data = Object.fromEntries(sessions);
  const json = JSON.stringify(data);
  const encrypted = safeStorage.encryptString(json);
  fs.writeFileSync(getSessionsFilePath(), encrypted);
}

function loadSessions(): void {
  const filePath = getSessionsFilePath();
  if (!fs.existsSync(filePath)) return;
  try {
    const encrypted = fs.readFileSync(filePath);
    const json = safeStorage.decryptString(encrypted);
    const data = JSON.parse(json);
    sessions = new Map(Object.entries(data));
  } catch {
    sessions = new Map();
  }
}

/** Initialize sessions from disk. Call after app.whenReady(). */
export function initE2ESessions(): void {
  loadSessions();
}

// ── ECDH Helpers ───────────────────────────────────────────────────────────────

function generateEphemeralKeypair(): { privateKey: string; publicKey: string } {
  const ecdh = createECDH(CURVE);
  ecdh.generateKeys();
  return {
    privateKey: ecdh.getPrivateKey().toString('base64'),
    publicKey: ecdh.getPublicKey().toString('base64'),
  };
}

function ecdhSecret(privateKey: string, publicKey: string): Buffer {
  const ecdh = createECDH(CURVE);
  ecdh.setPrivateKey(Buffer.from(privateKey, 'base64'));
  return ecdh.computeSecret(Buffer.from(publicKey, 'base64'));
}

function hkdfDerive(inputKey: Buffer, salt: Buffer, info: string, length: number): Buffer {
  return Buffer.from(hkdfSync('sha256', inputKey, salt, Buffer.from(info, 'utf8'), length));
}

// ── Key Derivation Chain ───────────────────────────────────────────────────────

function deriveChainKey(chainKey: Buffer): { messageKey: Buffer; nextChainKey: Buffer } {
  const messageKey = hkdfDerive(chainKey, Buffer.alloc(32), 'msg-key', AES_KEY_LENGTH);
  const nextChainKey = hkdfDerive(chainKey, Buffer.alloc(32), 'chain-key', 32);
  return { messageKey, nextChainKey };
}

function deriveRootKey(rootKey: Buffer, dhSecret: Buffer): { newRootKey: Buffer; sendChainKey: Buffer } {
  const derived = hkdfDerive(dhSecret, rootKey, HKDF_E2E_INFO, 64);
  return {
    newRootKey: derived.subarray(0, 32),
    sendChainKey: derived.subarray(32, 64),
  };
}

// ── X3DH: Initial Key Exchange ─────────────────────────────────────────────────

/**
 * Perform X3DH as the initiator (sender of first message).
 * Establishes a shared session with the recipient using their key bundle.
 */
export function x3dhInitiate(recipientBundle: RecipientKeyBundle): {
  session: RatchetState;
  ephemeralPublicKey: string;
  usedOTPKeyId: number;
} {
  // Generate ephemeral keypair for this exchange
  const ephemeral = generateEphemeralKeypair();
  const ourIdentityPrivate = getOurIdentityPrivate();

  // X3DH: compute 3 (or 4) DH values
  // DH1: our identity key × their signed pre-key
  const dh1 = ecdhSecret(ourIdentityPrivate, recipientBundle.signedPreKey);
  // DH2: our ephemeral key × their identity key
  const dh2 = ecdhSecret(ephemeral.privateKey, recipientBundle.identityKey);
  // DH3: our ephemeral key × their signed pre-key
  const dh3 = ecdhSecret(ephemeral.privateKey, recipientBundle.signedPreKey);

  let masterSecret: Buffer;
  let usedOTPKeyId = -1;

  if (recipientBundle.oneTimePreKey) {
    // DH4: our ephemeral key × their one-time pre-key
    const dh4 = ecdhSecret(ephemeral.privateKey, recipientBundle.oneTimePreKey.publicKey);
    masterSecret = Buffer.concat([dh1, dh2, dh3, dh4]);
    usedOTPKeyId = recipientBundle.oneTimePreKey.keyId;
    dh4.fill(0);
  } else {
    masterSecret = Buffer.concat([dh1, dh2, dh3]);
  }

  // Zero out intermediate secrets
  dh1.fill(0);
  dh2.fill(0);
  dh3.fill(0);

  // Derive root key and initial sending chain key
  const { newRootKey, sendChainKey } = deriveRootKey(
    Buffer.alloc(32), // Initial root key is zeros
    masterSecret,
  );
  masterSecret.fill(0);

  const session: RatchetState = {
    rootKey: newRootKey.toString('base64'),
    sendChainKey: sendChainKey.toString('base64'),
    recvChainKey: '', // Will be established when we receive a reply
    ourEphemeralPrivate: ephemeral.privateKey,
    ourEphemeralPublic: ephemeral.publicKey,
    theirEphemeralPublic: recipientBundle.signedPreKey, // Start with their signed pre-key
    theirIdentityKey: recipientBundle.identityKey,
    sendCounter: 0,
    recvCounter: 0,
  };

  return { session, ephemeralPublicKey: ephemeral.publicKey, usedOTPKeyId };
}

/**
 * Perform X3DH as the responder (receiver of first message).
 * Uses our pre-keys to derive the same shared secret.
 */
export function x3dhRespond(
  senderIdentityKey: string,
  senderEphemeralKey: string,
  usedOTPKeyId: number,
): RatchetState {
  const ourIdentityPrivate = getOurIdentityPrivate();
  const ourSignedPreKeyPrivate = getOurSignedPreKeyPrivate();

  // DH1: their identity key × our signed pre-key
  const dh1 = ecdhSecret(ourSignedPreKeyPrivate, senderIdentityKey);
  // DH2: their ephemeral key × our identity key
  const dh2 = ecdhSecret(ourIdentityPrivate, senderEphemeralKey);
  // DH3: their ephemeral key × our signed pre-key
  const dh3 = ecdhSecret(ourSignedPreKeyPrivate, senderEphemeralKey);

  let masterSecret: Buffer;
  if (usedOTPKeyId >= 0) {
    const otpSecret = consumeOneTimePreKey(usedOTPKeyId, senderEphemeralKey);
    if (otpSecret) {
      masterSecret = Buffer.concat([dh1, dh2, dh3, otpSecret]);
      otpSecret.fill(0);
    } else {
      // OTP key already consumed or missing — fall back to 3-DH
      masterSecret = Buffer.concat([dh1, dh2, dh3]);
    }
  } else {
    masterSecret = Buffer.concat([dh1, dh2, dh3]);
  }

  dh1.fill(0);
  dh2.fill(0);
  dh3.fill(0);

  const { newRootKey, sendChainKey } = deriveRootKey(
    Buffer.alloc(32),
    masterSecret,
  );
  masterSecret.fill(0);

  // Generate our ephemeral for future ratchet steps
  const ephemeral = generateEphemeralKeypair();

  // Derive receiving chain key from a DH ratchet step
  const dhRatchet = ecdhSecret(ephemeral.privateKey, senderEphemeralKey);
  const { newRootKey: rootKey2, sendChainKey: recvChainKey } = deriveRootKey(newRootKey, dhRatchet);
  dhRatchet.fill(0);

  return {
    rootKey: rootKey2.toString('base64'),
    sendChainKey: sendChainKey.toString('base64'),
    recvChainKey: recvChainKey.toString('base64'),
    ourEphemeralPrivate: ephemeral.privateKey,
    ourEphemeralPublic: ephemeral.publicKey,
    theirEphemeralPublic: senderEphemeralKey,
    theirIdentityKey: senderIdentityKey,
    sendCounter: 0,
    recvCounter: 0,
  };
}

// ── Encrypt / Decrypt ──────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message for a recipient.
 * If no session exists, performs X3DH with the provided key bundle.
 */
export function e2eEncrypt(
  recipientUserId: string,
  plaintext: string,
  recipientBundle?: RecipientKeyBundle,
): E2EEncryptedEnvelope {
  let session = sessions.get(recipientUserId);
  let ephemeralPublicKey: string;
  let usedOTPKeyId = -1;

  if (!session) {
    if (!recipientBundle) {
      throw new Error('No session exists and no recipient key bundle provided');
    }
    const x3dh = x3dhInitiate(recipientBundle);
    session = x3dh.session;
    ephemeralPublicKey = x3dh.ephemeralPublicKey;
    usedOTPKeyId = x3dh.usedOTPKeyId;
    sessions.set(recipientUserId, session);
  } else {
    ephemeralPublicKey = session.ourEphemeralPublic;
  }

  // Derive message key from sending chain
  const chainKey = Buffer.from(session.sendChainKey, 'base64');
  const { messageKey, nextChainKey } = deriveChainKey(chainKey);

  // Update chain state
  session.sendChainKey = nextChainKey.toString('base64');
  const messageNumber = session.sendCounter++;
  saveSessions();

  // Encrypt with AES-256-GCM
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', messageKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const ctWithTag = Buffer.concat([encrypted, tag]);

  // Zero out key material
  messageKey.fill(0);

  return {
    v: 2,
    did: getDeviceId(),
    ik: getIdentityPublicKey(),
    ek: ephemeralPublicKey,
    opk: usedOTPKeyId,
    ct: ctWithTag.toString('base64'),
    iv: iv.toString('base64'),
    n: messageNumber,
  };
}

/**
 * Decrypt an E2E encrypted message from a sender.
 * If no session exists, performs X3DH respond to establish one.
 */
export function e2eDecrypt(
  senderUserId: string,
  envelope: E2EEncryptedEnvelope,
): string {
  let session = sessions.get(senderUserId);

  if (!session) {
    // First message from this sender — perform X3DH as responder
    session = x3dhRespond(envelope.ik, envelope.ek, envelope.opk);
    sessions.set(senderUserId, session);
    saveSessions();
  }

  // Check if we need a DH ratchet step (their ephemeral key changed)
  if (envelope.ek !== session.theirEphemeralPublic && session.recvChainKey) {
    // DH ratchet: derive new receiving chain
    const dhSecret = ecdhSecret(session.ourEphemeralPrivate, envelope.ek);
    const rootKey = Buffer.from(session.rootKey, 'base64');
    const { newRootKey, sendChainKey: newRecvChainKey } = deriveRootKey(rootKey, dhSecret);
    dhSecret.fill(0);

    session.rootKey = newRootKey.toString('base64');
    session.recvChainKey = newRecvChainKey.toString('base64');
    session.theirEphemeralPublic = envelope.ek;
    session.recvCounter = 0;

    // Also generate new ephemeral for our next send
    const newEph = generateEphemeralKeypair();
    const dhSecret2 = ecdhSecret(newEph.privateKey, envelope.ek);
    const { newRootKey: rk2, sendChainKey: newSendChainKey } = deriveRootKey(
      Buffer.from(session.rootKey, 'base64'),
      dhSecret2,
    );
    dhSecret2.fill(0);

    session.rootKey = rk2.toString('base64');
    session.sendChainKey = newSendChainKey.toString('base64');
    session.ourEphemeralPrivate = newEph.privateKey;
    session.ourEphemeralPublic = newEph.publicKey;
    session.sendCounter = 0;
  }

  // Derive message key from receiving chain
  const recvChainKey = session.recvChainKey || session.sendChainKey;
  const chainKey = Buffer.from(recvChainKey, 'base64');
  const { messageKey, nextChainKey } = deriveChainKey(chainKey);

  // Advance the chain for the number of skipped messages
  // (simplified: we advance one step per message)
  if (session.recvChainKey) {
    session.recvChainKey = nextChainKey.toString('base64');
  }
  session.recvCounter++;
  saveSessions();

  // Decrypt AES-256-GCM
  const ctWithTag = Buffer.from(envelope.ct, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = ctWithTag.subarray(ctWithTag.length - TAG_LENGTH);
  const ciphertext = ctWithTag.subarray(0, ctWithTag.length - TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', messageKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  messageKey.fill(0);

  return decrypted.toString('utf8');
}

// ── Session Management ─────────────────────────────────────────────────────────

export function hasSession(userId: string): boolean {
  return sessions.has(userId);
}

export function clearSession(userId: string): void {
  sessions.delete(userId);
  saveSessions();
}

export function clearAllSessions(): void {
  sessions.clear();
  const filePath = getSessionsFilePath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// ── Private Key Accessors (from e2e-keys module) ────────────────────────────────

function getOurIdentityPrivate(): string {
  // We need the private key for X3DH — read from the key storage
  const keysFile = path.join(app.getPath('userData'), 'e2e-keys.bin');
  const encrypted = fs.readFileSync(keysFile);
  const json = safeStorage.decryptString(encrypted);
  const keys = JSON.parse(json);
  return keys.identityPrivateKey;
}

function getOurSignedPreKeyPrivate(): string {
  const keysFile = path.join(app.getPath('userData'), 'e2e-keys.bin');
  const encrypted = fs.readFileSync(keysFile);
  const json = safeStorage.decryptString(encrypted);
  const keys = JSON.parse(json);
  return keys.signedPreKeyPrivate;
}
