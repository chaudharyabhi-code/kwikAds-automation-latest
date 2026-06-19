export class KwiksAdsCreativeAgent {
  constructor(page) {
    this.page = page;
    this.kwidAdsSideBar      = this.page.locator('li div').filter({ hasText: 'KwikAds' });
    this.createAgent         = this.kwidAdsSideBar.locator('..').locator('ul li').filter({ hasText: 'Creative Agent' });
    // Merchant selector — available on the dashboard header after login
    this.merchantChangeButton = this.page.locator('button[type="button"] span[role="img"]').nth(0);
    this.merchantDialog       = this.page.locator('div[role="dialog"]');
    this.merchantSearchInput  = this.merchantDialog.locator('input[type="text"]');
    this.merchantRadioFirst   = this.merchantDialog.locator('ul').locator('input[type="radio"]').nth(0);
    this.setMerchantButton    = this.merchantDialog.locator('button[type="button"]').filter({ hasText: 'Set Merchant' });
  }

  async goto() {
    await this.page.goto(process.env.BASE_URL);
    await this.page.waitForLoadState('networkidle');
    await this.selectMerchant();
    await this.navigateToCreativeAgent();
    await this.page.waitForLoadState('networkidle');
  }

  // Selects MERCHANT_NAME from the dashboard merchant switcher.
  // Runs on every goto() because merchant context is server-side and does not
  // survive across browser contexts even when storageState is restored.
  async selectMerchant() {
    await this.merchantChangeButton.click();
    await this.merchantSearchInput.fill(process.env.MERCHANT_NAME);
    await this.page.waitForTimeout(1000);
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

