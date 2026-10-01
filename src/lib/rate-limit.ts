/**
 * Minimal in-memory sliding-window rate limiter for API routes.
 * Per-instance only - good enough for "basic rate limiting" on simple hosts.
 */

const hits = new Map<string, number[]>();
const MAX_KEYS = 10000;

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();

  if (hits.size > MAX_KEYS) hits.clear();

  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);
  return false;
}

/**
 * Forgets a key's history. Call this after a *successful* attempt, otherwise a
 * user who logs in correctly `max` times in a row locks themselves out - the
 * limiter is meant to throttle failures, not successes.
 */
export function clearRateLimit(key: string): void {
  hits.delete(key);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}