// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number;
  page?: number;
  limit?: number;
}

// ============================================
// Location Types
// ============================================

export type LocationStatus = 'pending' | 'approved' | 'denied';

export interface Location {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  status: LocationStatus;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateLocationRequest {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
}

export interface UpdateLocationStatusRequest {
  id: string;
  status: 'approved' | 'denied';
}

export interface DeleteLocationRequest {
  id: string;
}

// ============================================
// Live Location Types
// ============================================

export interface LiveLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  profile?: {
    display_name: string | null;
  };
}

export interface UpdateLiveLocationRequest {
  latitude: number;
  longitude: number;
}

// ============================================
// Auth Types
// ============================================

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface CheckAdminResponse {
  isAdmin: boolean;
}

// ============================================
// Validation Schemas (using Zod-like structure)
// ============================================

export const LocationValidation = {
  name: {
    min: 1,
    max: 100,
    required: true,
  },
  description: {
    max: 500,
    required: false,
  },
  latitude: {
    min: -90,
    max: 90,
    required: true,
  },
  longitude: {
    min: -180,
    max: 180,
    required: true,
  },
};

export function validateCreateLocation(data: CreateLocationRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < LocationValidation.name.min) {
    errors.push('Name is required');
  }
  if (data.name && data.name.length > LocationValidation.name.max) {
    errors.push(`Name must be less than ${LocationValidation.name.max} characters`);
  }
  if (data.description && data.description.length > LocationValidation.description.max) {
    errors.push(`Description must be less than ${LocationValidation.description.max} characters`);
  }
  if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) {
    errors.push('Invalid latitude');
  }
  if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) {
    errors.push('Invalid longitude');
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateLiveLocation(data: UpdateLiveLocationRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90) {
    errors.push('Invalid latitude');
  }
  if (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180) {
    errors.push('Invalid longitude');
  }

  return { valid: errors.length === 0, errors };
}
