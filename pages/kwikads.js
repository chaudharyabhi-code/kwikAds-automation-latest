export class KwiksAdsCreativeAgent {
  constructor(page) {
    this.page = page;
    this.kwidAdsSideBar      = this.page.locator('li div').filter({ hasText: 'KwikAds' });
    this.createAgent         = this.kwidAdsSideBar.locator('..').locator('ul li').filter({ hasText: 'Creative Agent' });
    // Merchant selector — available on the dashboard header after login
    this.merchantChangeButton = this.page.locator('button[type="button"] span[role="img"]').last();
    this.merchantDialog       = this.page.locator('div[role="dialog"]');
    this.merchantDialogLoader = this.merchantDialog.locator('span[aria-label="loading"]');
    this.merchantSearchInput  = this.merchantDialog.locator('input[type="text"]');
    this.merchantRadioFirst   = this.merchantDialog.locator('ul').locator('input[type="radio"]').nth(0);
    this.setMerchantButton    = this.merchantDialog.locator('button[type="button"]').filter({ hasText: 'Set Merchant' });
    // "Start Your Payments KYC" promo modal — appears intermittently after selecting a merchant
    // Dashboard-level loading spinner (shown while the merchant switch reloads data)
    this.pageLoader           = this.page.locator('span[aria-label="loading"]').first();
    this.kycModal             = this.page.locator('div.fixed.inset-0').filter({ hasText: 'Start Your Payments KYC' });
    this.kycModalRemindLater  = this.kycModal.locator('button').filter({ hasText: 'Remind me later' });
  }

  async goto() {
    if (process.env.KA_BASE_URL) {
      // Register the proxy route BEFORE the first navigation.
      // storageState may already contain ka_base_url from a previous auth
      // save, so the initial page.goto() can immediately make requests to the
      // private dev backend — the route must exist from the very first request.
      //
      // How it works: every request the browser tries to send to the private
      // backend is intercepted; Playwright forwards it from Node.js (not from
      // the browser), so Chrome's Private Network Access check never fires and
      // the "Block / Allow" dialog never appears.
      //
      // The try/catch is essential: when the test ends and Playwright tears down
      // the context, any in-flight route.fetch() throws "page has been closed".
      // Without catching it, that error cascades and breaks other parallel tests.
      const backendOrigin = new URL(process.env.KA_BASE_URL).origin;
      await this.page.route(`${backendOrigin}/**`, async route => {
        try {
          const response = await route.fetch();
          await route.fulfill({ response });
        } catch {
          // page/context closed while request was in-flight — safe to ignore
        }
      });
    }

    await this.page.goto(process.env.BASE_URL);
    await this._settleNetwork();

    if (process.env.KA_BASE_URL) {
      await this.page.context().addCookies([{
        name:  'ka_base_url',
        value: process.env.KA_BASE_URL,
        url:   process.env.BASE_URL,
      }]);
      await this.page.reload();
      await this._settleNetwork();
    }

    // The "Start Your Payments KYC" promo modal appears intermittently and at an
    // unpredictable moment (a loader runs first, then the modal renders). Register a
    // locator handler so Playwright auto-dismisses it before ANY later action it would
    // block — this covers the case where it appears after our explicit check below.
    await this.registerKycModalHandler();

    await this.selectMerchant();
    // Deterministic pass for the common case: wait out the post-merchant loader, then
    // dismiss the modal if it rendered.
    await this.dismissKycModalIfPresent();
    await this.navigateToCreativeAgent();
    await this._settleNetwork();
  }

  // Bounded, non-fatal replacement for a bare waitForLoadState('networkidle').
  //
  // goto() is the shared beforeEach for all 64 spec files and used to await networkidle
  // four times with no timeout. On a dashboard with background polling, networkidle (500ms
  // of zero requests) can stall indefinitely — and since it was unbounded, ONE stall ate
  // the whole 120s test budget and surfaced as "Test timeout exceeded while running
  // beforeEach" with nothing pointing at the cause.
  //
  // Best-effort by design: if the network never goes quiet, carry on. Every caller follows
  // up with a real UI wait or assertion, which is the signal that actually matters.
  async _settleNetwork(timeout = 15000) {
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  }

  // Auto-dismisses the KYC promo modal whenever it becomes visible and would block an
  // action. Registered once per page, before the merchant flow.
  async registerKycModalHandler() {
    await this.page.addLocatorHandler(this.kycModal, async () => {
      // The modal may vanish on its own between detection and click — ignore that.
      await this.kycModalRemindLater.click({ timeout: 5000 }).catch(() => {});
    }, { times: 5 });
  }

  // Closes the intermittent "Start Your Payments KYC" promo modal.
  // Order matters: setting the merchant first triggers a dashboard loader, and the
  // modal only renders once that finishes — so waiting for the loader before looking
  // for the modal is what makes this reliable.
  async dismissKycModalIfPresent() {
    await this.pageLoader.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    await this.pageLoader.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this._settleNetwork();

    try {
      await this.kycModalRemindLater.waitFor({ state: 'visible', timeout: 6000 });
      await this.kycModalRemindLater.click();
      await this.kycModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    } catch {
      // Modal did not appear on this run — it is intermittent. If it shows up later,
      // the locator handler registered in goto() will dismiss it.
    }
  }

  // Selects MERCHANT_ID from the dashboard merchant switcher.
  // Runs on every goto() because merchant context is server-side and does not
  // survive across browser contexts even when storageState is restored.
  async selectMerchant() {
    await this.merchantChangeButton.click();
    await this.merchantDialog.waitFor({ state: 'visible' });
    // Wait for the initial merchant list to finish loading before typing
    await this.merchantDialogLoader.waitFor({ state: 'hidden' });
    await this.merchantSearchInput.fill(process.env.MERCHANT_ID);
    // Wait for search results to reload after the query
    await this.merchantDialogLoader.waitFor({ state: 'hidden' });
    await this.merchantRadioFirst.check();
    await this.page.waitForTimeout(500);
    await this.setMerchantButton.click();
    await this.merchantDialog.waitFor({ state: 'hidden' });
    await this._settleNetwork();
  }

  async navigateToCreativeAgent() {
    await this.kwidAdsSideBar.click();
    await this.createAgent.click();
    await this._settleNetwork();
  }
}

