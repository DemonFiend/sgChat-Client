/**
 * E2E Encryption Store — Renderer-side state for end-to-end encrypted DMs.
 *
 * This store does NOT hold private keys (those live in the main process).
 * It tracks: initialization status, device ID, key upload state, and
 * provides encrypt/decrypt actions via IPC.
 */

import { create } from 'zustand';

const electronAPI = (window as any).electronAPI;

interface E2EState {
  initialized: boolean;
  deviceId: string;
  keysUploaded: boolean;

  /** Initialize E2E keys in main process and upload bundle to server */
  init: () => Promise<void>;
  /** Upload current key bundle to server */
  uploadKeyBundle: () => Promise<void>;
  /** Check and replenish one-time pre-keys if running low */
  replenishOTPKeys: () => Promise<void>;
  /** Encrypt a DM message for a recipient */
  encryptMessage: (recipientUserId: string, plaintext: string) => Promise<any>;
  /** Decrypt a received E2E DM message */
  decryptMessage: (senderUserId: string, envelope: any) => Promise<string | null>;
}

const OTP_LOW_THRESHOLD = 20;

export const useE2EStore = create<E2EState>((set, get) => ({
  initialized: false,
  deviceId: '',
  keysUploaded: false,

  init: async () => {
    if (get().initialized) return;
    try {
      const result = await electronAPI.e2e.init();
      set({ initialized: true, deviceId: result.deviceId });
    } catch (err) {
      console.error('[e2e] Init failed:', err);
    }
  },

  uploadKeyBundle: async () => {
    try {
      const bundle = await electronAPI.e2e.getKeyBundle();
      await electronAPI.api.request('PUT', '/api/e2e/keys', {
        device_id: bundle.deviceId,
        device_label: bundle.deviceLabel,
        identity_key: bundle.identityKey,
        signed_pre_key: bundle.signedPreKey,
        signed_pre_key_signature: bundle.signedPreKeySignature,
        signed_pre_key_id: bundle.signedPreKeyId,
        one_time_pre_keys: bundle.oneTimePreKeys.map((k: any) => ({
          key_id: k.keyId,
          public_key: k.publicKey,
        })),
      });
      set({ keysUploaded: true });
    } catch (err) {
      console.error('[e2e] Key bundle upload failed:', err);
    }
  },

  replenishOTPKeys: async () => {
    try {
      const localCount = await electronAPI.e2e.getLocalOTPCount();
      if (localCount < OTP_LOW_THRESHOLD) {
        const newKeys = await electronAPI.e2e.generateOTPKeys(100);
        await electronAPI.api.request('POST', '/api/e2e/keys/one-time', {
          keys: newKeys.map((k: any) => ({
            key_id: k.keyId,
            public_key: k.publicKey,
          })),
        });
      }
    } catch (err) {
      console.error('[e2e] OTP key replenishment failed:', err);
    }
  },

  encryptMessage: async (recipientUserId: string, plaintext: string) => {
    // Check if we have a session, if not fetch recipient's key bundle
    const hasSession = await electronAPI.e2e.hasSession(recipientUserId);
    let recipientBundle = undefined;

    if (!hasSession) {
      try {
        const res = await electronAPI.api.request('GET', `/api/e2e/keys/${recipientUserId}`);
        if (res && res.devices && res.devices.length > 0) {
          const device = res.devices[0]; // Use first device
          recipientBundle = {
            deviceId: device.device_id,
            identityKey: device.identity_key,
            signedPreKey: device.signed_pre_key,
            signedPreKeySignature: device.signed_pre_key_signature,
            signedPreKeyId: device.signed_pre_key_id,
            oneTimePreKey: device.one_time_pre_key ? {
              keyId: device.one_time_pre_key.key_id,
              publicKey: device.one_time_pre_key.public_key,
            } : undefined,
          };
        }
      } catch (err) {
        console.warn('[e2e] Could not fetch recipient keys:', err);
        return null;
      }
    }

    const result = await electronAPI.e2e.encrypt(recipientUserId, plaintext, recipientBundle);
    if (!result.ok) {
      console.error('[e2e] Encrypt failed:', result.error);
      return null;
    }
    return result.envelope;
  },

  decryptMessage: async (senderUserId: string, envelope: any) => {
    try {
      const result = await electronAPI.e2e.decrypt(senderUserId, envelope);
      if (!result.ok) {
        console.warn('[e2e] Decrypt failed:', result.error);
        return null;
      }
      return result.plaintext;
    } catch (err) {
      console.warn('[e2e] Decrypt error:', err);
      return null;
    }
  },
}));
