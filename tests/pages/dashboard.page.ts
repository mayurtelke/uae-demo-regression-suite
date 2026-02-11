import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async selectTIN(tinNumber: string) {
    const tin = this.page
      .locator('p.tin-number')
      .filter({ hasText: tinNumber })
      .first();

    await expect(tin).toBeVisible({ timeout: 60000 });
    await tin.scrollIntoViewIfNeeded();
    await tin.click({ force: true });
  }

  async openDashboard() {
    await this.page.getByRole('button', { name: 'View Dashboard' }).click();
  }
}
