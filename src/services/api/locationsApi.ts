import { callEdgeFunction } from './baseApi';
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
 * Handles all location-related API calls through Edge Functions
 */
export const locationsApi = {
  /**
   * Get all locations (respects RLS - admins see all, users see approved + own)
   */
  async getAll(): Promise<ApiResponse<Location[]>> {
    return callEdgeFunction<Location[]>('locations', {
      method: 'GET',
    });
  },

  /**
   * Get a single location by ID
   */
  async getById(id: string): Promise<ApiResponse<Location>> {
    return callEdgeFunction<Location>('locations', {
      method: 'GET',
      params: { id },
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

    return callEdgeFunction<Location>('locations', {
      method: 'POST',
      body: {
        action: 'create',
        ...data,
      },
    });
  },

  /**
   * Update location status (admin only)
   */
  async updateStatus(data: UpdateLocationStatusRequest): Promise<ApiResponse<Location>> {
    return callEdgeFunction<Location>('locations', {
      method: 'POST',
      body: {
        action: 'updateStatus',
        ...data,
      },
    });
  },

  /**
   * Delete a location (admin only)
   */
  async delete(data: DeleteLocationRequest): Promise<ApiResponse<void>> {
    return callEdgeFunction<void>('locations', {
      method: 'POST',
      body: {
        action: 'delete',
        ...data,
      },
    });
  },
};
