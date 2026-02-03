/**
 * Services Layer
 * 
 * Central export point for all services.
 * Components should import from here for clean API access.
 * 
 * Architecture:
 * - /api - API service modules for Edge Function calls
 * - /types.ts - TypeScript types and validation
 * 
 * Usage:
 * import { locationsApi, authApi } from '@/services';
 */

// API Services
export * from './api';

// Types
export * from './types';
