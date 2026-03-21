import { api } from './api';
import { networkStore, type RelayServer } from '../stores/networkStore';

// ── Types ────────────────────────────────────────────────────────

interface PingResult {
  relayId: string;
  latencyMs: number;
}

// ── Config ───────────────────────────────────────────────────────

const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PING_SAMPLES = 3;
const PING_TIMEOUT_MS = 5000;

// ── Module State ─────────────────────────────────────────────────

let pingTimer: ReturnType<typeof setInterval> | null = null;

// ── Ping Logic ───────────────────────────────────────────────────

/** Ping a single relay health URL and return latency in ms */
async function pingRelay(healthUrl: string): Promise<number | null> {
  try {
    const start = performance.now();
    const res = await fetch(healthUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return Math.round(performance.now() - start);
  } catch {
    return null;
  }
}

/** Measure average latency to a relay over multiple samples */
async function measureRelay(healthUrl: string): Promise<number | null> {
  const samples: number[] = [];
  for (let i = 0; i < PING_SAMPLES; i++) {
    const latency = await pingRelay(healthUrl);
    if (latency !== null) samples.push(latency);
  }
  if (samples.length === 0) return null;
  return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
}

/** Fetch relay list, ping each, store results, report to server */
async function runPingCycle(): Promise<void> {
  try {
    const relays = await api.getArray<RelayServer>('/relays');
    if (relays.length === 0) return;

    // Update store with fresh relay list
    networkStore.setRelays(relays);

    // Filter to pingable relays (those with a health URL)
    const pingable = relays.filter((r) => r.health_url);

    const measurements = await Promise.all(
      pingable.map(async (relay) => {
        const latency = await measureRelay(relay.health_url!);
        return { relayId: relay.id, latency };
      }),
    );

    const results: PingResult[] = [];
    const pingUpdates: Record<string, number> = {};

    for (const { relayId, latency } of measurements) {
      if (latency !== null) {
        pingUpdates[relayId] = latency;
        results.push({ relayId, latencyMs: latency });
      }
    }

    // Batch-update the store
    if (Object.keys(pingUpdates).length > 0) {
      networkStore.updatePings(pingUpdates);
    }

    // Report pings to the server (non-critical)
    if (results.length > 0) {
      try {
        await api.post('/relays/ping-report', { pings: results });
      } catch {
        // Server may be temporarily unavailable — skip
      }
    }
  } catch {
    // Relay list fetch failed — skip this cycle
  }
}

// ── Public API ───────────────────────────────────────────────────

/** Start the periodic relay ping measurement service */
export function startRelayPingService(): void {
  if (pingTimer) return; // Already running

  // Run immediately, then every 5 minutes
  runPingCycle();
  pingTimer = setInterval(runPingCycle, PING_INTERVAL_MS);
}

/** Stop the ping service and clear cached results */
export function stopRelayPingService(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

/** Get current ping results from the network store */
export function getRelayPings(): Record<string, number> {
  return networkStore.pings();
}
