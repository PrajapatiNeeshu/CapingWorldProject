import { Page } from '@playwright/test';

export class LoginPage {
  page: Page;
  readonly emailInput = '[data-testid="email-input"]';
  readonly passwordInput = '[data-testid="password-input"]';
  readonly loginButton = '[data-testid="login-button"]';
  readonly errorMessage = '[data-testid="error-message"]';

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }

  async getErrorMessage(): Promise<string> {
    return await this.page.locator(this.errorMessage).textContent() || '';
  }
}
