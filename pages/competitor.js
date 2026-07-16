export class Competitor {
  constructor(page) {
    this.page = page;
    this.adsLibraryContent = this.page.locator('div[id="single-spa-application:@gokwik/kwikads"]');

    // Top navigation tab
    this.competitorsTab = this.adsLibraryContent.locator('button').filter({ hasText: /^Competitors$/ });

    // Page header elements
    this.searchInput             = this.adsLibraryContent.locator('input[placeholder="Search competitor brands..."]');
    this.savedCompetitorsHeading = this.adsLibraryContent.getByText(/Saved Competitors \(\d+\)/).first();
    this.syncedTodayBadge        = this.adsLibraryContent.locator('span').filter({ hasText: 'Synced today' }).first();
    this.mergeButton             = this.adsLibraryContent.locator('button').filter({ hasText: 'Merge' }).first();

    // Competitor cards — identified by data-competitor-id attribute present on every card
    this.competitorCards = this.adsLibraryContent.locator('[data-competitor-id]');

    // Delete/Remove confirmation modal — covers both regular ("Remove") and merged-group ("Delete Merged Group") variants
    this.removeCompetitorModal      = this.page.locator('div[aria-modal="true"].ant-modal-confirm');
    this.removeCompetitorConfirmBtn = this.removeCompetitorModal.locator('button').filter({ hasText: /^(Remove|Delete|Delete Group)$/ });
    this.removeCompetitorCancelBtn  = this.removeCompetitorModal.locator('button').filter({ hasText: 'Cancel' });

    // Tooltip that appears when hovering the "Synced today" badge
    this.syncedTodayTooltip = this.page.locator('.ant-tooltip-inner[role="tooltip"]');

    // Popover that appears when clicking the Sync button on a card
    this.syncPopover = this.page.locator('.ant-popover-inner[role="tooltip"]');

    // Ad Library virtual grid — becomes visible after "View Ads" navigates away from Competitors tab
    this.adLibraryGrid = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller');

    // Selected brand tag in the Ad Library brand filter — populated after "View Ads" navigation
    this.adLibraryBrandFilterTag = this.adsLibraryContent.locator('.ant-select-selection-item').first();

    // "X of Y ads" label shown in Ad Library after "View Ads" navigation
    this.adLibraryResultsCount = this.adsLibraryContent.locator('span').filter({ hasText: /\d+ of [\d,]+ ads/ });

    // Empty state shown when search returns no competitor results
    this.emptySearchResult = this.adsLibraryContent.getByText(/No competitors found matching your search/i);

    // Success toast (Ant Design global message)
    this.successToast = this.page.locator('.ant-message-notice-success');

    // ── Merge selection mode ─────────────────────────────────────────────────
    // Cancel button that appears in the header while in merge selection mode
    this.cancelMergeModeButton = this.adsLibraryContent.locator('button').filter({ hasText: 'Cancel' }).first();

    // "Merge (N)" button — disabled when < 2 selected, enabled at 2+
    this.mergeCountButton = this.adsLibraryContent.locator('button').filter({ hasText: /Merge \(\d+\)/ });

    // Instruction banner that changes as cards are selected
    this.mergeBanner = this.adsLibraryContent.locator('span').filter({ hasText: /Select at least 2|competitors selected/ });

    // ── Merge Competitors modal (ant-modal, NOT ant-modal-confirm) ───────────
    this.mergeModal = this.page.locator('.ant-modal-content').filter({ hasText: 'Merge Competitors' });
    this.mergeModalCancelBtn = this.mergeModal.locator('.ant-modal-footer').locator('button').filter({ hasText: 'Cancel' });
    this.mergeModalConfirmBtn = this.mergeModal.locator('button').filter({ hasText: 'Confirm & Merge' });
    this.mergeModalRadios = this.mergeModal.locator('input[type="radio"]');
  }

  async navigate() {
    // Creative Agent opens Ads Library by default — wait for that initial loader to finish first
    await this.adsLibraryContent.waitFor({ state: 'visible' });
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    // Now click Competitors tab and wait for its own loader
    await this.competitorsTab.click({ force: true });
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.savedCompetitorsHeading.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  // Clicks the Competitors tab and waits for the list to reload — used to return from Ad Library
  async backToCompetitorsTab() {
    await this.competitorsTab.click({ force: true });
    await this.savedCompetitorsHeading.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  // Hovers the "Synced today" badge to trigger the tooltip
  async hoverSyncedTodayBadge() {
    await this.syncedTodayBadge.hover();
    await this.syncedTodayTooltip.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Types brandName in the search box and waits for results
  async search(brandName) {
    await this.searchInput.fill(brandName);
    await this.page.keyboard.press('Enter');
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  // Returns the numeric count from "Saved Competitors (N)"
  async getSavedCount() {
    const text = await this.savedCompetitorsHeading.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Scrolls to the bottom of the page to ensure all cards are rendered, then returns the count
  async countAllCards() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForLoadState('networkidle');
    return this.competitorCards.count();
  }

  // Parses the total from "X of Y ads" label in Ad Library after View Ads navigation
  async getAdLibraryTotalCount() {
    await this.adLibraryResultsCount.waitFor({ state: 'visible', timeout: 15000 });
    const text = await this.adLibraryResultsCount.innerText();
    return parseInt(text.split('of')[1].split('ads')[0].trim().replace(/,/g, ''));
  }

  // Returns the Nth competitor card locator for scoped assertions in spec files
  getCard(n = 0) {
    return this.competitorCards.nth(n);
  }

  // ── Card field locators (scoped to the Nth card) ──────────────────────────

  getCardLogo(n = 0) {
    return this.competitorCards.nth(n).locator('img').first();
  }

  getCardName(n = 0) {
    return this.competitorCards.nth(n).locator('h4').first();
  }

  getCardStatus(n = 0) {
    return this.competitorCards.nth(n).locator('span').filter({ hasText: /^(ACTIVE|INACTIVE|MERGED)$/i }).first();
  }

  getCardLastSynced(n = 0) {
    return this.competitorCards.nth(n).locator('p[title*="Last synced"]').first();
  }

  getCardAdVolumeLabel(n = 0) {
    return this.competitorCards.nth(n).getByText('Ad Volume', { exact: true });
  }

  getCardFormatSplitLabel(n = 0) {
    return this.competitorCards.nth(n).getByText('Format Split', { exact: true });
  }

  getCardAdLongevityLabel(n = 0) {
    return this.competitorCards.nth(n).getByText('Ad Longevity');
  }

  getCardLongevityTesting(n = 0) {
    return this.competitorCards.nth(n).getByText('Testing', { exact: true });
  }

  getCardLongevityScaling(n = 0) {
    return this.competitorCards.nth(n).getByText('Scaling', { exact: true });
  }

  getCardLongevityEvergreen(n = 0) {
    return this.competitorCards.nth(n).getByText('Evergreen', { exact: true });
  }

  // Returns { active, total } ad volume numbers from the Nth card
  async getCardAdVolumeNumbers(n = 0) {
    return this.competitorCards.nth(n).evaluate(el => {
      const spans = [...el.querySelectorAll('span')];
      const activeLabel = spans.find(s => s.textContent.trim() === 'active');
      const totalLabel  = spans.find(s => s.textContent.trim() === 'total');
      return {
        active: parseInt(activeLabel?.previousElementSibling?.textContent ?? '0'),
        total:  parseInt(totalLabel?.previousElementSibling?.textContent  ?? '0'),
      };
    });
  }

  // Returns { video, image } counts from the Format Split section of the Nth card
  async getCardFormatSplitNumbers(n = 0) {
    return this.competitorCards.nth(n).evaluate(el => {
      const text = el.innerText;
      const videoMatch = text.match(/Video\s*\((\d+)\)/);
      const imageMatch = text.match(/Image\s*\((\d+)\)/);
      return {
        video: videoMatch ? parseInt(videoMatch[1]) : 0,
        image: imageMatch ? parseInt(imageMatch[1]) : 0,
      };
    });
  }

  // Returns { testing, scaling, evergreen } counts from the Ad Longevity section of the Nth card
  async getCardAdLongevityNumbers(n = 0) {
    return this.competitorCards.nth(n).evaluate(el => {
      const allDivs = [...el.querySelectorAll('div')];
      const findNum = label => {
        const div = allDivs.find(d => d.textContent.trim() === label);
        return div ? parseInt(div.previousElementSibling?.textContent ?? '0') : 0;
      };
      return {
        testing:   findNum('Testing'),
        scaling:   findNum('Scaling'),
        evergreen: findNum('Evergreen'),
      };
    });
  }

  // Returns the Sync button locator for the Nth card (first button in the card action row)
  getSyncButton(n = 0) {
    return this.competitorCards.nth(n).locator('button').first();
  }

  // Clicks Sync on the Nth competitor card (0-based)
  async syncCompetitor(n = 0) {
    await this.competitorCards.nth(n).locator('button').filter({ hasText: 'Sync' }).click();
  }

  // Clicks View Ads on the Nth competitor card (0-based)
  async clickViewAds(n = 0) {
    await this.competitorCards.nth(n).locator('button').filter({ hasText: 'View Ads' }).click();
  }

  // Clicks Delete on the Nth competitor card (0-based)
  async deleteCompetitor(n = 0) {
    await this.competitorCards.nth(n).locator('button').filter({ hasText: 'Delete' }).click();
  }

  // ── Merge helpers ──────────────────────────────────────────────────────────

  // Checkbox input inside the Nth card (only present in merge selection mode)
  getCardCheckbox(n = 0) { return this.competitorCards.nth(n).locator('input[type="checkbox"]'); }

  // "MERGED GROUP" badge tag on the Nth card
  getMergedGroupBadge(n = 0) { return this.competitorCards.nth(n).getByText('MERGED GROUP'); }

  // "View Merged Competitor Data (N)" expandable link on the Nth card
  getViewMergedDataLink(n = 0) { return this.competitorCards.nth(n).getByText(/View Merged Competitor Data/); }

  // Clicks the top-right Merge button and waits for selection-mode banner
  async enterMergeMode() {
    await this.mergeButton.click();
    await this.mergeBanner.waitFor({ state: 'visible', timeout: 5000 });
    await this.page.waitForTimeout(2000)
  }

  // Checks the merge checkbox on the Nth card
  async selectForMerge(n = 0) {
    await this.competitorCards.nth(n).locator('input[type="checkbox"]').check();
  }

  // Returns the numeric count from the "Merge (N)" button label
  async getMergeButtonCount() {
    const text = await this.mergeCountButton.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Exits merge selection mode via the Cancel button
  async cancelMergeMode() {
    await this.cancelMergeModeButton.click();
    await this.savedCompetitorsHeading.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Clicks the enabled "Merge (N)" button to open the Merge Competitors modal
  async clickMergeAction() {
    await this.mergeCountButton.click();
    await this.mergeModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Clicks "Confirm & Merge" and returns immediately — the toast appears while
  // the loader is still running and auto-dismisses in ~3s, so the caller must
  // assert it before calling waitForMergeToComplete().
  async confirmMerge() {
    await this.mergeModalConfirmBtn.click();
  }

  // Waits for the post-merge loader to finish and the competitor list to reload.
  // Call this AFTER asserting the success toast.
  async waitForMergeToComplete() {
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.savedCompetitorsHeading.waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
  }
}
