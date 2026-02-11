import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto(url?: string) {
    await this.page.goto(url || 'https://dev.covoro.ai/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('#email-label', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('#sign-in');

    await this.page.waitForURL(/dashboard|home/, { timeout: 60000 });
    await expect(this.page).not.toHaveURL(/login/);
  }
}
