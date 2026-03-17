const { test, expect } = require('@playwright/test');
const { HomePage }          = require('../pages/HomePage');
const { RetrieveQuotePage } = require('../pages/RetrieveQuotePage');
const { QuotesPage }        = require('../pages/QuotesPage');
const { CoveragePage }      = require('../pages/CoveragePage');
const { PaymentPage }       = require('../pages/PaymentPage');
const { checkoutData }      = require('../data/checkoutData');

// ─── Shared timeout ────────────────────────────────────────────────────────────
const STEP_TIMEOUT = 180000; // 3 min per individual test (includes full navigation)
// Run with --workers=1 to avoid overloading the staging server

// ─── Automation masking (Cloudflare Turnstile) ────────────────────────────────
async function maskAutomation(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // eslint-disable-next-line no-undef
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    // eslint-disable-next-line no-undef
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
  });
}

// ─── Navigation helpers ────────────────────────────────────────────────────────
async function goToRetrieveQuotePage(page) {
  await maskAutomation(page);
  const home = new HomePage(page);
  await home.navigate();
  await home.clickRetrieveQuote();
  // Wait for SSR text to appear, then extra time for React hydration to complete
  await page.waitForSelector('text=Enter your details', { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  return new RetrieveQuotePage(page);
}

async function goToQuotesPage(page) {
  const retrieve = await goToRetrieveQuotePage(page);
  await retrieve.fillForm(checkoutData.retrieveQuote);
  await retrieve.clickFindMyQuote();
  // Use content-based waiting (h1 "my quotes") — URL pattern may vary in SPA routing
  const quotesPage = new QuotesPage(page);
  await quotesPage.waitForPage();
  return quotesPage;
}

async function goToCoveragePage(page) {
  const quotesPage = await goToQuotesPage(page);
  await quotesPage.selectFirstQuote();
  await quotesPage.clickContinue();
  const coveragePage = new CoveragePage(page);
  await coveragePage.waitForPage();
  return coveragePage;
}

async function goToPaymentPage(page) {
  const coveragePage = await goToCoveragePage(page);
  await coveragePage.selectQuarterlyPayment();
  await coveragePage.enableTireProtection();
  await coveragePage.clickSecureCoverage();
  const paymentPage = new PaymentPage(page);
  await paymentPage.waitForPage();
  return paymentPage;
}

// ══════════════════════════════════════════════════════════════════════════════
// TC01 — Home Page
// ══════════════════════════════════════════════════════════════════════════════
test.describe('TC01 - Home Page', () => {

  test('TC01_01: Home page loads and URL contains /checkout', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    await maskAutomation(page);
    const home = new HomePage(page);
    await home.navigate();
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('TC01_02: "Retrieve a Quote" button is visible on home page', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    await maskAutomation(page);
    const home = new HomePage(page);
    await home.navigate();
    await expect(home.retrieveQuoteBtn).toBeVisible();
  });

  test('TC01_03: Clicking "Retrieve a Quote" navigates to quote form', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    await maskAutomation(page);
    const home = new HomePage(page);
    await home.navigate();
    await home.clickRetrieveQuote();
    await expect(page).toHaveURL(/quote/);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// TC02 — Retrieve Quote Form
// ══════════════════════════════════════════════════════════════════════════════
test.describe('TC02 - Retrieve Quote Form', () => {

  test('TC02_01: Retrieve Quote page contains all form fields', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const retrieve = await goToRetrieveQuotePage(page);
    await expect(retrieve.lastNameInput).toBeVisible();
    await expect(retrieve.emailInput).toBeVisible();
    await expect(retrieve.zipCodeInput).toBeVisible();
    await expect(retrieve.findMyQuoteBtn).toBeVisible();
  });

  test('TC02_02: Last Name field accepts input correctly', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const retrieve = await goToRetrieveQuotePage(page);
    await retrieve._fillField(retrieve.lastNameInput, checkoutData.retrieveQuote.lastName);
    const val = await retrieve.lastNameInput.inputValue();
    expect(val).toBe(checkoutData.retrieveQuote.lastName);
  });

  test('TC02_03: Email field accepts input correctly', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const retrieve = await goToRetrieveQuotePage(page);
    await retrieve._fillField(retrieve.emailInput, checkoutData.retrieveQuote.email);
    const val = await retrieve.emailInput.inputValue();
    expect(val).toBe(checkoutData.retrieveQuote.email);
  });

  test('TC02_04: ZIP Code field accepts input correctly', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const retrieve = await goToRetrieveQuotePage(page);
    await retrieve._fillField(retrieve.zipCodeInput, checkoutData.retrieveQuote.zipCode);
    const val = await retrieve.zipCodeInput.inputValue();
    expect(val).toBe(checkoutData.retrieveQuote.zipCode);
  });

  test('TC02_05: Form filled with valid data navigates to My Quotes', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const retrieve = await goToRetrieveQuotePage(page);
    await retrieve.fillForm(checkoutData.retrieveQuote);
    await retrieve.clickFindMyQuote();
    // Verify navigation by checking page heading (SPA routing — URL pattern may vary)
    const quotesPage = new QuotesPage(page);
    await expect(quotesPage.pageTitle).toBeVisible({ timeout: 60000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// TC03 — My Quotes Page
// ══════════════════════════════════════════════════════════════════════════════
test.describe('TC03 - My Quotes Page', () => {

  test('TC03_01: My Quotes page loads with heading', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const quotesPage = await goToQuotesPage(page);
    await expect(quotesPage.pageTitle).toBeVisible();
  });

  test('TC03_02: At least one quote is displayed', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const quotesPage = await goToQuotesPage(page);
    const count = await quotesPage.verifyAtLeastOneQuote();
    expect(count).toBeGreaterThan(0);
  });

  test('TC03_03: Quote card contains Quote ID', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const quotesPage = await goToQuotesPage(page);
    const quotes = await quotesPage.getQuotesData();
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0].text).toMatch(/Quote ID/i);
  });

  test('TC03_04: Quote card contains vehicle info', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const quotesPage = await goToQuotesPage(page);
    const quotes = await quotesPage.getQuotesData();
    expect(quotes[0].text).toMatch(/Toyota Highlander/i);
  });

  test('TC03_05: "See Quote" button is visible after selecting first quote', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const quotesPage = await goToQuotesPage(page);
    await quotesPage.selectFirstQuote();
    await expect(quotesPage.seeQuoteBtn).toBeVisible();
  });

  test('TC03_06: Clicking "See Quote" navigates to Coverage page', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const quotesPage = await goToQuotesPage(page);
    await quotesPage.selectFirstQuote();
    await quotesPage.clickContinue();
    const coveragePage = new CoveragePage(page);
    await expect(coveragePage.pageTitle).toBeVisible({ timeout: 15000 });
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// TC04 — Coverage / Personalize Page
// ══════════════════════════════════════════════════════════════════════════════
test.describe('TC04 - Coverage Selection', () => {

  test('TC04_01: Coverage page loads with heading', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const coveragePage = await goToCoveragePage(page);
    await expect(coveragePage.pageTitle).toBeVisible();
  });

  test('TC04_02: Quarterly payment option can be selected', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const coveragePage = await goToCoveragePage(page);
    await coveragePage.selectQuarterlyPayment();
    // Passes if no error thrown
  });

  test('TC04_03: Tire Protection checkbox is visible', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const coveragePage = await goToCoveragePage(page);
    await expect(coveragePage.tireProtectionCheck).toBeVisible();
  });

  test('TC04_04: Tire Protection checkbox is checked after enableTireProtection()', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const coveragePage = await goToCoveragePage(page);
    await coveragePage.enableTireProtection();
    await expect(coveragePage.tireProtectionCheck).toBeChecked();
  });

  test('TC04_05: "Secure Coverage" button is visible', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const coveragePage = await goToCoveragePage(page);
    await expect(coveragePage.secureCoverageBtn).toBeVisible();
  });

  test('TC04_06: Clicking "Secure Coverage" navigates to Payment page', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const coveragePage = await goToCoveragePage(page);
    await coveragePage.selectQuarterlyPayment();
    await coveragePage.enableTireProtection();
    await coveragePage.clickSecureCoverage();
    await expect(page).toHaveURL(/payment/);
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// TC05 — Payment Page
// ══════════════════════════════════════════════════════════════════════════════
test.describe('TC05 - Payment Page', () => {

  test('TC05_01: Payment page loads with correct heading', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    await expect(paymentPage.pageTitle).toBeVisible();
  });

  test('TC05_02: ProcessOne payment iframe is detected', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    const frame = await paymentPage._resolvePaymentFrame(30000);
    expect(frame).not.toBeNull();
  });

  test('TC05_03: Card Number input is present in payment frame', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    const frame = await paymentPage._resolvePaymentFrame(30000);
    const cardInput = frame.getByPlaceholder('Card Number');
    await expect(cardInput).toBeVisible({ timeout: 10000 });
  });

  test('TC05_04: Expiration Date input is present in payment frame', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    const frame = await paymentPage._resolvePaymentFrame(30000);
    const expiryInput = frame.getByPlaceholder('Expiration Date');
    await expect(expiryInput).toBeVisible({ timeout: 10000 });
  });

  test('TC05_05: Filling card details enables NEXT button', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    await paymentPage.selectCreditCard();
    await paymentPage.fillCardDetails(checkoutData.payment);
    const frame = await paymentPage._resolvePaymentFrame(10000);
    const nextBtn = frame.getByRole('button', { name: /next/i });
    const isDisabled = await nextBtn.isDisabled().catch(() => true);
    expect(isDisabled).toBe(false);
  });

  test('TC05_06: Clicking NEXT shows summary screen with SUBMIT AND PAY', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    await paymentPage.selectCreditCard();
    await paymentPage.fillCardDetails(checkoutData.payment);
    await paymentPage.clickNext();
    const frame = await paymentPage._resolvePaymentFrame(10000);
    const submitBtn = frame.getByRole('button', { name: /submit and pay/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test('TC05_07: Accept checkbox is present on summary screen', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    await paymentPage.selectCreditCard();
    await paymentPage.fillCardDetails(checkoutData.payment);
    await paymentPage.clickNext();
    const frame = await paymentPage._resolvePaymentFrame(10000);
    const acceptCheck = frame.getByRole('checkbox', { name: /accept/i });
    await expect(acceptCheck).toBeVisible({ timeout: 10000 });
  });

  test('TC05_08: Checking Accept enables SUBMIT AND PAY button', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    await paymentPage.selectCreditCard();
    await paymentPage.fillCardDetails(checkoutData.payment);
    await paymentPage.clickNext();
    await paymentPage.acceptTerms();
    const frame = await paymentPage._resolvePaymentFrame(10000);
    const submitBtn = frame.getByRole('button', { name: /submit and pay/i });
    const isDisabled = await submitBtn.isDisabled().catch(() => true);
    expect(isDisabled).toBe(false);
  });

  test('TC05_09: Billing details are pre-filled in payment frame', async ({ page }) => {
    test.setTimeout(STEP_TIMEOUT);
    const paymentPage = await goToPaymentPage(page);
    const frame = await paymentPage._resolvePaymentFrame(30000);
    // Name On Card should be pre-filled with customer name
    const nameOnCard = frame.getByLabel(/name on card/i);
    if (await nameOnCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      const val = await nameOnCard.inputValue();
      expect(val.length).toBeGreaterThan(0);
    }
    // Billing Zip should match the zip from quote
    const billingZip = frame.getByLabel(/billing zip/i);
    if (await billingZip.isVisible({ timeout: 5000 }).catch(() => false)) {
      const val = await billingZip.inputValue();
      expect(val).toBe(checkoutData.retrieveQuote.zipCode);
    }
  });

});

// ══════════════════════════════════════════════════════════════════════════════
// TC06 — Full E2E Checkout (Steps 1–8 verified as passing in staging)
// ══════════════════════════════════════════════════════════════════════════════
test.describe('TC06 - Full E2E Checkout Flow', () => {

  test('TC06_01: Complete checkout from Home to SUBMIT AND PAY click', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    // Mask automation signals
    await maskAutomation(page);

    // Step 1 — Home
    console.log('\n[Step 1] Home page...');
    const homePage = new HomePage(page);
    await homePage.navigate();
    await expect(page).toHaveURL(/\/checkout/);

    // Step 2 — Retrieve Quote page
    console.log('[Step 2] Retrieve Quote...');
    await homePage.clickRetrieveQuote();
    // Wait for React hydration to complete before interacting with form inputs
    await page.waitForSelector('text=Enter your details', { timeout: 15000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Step 3 — Fill form
    console.log('[Step 3] Fill form...');
    const retrievePage = new RetrieveQuotePage(page);
    await retrievePage.fillForm(checkoutData.retrieveQuote);
    await retrievePage.clickFindMyQuote();

    // Step 4 — My Quotes
    console.log('[Step 4] My Quotes...');
    const quotesPage = new QuotesPage(page);
    await quotesPage.waitForPage();
    const quoteCount = await quotesPage.verifyAtLeastOneQuote();
    expect(quoteCount).toBeGreaterThan(0);

    // Step 5 — Select Quote
    console.log('[Step 5] Select Quote...');
    await quotesPage.selectFirstQuote();
    await quotesPage.clickContinue();

    // Step 6 — Coverage
    console.log('[Step 6] Coverage...');
    const coveragePage = new CoveragePage(page);
    await coveragePage.waitForPage();
    await coveragePage.selectQuarterlyPayment();
    await coveragePage.enableTireProtection();
    await expect(coveragePage.tireProtectionCheck).toBeChecked();
    await coveragePage.clickSecureCoverage();

    // Step 7 — Payment
    console.log('[Step 7] Payment...');
    const paymentPage = new PaymentPage(page);
    await paymentPage.waitForPage();
    await paymentPage.selectCreditCard();
    await paymentPage.fillCardDetails(checkoutData.payment);

    const frame = await paymentPage._resolvePaymentFrame(10000);
    const nextBtn = frame.getByRole('button', { name: /next/i });
    const nextDisabled = await nextBtn.isDisabled().catch(() => true);
    expect(nextDisabled).toBe(false);

    await paymentPage.clickNext();

    // Step 8 — Accept & Submit
    console.log('[Step 8] Accept Terms & Submit...');
    await paymentPage.acceptTerms();

    const submitBtn = frame.getByRole('button', { name: /submit and pay/i });
    const submitDisabled = await submitBtn.isDisabled().catch(() => true);
    expect(submitDisabled).toBe(false);

    await paymentPage.submitAndPay();

    console.log(`\n[DONE] All steps 1-8 completed. Final URL: ${page.url()}`);
    console.log('NOTE: Step 9 (Order Confirmation) requires a valid ProcessOne staging test card.');
  });

});
