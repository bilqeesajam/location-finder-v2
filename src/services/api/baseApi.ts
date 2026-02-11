import { supabase } from '@/integrations/supabase/client';
import { cache, cacheTTL } from '@/lib/cache';
import type { ApiResponse } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Get the current session's access token
 */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Get common headers for Edge Function calls
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Generate cache key for edge function call
 */
function generateCacheKey(functionName: string, params?: Record<string, string>): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${functionName}:${paramStr}`;
}

/**
 * Call a Supabase Edge Function with caching support
 */
export async function callEdgeFunction<T>(
  functionName: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    params?: Record<string, string>;
    cache?: boolean; // Enable caching for this call
    cacheTtl?: number; // Custom TTL in milliseconds
  } = {}
): Promise<ApiResponse<T>> {
  const { method = 'POST', body, params, cache: enableCache = true, cacheTtl = cacheTTL.MEDIUM } = options;

  // Only cache GET requests
  const shouldCache = enableCache && method === 'GET';
  const cacheKey = generateCacheKey(functionName, params);

  // Check cache first
  if (shouldCache) {
    const cachedData = cache.get<ApiResponse<T>>(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for ${functionName}`);
      return cachedData;
    }
  }

  try {
    const headers = await getAuthHeaders();
    
    let url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const result: ApiResponse<T> = {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
      };
      return result;
    }

    const result: ApiResponse<T> = {
      success: true,
      data: data.data ?? data,
      message: data.message,
    };

    // Cache successful GET responses
    if (shouldCache && result.success) {
      cache.set(cacheKey, result, cacheTtl);
    }

    return result;
  } catch (error) {
    console.error(`Edge function ${functionName} error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
