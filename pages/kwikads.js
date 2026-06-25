export class KwiksAdsCreativeAgent {
  constructor(page) {
    this.page = page;
    this.kwidAdsSideBar      = this.page.locator('li div').filter({ hasText: 'KwikAds' });
    this.createAgent         = this.kwidAdsSideBar.locator('..').locator('ul li').filter({ hasText: 'Creative Agent' });
    // Merchant selector — available on the dashboard header after login
    this.merchantChangeButton = this.page.locator('button[type="button"] span[role="img"]').nth(1);
    this.merchantDialog       = this.page.locator('div[role="dialog"]');
    this.merchantDialogLoader = this.merchantDialog.locator('span[aria-label="loading"]');
    this.merchantSearchInput  = this.merchantDialog.locator('input[type="text"]');
    this.merchantRadioFirst   = this.merchantDialog.locator('ul').locator('input[type="radio"]').nth(0);
    this.setMerchantButton    = this.merchantDialog.locator('button[type="button"]').filter({ hasText: 'Set Merchant' });
  }

  async goto() {
    await this.page.goto(process.env.BASE_URL);
    await this.page.waitForLoadState('networkidle');

    // Overwrite ka_base_url cookie to point at the target backend, then reload
    // so all subsequent API calls use the correct environment.
    if (process.env.KA_BASE_URL) {
      // Proxy every request the page makes to the private dev backend through
      // Playwright's Node.js-side fetch. Because the *browser* never makes a
      // direct connection to the private host, Chrome's Private Network Access
      // (PNA) check never runs and the "Block / Allow" dialog never appears.
      const backendOrigin = new URL(process.env.KA_BASE_URL).origin;
      await this.page.route(`${backendOrigin}/**`, async route => {
        const response = await route.fetch();
        await route.fulfill({ response });
      });

      await this.page.context().addCookies([{
        name:  'ka_base_url',
        value: process.env.KA_BASE_URL,
        url:   process.env.BASE_URL,
      }]);
      await this.page.reload();
      await this.page.waitForLoadState('networkidle');
    }

    await this.selectMerchant();
    await this.navigateToCreativeAgent();
    await this.page.waitForLoadState('networkidle');
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
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToCreativeAgent() {
    await this.kwidAdsSideBar.click();
    await this.createAgent.click();
  }
}

