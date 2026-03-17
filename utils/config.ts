import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment and Configuration Settings
 */
export const config = {
  // Environment
  environment: process.env.ENVIRONMENT || 'development',
  isCIEnvironment: process.env.CI === 'true',

  // URLs
  baseUrl: process.env.BASE_URL || 'https://example.com',
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.example.com',

  // Credentials
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'testuser@example.com',
    password: process.env.TEST_USER_PASSWORD || 'password123',
  },

  // Timeouts
  timeout: {
    short: 5000,
    medium: 10000,
    long: 30000,
  },

  // Retry settings
  retry: {
    attempts: process.env.RETRY_ATTEMPTS ? parseInt(process.env.RETRY_ATTEMPTS) : 2,
    delay: 1000,
  },

  // Execution settings
  headless: process.env.HEADLESS !== 'false',
  slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,

  // Logging
  verbose: process.env.VERBOSE === 'true',
};
