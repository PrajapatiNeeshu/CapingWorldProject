class CoveragePage {
  constructor(page) {
    this.page = page;
    this.pageTitle           = page.locator('h1, h2').filter({ hasText: /personalize your coverage/i });
    this.quarterlyOption     = page.locator('button, [role="radio"], [role="tab"], [role="option"]').filter({ hasText: /^Quarterly$/ }).first();
    this.tireProtectionCheck = page.getByRole('checkbox', { name: /tire protection/i });
    this.secureCoverageBtn   = page.getByRole('button', { name: /secure coverage/i });
  }

  async waitForPage() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.pageTitle.waitFor({ timeout: 15000 });
    // Wait for skeleton loaders to resolve
    await this.page.waitForTimeout(2000);
  }

  async selectQuarterlyPayment() {
    await this.quarterlyOption.waitFor({ timeout: 10000 });
    await this.quarterlyOption.click();
    await this.page.waitForTimeout(500);
    console.log('Selected: Quarterly payment');
  }

  async enableTireProtection() {
    await this.tireProtectionCheck.waitFor({ timeout: 10000 });
    const isChecked = await this.tireProtectionCheck.isChecked();
    if (!isChecked) {
      await this.tireProtectionCheck.click();
      await this.page.waitForTimeout(500);
      console.log('Enabled: Tire Protection');
    } else {
      console.log('Tire Protection: already enabled');
    }
  }

  async clickSecureCoverage() {
    await this.secureCoverageBtn.scrollIntoViewIfNeeded();
    await this.secureCoverageBtn.waitFor({ timeout: 10000 });
    await this.secureCoverageBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000);
    console.log('Clicked: Secure Coverage');
  }
}

module.exports = { CoveragePage };
