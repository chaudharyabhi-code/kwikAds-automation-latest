export class AdsLibrary {
  constructor(page) {
    this.page = page;
    this.adsLibraryContent       = this.page.locator('div[id="single-spa-application:@gokwik/kwikads"]');
    this.adsLibraryTab           = this.adsLibraryContent.locator('button').filter({ hasText: 'Ad Library' });
    this.searchInputBox          = this.adsLibraryContent.locator('input[placeholder="Search ads by Library ID, copy, brand name, layout attributes..."]');
    this.brandNameFilter         = this.adsLibraryContent.locator('label').filter({ hasText: 'Brand Name' }).locator('..').locator('.ant-select');
    this.adFormatFilter          = this.adsLibraryContent.locator('label').filter({ hasText: 'Ad Format' }).locator('..').locator('.ant-select');
    this.allStatusFilter         = this.adsLibraryContent.locator('label').filter({ hasText: 'All Status' }).locator('..').locator('.ant-select');
    this.kaaiAnalysisFilter      = this.adsLibraryContent.locator('label').filter({ hasText: 'Kaai Analysis' }).locator('..').locator('.ant-select');
    this.launchDateRangePicker   = this.adsLibraryContent.locator('.ant-picker-range');
    this.sortMetricsBy           = this.adsLibraryContent.locator('label').filter({ hasText: 'Sort Metrics By' }).locator('..').locator('.ant-select');
    this.minDaysRunningInput     = this.adsLibraryContent.locator('input[type="number"]');
    this.orderDescButton         = this.adsLibraryContent.locator('button').filter({ hasText: 'Desc' });
    this.resultsCount            = this.adsLibraryContent.locator('span').filter({ hasText: /\d+ of [\d,]+ ads/ });
    this.emptyState              = this.adsLibraryContent.locator('.ant-empty-description').filter({ hasText: 'No ads found matching your search' });
    this.brandDropdownOptions    = this.page.locator('.ant-select-dropdown .ant-select-item-option');
    this.brandDropdownNoData     = this.page.locator('.ant-select-dropdown .ant-empty, .ant-select-dropdown .ant-select-empty').filter({ hasText: 'No data' });
    this.adFormatDropdownOptions = this.page.locator('.ant-select-dropdown .ant-select-item-option');
    this.adCardVideoLabels       = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').getByText('VIDEO', { exact: true });
    this.adCardImageLabels       = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').getByText('IMAGE', { exact: true });
    this.allStatusDropdownOptions = this.page.locator('.ant-select-dropdown .ant-select-item-option');
    this.statusOptionAllAds      = this.page.locator('.ant-select-dropdown').getByTitle('All Ads', { exact: true });
    this.statusOptionActiveAds   = this.page.locator('.ant-select-dropdown').getByTitle('Active Ads', { exact: true });
    this.statusOptionInactiveAds = this.page.locator('.ant-select-dropdown').getByTitle('Inactive Ads', { exact: true });
    this.statusOptionArchivedAds = this.page.locator('.ant-select-dropdown').getByTitle('Archived Ads', { exact: true });
    this.activeAdBadges          = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').getByText(/^Active/);
    this.inactiveAdBadges        = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').getByText('Inactive', { exact: true });
    this.archivedAdBadges        = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').getByText('Archived', { exact: true });
    this.kaaiButton              = this.adsLibraryContent.locator('button').filter({ hasText: /KAAI/i }).nth(1);
    this.selectButton            = this.adsLibraryContent.locator('button').filter({ hasText: 'Select' });
    this.kaaiOptionAll           = this.page.locator('.ant-select-dropdown').getByTitle('All', { exact: true });
    this.kaaiOptionAnalysed      = this.page.locator('.ant-select-dropdown').getByTitle('KAAI Analysed', { exact: true });
    this.kaaiOptionNotAnalysed   = this.page.locator('.ant-select-dropdown').getByTitle('Not Analysed', { exact: true });
    // Purple filled = KAAI analysed card button; white outlined = not analysed card button
    this.kaaiAnalysedCardButtons    = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').locator('button[title="KAAI analysis ready"][style*="rgb(126, 34, 206)"]');
    this.kaaiNotAnalysedCardButtons = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').locator('button[style*="rgba(250, 245, 255, 0.6)"]');
    this.orderAscButton             = this.adsLibraryContent.locator('button').filter({ hasText: 'Asc' });
    this.adCardList                 = this.adsLibraryContent.locator('[data-testid="virtuoso-item-list"]');
    // KAAI coverage popover (opens on clicking the "KAAI XX%" button)
    this.kaaiCoverageButton         = this.adsLibraryContent.locator('button').filter({ hasText: /KAAI \d+%/ });
    this.kaaiCoveragePopover        = this.page.locator('.ant-popover').filter({ hasText: 'KAAI Coverage' });
  }

  async navigateToAdsLibrary() {
    await this.adsLibraryContent.waitFor({ state: 'visible' });
    await this.adsLibraryTab.click({ force: true });
    await this.page.waitForLoadState('networkidle');
    await this.page.locator("div span[aria-label='loading']").nth(0).waitFor({ state: 'hidden' });
  }

  async waitForFilter() {
    await this.page.locator("div span[aria-label='loading']").nth(0).waitFor({ state: 'hidden' });
    await this.page.waitForLoadState('networkidle');
  }

  async getResultsCount() {
    const text = await this.resultsCount.innerText();
    return parseInt(text.split('of')[1].split('ads')[0].trim().replace(/,/g, ''));
  }

  async selectStatus(status) {
    await this.allStatusFilter.click();
    await this.page.locator('.ant-select-dropdown').getByTitle(status, { exact: true }).click();
    await this.waitForFilter();
  }

  async selectAdFormat(format) {
    await this.adFormatFilter.click();
    await this.adFormatDropdownOptions.filter({ hasText: format }).click();
    await this.waitForFilter();
  }

  async selectKaaiOption(option) {
    await this.kaaiAnalysisFilter.click();
    await this.page.locator('.ant-select-dropdown').getByTitle(option, { exact: true }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async searchBrandDropdown(text) {
    await this.brandNameFilter.click();
    await this.brandDropdownOptions.first().waitFor({ state: 'visible' });
    await this.page.keyboard.type(text);
  }

  async searchAd(query) {
    await this.searchInputBox.fill(query);
    await this.page.waitForTimeout(1000);
    await this.searchInputBox.press('Enter');
  }

  // dateFrom / dateTo format: 'YYYY-MM-DD'  (e.g. '2026-01-06')
  async setDateRange(dateFrom, dateTo) {
    // The two text inputs live inside the picker component, not the calendar dropdown
    const fromInput = this.launchDateRangePicker.locator('.ant-picker-input').first().locator('input');
    const toInput   = this.launchDateRangePicker.locator('.ant-picker-input').last().locator('input');

    // Click from-input, type the date, Tab to move to to-input
    await fromInput.click();
    await this.page.waitForSelector('.ant-picker-dropdown', { state: 'visible' });
    await fromInput.fill(dateFrom);
    await fromInput.press('Tab');

    // Now fill the to-input and press Enter to confirm and close the picker
    await toInput.fill(dateTo);
    await toInput.press('Enter');

    await this.waitForFilter();
  }

  async sortAsc() {
    // Button label shows current state — click "Desc" button to switch from DESC → ASC
    await this.orderDescButton.click();
    await this.waitForFilter();
  }

  async sortDesc() {
    // Button label shows current state — click "Asc" button to switch from ASC → DESC
    await this.orderAscButton.click();
    await this.waitForFilter();
  }

  async openKaaiCoveragePopover() {
    await this.kaaiCoverageButton.click();
    await this.kaaiCoveragePopover.waitFor({ state: 'visible' });
  }

  // Returns { analyzed, pending, total, percentage } from the KAAI coverage popover
  async getKaaiCoverageStats() {
    const text = await this.kaaiCoveragePopover.innerText();
    const parse = (label) =>
      parseInt((text.match(new RegExp(label + '[\\s\\t]+([\\d,]+)')) || [])[1]?.replace(/,/g, '') || '0');

    const analyzed   = parse('Analyzed');
    const pending    = parse('Pending');
    const total      = parse('Total');
    const btnText    = await this.kaaiCoverageButton.innerText();
    const percentage = parseInt(btnText.match(/(\d+)%/)[1]);

    return { analyzed, pending, total, percentage };
  }

  // Returns a Date object from the first ad card's launch date (e.g. "Jan 19, 2025")
  async getFirstAdLaunchDate() {
    const firstCard = this.adCardList.locator('[data-index="0"] div[style*="rgb(255, 255, 255)"]').nth(0);
    await firstCard.waitFor({ state: 'visible' });
    // Date is rendered as a <span> next to the calendar SVG icon, e.g. "Jan 19, 2025"
    const dateText = await firstCard.locator('span[style*="rgb(100, 116, 139)"]').nth(0).innerText();
    return new Date(dateText);
  }
}
