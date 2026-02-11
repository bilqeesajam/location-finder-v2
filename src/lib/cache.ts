/**
 * Client-side Cache Utility
 * Provides in-memory and localStorage caching with TTL support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

class ClientCache {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private useLocalStorage = true;

  constructor() {
    // Check if localStorage is available
    try {
      const test = '__cache_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
    } catch {
      this.useLocalStorage = false;
      console.warn('localStorage not available - using in-memory cache only');
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry && !this.isExpired(memEntry)) {
      return memEntry.data;
    }

    // Check localStorage
    if (this.useLocalStorage) {
      try {
        const stored = localStorage.getItem(`cache:${key}`);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (!this.isExpired(entry)) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
          }
          // Expired, remove it
          this.delete(key);
        }
      } catch (error) {
        console.error(`Error reading cache for key ${key}:`, error);
      }
    }

    return null;
  }

  /**
   * Set value in cache with TTL (milliseconds)
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store in localStorage if available
    if (this.useLocalStorage) {
      try {
        localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
      } catch (error) {
        console.error(`Error caching key ${key}:`, error);
      }
    }
  }

  /**
   * Delete single cache entry
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    if (this.useLocalStorage) {
      try {
        localStorage.removeItem(`cache:${key}`);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Delete multiple cache entries by pattern
   */
  deleteByPattern(pattern: string): void {
    const regex = new RegExp(pattern);

    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear localStorage
    if (this.useLocalStorage) {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache:')) {
            const cacheKey = key.substring(6); // Remove 'cache:' prefix
            if (regex.test(cacheKey)) {
              localStorage.removeItem(key);
            }
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    if (this.useLocalStorage) {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith('cache:')) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

export const cache = new ClientCache();

/**
 * Cache key generators
 */
export const cacheKeys = {
  allLocations: () => 'locations:all',
  locationById: (id: string) => `locations:${id}`,
  allLiveLocations: () => 'live_locations:all',
  locationsByStatus: (status: string) => `locations:status:${status}`,
};

/**
 * TTL constants (in milliseconds)
 */
export const cacheTTL = {
  VERY_SHORT: 30 * 1000, // 30 seconds - for real-time data
  SHORT: 2 * 60 * 1000, // 2 minutes - for frequently changing data
  MEDIUM: 5 * 60 * 1000, // 5 minutes - default
  LONG: 1 * 60 * 60 * 1000, // 1 hour - for static data
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours - for rarely changing data
};
