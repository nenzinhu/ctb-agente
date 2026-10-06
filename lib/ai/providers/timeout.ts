// Shared fetch wrapper with an abort-based timeout for every AI provider.
// Without it a hung provider (rare but real) pinned the request for minutes;
// the ping in the admin panel already had its own Promise.race, but the race
// loser kept the underlying socket open.
const DEFAULT_TIMEOUT_MS = 20_000;

let configuredTimeoutMs: number | null = null;
let timeoutCacheTs = 0;
const TIMEOUT_CACHE_TTL = 60_000;

async function getTimeoutMs(): Promise<number> {
  const now = Date.now();
  if (configuredTimeoutMs !== null && now - timeoutCacheTs < TIMEOUT_CACHE_TTL) {
    return configuredTimeoutMs;
  }
  try {
    const { getSettings } = await import('../../config/settings');
    const s = await getSettings();
    configuredTimeoutMs = s.providerTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  } catch {
    configuredTimeoutMs = DEFAULT_TIMEOUT_MS;
  }
  timeoutCacheTs = now;
  return configuredTimeoutMs;
}

export function invalidateTimeoutCache(): void {
  configuredTimeoutMs = null;
}

/**
 * Fetch that aborts when the deadline expires. When no explicit timeout is
 * passed, reads the configured provider timeout from settings.
 * @param url - Request URL
 * @param init - Standard fetch options
 * @param timeoutMs - Optional explicit timeout (overrides settings)
 * @returns The fetch response
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs?: number
): Promise<Response> {
  // Caller-provided signals win (e.g. request-scoped cancellation).
  if (init.signal) {
    return fetch(url, init);
  }

  const ms = timeoutMs ?? (await getTimeoutMs());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout após ${ms / 1000}s ao contatar o provedor`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
