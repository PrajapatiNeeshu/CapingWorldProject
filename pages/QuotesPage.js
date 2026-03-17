class QuotesPage {
  constructor(page) {
    this.page = page;
    this.pageTitle  = page.locator('h1').filter({ hasText: /my quotes/i });
    // Quote cards are the bordered containers showing plan + vehicle info
    this.quoteCards = page.locator('div').filter({ has: page.locator('text=Quote ID') });
    this.seeQuoteBtn = page.getByRole('button', { name: /see quote/i }).first();
  }

  async waitForPage() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.pageTitle.waitFor({ timeout: 30000 });
    // Wait for quote cards to load (not skeleton)
    await this.page.waitForFunction(
      () => document.body.innerText.includes('Quote ID'),
      { timeout: 15000 }
    ).catch(() => {});
    await this.page.screenshot({ path: 'test-results/step4-quotes-loaded.png', fullPage: true });
  }

  async getQuotesData() {
    const cards = await this.quoteCards.all();
    const quotesData = [];
    for (let i = 0; i < cards.length; i++) {
      const text = (await cards[i].innerText().catch(() => '')).trim();
      if (text) quotesData.push({ index: i + 1, text });
    }
    return quotesData;
  }

  async printAllQuotes() {
    const quotes = await this.getQuotesData();
    console.log('\n========== MY QUOTES ==========');
    console.log(`Total quotes found: ${quotes.length}`);
    quotes.forEach(q => {
      console.log(`\n--- Quote ${q.index} ---`);
      console.log(q.text);
    });
    console.log('================================\n');
    return quotes;
  }

  async verifyAtLeastOneQuote() {
    const quotes = await this.getQuotesData();
    if (quotes.length === 0) throw new Error('No quotes found on the My Quotes page');
    console.log(`Verified: ${quotes.length} quote(s) available.`);
    return quotes.length;
  }

  async selectFirstQuote() {
    // Click the first quote card area
    const firstCard = this.quoteCards.first();
    await firstCard.waitFor({ timeout: 10000 });
    await firstCard.click();
    await this.page.waitForTimeout(800);
  }

  async clickContinue() {
    // Button is "See Quote" on this page
    await this.seeQuoteBtn.waitFor({ timeout: 15000 });
    await this.seeQuoteBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
  }
}

module.exports = { QuotesPage };
