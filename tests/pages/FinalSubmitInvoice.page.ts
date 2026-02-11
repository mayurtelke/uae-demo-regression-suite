import { Page, expect } from '@playwright/test';

export class FinalSubmitInvoicePage {
  private invoiceNumber: string;

  constructor(private page: Page, invoiceNumber: string) {
    this.invoiceNumber = invoiceNumber;
  }

  // 1️⃣ Click on Filter button
  async clickFilter() {
    const filterBtn = this.page.locator(
      '//*[@id="root"]/div/div[2]/div[2]/div[3]/div[2]/div[1]/div/div[3]/div[1]/div[1]/span/div/button'
    );
    await expect(filterBtn).toBeVisible({ timeout: 60000 });
    await filterBtn.click();
  }

  // 2️⃣ Enter invoice number
  async enterInvoiceNumber() {
    const invoiceInput = this.page.locator('#invNum');
    await expect(invoiceInput).toBeVisible({ timeout: 60000 });
    await invoiceInput.fill(this.invoiceNumber);
  }

  // 3️⃣ Click Apply button
  async clickApply() {
    const applyBtn = this.page.locator(
      '//*[@id="root"]/div/div[2]/div[2]/div[2]/form/div/div[12]/div[2]/button'
    );
    await expect(applyBtn).toBeVisible({ timeout: 60000 });
    await applyBtn.click();
  }

  // 4️⃣ Open submit dropdown — scope to the row containing this invoice, then click Options
  async openSubmitDropdown() {
    const row = this.page.getByRole('row').filter({ hasText: this.invoiceNumber });
    const optionsBtn = row.getByRole('button', { name: 'Options' });
    await expect(optionsBtn).toBeVisible({ timeout: 60000 });
    await optionsBtn.click();
  }

  // 5️⃣ Click Final Submit
  async clickFinalSubmit() {
    await this.page.locator('//*[@id="sub-item-submit"]').click();
  }

  // 6️⃣ Verify invoice status after final submission (waits 5 sec then checks row)
  async verifyInvoiceStatusAfterFinalSubmit(expectedStatus: string | RegExp = /submitted|final|accepted|in progress|submission error|ready to submit/i) {
    await this.page.waitForTimeout(5000);
    const row = this.page.getByRole('row').filter({ hasText: this.invoiceNumber });
    await expect(row).toBeVisible({ timeout: 15000 });
    const statusPattern = typeof expectedStatus === 'string' ? new RegExp(expectedStatus, 'i') : expectedStatus;
    await expect(row).toContainText(statusPattern);
  }

  // 🔥 ONE-CALL FLOW
  async filterAndSubmitInvoice() {
    await this.clickFilter();
    await this.page.waitForTimeout(1000);
    await this.enterInvoiceNumber();
    await this.clickApply();
    await this.page.waitForTimeout(1000);
    await this.openSubmitDropdown();
    await this.page.waitForTimeout(1000);

    await this.clickFinalSubmit();
  }
}
