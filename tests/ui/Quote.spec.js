const { test } = require('@playwright/test');

const userData = {
  firstName: 'Sammy',
  lastName: 'Deluxe',
  email: 'anil.mor123@campingworld.com',
  shippingAddress: '650 Three Springs Rd',
  city: 'Bowling Green',
  state: 'KY',
  phoneNumber: '+1 (232) 342-5090',
  zipCode: '42104',
};

test('Already have a quote - fill form, find quote, then start new quote', async ({ page }) => {
  // Step 1: Navigate to checkout page
  await page.goto('https://gs-unified-web-git-feat-dgwi-33-camping-world.vercel.app/checkout', {
    waitUntil: 'domcontentloaded',
  });

  // Step 2: Click "Retrieve a quote" (next to "Already have a quote?" text)
  const retrieveBtn = page.getByRole('button', { name: /retrieve a quote/i });
  await retrieveBtn.scrollIntoViewIfNeeded();
  await retrieveBtn.click();
  await page.waitForLoadState('domcontentloaded');

  // Step 3: Fill the retrieve form
  await page.getByLabel(/last name/i).fill(userData.lastName);
  await page.getByLabel(/email/i).fill(userData.email);
  await page.getByLabel(/zip code/i).fill(userData.zipCode);

  await page.screenshot({ path: 'test-results/01-retrieve-form-filled.png' });

  // Step 4: Click "Find my quote"
  await page.getByRole('button', { name: /find my quote/i }).click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'test-results/02-after-find-quote.png' });

  // Step 5: No existing quote found — click "Start a new quote" to proceed
  await page.getByRole('link', { name: /start a new quote/i }).click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'test-results/03-new-quote-page.png' });

  // Step 6: Fill the "Start protecting your vehicle" form
  await page.getByRole('textbox', { name: /first name/i }).fill(userData.firstName);
  await page.getByRole('textbox', { name: /last name/i }).fill(userData.lastName);
  await page.getByRole('textbox', { name: /^email$/i }).fill(userData.email);
  await page.getByRole('textbox', { name: /home street address/i }).fill(userData.shippingAddress);
  await page.getByRole('textbox', { name: /phone number/i }).fill(userData.phoneNumber);
  await page.getByRole('textbox', { name: /zip code/i }).fill(userData.zipCode);

  await page.screenshot({ path: 'test-results/04-new-quote-form-filled.png' });

  // Step 7: Click "Start my quote" and wait for the loading overlay to disappear
  await page.getByRole('button', { name: /start my quote/i }).click();

  // Wait for "Checking coverage" overlay to disappear
  await page.waitForSelector('text=Checking coverage options', { state: 'hidden', timeout: 30000 }).catch(() => {});

  // Wait for navigation or page change
  await Promise.race([
    page.waitForURL(url => !url.includes('/checkout'), { timeout: 20000 }),
    page.waitForTimeout(20000),
  ]).catch(() => {});

  await page.waitForLoadState('domcontentloaded');
  await page.screenshot({ path: 'test-results/05-vehicle-info-page.png', fullPage: true });

  // Step 8: Select vehicle type — "Autos" (Cars, trucks, & SUVs)
  await page.getByText('Autos', { exact: false }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/06-vehicle-type-selected.png' });

  // Step 9: Select a Year first (Make depends on Year)
  const yearDropdown = page.locator('button, [role="combobox"]').filter({ hasText: /select vehicle year/i });
  await yearDropdown.waitFor({ timeout: 10000 });
  await yearDropdown.click();

  // Pick the first year option
  const firstYear = page.getByRole('option').first();
  await firstYear.waitFor({ timeout: 5000 });
  await firstYear.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/07-year-selected.png' });

  // Step 10: Click the Make dropdown and select the first make
  const makeDropdown = page.locator('button, [role="combobox"]').filter({ hasText: /select vehicle make/i });
  await makeDropdown.waitFor({ timeout: 10000 });
  await makeDropdown.click();

  // Pick the first make option
  const firstMake = page.getByRole('option').first();
  await firstMake.waitFor({ timeout: 5000 });
  await firstMake.click();

  await page.screenshot({ path: 'test-results/08-make-selected.png' });
});
