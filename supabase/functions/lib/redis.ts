import { createClient } from "https://esm.sh/redis@4.6.5/mod.ts";

interface RedisClientConfig {
  url: string;
}

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create Redis client
 * Uses connection pooling for efficiency
 */
export async function getRedisClient() {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const redisUrl = Deno.env.get("REDIS_URL");
  if (!redisUrl) {
    console.warn("REDIS_URL not configured - caching disabled");
    return null;
  }

  try {
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log("Redis client connected successfully");
    return redisClient;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    return null;
  }
}

/**
 *close Redis connection
 */
export async function closeRedisClient() {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log("Redis client closed");
    } catch (error) {
      console.error("Error closing Redis client:", error);
    }
  }
}

/**
 * Get value from cache
 */
export async function getCacheValue(key: string): Promise<string | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    return await client.get(key);
  } catch (error) {
    console.error(`Failed to get cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache with TTL (seconds)
 */
export async function setCacheValue(
  key: string,
  value: string | number,
  ttlSeconds: number = 300
): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    await client.setEx(key, ttlSeconds, String(value));
    return true;
  } catch (error) {
    console.error(`Failed to set cache for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function deleteCacheValue(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Failed to delete cache for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple cache keys by pattern
 */
export async function deleteCacheByPattern(pattern: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      console.log(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
    }
    return true;
  } catch (error) {
    console.error(`Failed to delete cache by pattern ${pattern}:`, error);
    return false;
  }
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  allLocations: () => "locations:all",
  locationById: (id: string) => `locations:${id}`,
  allLiveLocations: () => "live_locations:all",
  liveLocationsByUser: (userId: string) => `live_locations:user:${userId}`,
};
