import { Page, expect } from '@playwright/test';

export class InvoicePage {
  constructor(private page: Page) {}

  async clickCreateInvoice() {
    await this.page.getByRole('button', { name: 'Create Invoice' }).click();
  }

  async clickUploadInvoice() {
    const uploadBtn = this.page.getByRole('button', { name: /upload/i });
    await expect(uploadBtn).toBeVisible({ timeout: 60000 });
    await uploadBtn.click();
  }

  async selectAndUploadExcelFile(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached', timeout: 15000 });
    await fileInput.setInputFiles(filePath);
  }

  /** Xpath for file upload status text (span showing status until completed). */
  private readonly uploadStatusXpath =
    '//*[@id="root"]/div/div[2]/div[2]/div[3]/div[2]/div[1]/div/div[2]/div/div[7]/span[3]';

  /** Refresh button for file upload status (id download-error-file; click parent for reliability). */
  private readonly uploadStatusRefreshXpath = '//*[@id="download-error-file"]';

  private get uploadStatusRefreshButton() {
    return this.page.locator(this.uploadStatusRefreshXpath);
  }

  /** Click the refresh button beside the file upload status to refresh status. */
  async clickUploadStatusRefresh() {
    const btn = this.uploadStatusRefreshButton;
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
  }

  /** Get current file upload status text from the status span. */
  async getUploadStatusText(): Promise<string> {
    const el = this.page.locator(this.uploadStatusXpath);
    await el.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    return (await el.textContent())?.trim() ?? '';
  }

  /**
   * Every 5 sec click refresh beside status, then get status text. Repeat until status is
   * "completed" (success) or "Error in records" / "error" (failure). Returns statuses seen.
   * @param timeoutMs max time to wait (default 120000)
   * @param pollIntervalMs interval between refresh + get status (default 5000)
   */
  async getUploadStatusTillCompleted(
    timeoutMs: number = 120000,
    pollIntervalMs: number = 5000
  ): Promise<string[]> {
    const statuses: string[] = [];
    const deadline = Date.now() + timeoutMs;
    const completedPattern = /completed/i;
    const errorPattern = /error in records|error/i;

    await this.page.waitForTimeout(3000); // allow upload row and status to appear

    while (Date.now() < deadline) {
      await this.clickUploadStatusRefresh();
      await this.page.waitForTimeout(1500); // allow UI to update after refresh
      const text = await this.getUploadStatusText();
      if (text && !statuses.includes(text)) statuses.push(text);
      if (completedPattern.test(text)) return statuses;
      if (errorPattern.test(text)) {
        throw new Error(
          `Upload ended with error. Status: "${text}". Statuses seen: ${statuses.join(' → ')}`
        );
      }
      await this.page.waitForTimeout(Math.max(0, pollIntervalMs - 1500)); // remainder of 5 sec
    }
    throw new Error(
      `Upload status did not reach "completed" or error within ${timeoutMs}ms. Statuses seen: ${statuses.join(' → ') || 'none'}`
    );
  }

  /** Wait for file upload to complete (refresh every 5 sec until completed or error). */
  async verifyUploadStatus(timeoutMs: number = 120000) {
    await this.page.waitForTimeout(2000); // allow upload to start
    await this.getUploadStatusTillCompleted(timeoutMs);
  }

  // async enterInvoiceNumber(index: number) {
  // //async enterInvoiceNumber(index: number) {
  // const now = new Date();

  // const dateTime =
  //   `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}` +
  //   `${now.getDate().toString().padStart(2, '0')}_` +
  //   `${now.getHours().toString().padStart(2, '0')}` +
  //   `${now.getMinutes().toString().padStart(2, '0')}` +
  //   `${now.getSeconds().toString().padStart(2, '0')}`;

  // await this.page.fill('#invNum', `Automation_${dateTime}_${index}`);

async enterInvoiceNumber(index: number): Promise<string> {
  const now = new Date();

  const dateTime =
    `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}` +
    `${now.getDate().toString().padStart(2, '0')}_` +
    `${now.getHours().toString().padStart(2, '0')}` +
    `${now.getMinutes().toString().padStart(2, '0')}` +
    `${now.getSeconds().toString().padStart(2, '0')}`;

  const invoiceNumber = `Automation_${dateTime}_${index}`;

  // Fill the invoice number input
  await this.page.fill('#invNum', invoiceNumber);

  // Return the invoice number so you can reuse it
  return invoiceNumber;

  
  
  
  
  //  const timestamp = Date.now();
    //await this.page.fill('#invNum', `Automation_${timestamp}_${index}`);
  }

  async selectTxnTypeByIndex(index: number) {
    await this.page.locator('#invTxnType').click();

    const options = this.page.locator('ul[role="listbox"] li');
    await expect(options.first()).toBeVisible({ timeout: 10000 });

    const count = await options.count();
    if (index >= count) {
      throw new Error(`Txn type index ${index} not available. Only ${count} options found.`);
    }

    await options.nth(index).click();
  }

  /** Select Invoice Transaction Type by option text (e.g. "Standard Tax Invoice") */
  async selectTxnTypeByText(optionText: string) {
    await this.page.locator('#invTxnType').click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  /** Fill Seller TIN/TRN (VAT Identifier) in Seller section. Clears autopopulated value first. */
  async fillSellerVatIdentifier(value: string) {
    const byId = this.page.locator('#vatIdentifier, [id="vatIdentifier"], input[id="vatIdentifier"]').first();
    const byLabel = this.page.getByLabel(/seller.*vat|vat.*identifier.*trn|trn.*tin/i);
    const field = byId.or(byLabel).first();
    await expect(field).toBeVisible({ timeout: 15000 });
    await field.scrollIntoViewIfNeeded();
    await field.click({ force: true });
    await this.page.waitForTimeout(300);
    await field.press('Control+A');
    await field.press('Backspace');
    await field.fill(value);
    await this.page.waitForTimeout(200);
  }

  /** Select Item Type in document/item section (e.g. "Goods"). Call when on document section. */
  async selectItemType(typeName: string) {
    const trigger = this.page.getByLabel(/item type/i).or(this.page.getByRole('combobox').filter({ has: this.page.getByText(/item type/i) }));
    await trigger.first().click();
    await this.page.getByRole('option', { name: new RegExp(typeName, 'i') }).first().click();
  }

  async continueStep(buttonIndex = 0) {
   // await this.page.locator('button:has-text("Save")').nth(buttonIndex).click();
  await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async selectBuyer(buyerCode: string) {
    await this.page.fill('#searchValue', buyerCode);
    await this.page.waitForTimeout(500);
    await this.page.locator('(//div[@role="presentation" and contains(@class,"search-item")])[1]').click();
    //await this.page.locator('p', { hasText: buyerCode }).first().click();
await this.page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    await this.page.locator('//button[.//text()[normalize-space()="Save"]]').click();

  }

  /** Select Invoice Type from document section dropdown (e.g. "Credit note") */
  async selectInvoiceType(typeName: string) {
    await this.page.locator('//*[@id="root"]/div/div[2]/main/section[1]/form/div[1]/div[3]/div/div').click();
    await this.page.getByRole('option', { name: new RegExp(typeName, 'i') }).first().click();
  }

  /** Fill Credit Note fields: Invoice Type, preceding dropdown, reference, date */
  async fillCreditNoteFields() {
    // 1) Select Invoice Type as Credit Note
    await this.page.locator('//*[@id="root"]/div/div[2]/main/section[1]/form/div[1]/div[3]/div/div').click();
    await this.page.getByRole('option', { name: /credit note/i }).first().click();
    await this.page.waitForTimeout(500);
    // 2) Select 1st value from preceding details dropdown
    const precedingDropdown = this.page.locator('//*[@id="root"]/div/div[2]/main/section[1]/form/div[1]/div[15]/div/div');
    await precedingDropdown.scrollIntoViewIfNeeded();
    await precedingDropdown.click();
    await this.page.waitForTimeout(800);
    await this.page.locator('ul[role="listbox"] li[role="option"]').first().click();
    await this.page.waitForTimeout(500);
    // 3) Enter "TEST" in preceding invoice reference field
    await this.page.locator('//*[@id="proceedingDtls[0].invoiceReference"]').fill('TEST');
    // 4) Click date picker to open dropdown
    await this.page.locator('//*[@id="root"]/div/div[2]/main/section[1]/form/div[2]/div[1]/div/div[2]/div/div[2]/button').click();
    await this.page.waitForTimeout(500);
    // 5) Select any date from dropdown
    await this.page.locator('xpath=/html/body/div[2]/div[2]/div/div/div/div[2]/div/div/div[2]/div/div[2]/button[4]').click();
  }

  /** Fill Credit Note "related to goods or services" fields — same as fillCreditNoteFields but selects "Credit note related to goods or services" */
  async fillCreditNoteFieldsRelatedToGoodsOrServices() {
    // 1) Select Invoice Type as "Credit note related to goods or services"
    await this.page.locator('//*[@id="root"]/div/div[2]/main/section[1]/form/div[1]/div[3]/div/div').click();
    await this.page.getByRole('option', { name: /credit note related to goods or services/i }).click();
    await this.page.waitForTimeout(500);
    // 2) Select 1st value from preceding details dropdown
    const precedingDropdown = this.page.locator('//*[@id="root"]/div/div[2]/main/section[1]/form/div[1]/div[15]/div/div');
    await precedingDropdown.scrollIntoViewIfNeeded();
    await precedingDropdown.click();
    await this.page.waitForTimeout(800);
    await this.page.locator('ul[role="listbox"] li[role="option"]').first().click();
    await this.page.waitForTimeout(500);
    // 3) Enter "TEST" in preceding invoice reference field
    await this.page.locator('//*[@id="proceedingDtls[0].invoiceReference"]').fill('TEST');
    // 4) Click date picker to open dropdown
    await this.page.locator('//*[@id="root"]/div/div[2]/main/section[1]/form/div[2]/div[1]/div/div[2]/div/div[2]/button').click();
    await this.page.waitForTimeout(500);
    // 5) Select any date from dropdown
    await this.page.locator('xpath=/html/body/div[2]/div[2]/div/div/div/div[2]/div/div/div[2]/div/div[2]/button[4]').click();
  }

  async addItem(itemDescription: string = 'ABC Revise') {
    await this.page.getByRole('button', { name: /add item/i }).click();
    await this.page.fill('#itemDescription', itemDescription);
    await this.page.waitForTimeout(500);
    await this.page.locator('//*[@id="root"]/div/div[2]/main/section[4]/div[3]/div/div/div/div[2]/div/form/div[2]/div[2]/div[2]/div/div[1]').click();
    await this.page.waitForTimeout(500);
    const qtyField = this.page.locator('//*[@id="invoiceQty"]');
    await qtyField.waitFor({ state: 'visible', timeout: 10000 });
    await qtyField.click();
    await qtyField.press('Control+A');
    await qtyField.press('Backspace');
    await qtyField.fill('10');
    await this.page.fill('#invLineId', 'Automation');
    await this.page.locator(
      '//*[@id="root"]/div/div[2]/main/section[4]/div[3]/div/div/div/div[2]/div/form/div[10]/div[2]/button/div').click();
    await this.page.locator('//button[.//text()[normalize-space()="Save"]]').click();
  }

  /** Add item - Item Type Goods */
  async addItemGoods() {
    await this.addItem('GoodsItem');
  }

  /** Add item - Item Type Services */
  async addItemServices() {
    await this.addItem('ServiceItem');
  }

  /** Add item - Item Type Both */
  async addItemBoth() {
    await this.addItem('Bothtype');
  }

  /** Add item - Exempt Goods */
  async addItemExemptGoods() {
    await this.addItem('ExemptGoods');
  }

  /** Add item - Exempt Service */
  async addItemExemptService() {
    await this.addItem('ExemptService');
  }

  /** Add item - Both type exempt */
  async addItemBothtypeExempt() {
    await this.addItem('Bothtypeexempt');
  }

  /** Fill tax exemption fields: dropdown taxExemptionRsnType, select any value, then taxExemptionRsn "TEST" */
  async fillTaxExemptionFields() {
    const dropdown = this.page.locator('//*[@id="taxExemptionRsnType"]');
    await expect(dropdown).toBeVisible({ timeout: 10000 });
    await dropdown.scrollIntoViewIfNeeded();
    await dropdown.click();
    await this.page.waitForTimeout(500);
    await this.page.locator('ul[role="listbox"] li[role="option"]').first().click();
    await this.page.waitForTimeout(500);
    await this.page.locator('//*[@id="taxExemptionRsn"]').fill('TEST');
  }

  async selectPaymentMeans() {
    await this.page.locator('#meansType').click();
    await this.page.locator('#meansType-option-0').click();

  }

  async selectTodayDate() {
//    await this.page.getByRole('gridcell', {
  //    name: new RegExp(`^${new Date().getDate()}$`)
   // }).click();

await this.page.locator('#Group_15406').click();
await  this.page.waitForTimeout(1000);

// Next button
await  this.page
  .locator('.MuiPickersArrowSwitcher-rightArrowIcon')
  .locator('xpath=ancestor::button')
  .click({ force: true });

//Date pick
await  this.page
  .locator('.MuiPickersDay-root.mui-144rw37')
  .first()
  .click();
await this.page.locator('//button[.//text()[normalize-space()="Save"]]').click();

  }

  async submitInvoice() {
    await this.page.getByRole('button', { name: /submit/i }).click();
    console.log(await this.page.locator('body').innerText());

    //await expect(this.page.getByText(/invoice created successfully/i)).toBeVisible({ timeout: 3000 });
  }


}
