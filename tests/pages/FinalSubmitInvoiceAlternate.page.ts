import { Page, expect } from '@playwright/test';

/**
 * Alternate Final Submit Invoice flow: skips Options dropdown and uses
 * direct final-submit control: //*[@id="submit-einv-1"]/div/div/span/svg
 */
export class FinalSubmitInvoiceAlternate {
  private invoiceNumber: string;

  constructor(private page: Page, invoiceNumber: string) {
    this.invoiceNumber = invoiceNumber;
  }

  async clickFilter() {
    const filterBtn = this.page.locator(
      '//*[@id="root"]/div/div[2]/div[2]/div[3]/div[2]/div[1]/div/div[3]/div[1]/div[1]/span/div/button'
    );
    await expect(filterBtn).toBeVisible({ timeout: 60000 });
    await filterBtn.click();
  }

  async enterInvoiceNumber() {
    const invoiceInput = this.page.locator('#invNum');
    await expect(invoiceInput).toBeVisible({ timeout: 60000 });
    await invoiceInput.fill(this.invoiceNumber);
  }

  async clickApply() {
    const applyBtn = this.page.locator(
      '//*[@id="root"]/div/div[2]/div[2]/div[2]/form/div/div[12]/div[2]/button'
    );
    await expect(applyBtn).toBeVisible({ timeout: 60000 });
    await applyBtn.click();
  }

  /** Final submit: click on submit control (no Options dropdown). */
  async clickFinalSubmit() {
    const finalSubmitBtn = this.page.locator('#submit-einv-1');
    await expect(finalSubmitBtn).toBeVisible({ timeout: 60000 });
    await finalSubmitBtn.click();
  }

  async verifyInvoiceStatusAfterFinalSubmit(expectedStatus: string | RegExp = /submitted|final|accepted|in progress|submission error|ready to submit/i) {
    await this.page.waitForTimeout(5000);
    const row = this.page.getByRole('row').filter({ hasText: this.invoiceNumber });
    await expect(row).toBeVisible({ timeout: 15000 });
    const statusPattern = typeof expectedStatus === 'string' ? new RegExp(expectedStatus, 'i') : expectedStatus;
    await expect(row).toContainText(statusPattern);
  }

  /** Status cell xpath (first row, status column). */
  private readonly statusCellXpath = '//*[@id="root"]/div/div[2]/div[2]/div[3]/div[2]/div[1]/div/div[3]/div[2]/table/tbody/tr[1]/td[2]/p';

  /** Refresh button to reload invoice list. */
  async clickRefresh() {
    await this.page.locator('//*[@id="Box"]').click();
  }

  /**
   * Poll status from the table until it is "Submitted". Clicks refresh between checks.
   * Returns array of all status texts seen until Submitted.
   * @param maxAttempts max refresh/poll cycles (default 30)
   * @param pollIntervalMs wait between refresh and reading status (default 5000)
   */
  async getStatusTillSubmitted(maxAttempts: number = 30, pollIntervalMs: number = 5000): Promise<string[]> {
    const statuses: string[] = [];
    const submittedPattern = /submitted/i;
    for (let i = 0; i < maxAttempts; i++) {
      await this.page.waitForTimeout(pollIntervalMs);
      const statusEl = this.page.locator(this.statusCellXpath);
      await statusEl.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      const text = (await statusEl.textContent())?.trim() ?? '';
      statuses.push(text);
      console.log(`[Status ${i + 1}] ${text}`);
      if (submittedPattern.test(text)) {
        return statuses;
      }
      await this.clickRefresh();
    }
    return statuses;
  }

  /** One-call flow: filter → enter invoice → apply → final submit (no Options dropdown). */
  async filterAndSubmitInvoice() {
    await this.clickFilter();
    await this.page.waitForTimeout(1000);
    await this.enterInvoiceNumber();
    await this.clickApply();
    await this.page.waitForTimeout(1000);
    await this.clickFinalSubmit();
  }
}
