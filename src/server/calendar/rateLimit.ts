export type BusyInterval = { start: string; end: string };

type CachedBusy = {
  from: number;
  to: number;
  busy: BusyInterval[];
  expiresAt: number;
};

const WINDOW_MS = 60_000;
// Longest availability range a client may request, shared with the browser.
export const MAX_BUSY_RANGE_MS = 60 * 24 * 60 * 60_000;

// In memory, because Kennel runs one app instance per environment.
export function createBusyLimiter({ perUser = 10, global = 1_000 } = {}) {
  let window = -1;
  let globalCount = 0;
  const userCounts = new Map<string, number>();
  const cache = new Map<string, CachedBusy>();

  function roll(now: number) {
    const current = Math.floor(now / WINDOW_MS);
    if (current === window) return;
    window = current;
    globalCount = 0;
    userCounts.clear();
    for (const [userId, entry] of cache)
      if (entry.expiresAt <= now) cache.delete(userId);
  }

  return {
    acquire(userId: string, now: number): boolean {
      roll(now);
      const count = userCounts.get(userId) ?? 0;
      if (count >= perUser || globalCount >= global) return false;
      userCounts.set(userId, count + 1);
      globalCount++;
      return true;
    },
    cached(userId: string, from: number, to: number, now: number) {
      const entry = cache.get(userId);
      if (!entry || entry.expiresAt <= now) return null;
      return entry.from <= from && entry.to >= to ? entry.busy : null;
    },
    store(
      userId: string,
      from: number,
      to: number,
      busy: BusyInterval[],
      now: number,
    ) {
      cache.set(userId, { from, to, busy, expiresAt: now + WINDOW_MS });
    },
  };
}
