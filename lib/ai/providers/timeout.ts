// Shared fetch wrapper with an abort-based timeout for every AI provider.
// Without it a hung provider (rare but real) pinned the request for minutes;
// the ping in the admin panel already had its own Promise.race, but the race
// loser kept the underlying socket open.
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Fetch that aborts when the deadline expires
 * @param url - Request URL
 * @param init - Standard fetch options
 * @param timeoutMs - Milliseconds before the request is aborted
 * @returns The fetch response
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  // Caller-provided signals win (e.g. request-scoped cancellation).
  if (init.signal) {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout após ${timeoutMs / 1000}s ao contatar o provedor`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
