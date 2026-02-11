import { callEdgeFunction } from './baseApi';
import { cache, cacheTTL } from '@/lib/cache';
import type { ApiResponse, LiveLocation, UpdateLiveLocationRequest } from '../types';
import { validateUpdateLiveLocation } from '../types';

/**
 * Live Locations API Service
 * Handles real-time location sharing through Edge Functions with caching
 */
export const liveLocationsApi = {
  /**
   * Get all live locations
   */
  async getAll(): Promise<ApiResponse<LiveLocation[]>> {
    return callEdgeFunction<LiveLocation[]>('live-locations', {
      method: 'GET',
      cache: true,
      cacheTtl: cacheTTL.VERY_SHORT, // 30 seconds (real-time data)
    });
  },

  /**
   * Update the current user's live location (upsert)
   */
  async update(data: UpdateLiveLocationRequest): Promise<ApiResponse<LiveLocation>> {
    // Client-side validation
    const validation = validateUpdateLiveLocation(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    const result = await callEdgeFunction<LiveLocation>('live-locations', {
      method: 'POST',
      body: {
        action: 'update',
        ...data,
      },
      cache: false, // Don't cache POST requests
    });

    // Invalidate live location caches on successful update
    if (result.success) {
      cache.deleteByPattern('live_locations:.*');
    }

    return result;
  },

  /**
   * Stop sharing location (delete current user's live location)
   */
  async stopSharing(): Promise<ApiResponse<void>> {
    const result = await callEdgeFunction<void>('live-locations', {
      method: 'POST',
      body: {
        action: 'delete',
      },
      cache: false, // Don't cache POST requests
    });

    // Invalidate live location caches on successful delete
    if (result.success) {
      cache.deleteByPattern('live_locations:.*');
    }

    return result;
  },
};
  },
};
