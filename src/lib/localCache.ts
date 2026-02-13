const PREFIX = "findr-cache:";

interface CachePayload<T> {
  value: T;
  expiresAt: number | null;
  updatedAt: string;
}

function storageKey(key: string) {
  return `${PREFIX}${key}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function readCache<T>(key: string): T | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachePayload<T>;
    if (
      parsed.expiresAt !== null &&
      Number.isFinite(parsed.expiresAt) &&
      Date.now() > parsed.expiresAt
    ) {
      window.localStorage.removeItem(storageKey(key));
      return null;
    }

    return parsed.value;
  } catch (error) {
    console.error("Failed to read cache", error);
    return null;
  }
}

export function writeCache<T>(key: string, value: T, ttlMs?: number) {
  if (!isBrowser()) return;

  try {
    const payload: CachePayload<T> = {
      value,
      expiresAt: typeof ttlMs === "number" ? Date.now() + ttlMs : null,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey(key), JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to write cache", error);
  }
}

export function removeCache(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(storageKey(key));
}
