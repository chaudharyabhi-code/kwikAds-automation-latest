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
    this.selectButton            = this.adsLibraryContent.locator("xpath=//button[contains(text(),'Select')]")
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
    // Select mode toolbar elements (appear after clicking the Select button)
    this.addToCollectionButton      = this.adsLibraryContent.locator('button').filter({ hasText: 'Add to Collection' });
    this.cancelSelectionButton      = this.adsLibraryContent.locator('button').filter({ hasText: 'Cancel' });
    this.selectionCountText         = this.adsLibraryContent.locator('span').filter({ hasText: /\d+ selected/ });
    // Collections tab and list
    this.collectionsTab             = this.adsLibraryContent.locator('button').filter({ hasText: /^Collections$/ });
    this.collectionListCards        = this.adsLibraryContent.locator("xpath=//button[contains(.,'New Collection')]/ancestor::div[@style='display: flex; flex-direction: column; gap: 12px;']/div[contains(@style,'display: grid')]/div");
    // Inside an open collection
    this.openCollectionTitle        = this.adsLibraryContent.locator('div[style*="font-weight: 600"][style*="font-size: 18px"]');
    this.collectionShowingText      = this.adsLibraryContent.locator('span').filter({ hasText: /Showing \d+ ads/ });
    // Icon-only back button (no visible text) — first button of its kind in the collection header
    this.collectionBackButton       = this.adsLibraryContent.locator('button.ant-btn-icon-only').first();
    // "Save to Collection" modal opened from the Add to Collection toolbar button
    this.saveToCollectionModal      = this.page.locator('div[aria-modal="true"]').filter({ hasText: 'Save to Collection' });
    // 3-dot (kebab) menu on the first ad card
    this.firstCardMenuButton        = this.adCardList.locator('[data-index="0"]').locator('button.ant-dropdown-trigger');
    this.cardDropdownMenu           = this.page.locator('.ant-dropdown').filter({ hasText: 'View Meta Ad Link' });
    this.cardDropdownItems          = this.cardDropdownMenu.locator('li[role="menuitem"]');
    // Card detail modal (opens by clicking a card)
    this.cardDetailModal      = this.page.locator('div[aria-modal="true"]').filter({ hasText: 'KAAI Analysis' });
    // Span whose text content is "Library ID: 1394977966061986 [copy icon]"
    this.cardDetailLibraryIdEl = this.cardDetailModal.locator('span').filter({ hasText: /^Library ID:/ }).first();
    this.cardDetailCloseBtn    = this.cardDetailModal.locator('button[aria-label="Close"]');
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

  async enterSelectMode() {
    await this.selectButton.click();
    await this.cancelSelectionButton.waitFor({ state: 'visible' });
  }

  async exitSelectMode() {
    await this.cancelSelectionButton.click();
    await this.selectButton.waitFor({ state: 'visible' });
  }

  // Clicks the first ad card to select it in select mode
  async selectFirstAdCard() {
    await this.adCardList.locator('div[style*="rgba(255, 255, 255, 0.92)"]').nth(0).click({ force: true });
    await this.selectionCountText.waitFor({ state: 'visible' });
  }

  // Clicks the first N ad cards sequentially and returns the final count text
  async selectAdCards(count) {
    for (let i = 0; i < count; i++) {
      await this.page.waitForTimeout(1000)
      await this.adCardList.locator('div[style*="rgba(255, 255, 255, 0.92)"]').nth(0).click({ force: true });
    }
    await this.selectionCountText.waitFor({ state: 'visible' });
    return await this.selectionCountText.innerText();
  }

  // ── Card 3-dot menu ───────────────────────────────────────────────────────────

  async openFirstCardMenu() {
    await this.firstCardMenuButton.nth(0).click();
    await this.cardDropdownMenu.waitFor({ state: 'visible' });
  }

  async clickCardMenuOption(text) {
    await this.cardDropdownMenu.locator('li[role="menuitem"]').filter({ hasText: text }).click();
  }

  // Opens the detail modal of the first card by clicking its image/media area
  async openFirstCardDetail() {
    const firstCard = this.adCardList.locator('[data-index="0"]');
    // Click at y=100 inside the white card to land on the image area, away from corner buttons
    await firstCard.locator('div[style*="rgb(255, 255, 255)"]').first().click({ position: { x: 100, y: 100 } });
    await this.cardDetailModal.waitFor({ state: 'visible' });
  }

  async getCardDetailLibraryId() {
    const text = await this.cardDetailLibraryIdEl.innerText();
    // text is "Library ID: 1394977966061986" — extract the numeric ID
    return text.match(/Library ID:\s*(\d+)/)?.[1]?.trim() ?? '';
  }

  async closeCardDetail() {
    await this.cardDetailCloseBtn.click();
    await this.cardDetailModal.waitFor({ state: 'hidden' });
  }

  async openKaaiCoveragePopover() {
    await this.kaaiCoverageButton.click();
    await this.kaaiCoveragePopover.waitFor({ state: 'visible' });
  }

  // ── Collections ──────────────────────────────────────────────────────────────

  async navigateToCollections() {
    await this.collectionsTab.click({ force: true });
    await this.page.waitForLoadState('networkidle');
  }

  // Opens the first collection card visible in the collections list
  async openFirstCollectionCard() {
    await this.collectionListCards.first().waitFor({ state: 'visible' });
    await this.collectionListCards.first().click();
    await this.page.waitForLoadState('networkidle');
    await this.page.locator("div span[aria-label='loading']").nth(0).waitFor({ state: 'hidden' }).catch(() => {});
  }


  // Returns the title of the currently open collection
  async getOpenCollectionName() {
    return (await this.openCollectionTitle.first().innerText()).trim();
  }

  // Returns the integer ad count from the "Showing X ads" label inside an open collection
  async getOpenCollectionAdCount() {
    await this.collectionShowingText.waitFor({ state: 'visible' });
    const text = await this.collectionShowingText.innerText();
    return parseInt(text.match(/\d+/)[0]);
  }

  // Clicks the back arrow to return to the collections list
  async goBackFromCollection() {
    await this.collectionBackButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Opens the "Save to Collection" modal (must already be in select mode with cards selected)
  async openAddToCollectionModal() {
    await this.addToCollectionButton.click();
    await this.saveToCollectionModal.waitFor({ state: 'visible' });
  }

  // Reads the ad count shown next to a collection name in the "Save to Collection" modal.
  // Returns 0 when the collection is empty ("Empty board") or the name isn't found.
  async getCountForCollectionInModal(collectionName) {
    // Each row: cursor:pointer div → flex:1 div → [name div (font-weight:600), count div (font-size:11px)]
    const row = this.saveToCollectionModal
      .locator('[style*="cursor: pointer"]')
      .filter({ hasText: collectionName })
      .first();
    const countText = await row.locator('[style*="font-size: 11px"]').innerText();
    const match = countText.match(/(\d+)\s*ads?/i);
    return match ? parseInt(match[1]) : 0;
  }

  // Clicks the named collection row in the "Save to Collection" modal and waits for it to close
  async clickCollectionInModal(collectionName) {
    const row = this.saveToCollectionModal.locator('[style*="cursor: pointer"]')
      .filter({ hasText: collectionName }).first();
    await row.click();
    await this.saveToCollectionModal.waitFor({ state: 'hidden' });
    await this.page.waitForLoadState('networkidle');
  }

  // ── KAAI Coverage ─────────────────────────────────────────────────────────────

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
