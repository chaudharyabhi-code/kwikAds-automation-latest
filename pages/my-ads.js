import { expect } from '@playwright/test';

export class MyAds {
  constructor(page) {
    this.page = page;

    // Number of ads the grid loads in its first batch (product behaviour)
    this.FIRST_PAGE_SIZE = 30;

    // ── DOM/framework details the specs assert against ────────────────────────
    // Ant Design disabled-state classes for the filter controls
    this.DISABLED_SELECT_CLASS = /ant-select-disabled/;
    this.DISABLED_PICKER_CLASS = /ant-picker-disabled/;


    this.adsLibraryContent = this.page.locator('div[id="single-spa-application:@gokwik/kwikads"]');
    // Page-level loading spinner inside the Creative Agent shell
    this.pageSpinner       = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    // Ant Design renders select dropdowns in a body-level portal and keeps closed ones
    // in the DOM with display:none — this picks the one that is actually open.
    this.openSelectDropdown = this.page.locator('.ant-select-dropdown')
      .filter({ hasNot: this.page.locator('[style*="display: none"]') })
      .last();
    this.openDropdownOptions        = this.openSelectDropdown.locator('.ant-select-item-option');
    this.openDropdownOptionContents = this.openSelectDropdown.locator('.ant-select-item-option-content');
    this.filtersDiv= this.adsLibraryContent.locator('div[style="border-radius: 14px; border: 1px solid rgb(226, 232, 240); background-color: rgb(255, 255, 255); padding: 12px 14px; display: flex; flex-direction: column; gap: 0px; box-shadow: rgba(0, 0, 0, 0.05) 0px 1px 2px; position: sticky; top: 0px; z-index: 1;"]').nth(0)

    // Top nav tab (Creative Agent → My Ads)
    this.myAdsTab = this.adsLibraryContent.getByRole('button', { name: 'My Ads' }).first();

    // Main tabs inside My Ads — Ads | Performance
    // Distinguished from sub-tabs (All/Meta/Draft) which carry a title attribute
    this.adsTab         = this.adsLibraryContent.locator('.ant-segmented-item-label:not([title])').filter({ hasText: /^Ads$/ }).first();
    this.performanceTab = this.adsLibraryContent.locator('.ant-segmented-item-label:not([title])').filter({ hasText: 'Performance' }).first();

    // Search bar
    this.searchInput       = this.filtersDiv.locator('input[placeholder="Search by creative name or ID..."]').first();
    this.resultsBadge      = this.filtersDiv.locator('span[style*="monospace"][style*="background-color: rgb(241, 245, 249)"]').first();
    this.searchClearButton = this.filtersDiv.locator('button[aria-label="Clear search"]').first();

    // Sub-tabs (All / Meta Creatives / Draft Creatives)
    this.subTabAll    = this.filtersDiv.locator('.ant-segmented-item-label[title="All"]').first();
    this.subTabMeta   = this.filtersDiv.locator('.ant-segmented-item-label[title="Meta Creatives"]').first();
    this.subTabDraft  = this.filtersDiv.locator('.ant-segmented-item-label[title="Draft Creatives"]').first();
    // The label wrapping the currently-selected sub-tab gets ant-segmented-item-selected
    this.activeSubTab = this.filtersDiv.locator('label.ant-segmented-item-selected').first();

    // Filters
    this.adFormatFilter  = this.filtersDiv.locator('label').filter({ hasText: 'Ad Format' }).locator('..').locator('.ant-select').first();
    this.statusFilter    = this.filtersDiv.locator('label').filter({ hasText: /^Status$/i }).locator('..').locator('.ant-select').first();
    this.kaaiFilter      = this.filtersDiv.locator('label').filter({ hasText: 'KAAI Analysis' }).locator('..').locator('.ant-select').first();
    this.sortByFilter    = this.filtersDiv.locator('label').filter({ hasText: /^Sort By$/i }).locator('..').locator('.ant-select').first();
    this.launchDateRange = this.filtersDiv.locator('.ant-picker-range').first();
    this.minDaysInput    = this.filtersDiv.locator('input[type="number"]').first();
    this.orderDescButton = this.filtersDiv.locator('button').filter({ hasText: 'Desc' }).first();

    // Card format labels — scoped to first scroller only (two exist in DOM; second is hidden)
    this.adCardVideoLabels = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first().getByText('VIDEO', { exact: true });
    this.adCardImageLabels = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first().getByText('IMAGE', { exact: true });
    // Card status badges — scoped to first scroller; My Ads uses "Paused" (not "Inactive")
    this.activeAdBadges   = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first()
      .locator('span[style*="border-radius: 9999px"][style*="font-weight: 700"]').filter({ hasText: /^Active/ });
    this.pausedAdBadges   = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first()
      .locator('span[style*="border-radius: 9999px"][style*="font-weight: 700"]').getByText('Paused', { exact: true });
    this.archivedAdBadges = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first()
      .locator('span[style*="border-radius: 9999px"][style*="font-weight: 700"]').getByText('Archived', { exact: true });
    // KAAI card buttons — purple filled = analysed, white/transparent = not analysed
    this.kaaiAnalysedCardButtons    = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first()
      .locator('button[title="KAAI analysis ready"][style*="rgb(126, 34, 206)"]');
    this.kaaiNotAnalysedCardButtons = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first()
      .locator('button[style*="rgba(250, 245, 255, 0.6)"]');
    // KAAI coverage popover (opens on clicking the KAAI XX% button)
    this.kaaiCoveragePopover = this.page.locator('.ant-popover').filter({ hasText: 'KAAI Coverage' });
    // Ad Format dropdown options (portal-rendered by Ant Design)
    this.adFormatDropdownOptions = this.page.locator('.ant-select-dropdown .ant-select-item-option');

    // Results and card list
    this.resultsCount = this.adsLibraryContent.locator('span').filter({ hasText: /\d+ of [\d,]+ ads/ }).first();
    this.adCardList   = this.adsLibraryContent.locator('[data-testid="virtuoso-item-list"]').first();
    this.firstAdCard  = this.adCardList.locator('[data-index="0"]').first().locator("div[style*='border: 1px solid rgb(233, 234, 235);'][style*='border-radius: 25px;'][style*='overflow: hidden;'][style*='background-color: rgb(255, 255, 255);'][style*='cursor: pointer;'][style*='box-shadow: none;'][style*='position: relative;'][style*='isolation: isolate;'][style*='opacity: 1;']").first();
    this.adCardNames  = this.adsLibraryContent.locator('[data-testid="virtuoso-item-list"] h2');
    this.scroller     = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first();
    this.emptyState   = this.adsLibraryContent.getByText('No ads found matching your search', { exact: true }).first();

    // Ad detail modal (portal-rendered by Ant Design, outside the app root)
    this.adDetailModal      = this.page.locator('.ant-modal-content').first();
    this.adDetailModalClose = this.page.locator('button.ant-modal-close').first();

    // Toolbar buttons — sibling div immediately after filtersDiv
    this.kaaiCoverageButton = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(.,"KAAI")]').nth(0);
    this.selectButton       = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(.,"Select")]').nth(0);
    this.uploadButton       = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(@class,"ant-btn-primary") and contains(@class,"ant-btn-icon-only")]').nth(0);
    this.syncButton         = this.filtersDiv.locator('xpath=./following-sibling::div[1]//button[contains(@class,"ant-btn-default") and contains(@class,"ant-btn-icon-only")]').nth(0);

    // Sync KAAI confirm modal (Ant Design confirm dialog)
    this.syncKaaiModal          = this.page.locator('.ant-modal-confirm').filter({ hasText: 'Sync KAAI' });
    this.syncKaaiModalSyncBtn   = this.syncKaaiModal.locator('button.ant-btn-primary');
    // Same button once the sync request is in flight (Ant adds ant-btn-loading)
    this.syncKaaiModalLoadingBtn = this.syncKaaiModal.locator('button.ant-btn-primary.ant-btn-loading');
    this.syncKaaiModalCancelBtn = this.syncKaaiModal.locator('button.ant-btn-default');
    // Tooltip shown on hover over the sync button
    this.syncKaaiTooltip        = this.page.locator('.ant-tooltip-inner').filter({ hasText: 'Sync KAAI' });
  }

  // A specific option inside the currently-open select dropdown, matched by label
  openDropdownOptionByText(label) {
    return this.openSelectDropdown.locator('.ant-select-item-option-content', { hasText: label });
  }

  // Scrolls the My Ads grid to the bottom to trigger the next page of results
  async scrollGridToBottom() {
    await this.scroller.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
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
    await this.adCardList.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  // Types a search term and presses Enter, then waits for the loader
  async searchFor(term) {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  // Clears the search (via X button if visible, else clears input) and presses Enter
  async clearSearch() {
    const clearVisible = await this.searchClearButton.isVisible().catch(() => false);
    if (clearVisible) {
      await this.searchClearButton.click();
    } else {
      await this.searchInput.clear();
      await this.searchInput.press('Enter');
    }
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  // Opens the first ad card modal and returns its Ad ID string, then closes the modal
  async getAdIdFromFirstCard() {
    await this.firstAdCard.scrollIntoViewIfNeeded();
    await this.firstAdCard.click({ force: true });
    await this.adDetailModal.waitFor({ state: 'visible', timeout: 10000 });
    const modalText = await this.adDetailModal.innerText();
    await this.adDetailModalClose.click();
    await this.adDetailModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    const match = modalText.match(/Ad ID\s*[:\s]+(\d{10,})/);
    return match?.[1] ?? null;
  }

  // Waits for the spinner to appear then disappear after any filter action
  async waitForFilter() {
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  // Clicks the Ad Format dropdown and selects the given option ("Video", "Image", "All Formats")
  async selectAdFormat(format) {
    await this.adFormatFilter.click();
    await this.adFormatDropdownOptions.filter({ hasText: format }).click();
    await this.waitForFilter();
  }

  // Clicks the Status dropdown and selects the given option ("All", "Active", "Paused", "Archived")
  async selectStatus(status) {
    await this.statusFilter.click();
    await this.page.locator('.ant-select-dropdown').getByTitle(status, { exact: true }).click();
    await this.waitForFilter();
  }

  // Clicks the KAAI Analysis dropdown and selects the given option ("All", "KAAI Analysed", "Not Analysed")
  async selectKaaiOption(option) {
    await this.kaaiFilter.click();
    await this.page.locator('.ant-select-dropdown').getByTitle(option, { exact: true }).click();
    await this.waitForFilter();
  }

  // Opens the KAAI coverage popover by clicking the KAAI XX% button
  async openKaaiCoveragePopover() {
    await this.kaaiCoverageButton.click();
    await this.kaaiCoveragePopover.waitFor({ state: 'visible' });
  }

  // Returns { analyzed, pending, total, percentage } parsed from the KAAI coverage popover
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

  // Clicks a main tab (Ads / Performance) and waits for the loader
  async clickMainTab(tabLocator) {
    await tabLocator.click();
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  // Clicks a sub-tab label and waits for the loader to finish
  async clickSubTab(subTabLocator) {
    await subTabLocator.click();
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }

  // Clicks the sync icon to open the Sync KAAI confirmation modal
  async openSyncKaaiModal() {
    await this.syncButton.click();
    await this.syncKaaiModal.waitFor({ state: 'visible' });
  }

  // Confirms the Sync KAAI modal and waits for it to close
  async confirmSyncKaai() {
    await this.syncKaaiModalSyncBtn.click();
    await this.syncKaaiModal.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
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
