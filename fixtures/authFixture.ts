import { test as base, Page } from '@playwright/test';
import { APIClient } from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

/**
 * Authentication Fixture
 * Provides authenticated page and API client for tests
 */
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'testuser@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForNavigation();

    await use(page);

    // Logout after test
    await page.click('[data-testid="logout-button"]');
  },

  apiClient: async ({ request }, use) => {
    const apiClient = new APIClient();

    // Authenticate API client
    const loginResponse = await apiClient.post(ENDPOINTS.USER_LOGIN, {
      email: 'testuser@example.com',
      password: 'password123',
    });

    const { token } = await loginResponse.data;
    apiClient.setToken(token);

    await use(apiClient);

    // Cleanup
    apiClient.clearToken();
  },
});

export { expect } from '@playwright/test';
