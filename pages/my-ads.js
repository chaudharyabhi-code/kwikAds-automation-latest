import { expect } from '@playwright/test';

export class MyAds {
  constructor(page) {
    this.page = page;

    this.adsLibraryContent = this.page.locator('div[id="single-spa-application:@gokwik/kwikads"]');
    this.filtersDiv= this.adsLibraryContent.locator('div[style="border-radius: 14px; border: 1px solid rgb(226, 232, 240); background-color: rgb(255, 255, 255); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: rgba(0, 0, 0, 0.05) 0px 1px 2px; position: sticky; top: 44px; z-index: 1;"]')

    // Top tab
this.myAdsTab = this.adsLibraryContent.getByRole('button', {
  name: 'My Ads',
});
    // Search bar
    this.searchInput  = this.filtersDiv.locator('input[placeholder="Search by creative name or ID..."]');
    this.resultsBadge = this.filtersDiv.locator('span[style*="monospace"][style*="background-color: rgb(241, 245, 249)"]');

    // Sub-tabs (All / Meta Creatives / Draft Creatives)
    this.subTabAll      = this.filtersDiv.locator('.ant-segmented-item-label[title="All"]');
    this.subTabMeta     = this.filtersDiv.locator('.ant-segmented-item-label[title="Meta Creatives"]');
    this.subTabDraft    = this.filtersDiv.locator('.ant-segmented-item-label[title="Draft Creatives"]');
    // The label wrapping the currently-selected sub-tab gets ant-segmented-item-selected
    this.activeSubTab   = this.filtersDiv.locator('label.ant-segmented-item-selected');

    // Filters
    this.adFormatFilter  = this.filtersDiv.locator('label').filter({ hasText: 'Ad Format' }).locator('..').locator('.ant-select');
    this.statusFilter    = this.filtersDiv.locator('label').filter({ hasText: /^Status$/i }).locator('..').locator('.ant-select');
    this.kaaiFilter      = this.filtersDiv.locator('label').filter({ hasText: 'KAAI Analysis' }).locator('..').locator('.ant-select');
    this.sortByFilter    = this.filtersDiv.locator('label').filter({ hasText: /^Sort By$/i }).locator('..').locator('.ant-select');
    this.launchDateRange = this.filtersDiv.locator('.ant-picker-range');
    this.minDaysInput    = this.filtersDiv.locator('input[type="number"]');
    this.orderDescButton = this.filtersDiv.locator('button').filter({ hasText: 'Desc' });

    // Results and card list
    this.resultsCount = this.adsLibraryContent.locator('span').filter({ hasText: /\d+ of [\d,]+ ads/ }).nth(0);
    this.adCardList   = this.adsLibraryContent.locator('[data-testid="virtuoso-item-list"]');
    this.scroller     = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').nth(0);
    this.emptyState   = this.adsLibraryContent.getByText('No ads found matching your search', { exact: true });

    // Toolbar buttons — sibling div immediately after filtersDiv
    this.kaaiCoverageButton = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(.,"KAAI")]').nth(0);
    this.selectButton       = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(.,"Select")]').nth(0);
    this.uploadButton       = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(@class,"ant-btn-primary") and contains(@class,"ant-btn-icon-only")]').nth(0);
    this.syncButton         = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(@class,"ant-btn-default") and contains(@class,"ant-btn-icon-only")]').nth(0);
  }

  async navigate() {
    // Creative Agent opens Ads Library by default — wait for that initial loader to finish first
    await this.adsLibraryContent.waitFor({ state: 'visible' });
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    // Now click My Ads tab and wait for its own loader
    await this.myAdsTab.click({ force: true });
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.adCardList.first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  }

  // Clicks a sub-tab label and waits for the loader to finish
  async clickSubTab(subTabLocator) {
    await subTabLocator.click();
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  // Returns { loaded: X, total: Y } parsed from "X of Y ads"
  async getResultsLoadedAndTotal() {
    let text = '';
    await expect.poll(
      async () => {
        try { text = await this.resultsCount.innerText(); return true; }
        catch { return false; }
      },
      { timeout: 30000, intervals: [500] }
    ).toBe(true);
    const [loadedStr, rest] = text.split(' of ');
    return {
      loaded: parseInt(loadedStr.trim().replace(/,/g, '')),
      total:  parseInt(rest.split(' ads')[0].trim().replace(/,/g, '')),
    };
  }
}
