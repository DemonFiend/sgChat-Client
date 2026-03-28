/**
 * SSE (Server-Sent Events) Gateway — fallback transport when Socket.IO
 * WebSocket connection fails or is unreliable.
 *
 * SSE is one-directional (server -> client only). Client -> server actions
 * still use the REST API via IPC.
 *
 * ## Server endpoint required
 * This module expects the server to expose:
 *   GET /api/events/stream  (text/event-stream)
 *     - Query param: ?token=<jwt>
 *     - Each SSE message: `event: <type>\ndata: <json payload>\n\n`
 *     - Types mirror the Socket.IO envelope `type` field (e.g. "message.new")
 *
 * If the server does not yet implement this endpoint, the SSE gateway will
 * fail to connect gracefully and remain dormant.
 */

import { handleEvent, getLastEventTimestamp, setLastEventTimestamp } from '../api/socket';

const electronAPI = (window as unknown as { electronAPI: Record<string, unknown> }).electronAPI as {
  auth: { getSocketToken: () => Promise<{ token: string; serverUrl: string }> };
};

// ── Types ────────────────────────────────────────────────────────

export type SSEGatewayState = 'inactive' | 'connecting' | 'connected' | 'error';

type StateChangeCallback = (state: SSEGatewayState) => void;

// ── Module state ─────────────────────────────────────────────────

let eventSource: EventSource | null = null;
let state: SSEGatewayState = 'inactive';
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let stateListeners: StateChangeCallback[] = [];

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 2_000;

// ── Public API ───────────────────────────────────────────────────

/** Current SSE gateway state. */
export function getSSEState(): SSEGatewayState {
  return state;
}

/** Subscribe to state changes. Returns unsubscribe function. */
export function onSSEStateChange(cb: StateChangeCallback): () => void {
  stateListeners.push(cb);
  return () => {
    stateListeners = stateListeners.filter((l) => l !== cb);
  };
}

/**
 * Activate the SSE fallback gateway.
 * Called when Socket.IO has failed to connect after multiple retries.
 */
export async function activateSSE(): Promise<void> {
  if (eventSource) return; // Already active

  setState('connecting');
  reconnectAttempts = 0;

  await connect();
}

/**
 * Deactivate the SSE fallback gateway.
 * Called when Socket.IO reconnects successfully.
 */
export function deactivateSSE(): void {
  cleanup();
  setState('inactive');
  reconnectAttempts = 0;
}

/** Whether the SSE gateway is currently active (connecting or connected). */
export function isSSEActive(): boolean {
  return state === 'connecting' || state === 'connected';
}

// ── Internal ─────────────────────────────────────────────────────

function setState(next: SSEGatewayState): void {
  if (state === next) return;
  state = next;
  for (const cb of stateListeners) {
    try { cb(next); } catch { /* swallow listener errors */ }
  }
}

async function connect(): Promise<void> {
  cleanup();

  let token: string;
  let serverUrl: string;

  try {
    const creds = await electronAPI.auth.getSocketToken();
    token = creds.token;
    serverUrl = creds.serverUrl;
    if (!token || !serverUrl) {
      setState('error');
      return;
    }
  } catch {
    setState('error');
    scheduleReconnect();
    return;
  }

  // Build SSE URL with auth token as query param
  const base = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  const lastTs = getLastEventTimestamp();
  const params = new URLSearchParams({ token });
  if (lastTs > 0) {
    params.set('since', String(lastTs));
  }
  const sseUrl = `${base}/api/events/stream?${params.toString()}`;

  try {
    eventSource = new EventSource(sseUrl);
  } catch {
    setState('error');
    scheduleReconnect();
    return;
  }

  eventSource.onopen = () => {
    setState('connected');
    reconnectAttempts = 0;
  };

  eventSource.onerror = () => {
    // EventSource auto-reconnects, but if it hits a permanent error
    // (e.g. 401, 404) readyState goes to CLOSED
    if (eventSource?.readyState === EventSource.CLOSED) {
      setState('error');
      cleanup();
      scheduleReconnect();
    }
  };

  // Listen for the generic "event" SSE event (matches socket envelope bus)
  eventSource.addEventListener('event', (e: MessageEvent) => {
    try {
      const envelope = JSON.parse(e.data) as {
        type: string;
        payload: unknown;
        timestamp?: number;
      };

      // Track timestamp for resync
      if (envelope.timestamp) {
        setLastEventTimestamp(envelope.timestamp);
      }

      handleEvent(envelope.type, envelope.payload);
    } catch (err) {
      console.warn('[sseGateway] Failed to parse SSE event:', err);
    }
  });

  // Some servers may use named events matching the event type directly
  eventSource.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as {
        type?: string;
        payload?: unknown;
        timestamp?: number;
      };

      if (data.type) {
        if (data.timestamp) {
          setLastEventTimestamp(data.timestamp);
        }
        handleEvent(data.type, data.payload ?? data);
      }
    } catch {
      // Ignore unparseable messages
    }
  };
}

function cleanup(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.onopen = null;
    eventSource.onerror = null;
    eventSource.onmessage = null;
    eventSource.close();
    eventSource = null;
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  if (state === 'inactive') return; // Was explicitly deactivated

  reconnectAttempts++;
  const delay = Math.min(
    BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1),
    MAX_RECONNECT_DELAY_MS,
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (state !== 'inactive') {
      setState('connecting');
      connect();
    }
  }, delay);
}
