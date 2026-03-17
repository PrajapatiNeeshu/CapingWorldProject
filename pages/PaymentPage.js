class PaymentPage {
  constructor(page) {
    this.page = page;
    this.pageTitle    = page.locator('h1').filter({ hasText: /let's get you on the road/i });
    this._paymentFrame = null; // set after form loads
  }

  async waitForPage() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.pageTitle.waitFor({ timeout: 15000 });
    // Wait for ProcessOne payment iframe to start loading
    await this.page.waitForFunction(
      () => document.querySelectorAll('iframe').length > 0,
      { timeout: 25000 }
    );
    await this.page.waitForTimeout(2000);
    console.log('Payment page loaded (iframes detected).');
  }

  async selectCreditCard() {
    // Credit Card is the default — no action needed
    console.log('Credit Card: default selection');
  }

  /** Poll all frames until one contains inputs, caching it as _paymentFrame. */
  async _resolvePaymentFrame(timeout = 30000) {
    if (this._paymentFrame) return this._paymentFrame;

    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const f of this.page.frames()) {
        if (f.url().includes('vercel.live')) continue;
        const cnt = await f.locator('input').count().catch(() => 0);
        if (cnt > 0) {
          this._paymentFrame = f;
          console.log(`  Payment frame resolved: ${f.url()} (${cnt} inputs)`);
          return f;
        }
      }
      await this.page.waitForTimeout(1000);
    }
    throw new Error('Payment frame with inputs not found within timeout');
  }

  /** Dismiss cookie consent banners on both the main page and the payment iframe. */
  async _dismissCookieBanner(frame) {
    // Dismiss on main page (banner can overlap the iframe at bottom of viewport)
    await this.page.evaluate(() => {
      document.querySelectorAll('[aria-label="cookieconsent"], .cc-window, #cookieconsent').forEach(el => {
        el.style.display = 'none';
      });
    }).catch(() => {});

    // Dismiss inside the payment iframe too
    await frame.evaluate(() => {
      document.querySelectorAll('[aria-label="cookieconsent"], .cc-window, #cookieconsent').forEach(el => {
        el.style.display = 'none';
      });
    }).catch(() => {});

    await this.page.waitForTimeout(300);
    console.log('  Cookie consent banners dismissed (main page + payment frame)');
  }

  async fillCardDetails({ cardNumber, expiryDate, cvv = '123' }) {
    const frame = await this._resolvePaymentFrame(30000);

    // Dismiss cookie consent banners before interacting with payment fields
    await this._dismissCookieBanner(frame);

    const cardIn   = frame.getByPlaceholder('Card Number');
    const expiryIn = frame.getByPlaceholder('Expiration Date');

    // Fill card number using fill() — triggers Angular input event and auto-formats
    await cardIn.waitFor({ timeout: 10000 });
    await cardIn.click({ force: true }); await this.page.waitForTimeout(400);
    await cardIn.fill(cardNumber);
    await this.page.waitForTimeout(600);

    // Fill expiry date
    await expiryIn.waitFor({ timeout: 10000 });
    await expiryIn.click({ force: true }); await this.page.waitForTimeout(400);
    await expiryIn.pressSequentially(expiryDate, { delay: 40 });
    await this.page.waitForTimeout(400);

    // Fill CVV if there is an explicitly labelled CVV/CVC/security field
    const allInputs = await frame.locator('input:not([type="hidden"])').all();
    for (const inp of allInputs) {
      const nm = (await inp.getAttribute('name').catch(() => '')) || '';
      const ph = (await inp.getAttribute('placeholder').catch(() => '')) || '';
      const visible = await inp.isVisible().catch(() => false);
      if (!visible) continue;
      if (/cvv|cvc|security.?code|csc/i.test(nm) || /cvv|cvc|security.?code|csc/i.test(ph)) {
        await inp.click(); await this.page.waitForTimeout(300);
        await inp.pressSequentially(cvv, { delay: 40 });
        await this.page.waitForTimeout(300);
        console.log(`  Filled CVV field (name="${nm}", placeholder="${ph}")`);
        break;
      }
    }

    await this.page.waitForTimeout(500);
    console.log(`Filled card details: card=${cardNumber.slice(0,4)}... expiry=${expiryDate}`);
  }

  async clickNext() {
    const frame = await this._resolvePaymentFrame(10000);
    const nextBtn = frame.getByRole('button', { name: /next/i });
    await nextBtn.waitFor({ timeout: 10000 });
    // Use JS click to bypass cross-origin iframe viewport restrictions
    const clicked = await frame.evaluate(() => {
      const btn = document.querySelector('button.action-buttons__primary, button[class*="primary"]');
      if (btn) { btn.click(); return true; }
      return false;
    }).catch(() => false);
    if (!clicked) {
      await nextBtn.click({ force: true });
    }
    await this.page.waitForTimeout(3000);
    console.log('Clicked: Next (in payment frame)');
  }

  async acceptTerms() {
    // The ProcessOne summary screen has an "Accept" checkbox that must be
    // checked before SUBMIT AND PAY becomes enabled
    const frame = await this._resolvePaymentFrame(10000).catch(() => null);
    if (frame) {
      const acceptCheck = frame.getByRole('checkbox', { name: /accept/i });
      if (await acceptCheck.isVisible({ timeout: 5000 }).catch(() => false)) {
        const checked = await acceptCheck.isChecked().catch(() => false);
        if (!checked) {
          await acceptCheck.click();
          await this.page.waitForTimeout(500);
          console.log('Checked: Accept checkbox in payment frame');
        } else {
          console.log('Accept checkbox already checked');
        }
        return;
      }

      // Fallback: find any unchecked visible checkbox in the frame
      const checkboxes = await frame.getByRole('checkbox').all();
      for (const cb of checkboxes) {
        const vis = await cb.isVisible().catch(() => false);
        if (!vis) continue;
        const checked = await cb.isChecked().catch(() => false);
        if (!checked) {
          await cb.click();
          await this.page.waitForTimeout(500);
          console.log('Checked: terms checkbox in payment frame');
          return;
        }
      }
    }
    console.log('No accept checkbox found — skipping acceptTerms step');
  }

  async submitAndPay() {
    const frame = await this._resolvePaymentFrame(5000).catch(() => null);

    if (frame) {
      const submitInFrame = frame.getByRole('button', { name: /submit and pay/i });
      if (await submitInFrame.isVisible({ timeout: 5000 }).catch(() => false)) {
        const disabled = await submitInFrame.isDisabled().catch(() => false);
        await submitInFrame.click({ force: disabled });
        // Wait for page to navigate away from the payment page (up to 30s)
        await this.page.waitForURL(
          url => !url.includes('/checkout/payment'),
          { timeout: 30000 }
        ).catch(() => {});
        console.log(`Clicked: Submit and Pay — URL: ${this.page.url()}`);
        return;
      }
    }

    const submitBtn = this.page.getByRole('button', { name: /submit and pay/i });
    await submitBtn.waitFor({ timeout: 10000 });
    await submitBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    console.log('Clicked: Submit and Pay (main page)');
  }
}

module.exports = { PaymentPage };
