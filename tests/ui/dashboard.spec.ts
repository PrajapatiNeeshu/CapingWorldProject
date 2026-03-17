import { test, expect } from '@playwright/test';

test.describe('Dashboard Tests', () => {
  test('should display dashboard title', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/Dashboard/);
  });

  test('should display user profile section', async ({ page }) => {
    await page.goto('/dashboard');
    const profile = page.locator('[data-testid="user-profile"]');
    await expect(profile).toBeVisible();
  });
});
