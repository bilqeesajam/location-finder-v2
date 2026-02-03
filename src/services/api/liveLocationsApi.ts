import { callEdgeFunction } from './baseApi';
import type { ApiResponse, LiveLocation, UpdateLiveLocationRequest } from '../types';
import { validateUpdateLiveLocation } from '../types';

/**
 * Live Locations API Service
 * Handles real-time location sharing through Edge Functions
 */
export const liveLocationsApi = {
  /**
   * Get all live locations
   */
  async getAll(): Promise<ApiResponse<LiveLocation[]>> {
    return callEdgeFunction<LiveLocation[]>('live-locations', {
      method: 'GET',
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

    return callEdgeFunction<LiveLocation>('live-locations', {
      method: 'POST',
      body: {
        action: 'update',
        ...data,
      },
    });
  },

  /**
   * Stop sharing location (delete current user's live location)
   */
  async stopSharing(): Promise<ApiResponse<void>> {
    return callEdgeFunction<void>('live-locations', {
      method: 'POST',
      body: {
        action: 'delete',
      },
    });
  },
};
