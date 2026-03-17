const BASE_URL = 'https://gs-unified-web-git-feat-dgwi-33-camping-world.vercel.app';

class RetrieveQuotePage {
  constructor(page) {
    this.page = page;
    this.lastNameInput  = page.locator('#lastName');
    this.emailInput     = page.getByLabel(/^email$/i);
    this.zipCodeInput   = page.getByLabel(/zip code/i);
    this.findMyQuoteBtn = page.getByRole('button', { name: /find my quote/i });
  }

  async navigate() {
    await this.page.goto(`${BASE_URL}/checkout/quote`, { waitUntil: 'domcontentloaded' });
    await this.findMyQuoteBtn.waitFor({ timeout: 10000 });
  }

  async _fillField(locator, value) {
    await locator.waitFor({ timeout: 10000 });
    // Triple-click to select all, then type — reliable for React controlled inputs
    await locator.click({ clickCount: 3 });
    await this.page.waitForTimeout(300);
    await locator.pressSequentially(value, { delay: 50 });
    await this.page.waitForTimeout(200);
    // Verify; retry with fill() fallback if pressSequentially didn't stick
    const actual = await locator.inputValue();
    if (actual !== value) {
      await locator.click({ clickCount: 3 });
      await this.page.waitForTimeout(400);
      await locator.fill(value);
      await this.page.waitForTimeout(200);
    }
  }

  async fillForm({ lastName, email, zipCode }) {
    await this._fillField(this.lastNameInput, lastName);
    await this.lastNameInput.press('Tab'); // blur to commit React state
    await this.page.waitForTimeout(300);
    await this._fillField(this.emailInput, email);
    await this.emailInput.press('Tab');
    await this.page.waitForTimeout(300);
    await this._fillField(this.zipCodeInput, zipCode);
    await this.zipCodeInput.press('Tab'); // blur to trigger ZIP validation
    await this.page.waitForTimeout(300);
  }

  async clickFindMyQuote() {
    // Wait for React to flush all field state updates before submitting
    await this.page.waitForTimeout(1500);
    await this.findMyQuoteBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
  }
}

module.exports = { RetrieveQuotePage };
