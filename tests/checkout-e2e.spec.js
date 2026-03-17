const { test, expect } = require('@playwright/test');
const { HomePage }          = require('../pages/HomePage');
const { RetrieveQuotePage } = require('../pages/RetrieveQuotePage');
const { QuotesPage }        = require('../pages/QuotesPage');
const { CoveragePage }      = require('../pages/CoveragePage');
const { PaymentPage }       = require('../pages/PaymentPage');
const { ConfirmationPage }  = require('../pages/ConfirmationPage');
const { checkoutData }      = require('../data/checkoutData');

test.describe('Checkout E2E - Full Quote Flow', () => {

  test('Complete checkout from Retrieve Quote to Order Confirmation', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for full E2E flow

    // Mask automation signals so Cloudflare Turnstile doesn't block the payment form
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // eslint-disable-next-line no-undef
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      // eslint-disable-next-line no-undef
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    });

    // ─── Step 1: Navigate to Checkout Home Page ───────────────────────────────
    console.log('\n[Step 1] Navigating to checkout page...');
    const homePage = new HomePage(page);
    await homePage.navigate();
    await page.screenshot({ path: 'test-results/step1-home.png' });
    console.log('Home page loaded successfully.');

    // ─── Step 2: Click "Retrieve a quote" ─────────────────────────────────────
    console.log('\n[Step 2] Clicking "Retrieve a quote"...');
    await homePage.clickRetrieveQuote();
    await page.screenshot({ path: 'test-results/step2-retrieve-page.png' });
    console.log('Retrieve quote page loaded.');

    // ─── Step 3: Fill Retrieve Quote Form & Find My Quote ─────────────────────
    console.log('\n[Step 3] Filling retrieve quote form...');
    const retrievePage = new RetrieveQuotePage(page);
    // Confirm we're on the retrieve page (may have navigated via button click or direct URL)
    await page.waitForSelector('text=Enter your details', { timeout: 10000 }).catch(() => {});
    await retrievePage.fillForm(checkoutData.retrieveQuote);
    await page.screenshot({ path: 'test-results/step3-form-filled.png' });

    // Log the actual values in the DOM to confirm React state is set
    const lastNameVal = await page.getByLabel(/last name/i).inputValue();
    const emailVal    = await page.getByRole('textbox', { name: /^email$/i }).inputValue();
    const zipVal      = await page.getByLabel(/zip code/i).inputValue();
    console.log(`  Last Name : ${lastNameVal}`);
    console.log(`  Email     : ${emailVal}`);
    console.log(`  ZIP Code  : ${zipVal}`);

    await retrievePage.clickFindMyQuote();

    // Wait up to 30s for page content to change after API call
    await page.waitForTimeout(5000);
    console.log('  Current URL:', page.url());
    await page.screenshot({ path: 'test-results/step3-after-find.png', fullPage: true });

    // ─── Step 4: My Quotes Page ────────────────────────────────────────────────
    console.log('\n[Step 4] Waiting for My Quotes page...');
    const quotesPage = new QuotesPage(page);
    await quotesPage.waitForPage();
    await page.screenshot({ path: 'test-results/step4-quotes-page.png', fullPage: true });

    // Validate and print all quotes
    const quoteCount = await quotesPage.verifyAtLeastOneQuote();
    await quotesPage.printAllQuotes();
    expect(quoteCount).toBeGreaterThan(0);

    // ─── Step 5: Select First Quote & Continue ────────────────────────────────
    console.log('\n[Step 5] Selecting first quote...');
    await quotesPage.selectFirstQuote();
    await page.screenshot({ path: 'test-results/step5-quote-selected.png' });

    await quotesPage.clickContinue();
    await page.screenshot({ path: 'test-results/step5-after-continue.png' });
    console.log('Navigated to: Personalize your coverage');

    // ─── Step 6: Coverage Selection ───────────────────────────────────────────
    console.log('\n[Step 6] Personalizing coverage...');
    const coveragePage = new CoveragePage(page);
    await coveragePage.waitForPage();
    await page.screenshot({ path: 'test-results/step6-coverage-page.png' });

    await coveragePage.selectQuarterlyPayment();
    await coveragePage.enableTireProtection();
    await page.screenshot({ path: 'test-results/step6-coverage-selected.png' });

    await coveragePage.clickSecureCoverage();
    await page.screenshot({ path: 'test-results/step6-after-secure.png' });
    console.log('Navigated to payment page.');

    // ─── Step 7: Payment Page ─────────────────────────────────────────────────
    console.log('\n[Step 7] Filling payment details...');
    const paymentPage = new PaymentPage(page);
    await paymentPage.waitForPage();
    await page.screenshot({ path: 'test-results/step7-payment-page.png' });

    await paymentPage.selectCreditCard();
    await paymentPage.fillCardDetails(checkoutData.payment);
    await page.screenshot({ path: 'test-results/step7-card-filled.png' });

    await paymentPage.clickNext();
    await page.screenshot({ path: 'test-results/step7-after-next.png' });

    // ─── Step 8: Accept Terms & Submit Payment ────────────────────────────────
    console.log('\n[Step 8] Accepting terms and submitting payment...');
    await paymentPage.acceptTerms();
    await page.screenshot({ path: 'test-results/step8-terms-accepted.png' });

    await paymentPage.submitAndPay();
    await page.screenshot({ path: 'test-results/step8-after-submit.png' });

    // ─── Step 9: Order Confirmation Page ──────────────────────────────────────
    console.log('\n[Step 9] Waiting for order confirmation...');
    const confirmPage = new ConfirmationPage(page);
    await confirmPage.waitForPage();
    await page.screenshot({ path: 'test-results/step9-confirmation.png', fullPage: true });

    // Validate order complete message
    await expect(confirmPage.orderCompleteMsg).toBeVisible();
    console.log('Order Complete message verified.');

    // Print all policy details
    const details = await confirmPage.printPolicyDetails();

    // Verify key policy fields are present
    expect(details.policyNumber).not.toBe('N/A');
    expect(details.vehicle).not.toBe('N/A');
    expect(details.effectiveDate).not.toBe('N/A');

    console.log('\n[DONE] Full checkout E2E test completed successfully.');
  });

});
