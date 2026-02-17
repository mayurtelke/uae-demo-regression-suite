import { test, Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { InvoicePage } from '../pages/invoice.page';
import { FinalSubmitInvoiceAlternate } from '../pages/FinalSubmitInvoiceAlternate.page';

test.setTimeout(10 * 60 * 1000);

const BASE_URL = 'https://ae.covoro.ai/login';
const EXCEL_PATH =
  'C:\\Users\\Perennial\\Desktop\\GST records\\UAE Testing\\UAE Excel Files\\Admin basic\\ValidforAdmin4.xlsx';

/**
 * UAE Regression v1 – 6 cases (TC002–TC004 merged).
 * throughStep: 1=Login, 2=Create Invoice+Buyer+Item, 3=Filter, 4=Submit, 5=Final Status, 6=File Upload.
 */
async function runStepsUpToV1(
  page: Page,
  throughStep: number
): Promise<{ invoiceNumber?: string; finalStatus?: string }> {
  const log = (msg: string, url?: string) => {
    console.log(`[LOG] ${msg} | URL: ${url ?? page.url()}`);
  };
  const login = new LoginPage(page);
  const dashboard = new DashboardPage(page);
  const invoice = new InvoicePage(page);
  let invoiceNumber: string | undefined;
  let finalStatus: string | undefined;

  // Step 1: Login
  if (throughStep >= 1) {
    log('Navigating to login page', BASE_URL);
    await login.goto(BASE_URL);
    await login.login('mayur.telke+receiveram@perennialsys.com', '12345678@aA');
    log('Opening dashboard');
    await dashboard.openDashboard();
  }

  // Step 2 (merged): Create Invoice + Search Buyer + Search Item
  if (throughStep >= 2) {
    await invoice.clickCreateInvoice();
    invoiceNumber = await invoice.enterInvoiceNumber(0);
    log(`Invoice number entered: ${invoiceNumber}`);
    await invoice.selectTxnTypeByIndex(0);
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    await page.waitForTimeout(1000);
    await invoice.fillSellerVatIdentifier('102303340122203');
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    await invoice.selectBuyer('Desai Brothers');
    await invoice.addItem();
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    await invoice.selectPaymentMeans();
    await invoice.selectTodayDate();
    await page.locator('//button[.//text()[normalize-space()="Save"]]').click();
    finalStatus = 'Created';
  }

  // Step 3: Filter Functionality
  if (throughStep >= 3) {
    
    await invoice.submitInvoice();
    const finalSubmit = new FinalSubmitInvoiceAlternate(page, invoiceNumber!);
    await finalSubmit.clickFilter();
    await page.waitForTimeout(1000);
    await finalSubmit.enterInvoiceNumber();
    await finalSubmit.clickApply();
    await page.waitForTimeout(1000);
    finalStatus = 'Filter applied';
  }

  // Step 4: Submit Invoice
  if (throughStep >= 4) {
    const finalSubmit = new FinalSubmitInvoiceAlternate(page, invoiceNumber!);
    await finalSubmit.clickFinalSubmit();
    finalStatus = 'Submitted';
  }

  // Step 5: Final Status – verify till "Delivered"
  if (throughStep >= 5) {
    const finalSubmit = new FinalSubmitInvoiceAlternate(page, invoiceNumber!);
    await finalSubmit.getStatusTillDelivered();
    await finalSubmit.verifyInvoiceStatusAfterFinalSubmit(/delivered/i);
    finalStatus = 'Delivered';
  }

  // Step 6: File Upload
  if (throughStep >= 6) {
    await invoice.clickUploadInvoice();
    await page.waitForTimeout(1000);
    await invoice.selectAndUploadExcelFile(EXCEL_PATH);
    await page.waitForTimeout(5000);
    await invoice.getUploadStatusText();
  }

  return { invoiceNumber, finalStatus };
}

test.describe.serial('UAE Regression v1 – 5 Cases', () => {
  test('TC001 – User Login – Verify user can successfully log in and access the dashboard', async ({ page }) => {
    await runStepsUpToV1(page, 1);
  });

  test('TC002 – Create Invoice – Verify user can create an invoice with valid details and save it successfully (Includes invoice number, transaction type, seller VAT, buyer selection, item addition, payment, and date)', async ({
    page,
  }) => {
    const result = await runStepsUpToV1(page, 2);
    console.log(`[LOG] Create Invoice Number: ${result.invoiceNumber ?? 'N/A'} | Final Status: ${result.finalStatus ?? 'N/A'} | Test case closed`);
  });

  test('TC003 – Invoice Filter – Verify user can filter invoices using invoice number and view correct results', async ({
    page,
  }) => {
    const result = await runStepsUpToV1(page, 3);
    console.log(`[LOG] Create Invoice Number: ${result.invoiceNumber ?? 'N/A'} | Final Status: ${result.finalStatus ?? 'N/A'} | Test case closed`);
  });

  test('TC004 – Invoice Status – Verify invoice status is updated correctly until Delivered', async ({ page }) => {
    const result = await runStepsUpToV1(page, 5);
    console.log(`[LOG] Create Invoice Number: ${result.invoiceNumber ?? 'N/A'} | Final Status: ${result.finalStatus ?? 'N/A'} | Test case closed`);
  });

  test('TC005 – File Upload – Verify user can upload an Excel file successfully and view processing status', async ({
    page,
  }) => {
    await runStepsUpToV1(page, 1); // Login + dashboard only
    const invoice = new InvoicePage(page);
    await invoice.clickUploadInvoice();
    await page.waitForTimeout(1000);
    await invoice.selectAndUploadExcelFile(EXCEL_PATH);
    await page.waitForTimeout(5000);
    const uploadStatus = await invoice.getUploadStatusText();
    console.log(`[LOG] Create Invoice Number: N/A | Final Status: ${uploadStatus || 'N/A'} | Test case closed`);
  });
});
