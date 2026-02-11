import { callEdgeFunction } from './baseApi';
import { cache, cacheKeys, cacheTTL } from '@/lib/cache';
import type {
  ApiResponse,
  Location,
  CreateLocationRequest,
  UpdateLocationStatusRequest,
  DeleteLocationRequest,
} from '../types';
import { validateCreateLocation } from '../types';

/**
 * Locations API Service
 * Handles all location-related API calls through Edge Functions with caching
 */
export const locationsApi = {
  /**
   * Get all locations (respects RLS - admins see all, users see approved + own)
   */
  async getAll(): Promise<ApiResponse<Location[]>> {
    return callEdgeFunction<Location[]>('locations', {
      method: 'GET',
      cache: true,
      cacheTtl: cacheTTL.MEDIUM, // 5 minutes
    });
  },

  /**
   * Get a single location by ID
   */
  async getById(id: string): Promise<ApiResponse<Location>> {
    return callEdgeFunction<Location>('locations', {
      method: 'GET',
      params: { id },
      cache: true,
      cacheTtl: cacheTTL.LONG, // 1 hour
    });
  },

  /**
   * Create a new location
   */
  async create(data: CreateLocationRequest): Promise<ApiResponse<Location>> {
    // Client-side validation
    const validation = validateCreateLocation(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    const result = await callEdgeFunction<Location>('locations', {
      method: 'POST',
      body: {
        action: 'create',
        ...data,
      },
      cache: false, // Don't cache POST requests
    });

    // Invalidate location caches on successful creation
    if (result.success) {
      cache.deleteByPattern('locations:.*');
    }

    return result;
  },

  /**
   * Update location status (admin only)
   */
  async updateStatus(data: UpdateLocationStatusRequest): Promise<ApiResponse<Location>> {
    const result = await callEdgeFunction<Location>('locations', {
      method: 'POST',
      body: {
        action: 'updateStatus',
        ...data,
      },
      cache: false, // Don't cache POST requests
    });

    // Invalidate location caches on successful update
    if (result.success) {
      cache.deleteByPattern('locations:.*');
    }

    return result;
  },

  /**
   * Delete a location (admin only)
   */
  async delete(data: DeleteLocationRequest): Promise<ApiResponse<void>> {
    const result = await callEdgeFunction<void>('locations', {
      method: 'POST',
      body: {
        action: 'delete',
        ...data,
      },
      cache: false, // Don't cache POST requests
    });

    // Invalidate location caches on successful delete
    if (result.success) {
      cache.deleteByPattern('locations:.*');
    }

    return result;
  },
};
