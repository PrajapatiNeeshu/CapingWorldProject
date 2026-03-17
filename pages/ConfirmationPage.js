class ConfirmationPage {
  constructor(page) {
    this.page = page;
    // Try multiple possible success message patterns
    this.orderCompleteMsg = page.locator([
      '[class*="confirmation" i]',
      '[class*="success" i]',
      '[class*="complete" i]',
      '[class*="order-confirmed" i]',
    ].join(', ')).filter({ hasText: /order|complete|confirmed|success|thank you/i }).first();
  }

  async waitForPage() {
    await this.page.waitForLoadState('domcontentloaded');
    console.log(`  Confirmation page URL: ${this.page.url()}`);

    // Log page body to see what text is available
    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    const preview = bodyText.replace(/\s+/g, ' ').trim().slice(0, 300);
    console.log(`  Page preview: "${preview}"`);

    // Try common order completion patterns
    const patterns = [
      /order complete/i,
      /order confirmed/i,
      /thank you/i,
      /payment successful/i,
      /enrollment complete/i,
      /your plan is active/i,
      /your coverage/i,
    ];
    for (const pattern of patterns) {
      const el = this.page.getByText(pattern).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`  Confirmation text found: ${pattern}`);
        this.orderCompleteMsg = el;
        return;
      }
    }

    // If no confirmation text found, wait longer and check URL
    await this.page.waitForTimeout(5000);
    const url = this.page.url();
    console.log(`  Final URL: ${url}`);
    if (/confirm|success|complete|thank/i.test(url)) {
      console.log('  Success inferred from URL pattern');
      return;
    }

    // Last resort: wait for any h1/h2 and print it
    const heading = await this.page.locator('h1, h2').first().innerText().catch(() => 'none');
    console.log(`  Page heading: "${heading}"`);
    throw new Error(`Order confirmation page not found. URL: ${url}, Heading: "${heading}"`);
  }

  async getPolicyDetails() {
    const fullText = await this.page.locator('body').innerText();

    // Extract key fields via regex
    const extract = (pattern) => {
      const match = fullText.match(pattern);
      return match ? match[1].trim() : 'N/A';
    };

    return {
      vehicle:        extract(/Vehicle[:\s]+([^\n]+)/i),
      policyNumber:   extract(/Policy\s*(?:number|#)[:\s]+([^\n]+)/i),
      effectiveDate:  extract(/Effective\s*Date[:\s]+([^\n]+)/i),
      deductible:     extract(/Deductible[:\s]+([^\n]+)/i),
      coverageLength: extract(/Coverage\s*Length[:\s]+([^\n]+)/i),
      tireProtection: extract(/Tire\s*Protection[:\s]+([^\n]+)/i),
    };
  }

  async printPolicyDetails() {
    const details = await this.getPolicyDetails();
    console.log('\n========== ORDER COMPLETE ==========');
    console.log('Your vehicle protection plan is active.');
    console.log("We've sent a confirmation email with your policy details.\n");
    console.log('--- Mechanical Breakdown Insurance ---');
    console.log(`Vehicle:          ${details.vehicle}`);
    console.log(`Policy Number:    ${details.policyNumber}`);
    console.log(`Effective Date:   ${details.effectiveDate}`);
    console.log(`Deductible:       ${details.deductible}`);
    console.log(`Coverage Length:  ${details.coverageLength}`);
    console.log(`Tire Protection:  ${details.tireProtection}`);
    console.log('=====================================\n');
    return details;
  }
}

module.exports = { ConfirmationPage };
