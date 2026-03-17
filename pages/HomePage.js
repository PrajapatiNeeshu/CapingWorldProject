const BASE_URL = 'https://gs-unified-web-git-feat-dgwi-33-camping-world.vercel.app';

class HomePage {
  constructor(page) {
    this.page = page;
    this.retrieveQuoteBtn = page.getByRole('button', { name: /retrieve a quote/i });
  }

  async navigate() {
    await this.page.goto(`${BASE_URL}/checkout`, { waitUntil: 'domcontentloaded' });
  }

  async clickRetrieveQuote() {
    await this.retrieveQuoteBtn.scrollIntoViewIfNeeded();
    await this.retrieveQuoteBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}

module.exports = { HomePage };
