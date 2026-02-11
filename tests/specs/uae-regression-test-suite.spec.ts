import { test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { InvoicePage } from '../pages/invoice.page';
import { FinalSubmitInvoiceAlternate } from '../pages/FinalSubmitInvoiceAlternate.page';

test.setTimeout(10 * 60 * 1000);

test('UAE Regression Test Suite - Split into 8 steps', async ({ page }) => {
  const log = (msg: string, url?: string) => {
    const u = url ?? page.url();
    console.log(`[LOG] ${msg} | URL: ${u}`);
  };

  const login = new LoginPage(page);
  const dashboard = new DashboardPage(page);
  const invoice = new InvoicePage(page);
  let invoiceNumber: string;

  // 1) Login
  await test.step('1) Login – Navigated, logged in, dashboard opened', async () => {
    log('Navigating to login page', 'https://ae.covoro.ai/login');
    await login.goto('https://ae.covoro.ai/login');
    log('Entering credentials and logging in');
    await login.login('mayur.telke+receiveram@perennialsys.com', '12345678@aA');
    log('Login completed');
    log('Opening dashboard');
    await dashboard.openDashboard();
    log('Dashboard opened');
  });

  // 2) Create Invoice
  await test.step('2) Create Invoice – Invoice number entered, txn type, seller VAT, saves', async () => {
    log('Clicking Create Invoice button');
    await invoice.clickCreateInvoice();
    log('Create Invoice clicked');
    log('Entering invoice number for index 0');
    invoiceNumber = await invoice.enterInvoiceNumber(0);
    log(`Invoice number entered: ${invoiceNumber}`);
    log('Selecting transaction type by index 0');
    await invoice.selectTxnTypeByIndex(0);
    log('Transaction type selected');
    log('Clicking Save button (1st)');
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    await page.waitForTimeout(1000);
    log('Filling Seller VAT Identifier (TRN/TIN)');
    await invoice.fillSellerVatIdentifier('102303340122203');
    log('Seller VAT Identifier entered');
    log('Clicking Save button (2nd)');
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    log('Create Invoice step completed');
  });

  // 3) Search Buyer
  await test.step('3) Search Buyer – BUYER1172562221 selected', async () => {
    log('Selecting buyer BUYER1172562221');
    await invoice.selectBuyer('BUYER1172562221');
    log('Buyer selected');
  });

  // 4) Search Item
  await test.step('4) Search Item – Item added, payment, date, saves', async () => {
    log('Adding item to invoice');
    await invoice.addItem();
    log('Item added');
    log('Clicking Save button (3rd)');
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    log('Selecting payment means');
    await invoice.selectPaymentMeans();
    log('Payment means selected');
    log('Selecting today date');
    await invoice.selectTodayDate();
    log('Date selected');
    log('Clicking Save button (4th)');
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    log('Search Item step completed');
  });

  // 5) Filter Functionality
  await test.step('5) Filter Functionality – Invoice submitted, filter opened, invoice number entered, Apply clicked', async () => {
    log('Submitting invoice');
    await invoice.submitInvoice();
    log('Invoice submitted');
    const finalSubmit = new FinalSubmitInvoiceAlternate(page, invoiceNumber);
    log('Clicking filter');
    await finalSubmit.clickFilter();
    await page.waitForTimeout(1000);
    log('Entering invoice number in filter');
    await finalSubmit.enterInvoiceNumber();
    log('Clicking Apply');
    await finalSubmit.clickApply();
    await page.waitForTimeout(1000);
    log('Filter Functionality completed');
  });

  // 6) Submit Invoice
  await test.step('6) Submit Invoice – Final submit clicked', async () => {
    const finalSubmit = new FinalSubmitInvoiceAlternate(page, invoiceNumber);
    log('Clicking final submit');
    await finalSubmit.clickFinalSubmit();
    log('Final submit completed');
  });

  // 7) Final Status
  await test.step('7) Final Status – Statuses: In Progress → Submitted, verification passed', async () => {
    const finalSubmit = new FinalSubmitInvoiceAlternate(page, invoiceNumber);
    log('Getting status till Submitted');
    const statuses = await finalSubmit.getStatusTillSubmitted();
    log(`Statuses seen till Submitted: ${statuses.join(' → ')}`);
    log('Verifying invoice status after final submit');
    await finalSubmit.verifyInvoiceStatusAfterFinalSubmit();
    log('Final Status verification completed');
  });

  // 8) File Upload – Upload Invoice, select Excel file, verify upload status
  await test.step('8) File Upload – Upload Invoice clicked, Excel file uploaded, upload status verified', async () => {
    log('Clicking Upload Invoice');
    await invoice.clickUploadInvoice();
    await page.waitForTimeout(1000); // allow upload dialog / file input to appear
    const excelFilePath =
      'C:\\Users\\Perennial\\Desktop\\GST records\\UAE Testing\\UAE Excel Files\\Admin basic\\ValidforAdmin4.xlsx';
    log('Selecting and uploading Excel file');
    await invoice.selectAndUploadExcelFile(excelFilePath);
    log('Getting file upload status till Completed');
    const uploadStatuses = await invoice.getUploadStatusTillCompleted();
    log(`Upload statuses seen: ${uploadStatuses.join(' → ') || 'none'}`);
    const completed = uploadStatuses.some((s) => /completed/i.test(s));
    if (!completed) {
      throw new Error(`Upload did not reach Completed. Statuses seen: ${uploadStatuses.join(' → ') || 'none'}`);
    }
    log('File upload status verified (Completed)');
  });

  log('UAE Regression Test Suite - All 8 steps completed');

  // Attach summary to report so it appears in HTML report
  const summary = `# UAE Regression Test Suite – Summary

**Result:** All 8 steps passed ✓

| Step | Name | Result |
|------|------|--------|
| 1 | Login | Navigated, logged in, dashboard opened |
| 2 | Create Invoice | Invoice number entered, txn type, seller VAT, saves |
| 3 | Search Buyer | BUYER1172562221 selected |
| 4 | Search Item | Item added, payment, date, saves |
| 5 | Filter Functionality | Invoice submitted, filter opened, invoice number entered, Apply clicked |
| 6 | Submit Invoice | Final submit clicked |
| 7 | Final Status | Statuses: In Progress → Submitted, verification passed |
| 8 | File Upload | Upload Invoice clicked, Excel file uploaded, upload status verified |
`;
  await test.info().attach('UAE Regression – 8 Steps Summary', {
    body: summary,
    contentType: 'text/markdown',
  });
});
