import { Page } from '@playwright/test';

export class DashboardPage {
  page: Page;
  readonly userProfile = '[data-testid="user-profile"]';
  readonly logoutButton = '[data-testid="logout-button"]';
  readonly dashboardTitle = 'h1:has-text("Dashboard")';

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async logout() {
    await this.page.click(this.logoutButton);
  }

  async isUserProfileVisible(): Promise<boolean> {
    return await this.page.locator(this.userProfile).isVisible();
  }
}
