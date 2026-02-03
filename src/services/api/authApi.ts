import { callEdgeFunction } from './baseApi';
import type { ApiResponse, CheckAdminResponse, UserProfile } from '../types';

/**
 * Auth API Service
 * Handles authentication-related API calls
 */
export const authApi = {
  /**
   * Check if the current user has admin role
   */
  async checkAdmin(): Promise<ApiResponse<CheckAdminResponse>> {
    return callEdgeFunction<CheckAdminResponse>('auth', {
      method: 'POST',
      body: {
        action: 'checkAdmin',
      },
    });
  },

  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return callEdgeFunction<UserProfile>('auth', {
      method: 'POST',
      body: {
        action: 'getProfile',
      },
    });
  },

  /**
   * Update the current user's profile
   */
  async updateProfile(data: { display_name?: string; avatar_url?: string }): Promise<ApiResponse<UserProfile>> {
    return callEdgeFunction<UserProfile>('auth', {
      method: 'POST',
      body: {
        action: 'updateProfile',
        ...data,
      },
    });
  },
};
