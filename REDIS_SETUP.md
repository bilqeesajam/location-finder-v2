# Redis Caching Setup Guide

## Overview

This project uses Redis for caching API responses to improve performance and reduce database queries. Redis caching has been implemented for:

1. **Locations API** (`/functions/locations`)
   - GET /locations (all locations) - 5 minute TTL
   - GET /locations?id=xxx (single location) - 1 hour TTL
   - Cache invalidation on CREATE/UPDATE/DELETE operations

2. **Live Locations API** (`/functions/live-locations`)
   - GET /live-locations (all active locations) - 2 minute TTL
   - Cache invalidation on UPDATE/DELETE operations

3. **MapTiler Key API** (`/functions/get-maptiler-key`)
   - GET /get-maptiler-key (API key retrieval) - 24 hour TTL

## Environment Setup

### 1. Install Redis

#### Local Development (Recommended for testing)
```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# Windows (using WSL2)
sudo apt-get install redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

#### Production
Use a managed Redis service like:
- **Upstash Redis** (Serverless, works great with Deno Deploy)
- **Redis Cloud** (Free tier available)
- **AWS ElastiCache**
- **Azure Cache for Redis**

### 2. Configure REDIS_URL Environment Variable

Add the `REDIS_URL` environment variable to your Supabase Edge Functions:

```
supabase secrets set REDIS_URL="redis://localhost:6379"
```

Or for a remote Redis service:
```
supabase secrets set REDIS_URL="redis://:password@host:port"
```

Example using Upstash Redis (recommended):
```
supabase secrets set REDIS_URL="redis://:default:xxx@xxx.upstash.io:6379"
```

### 3. Verify Configuration

Test the Redis connection:
```bash
# Local Redis
redis-cli ping
# Expected output: PONG

# Remote Redis - using curl or similar tool
curl -X GET https://your-api.dev/functions/v1/locations
# Check console logs for "Redis client connected successfully"
```

## Cache Keys Reference

The following cache keys are used throughout the application:

```typescript
// In lib/redis.ts
cacheKeys = {
  allLocations: () => "locations:all",
  locationById: (id: string) => `locations:${id}`,
  allLiveLocations: () => "live_locations:all",
  liveLocationsByUser: (userId: string) => `live_locations:user:${userId}`,
};
```

## Cache TTL Strategy

| Endpoint | Cache Key | TTL | Reason |
|----------|-----------|-----|--------|
| GET /locations | `locations:all` | 5 min | Changes moderately frequently |
| GET /locations?id=id | `locations:id` | 1 hour | Single location rarely changes |
| GET /live-locations | `live_locations:all` | 2 min | Real-time data, frequent updates |
| GET /get-maptiler-key | `maptiler:key` | 24 hours | Static configuration value |

## Cache Invalidation

When data is modified (CREATE, UPDATE, DELETE), the relevant cache entries are automatically cleared:

```typescript
// Locations function
await deleteCacheByPattern('locations:*'); // Clears all location caches

// Live-locations function
await deleteCacheByPattern('live_locations:*'); // Clears all live location caches
```

## Redis API Reference

### Available Functions (from `lib/redis.ts`)

```typescript
// Get or create Redis client (with auto-reconnection)
const client = await getRedisClient(): Promise<RedisClient | null>

// Get cached value
const value = await getCacheValue(key: string): Promise<string | null>

// Set cached value with TTL (seconds)
await setCacheValue(key: string, value: string | number, ttlSeconds: number): Promise<boolean>

// Delete single cache entry
await deleteCacheValue(key: string): Promise<boolean>

// Delete multiple entries by pattern
await deleteCacheByPattern(pattern: string): Promise<boolean>
```

## Monitoring & Debugging

### Check Redis Memory Usage
```bash
redis-cli info memory
```

### Monitor Cache Keys
```bash
redis-cli keys "*"
```

### Monitor Real-time Operations
```bash
# Terminal 1: Monitor all Redis commands
redis-cli monitor

# Terminal 2: Run API requests
curl -X GET https://your-api.dev/functions/v1/locations
```

### View Cache Logs
Check Supabase Edge Functions logs:
```bash
supabase functions logs locations --follow
```

Look for:
- "Cache hit for..." - Successful cache retrieval
- "Cache miss..." - Database query performed
- "Redis client connected successfully" - Connection established

## Performance Benefits

With Redis caching enabled:

| Metric | Without Cache | With Cache |
|--------|---------------|-----------|
| Locations GET latency | ~200-500ms | ~5-50ms |
| Database queries | Every request | ~12/hour (with 5min TTL) |
| Server load | High | Reduced by 80%+ |
| User experience | Slower | Faster |

## Fallback Behavior

If Redis is unavailable:
- The application will automatically fall back to direct database queries
- Check logs for: `"REDIS_URL not configured - caching disabled"`
- Performance will degrade but API will continue working

**Important:** Always test with Redis available during development to ensure cache logic is working correctly.

## Troubleshooting

### "REDIS_URL not configured - caching disabled"
- Set the `REDIS_URL` environment variable
- Verify format: `redis://[user:password@]host:port`

### "Failed to connect to Redis"
- Check Redis server is running: `redis-cli ping`
- Verify firewall/network connectivity
- Check credentials in REDIS_URL

### High memory usage in Redis
- Implement key expiration policies
- Monitor TTL values
- Consider increasing Redis memory limit

### Cache is stale
- Reduce TTL values in `index.ts` files
- Verify cache invalidation happens on updates
- Check Redis key patterns: `redis-cli keys "*"`

## Future Enhancements

Potential improvements:
1. **Implement cache warming** - Pre-populate frequently accessed data on startup
2. **Add analytics** - Track cache hit/miss ratios
3. **Implement cache versioning** - Handle schema changes gracefully
4. **Add user-specific caching** - Cache per-user view of data
5. **Implement cache compression** - Reduce memory usage for large datasets
