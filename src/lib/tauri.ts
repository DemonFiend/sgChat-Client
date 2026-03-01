/**
 * Tauri Store utilities - async replacement for localStorage
 * Uses @tauri-apps/plugin-store for persistent key-value storage
 */

import { LazyStore } from '@tauri-apps/plugin-store';

let store: LazyStore | null = null;

function getStore(): LazyStore {
  if (!store) {
    store = new LazyStore('sgchat-settings.json', { autoSave: true });
  }
  return store;
}

/**
 * Check if running inside a Tauri webview
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Get a value from the Tauri store
 */
export async function tauriGet<T>(key: string, defaultValue: T): Promise<T> {
  if (!isTauri()) {
    // Fallback to localStorage for development in browser
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  try {
    const s = getStore();
    const value = await s.get<T>(key);
    return value !== null && value !== undefined ? value : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a value in the Tauri store
 */
export async function tauriSet<T>(key: string, value: T): Promise<void> {
  if (!isTauri()) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
    return;
  }

  try {
    const s = getStore();
    await s.set(key, value);
  } catch (err) {
    console.error('Failed to save to Tauri store:', err);
  }
}

/**
 * Delete a key from the Tauri store
 */
export async function tauriDelete(key: string): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(key);
    return;
  }

  try {
    const s = getStore();
    await s.delete(key);
  } catch (err) {
    console.error('Failed to delete from Tauri store:', err);
  }
}
