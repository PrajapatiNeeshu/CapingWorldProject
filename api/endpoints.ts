/**
 * API Endpoints Configuration
 */
export const ENDPOINTS = {
  // User Management
  USERS: '/api/users',
  USER_PROFILE: '/api/users/profile',
  USER_LOGIN: '/api/auth/login',
  USER_LOGOUT: '/api/auth/logout',

  // Products
  PRODUCTS: '/api/products',

  // Orders
  ORDERS: '/api/orders',

  // Reports
  REPORTS: '/api/reports',
};

/**
 * Base URL Configuration
 */
export const BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';
