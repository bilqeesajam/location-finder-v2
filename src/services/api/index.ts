/**
 * API Services - Central export point
 * 
 * All API calls should be made through these service modules.
 * Components should never call supabase directly for data operations.
 */

export { locationsApi } from './locationsApi';
export { liveLocationsApi } from './liveLocationsApi';
export { authApi } from './authApi';
export { callEdgeFunction, getAccessToken, handleApiError } from './baseApi';

// Re-export types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  Location,
  LocationStatus,
  CreateLocationRequest,
  UpdateLocationStatusRequest,
  DeleteLocationRequest,
  LiveLocation,
  UpdateLiveLocationRequest,
  UserProfile,
  UserRole,
  CheckAdminResponse,
} from '../types';
