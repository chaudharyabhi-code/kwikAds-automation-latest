import { expect } from '@playwright/test';
import { startCapturingClipboardWrites, waitForClipboardWrite } from './clipboard';

export class AdsLibrary {
  constructor(page) {
    this.page = page;

    // ── DOM/framework details the specs assert against ────────────────────────
    // Active nav tab is blue text + blue bottom border.
    this.ACTIVE_TAB_COLOR = 'rgb(0, 75, 141)';
    // Ant Design adds this class to a checked checkbox wrapper.
    this.CHECKED_CHECKBOX_CLASS = /ant-checkbox-wrapper-checked/;
    // Ad-card status badge colours (confirmed in DevTools)
    this.BADGE_COLOR_ACTIVE   = 'rgb(82, 196, 26)';   // green
    this.BADGE_COLOR_INACTIVE = 'rgb(255, 77, 79)';   // red
    this.BADGE_COLOR_ARCHIVED = 'rgb(140, 140, 140)'; // grey

    this.adsLibraryContent       = this.page.locator('div[id="single-spa-application:@gokwik/kwikads"]');
    this.adsLibraryTab           = this.adsLibraryContent.locator('button').filter({ hasText: 'Ad Library' });
    this.searchInputBox          = this.adsLibraryContent.locator('input[placeholder="Search ads by Library ID, copy, brand name, layout attributes..."]');
    this.searchClearBtn          = this.adsLibraryContent.locator('button[aria-label="Clear search"]');
    this.brandNameFilter         = this.adsLibraryContent.locator('label').filter({ hasText: 'Brand Name' }).locator('..').locator('.ant-select');
    this.adFormatFilter          = this.adsLibraryContent.locator('label').filter({ hasText: 'Ad Format' }).locator('..').locator('.ant-select');
    this.allStatusFilter         = this.adsLibraryContent.locator('label').filter({ hasText: 'All Status' }).locator('..').locator('.ant-select');
    this.kaaiAnalysisFilter      = this.adsLibraryContent.locator('label').filter({ hasText: 'Kaai Analysis' }).locator('..').locator('.ant-select');
    this.launchDateRangePicker   = this.adsLibraryContent.locator('.ant-picker-range');
    // Ant Design calendar dropdown (rendered at body level) and its disabled (future) date cells
    this.datePickerDropdown      = this.page.locator('.ant-picker-dropdown');
    this.datePickerDisabledCells = this.datePickerDropdown.locator('.ant-picker-cell-disabled');
    this.sortMetricsBy           = this.adsLibraryContent.locator('label').filter({ hasText: 'Sort Metrics By' }).locator('..').locator('.ant-select');
    this.minDaysRunningInput     = this.adsLibraryContent.locator('input[type="number"]');
    this.orderDescButton         = this.adsLibraryContent.locator('button').filter({ hasText: 'Desc' });
    this.resultsCount            = this.adsLibraryContent.locator('span').filter({ hasText: /\d+ of [\d,]+ ads/ });
    this.emptyState              = this.adsLibraryContent.locator('.ant-empty-description').filter({ hasText: 'No ads found matching your search' });
    // Selected-tag remove "x" and the empty-state placeholder inside the Brand Name select
    this.brandFilterRemoveBtn    = this.brandNameFilter.locator('.ant-select-selection-item-remove');
    // Page-level "Clear all" button next to the search box — resets every active filter in
    // one click. Only rendered while at least one filter is applied. CSS uppercases it, so
    // the DOM text is "Clear all".
    this.clearAllFiltersButton   = this.adsLibraryContent.locator('button').filter({ hasText: /^clear all$/i });
    // Funnel toggle beside the search box. The filter row can be COLLAPSED, in which case
    // Brand Name / Ad Format / etc. are not in the DOM at all and any filter interaction
    // hangs waiting for a control that will never appear.
    // Primary guess: an Ant filter icon. Fallback: an icon-only button in the header that
    // is not a card 3-dot trigger. Verify against the real DOM if expansion ever fails.
    this.filtersToggleButton     = this.adsLibraryContent
      .locator('button')
      .filter({ has: this.page.locator('.anticon-filter, svg[data-icon="filter"], svg[data-icon="control"]') })
      .or(this.adsLibraryContent.locator('button:has(svg):not(.ant-dropdown-trigger)').filter({ hasText: /^\s*$/ }))
      .first();
    this.brandFilterPlaceholder  = this.brandNameFilter.locator('.ant-select-selection-placeholder');
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
    this.activeAdBadges = this.adsLibraryContent
  .locator('.virtualized-ad-grid-scroller span[style*="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 9999px; font-size: 8px; font-weight: 700;"]')
  .getByText(/^Active/);

this.inactiveAdBadges = this.adsLibraryContent
  .locator('.virtualized-ad-grid-scroller span[style*="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 9999px; font-size: 8px; font-weight: 700;"]')
  .getByText('Inactive', { exact: true });

this.archivedAdBadges = this.adsLibraryContent
  .locator('.virtualized-ad-grid-scroller span[style*="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 9999px; font-size: 8px; font-weight: 700;"]')
  .getByText('Archived', { exact: true });this.kaaiButton              = this.adsLibraryContent.locator('button').filter({ hasText: /KAAI/i }).nth(1);
    this.selectButton            = this.adsLibraryContent.locator("xpath=//button[contains(text(),'Select')]")
    this.kaaiOptionAll           = this.page.locator('.ant-select-dropdown').getByTitle('All', { exact: true });
    this.kaaiOptionAnalysed      = this.page.locator('.ant-select-dropdown').getByTitle('KAAI Analysed', { exact: true });
    this.kaaiOptionNotAnalysed   = this.page.locator('.ant-select-dropdown').getByTitle('Not Analysed', { exact: true });
    // Purple filled = KAAI analysed card button; white outlined = not analysed card button
    this.kaaiAnalysedCardButtons    = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').locator('button[title="KAAI analysis ready"][style*="rgb(126, 34, 206)"]');
    this.kaaiNotAnalysedCardButtons = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').locator('button[style*="rgba(250, 245, 255, 0.6)"]');
    this.orderAscButton             = this.adsLibraryContent.locator('button').filter({ hasText: 'Asc' });
    this.adCardList                 = this.adsLibraryContent.locator('[data-testid="virtuoso-item-list"]');
    // Scrollable viewport that wraps the virtualised ad grid
    this.virtualizedGridScroller    = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller');
    // Page-level loading spinner inside the Creative Agent shell
    this.pageSpinner                = this.adsLibraryContent.locator("span[aria-label='loading']").first();
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
    // Clickable collection rows inside the Save to Collection modal
    this.saveToCollectionRows       = this.saveToCollectionModal.locator('[style*="cursor: pointer"]');
    // 3-dot (kebab) menu on the first ad card
    this.firstCardMenuButton        = this.adCardList.locator('[data-index="0"]').locator('button.ant-dropdown-trigger');
    // Every 3-dot trigger currently rendered in the grid. Indexing per ROW is unsafe: the
    // grid renders 3 cards per row on a maximised window but only 1 in a headless CI
    // window, so [data-index="0"] >> nth(1) simply does not exist there.
    this.cardMenuTriggers           = this.adCardList.locator('button.ant-dropdown-trigger');
    // Scope to the OPEN dropdown: Ant Design leaves previously-opened menus in the DOM
    // marked .ant-dropdown-hidden, so a plain .ant-dropdown match accumulates stale
    // copies and trips strict mode once more than one card menu has been opened.
    // .first() matters: while one card menu closes and another opens, BOTH are briefly
    // un-hidden, so a bare match resolves to 2 elements and every waitFor/click on it
    // fails strict mode mid-transition.
    this.cardDropdownMenu           = this.page.locator('.ant-dropdown:not(.ant-dropdown-hidden)').filter({ hasText: 'View Meta Ad Link' }).first();
    this.cardDropdownItems          = this.cardDropdownMenu.locator('li[role="menuitem"]');
    // Individual menu items. Each <li> carries data-menu-id="rc-menu-uuid-<random>-1-<key>";
    // the uuid changes per render but the trailing key is stable, so match on the suffix.
    this.cardMenuShareCreative      = this.cardDropdownMenu.locator('li[data-menu-id$="-share"]');
    this.cardMenuDownloadCreative   = this.cardDropdownMenu.locator('li[data-menu-id$="-download"]');
    this.cardMenuViewMetaAdLink     = this.cardDropdownMenu.locator('li[data-menu-id$="-meta-link"]');
    this.cardMenuSaveToCollection   = this.cardDropdownMenu.locator('li[data-menu-id$="-save-to-collection"]');
    this.cardMenuCopyLibraryId      = this.cardDropdownMenu.locator('li[data-menu-id$="-copy-id"]');
    this.cardMenuTagCompetitor      = this.cardDropdownMenu.locator('li[data-menu-id$="-competitor"]');
    // Any currently-open (not hidden) card dropdown — used to assert only one menu is open at a time
    this.openCardDropdowns          = this.page.locator('.ant-dropdown:not(.ant-dropdown-hidden)');
    // Card detail modal (opens by clicking a card or the KAAI Analysis button)
    this.cardDetailModal      = this.page.locator('div[aria-modal="true"]').filter({ hasText: 'KAAI Analysis' });
    // Span whose text content is "Library ID: 1394977966061986 [copy icon]"
    this.cardDetailLibraryIdEl = this.cardDetailModal.locator('span').filter({ hasText: /^Library ID:/ }).first();
    this.cardDetailCloseBtn    = this.cardDetailModal.locator('button[aria-label="Close"]');
    // Header meta shown above the tabs
    this.cardDetailLivePlatformBadge = this.cardDetailModal.getByText('Live Platform Ad');
    this.cardDetailActivePeriod      = this.cardDetailModal.getByText('ACTIVE PERIOD');
    this.cardDetailFormats           = this.cardDetailModal.getByText('FORMATS');
    this.cardDetailLiveChannels      = this.cardDetailModal.getByText('LIVE CHANNELS');
    // In-modal tabs
    this.cardDetailKaaiTab           = this.cardDetailModal.getByText('KAAI Analysis', { exact: true });
    this.cardDetailAdCopyTab         = this.cardDetailModal.getByText('Ad Copy Details', { exact: true });
    // In-modal footer action buttons
    this.cardDetailSaveToCollectionBtn = this.cardDetailModal.locator('button').filter({ hasText: 'Save to Collection' });
    this.cardDetailRequestCreativeBtn  = this.cardDetailModal.locator('button').filter({ hasText: 'Request Creative' });
    this.cardDetailCompetitorBtn       = this.cardDetailModal.locator('button').filter({ hasText: /(Tag|Remove) Competitor/ });

    // KAAI Analysis state inside the modal
    // Spinner visible while AI is processing (not-analysed card)
    this.kaaiModalLoader       = this.cardDetailModal.locator('span[aria-label="loading"]');
    // Ant spin wrapper — aria-busy="true" while analysis is running
    this.kaaiModalSpinner      = this.cardDetailModal.locator('.ant-spin-spinning');
    // Caption rendered next to the spinner while the AI call is in flight
    this.kaaiModalAnalyzingText = this.cardDetailModal.getByText(/Analyzing creative with AI/i);
    // Top navigation tabs
    this.myAdsTab                  = this.adsLibraryContent.locator('button').filter({ hasText: /^My Ads$/ });
    this.competitorsTab            = this.adsLibraryContent.locator('button').filter({ hasText: /^Competitors$/ });
    this.aiAssistantTab            = this.adsLibraryContent.locator('button').filter({ hasText: /^AI Assistant$/ });
    // Competitors page — search input and page-level loader
    this.competitorSearchInput     = this.adsLibraryContent.locator('input[placeholder="Search competitor brands..."]');
    // Success toast (Ant Design global message)
    // .first(): Ant stacks notices, so overlapping success toasts trip strict mode on a
    // bare locator. Only ever used with toBeVisible()/waitFor, never counted.
    this.successToast              = this.page.locator('.ant-message-notice-success').first();
    // Remove Competitor confirmation modal
    this.removeCompetitorModal     = this.page.locator('div[aria-modal="true"]').filter({ hasText: 'Remove' });
    this.removeCompetitorConfirmBtn = this.removeCompetitorModal.locator('button').filter({ hasText: /^Remove$/ });
    this.removeCompetitorCancelBtn  = this.removeCompetitorModal.locator('button').filter({ hasText: 'Cancel' });
    // Breadcrumb
    this.breadcrumbNav              = this.page.locator('nav.ant-breadcrumb');
    this.breadcrumbHomeLink         = this.breadcrumbNav.locator('a[href="/"]');
    // The house SVG rendered inside the home crumb
    this.breadcrumbHomeIcon         = this.breadcrumbHomeLink.locator('[aria-label="home"]');
    this.breadcrumbCreativeAgentLink = this.breadcrumbNav.locator('a[href*="/kwikads"]');
    // Share Creative popup (opens from the share icon button on each ad card)
    // ":visible" matters here: closing an Ant modal leaves it in the DOM, so repeatedly
    // opening the share popup (as the fresh-ad scan does) accumulates stale copies and a
    // plain match trips strict mode. Matching only the visible one also keeps
    // not.toBeVisible()/waitFor('hidden') working, since a closed popup matches nothing.
    this.sharePopup            = this.page.locator('div[aria-modal="true"]:visible').filter({ hasText: 'Share Creative' });
    // Custom × close button (position:absolute, not the standard ant-modal-close)
    this.sharePopupCloseBtn    = this.sharePopup.locator('button[style*="position: absolute"]');
    // Checkboxes — use the label wrapper (.ant-checkbox-wrapper) so we can both
    // click (label is visible, no force needed) and assert state via
    // toHaveClass(/ant-checkbox-wrapper-checked/) for checked,
    // not.toHaveClass(...) for unchecked.
    this.shareKaaiCheckbox    = this.sharePopup.locator('.ant-checkbox-wrapper').filter({ hasText: 'KAAI Analysis' });
    this.shareUgcCheckbox     = this.sharePopup.locator('.ant-checkbox-wrapper').filter({ hasText: 'UGC Script' });
    this.sharePromptsCheckbox = this.sharePopup.locator('.ant-checkbox-wrapper').filter({ hasText: 'Prompts' });
    // Inner box of each checkbox — the element the tests click via evaluate()
    this.shareKaaiCheckboxInner    = this.shareKaaiCheckbox.locator('.ant-checkbox-inner');
    this.shareUgcCheckboxInner     = this.shareUgcCheckbox.locator('.ant-checkbox-inner');
    this.sharePromptsCheckboxInner = this.sharePromptsCheckbox.locator('.ant-checkbox-inner');
    // Primary action button — label is "Generate Link" before gen, "Regenerate Link" after
    this.shareActionBtn        = this.sharePopup.locator('button.ant-btn-primary');
    // Only visible after a link has been generated
    this.shareLinkInput        = this.sharePopup.locator('input[readonly]');
    this.shareCopyBtn          = this.sharePopup.locator('button').filter({ hasText: 'Copy' });
    // Spinner/skeleton shown inside the popup while this ad's share state loads from the
    // server. The rest of the app uses span[aria-label="loading"]; .ant-spin-spinning
    // covers the Ant default in case this popup renders that instead. .first() keeps
    // waitFor('hidden') working when neither is present (matches nothing → already hidden).
    this.sharePopupLoader      = this.sharePopup
      .locator('span[aria-label="loading"], .ant-spin-spinning').first();
  }

  // ── Ad card structure (locator factories) ─────────────────────────────────────
  // The grid is virtualised: each [data-index="N"] is a ROW holding two cards.
  // These keep every card-level selector here rather than in the specs.

  getAdRow(index = 0) {
    return this.adCardList.locator(`[data-index="${index}"]`);
  }

  // The ad cards inside a row. Structural (row > flex wrapper > column) rather than
  // width-based: the grid has already gone from 2 columns (calc(50%…)) to 3
  // (calc(33.3333%…)), which silently broke the old width selector.
  getCardsInRow(index = 0) {
    return this.getAdRow(index).locator('> div > div');
  }

  // Semi-transparent white sheet overlaid on each card while in select mode
  getRowSelectionOverlays(index = 0) {
    return this.getAdRow(index).locator('div[style*="rgba(255, 255, 255, 0.92)"]');
  }

  // White card bodies in a row — clicking one toggles its selection in select mode
  getRowCardBodies(index = 0) {
    return this.getAdRow(index).locator('div[style*="rgb(255, 255, 255)"]');
  }

  cardBrandName(card)        { return card.locator('h4').first(); }
  cardStatusBadge(card)      { return card.locator('span').filter({ hasText: /^(Active|Inactive|Archived)/ }).first(); }
  cardActiveBadge(card)      { return card.locator('span').filter({ hasText: /^Active/ }).first(); }
  cardLaunchDate(card)       { return card.locator('span[style*="rgb(100, 116, 139)"]').first(); }
  cardFormatLabel(card)      { return card.getByText('IMAGE', { exact: true }).or(card.getByText('VIDEO', { exact: true })); }
  cardKaaiButton(card)       { return card.locator('button').filter({ hasText: /KAAI/i }).first(); }
  // Buttons that remain directly on the card
  cardRequestCreativeButton(card) { return card.locator('button[title="Request Creative"]').first(); }

  // NOTE: Share / Download / Tag-Competitor are no longer icon buttons on the card —
  // they moved into the 3-dot "More options" menu (which grew from 3 to 6 items).
  // Use cardMenuShareCreative / cardMenuDownloadCreative / cardMenuTagCompetitor
  // after opening the menu. These three resolve to 0 elements on the current UI and
  // are kept only so older references keep resolving.
  cardShareButton(card)      { return card.locator('button[title="Share Creative"]').first(); }
  cardDownloadButton(card)   { return card.locator('button[title="Download Creative"]').first(); }
  cardCompetitorButton(card) { return card.locator('button[title="Tag Competitor"], button[title="Remove Competitor"]').first(); }
  cardMenuTrigger(card)      { return card.locator('button.ant-dropdown-trigger').first(); }

  // Exact brand-name text anywhere in the Creative Agent shell — used to confirm
  // a brand is (or is no longer) present on the Competitors page.
  brandNameText(name) {
    return this.adsLibraryContent.getByText(name, { exact: true });
  }

  // ── Grid scrolling / checkbox toggling (keep raw DOM APIs out of the specs) ──

  // Scrolls the virtualised ad grid down by `px` so virtuoso renders the next rows
  async scrollAdGrid(px = 400) {
    await this.virtualizedGridScroller.evaluate((el, y) => el.scrollBy({ top: y, behavior: 'instant' }), px);
  }

  // Scrolls the ad grid down by a full screen of its own height.
  // Preferred over a fixed pixel amount when the point is to move a card OUT of view: a
  // 400px scroll clears a row on a short window but not on a tall one, so behaviour tied
  // to the anchor leaving the viewport differed between local and CI.
  async scrollAdGridByOneScreen() {
    await this.virtualizedGridScroller.evaluate(
      el => el.scrollBy({ top: el.clientHeight, behavior: 'instant' }));
  }

  // Ant Design's checkbox label swallows normal clicks, so toggle via the inner box
  async toggleShareKaaiCheckbox() {
    await this.shareKaaiCheckboxInner.evaluate(el => el.click());
  }

  async toggleShareUgcCheckbox() {
    await this.shareUgcCheckboxInner.evaluate(el => el.click());
  }

  async toggleSharePromptsCheckbox() {
    await this.sharePromptsCheckboxInner.evaluate(el => el.click());
  }

  async navigateToAdsLibrary() {
    await this.adsLibraryContent.waitFor({ state: 'visible' });
    // Real (non-force) click: waits for the tab to be visible AND unobscured.
    // If an overlay (KYC modal, chat bubble, sticky header) is covering it,
    // this throws a clear "intercepts pointer events" error instead of
    // silently clicking the overlay and doing nothing.
    await this.adsLibraryTab.waitFor({ state: 'visible', timeout: 15000 });
    await this.adsLibraryTab.click();
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.adCardList.first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  }

  async waitForFilter() {
    await this.adsLibraryContent.locator("span[aria-label='loading']")
      .first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  async getResultsCount() {
    let text = '';
    await expect.poll(
      async () => {
        try { text = await this.resultsCount.innerText(); return true; }
        catch { return false; }
      },
      { timeout: 45000, intervals: [500] }
    ).toBe(true);
    return parseInt(text.split('of')[1].split('ads')[0].trim().replace(/,/g, ''));
  }

  // Returns { loaded: X, total: Y } from "X of Y ads"
  async getResultsLoadedAndTotal() {
    const text = await this.resultsCount.innerText();
    const [loadedStr, rest] = text.split(' of ');
    return {
      loaded: parseInt(loadedStr.trim().replace(/,/g, '')),
      total:  parseInt(rest.split(' ads')[0].trim().replace(/,/g, '')),
    };
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
  async searchValue(){
    return await this.searchInputBox.inputValue();
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

  // The order button is a toggle whose label shows the CURRENT order, so these are
  // written as "ensure" helpers: they no-op when the grid is already sorted that way.
  // (Without this, calling sortDesc() from the default DESC state looks for an "Asc"
  // button that isn't rendered and times out.)
  async sortAsc() {
    if (await this.orderDescButton.isVisible().catch(() => false)) {
      await this.orderDescButton.click();
      await this.waitForFilter();
    }
  }

  async sortDesc() {
    if (await this.orderAscButton.isVisible().catch(() => false)) {
      await this.orderAscButton.click();
      await this.waitForFilter();
    }
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

  // Opens the 3-dot menu on the Nth card in the first Virtuoso row (0-based)
  // Opens the Nth 3-dot menu in the grid (grid-wide index, not per row).
  async openNthCardMenu(n) {
    const btn = this.cardMenuTriggers.nth(n);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await this.cardDropdownMenu.waitFor({ state: 'visible', timeout: 10000 });
  }

  // Opens a DIFFERENT card's 3-dot menu than `excludeIndex`, picking one that is not
  // currently covered by the open menu (which would otherwise swallow the click).
  // Returns the index used, or -1 when no other trigger is reachable.
  async openAnotherCardMenu(excludeIndex = 0) {
    const total = await this.cardMenuTriggers.count();
    for (let i = 0; i < total; i++) {
      if (i === excludeIndex) continue;
      const trigger = this.cardMenuTriggers.nth(i);

      const reachable = await trigger.evaluate(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top && (el === top || el.contains(top));
      }).catch(() => false);
      if (!reachable) continue;

      await trigger.click({ timeout: 15000 });
      await this.openCardDropdowns.first().waitFor({ state: 'visible', timeout: 10000 });
      return i;
    }
    return -1;
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

  // ── Clipboard (for "Copy Library ID") ────────────────────────────────────────
  // Implementation lives in pages/clipboard.js so My Ads can use the same capture.
  // Kept as methods here so existing specs keep their adsLibrary.<method>() calls.
  async startCapturingClipboardWrites() {
    return startCapturingClipboardWrites(this.page);
  }

  async waitForClipboardWrite(timeout = 10000) {
    return waitForClipboardWrite(this.page, timeout);
  }

  // Opens the first ad's detail modal, reads its Library ID, and closes the modal again.
  async getFirstAdLibraryId() {
    await this.openFirstCardDetail();
    const id = await this.getCardDetailLibraryId();
    await this.closeCardDetail();
    return id;
  }

  async getCardDetailLibraryId() {
    const text = await this.cardDetailLibraryIdEl.innerText();
    // text is "Library ID: 1394977966061986" — extract the numeric ID
    return text.match(/Library ID:\s*(\d+)/)?.[1]?.trim() ?? '';
  }

  async closeCardDetail() {
    await this.cardDetailCloseBtn.click();
    // Ant Design exit animation can stall the hide — fall back to Escape
    await this.cardDetailModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
      await this.cardDetailModal.waitFor({ state: 'hidden' });
    });
  }

  // Waits for an in-flight KAAI analysis to finish: the spinner and the
  // "Analyzing creative with AI..." caption both disappear.
  async waitForKaaiAnalysisToFinish(timeout = 60000) {
    await this.kaaiModalLoader.waitFor({ state: 'hidden', timeout });
    await this.kaaiModalAnalyzingText.waitFor({ state: 'hidden', timeout }).catch(() => {});
  }

  // Clicks the KAAI Analysis button on the first card and waits for the modal to open.
  // Works for both analysed and not-analysed cards — filter first to control which type.
  async clickFirstKaaiButton() {
    const firstCard = this.adCardList.locator('[data-index="0"]');
    const kaaiBtn = firstCard.locator('button').filter({ hasText: /KAAI/i });
    await kaaiBtn.first().waitFor({ state: 'visible' });
    await kaaiBtn.first().click();
    await this.cardDetailModal.waitFor({ state: 'visible' });
  }

  // ── Competitor seeding (Ad Library → Brand filter → Tag Competitor) ──────────
  // Used as a precondition for the Competitors tab tests: a merchant may have no saved
  // competitors at all, which would leave those tests with nothing to act on.

  // Opens the Brand Name dropdown; returns how many brand options are listed.
  // Waits for the filter control itself first so a collapsed/not-yet-rendered filter row
  // fails on the control rather than on a confusing "no options" timeout.
  async openBrandDropdown() {
    await this.ensureFiltersExpanded();
    await this.brandNameFilter.waitFor({ state: 'visible', timeout: 20000 });
    await this.brandNameFilter.click();
    await this.brandDropdownOptions.first().waitFor({ state: 'visible', timeout: 20000 });
    return this.brandDropdownOptions.count();
  }

  // Makes the filter controls usable before touching them.
  //
  // Deliberately does NOT force-scroll: the filter row is position:sticky so it never
  // scrolls out of view, and driving scrollTop against the virtualised grid makes it
  // re-render continuously (a visible page jitter). Playwright already scrolls an element
  // into view before clicking it, so expanding a collapsed panel is the only thing needed.
  // True when the filter row is really open. isVisible() is NOT enough: the panel
  // collapses via a grid-template-rows transition on an overflow:hidden wrapper, so the
  // controls stay in the DOM and report "visible" while clipped to zero height. Clicking
  // one then gets intercepted by the wrapper and Playwright retries every 500ms, which is
  // what makes the page appear to shiver.
  async isFilterRowExpanded() {
    return this.brandNameFilter.evaluate(el => {
      const r = el.getBoundingClientRect();
      if (r.height < 5 || r.width < 5) return false;
      // Is the control actually the topmost element at its own centre? getBoundingClientRect
      // still reports full height when an ANCESTOR clips it (the panel collapses via
      // grid-template-rows on an overflow:hidden wrapper), and the sticky search bar can sit
      // over it — either way a click gets intercepted and Playwright retries forever.
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy);
      // Must be the element itself or a descendant — the same rule Playwright applies.
      // If an ANCESTOR is topmost (e.g. the overflow-hidden wrapper), the control is
      // clipped and a click would be intercepted, so that must count as NOT expanded.
      return !!top && (el === top || el.contains(top));
    }).catch(() => false);
  }

  async ensureFiltersExpanded() {
    // 1. Page scrolled down after tagging an ad? Bring the top (and the control) back.
    //    An off-viewport element also fails the hit-test below, so scrolling comes first
    //    and is retried before concluding the panel is collapsed.
    await this.scrollPageToTop();
    if (await this.isFilterRowExpanded()) return;

    await this.brandNameFilter.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.waitForTimeout(200);
    if (await this.isFilterRowExpanded()) return;

    // 2. Still not hittable → genuinely collapsed behind the funnel toggle.
    if (!(await this.hasFiltersToggle())) {
      throw new Error(
        'Brand Name filter is not clickable and no filter-toggle button was found. ' +
        'If the filter row is collapsed behind a funnel icon, update filtersToggleButton ' +
        'in pages/ads-library.js with that button\'s real selector.'
      );
    }
    await this.clickFiltersToggle();

    // The panel animates open over ~0.3s — poll until the control is actually hittable
    for (let i = 0; i < 25; i++) {
      if (await this.isFilterRowExpanded()) return;
      await this.page.waitForTimeout(200);
    }
    throw new Error('Clicked the filter toggle but the filter row never became clickable');
  }

  // The filter-panel toggle is an icon-only button sitting in the same row as the search
  // input, to its right (the funnel). Resolved from the live layout rather than a guessed
  // class name, since it is a custom icon rather than a standard Ant one.
  _filtersToggleFinder() {
    return (searchPlaceholderPrefix) => {
      const input = document.querySelector(`input[placeholder^="${searchPlaceholderPrefix}"]`);
      if (!input) return null;
      const row = input.getBoundingClientRect();
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => {
        if (b.classList.contains('ant-dropdown-trigger')) return false;
        if ((b.innerText || '').trim()) return false;          // icon-only
        if (!b.querySelector('svg')) return false;
        const r = b.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        return Math.abs(r.top - row.top) < 60 && r.left >= row.left; // same band, right side
      }) || null;
    };
  }

  async hasFiltersToggle() {
    return this.page.evaluate(
      ([src, prefix]) => !!eval(src)(prefix),
      [`(${this._filtersToggleFinder().toString()})`, 'Search ads by Library ID']
    ).catch(() => false);
  }

  async clickFiltersToggle() {
    return this.page.evaluate(
      ([src, prefix]) => { const el = eval(src)(prefix); if (el) { el.click(); return true; } return false; },
      [`(${this._filtersToggleFinder().toString()})`, 'Search ads by Library ID']
    ).catch(() => false);
  }

  // Scrolls the dashboard page container to the top.
  //
  // Clicking a card's 3-dot menu scrolls this container down, which is what puts the
  // filter row and the "Clear all" button out of reach. Resolves the container at runtime
  // (preferring .app-container, else the actual vertically-scrolling div) rather than
  // guessing a class name, and touches exactly ONE element — scrolling the virtualised ad
  // grid as well makes it re-render repeatedly and the page visibly jitters.
  async scrollPageToTop() {
    await this.page.evaluate(() => {
      const el = document.querySelector('.app-container')
        || Array.from(document.querySelectorAll('div')).find(d =>
             d.scrollHeight > d.clientHeight + 50 &&
             ['auto', 'scroll'].includes(getComputedStyle(d).overflowY));
      if (el) el.scrollTop = 0;
      window.scrollTo(0, 0);
    }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  // Closes the Brand Name dropdown and waits for the grid to re-filter.
  // Escape is used rather than clicking the search box: after the grid has scrolled, the
  // search box may be off-screen, so the click lands nowhere and the list stays open.
  async closeBrandDropdown() {
    await this.page.keyboard.press('Escape');
    await this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
      .first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.waitForFilter();
  }

  // Resets every active filter via the page-level "Clear all" button. No-ops when no
  // filter is applied (the button is not rendered then).
  async clearAllFilters() {
    await this.ensureFiltersExpanded();
    if (await this.clearAllFiltersButton.count() === 0) return;   // no filter applied
    await this.clearAllFiltersButton.click();
    await this.waitForFilter();
  }

  // Points the Brand Name filter at exactly ONE brand. Returns the brand's label.
  async selectOnlyBrand(index) {
    await this.clearAllFilters();
    await this.openBrandDropdown();
    const option = this.brandDropdownOptions.nth(index);
    const label  = (await option.innerText()).split('(')[0].trim();
    await option.click();
    await this.closeBrandDropdown();
    return label;
  }

  // Dismisses an open card 3-dot menu. Escape first; if the menu is still up (Ant keeps
  // the node around and the click can land nowhere after a scroll), click a neutral spot.
  async closeCardMenu() {
    await this.page.keyboard.press('Escape');
    if (await this.cardDropdownMenu.count() > 0) {
      await this.cardDropdownMenu.waitFor({ state: 'hidden', timeout: 3000 }).catch(async () => {
        await this.page.mouse.click(5, 5);
        await this.cardDropdownMenu.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      });
    }
  }

  // Tags the first ad in the grid as a competitor via its 3-dot menu.
  // Returns 'tagged', or 'already' when that brand is already a saved competitor
  // (the menu item then reads "Remove Competitor" and must not be clicked).
  async tagFirstAdAsCompetitor() {
    await this.openFirstCardMenu();
    const label = (await this.cardMenuTagCompetitor.innerText()).trim();

    if (/Remove Competitor/i.test(label)) {
      // Already a competitor — must NOT be clicked. Dismiss and move on.
      await this.closeCardMenu();
      return 'already';
    }

    await this.cardMenuTagCompetitor.click();
    await this.successToast.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
    await this.closeCardMenu();
    return 'tagged';
  }

  // Walks the Brand Name filter one brand at a time — select brand, tag one of its ads,
  // deselect it, move to the next — until `target` new competitors have been tagged.
  // Returns the number of NEW competitors created.
  async seedCompetitorsFromBrands(target = 5, maxBrands = 20) {
    const totalBrands = await this.openBrandDropdown();
    await this.closeBrandDropdown();

    const limit = Math.min(maxBrands, totalBrands);
    let tagged = 0;

    for (let i = 0; i < limit && tagged < target; i++) {
      const brand = await this.selectOnlyBrand(i);

      // Brand with no ads rendered — nothing to tag
      if (await this.adCardList.count() === 0) continue;

      const result = await this.tagFirstAdAsCompetitor();
      if (result === 'tagged') {
        tagged++;
        console.log(`  seeded competitor ${tagged}/${target}: ${brand}`);
      } else {
        // Menu showed "Remove Competitor" — this brand is already saved. Leave it alone
        // and move on; the next iteration clears the filter and picks the next brand.
        console.log(`  skipped (already a competitor): ${brand}`);
      }
    }

    // Leave the filter clean for whatever runs next
    await this.clearAllFilters();
    return tagged;
  }

  // ── Competitor Icon ───────────────────────────────────────────────────────────

  // Returns the brand name text from the first card in row 0
  async getFirstCardBrandName() {
    const row = this.adCardList.locator('[data-index="0"]');
    await row.waitFor({ state: 'visible' });
    return (await row.locator('h4').first().textContent()).trim();
  }

  // Clicks "Tag Competitor" on the given row/side; caller asserts the toast
  async clickTagCompetitorBtn(row = 0, side = 'first') {
    const rowLocator = this.adCardList.locator(`[data-index="${row}"]`);
    await rowLocator.waitFor({ state: 'visible' });
    const btn = rowLocator.locator('button[title="Tag Competitor"]');
    if (side === 'first') await btn.first().click();
    else await btn.last().click();
  }

  // Clicks "Remove Competitor" on the given row/side; caller asserts the modal
  async clickRemoveCompetitorBtn(row = 0, side = 'first') {
    const rowLocator = this.adCardList.locator(`[data-index="${row}"]`);
    await rowLocator.waitFor({ state: 'visible' });
    const btn = rowLocator.locator('button[title="Remove Competitor"]');
    if (side === 'first') await btn.first().click();
    else await btn.last().click();
  }

  async navigateToCompetitors() {
    await this.competitorsTab.click({ force: true });
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  // Types brandName into the search box, presses Enter, and waits for results to load
  async searchCompetitor(brandName) {
    await this.competitorSearchInput.waitFor({ state: 'visible' });
    await this.competitorSearchInput.fill(brandName);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(300);
    await this.page.locator("span[aria-label='loading']").first()
      .waitFor({ state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  // ── Share Creative popup ──────────────────────────────────────────────────────

  // row 0 = no scroll (default), row 1+ = scroll Virtuoso into view first
  // Opens the Share Creative popup. "Share Creative" used to be an icon button on the
  // card; it is now an item inside the card's 3-dot "More options" menu, so we open
  // that menu first. row 0 = no scroll (default), row 1+ = scroll the row into view.
  async openCardSharePopup(row = 0, side = 'first') {
    if (row > 0) {
      await this.virtualizedGridScroller.evaluate((el, r) => { el.scrollTop = r * 700; }, row);
      await this.page.waitForTimeout(400);
    }
    const rowLocator = this.getAdRow(row);
    await rowLocator.waitFor({ state: 'visible' });

    const trigger = rowLocator.locator('button.ant-dropdown-trigger');
    const menuBtn = side === 'first' ? trigger.first() : trigger.last();
    await menuBtn.scrollIntoViewIfNeeded();
    await menuBtn.click();
    await this.cardDropdownMenu.waitFor({ state: 'visible' });

    await this.cardMenuShareCreative.click();
    await this.sharePopup.waitFor({ state: 'visible' });
    await this.waitForSharePopupSettled();
  }

  // Opens the Share Creative popup on a specific card (row + position within that row).
  async openSharePopupOnCard(row = 0, cardIndex = 0) {
    const rowLocator = this.getAdRow(row);

    // The grid is virtualised: only rows near the viewport are mounted, so [data-index="N"]
    // for a row further down does not exist until we scroll there.
    //
    // Prefer scrolling the real element into view when it IS mounted. The old
    // unconditional `scrollTop = row * 700` hard-codes a row height, so on any row whose
    // actual height differs the jump lands somewhere else and the row never becomes
    // visible — that is what timed out on row 17 and aborted the whole fresh-ad scan.
    // Keep the estimate only as a fallback for reopening a row that has been unmounted.
    if (await rowLocator.count().catch(() => 0) > 0) {
      await rowLocator.scrollIntoViewIfNeeded().catch(() => {});
    } else if (row > 0) {
      await this.virtualizedGridScroller
        .evaluate((el, r) => { el.scrollTop = r * 700; }, row)
        .catch(() => {});
      await this.page.waitForTimeout(400);
    }
    await rowLocator.waitFor({ state: 'visible', timeout: 15000 });

    const card = this.getCardsInRow(row).nth(cardIndex);
    await card.scrollIntoViewIfNeeded();
    await this.cardMenuTrigger(card).click();
    await this.cardDropdownMenu.waitFor({ state: 'visible' });
    await this.cardMenuShareCreative.click();
    await this.sharePopup.waitFor({ state: 'visible' });
    await this.waitForSharePopupSettled();
  }

  // Waits until the popup's contents reflect the SERVER state for this ad.
  //
  // Why this exists: the modal becomes visible showing its DEFAULT skeleton — "Generate
  // Link", enabled, no link input — and only re-renders to "Regenerate Link" + disabled +
  // link input once the ad's share state arrives. Waiting on visibility alone therefore
  // sampled that pre-load window, so isSharePopupFresh() reported ads that ALREADY had a
  // link as fresh. Every share-popup failure traced back to this: the freshness scan
  // handed already-shared ads to tests that require a never-generated one.
  //
  // The loader wait handles it when the popup renders a spinner. There is no guarantee it
  // does, so the settle is confirmed independently: hold until label + disabled + link
  // visibility read identically several polls running.
  async waitForSharePopupSettled({ timeout = 15000, stableReads = 2, interval = 300 } = {}) {
    await this.sharePopupLoader.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const deadline = Date.now() + timeout;
    let previous = null;
    let matches = 0;

    while (Date.now() < deadline) {
      const current = await this._readShareActionState();
      if (current !== null && current === previous) {
        if (++matches >= stableReads) return;
      } else {
        matches = 0;
      }
      previous = current;
      await this.page.waitForTimeout(interval);
    }
    // Fall through rather than throw: the caller's own assertion gives a far better
    // failure message than "popup never settled" would.
  }

  // Single snapshot of everything in the popup that flips when the server state lands.
  // Returns null mid-render (the popup re-mounts, briefly resolving to nothing) so the
  // settle loop treats that as "not stable yet" instead of crashing.
  async _readShareActionState() {
    try {
      const [label, disabled, hasLink] = await Promise.all([
        this.shareActionBtn.innerText(),
        this.shareActionBtn.isDisabled(),
        this.shareLinkInput.isVisible(),
      ]);
      return `${label.trim()}|${disabled}|${hasLink}`;
    } catch {
      return null;
    }
  }

  // True when the OPEN share popup is in its never-generated default state:
  // no link yet and the action button still reads "Generate Link".
  // Assumes the popup has settled — openSharePopupOnCard() guarantees that.
  async isSharePopupFresh() {
    if (await this.shareLinkInput.isVisible()) return false;

    // NOT includes('Generate Link'): "Regenerate Link" contains that substring apart from
    // the capital G, so the old check told the two labels apart purely by accident of
    // casing. One copy tweak ("Generate link", "REGENERATE LINK") and every already-shared
    // ad would have read as fresh. Match case-insensitively and rule out "regenerate".
    const label = (await this.shareActionBtn.innerText()).trim().toLowerCase();
    return label.includes('generate link') && !label.includes('regenerate');
  }

  // Opens the Share Creative popup on the first card, whatever its state. Use this for
  // assertions that do not care whether a link has been generated — it avoids the cost of
  // scanning for a fresh ad.
  async openSharePopupOnFirstCard() {
    await this.openSharePopupOnCard(0, 0);
  }

  // Scans the ad grid for the first ad whose Share Creative popup is still in its
  // default (never-generated) state and LEAVES THAT POPUP OPEN.
  // Returns { row, card } for the ad found, or null if none was found.
  //
  // This replaces relying on fixed Library IDs from .env: once a link is generated for
  // an ad it can never show the default state again, so hard-coded ads "burn out" after
  // one run. Scanning finds a genuinely fresh ad on every run instead.
  // Virtualised rows are pulled in by scrolling as each batch is exhausted.
  // maxRows is deliberately generous: every test that generates a link consumes one
  // fresh ad, so over repeated runs the ads near the top of the grid all end up with
  // links and the scan has to reach further down to find an unused one.
  async findFreshSharePopup({ startRow = 12, maxScrolls = 30 } = {}) {
    // Start BELOW the top of the grid. Every test that generates a link permanently
    // consumes that ad, so repeated runs leave the first rows with no fresh ads — scanning
    // from row 0 re-walks a growing dead zone every time (measured: 25+ ads, >2 minutes).
    // Falls back to the top if the deeper region yields nothing.
    const visited = new Set();
    const deep = await this._scanForFreshShareAd(startRow, maxScrolls, visited);
    if (deep) return deep;
    return this._scanForFreshShareAd(0, maxScrolls, visited);
  }

  // Scans for an ad whose share popup is still in default state, leaving that popup OPEN.
  // Works off the rows virtuoso has ACTUALLY mounted rather than assuming a row height:
  // jumping to `row * 700px` can land where no [data-index] node exists, in which case a
  // naive scan silently finds nothing.
  async _scanForFreshShareAd(startRow, maxScrolls, visited = new Set()) {
    if (startRow > 0) {
      await this.virtualizedGridScroller
        .evaluate((el, r) => { el.scrollTop = r * 700; }, startRow)
        .catch(() => {});
      await this.page.waitForTimeout(600);
    } else {
      await this.virtualizedGridScroller.evaluate(el => { el.scrollTop = 0; }).catch(() => {});
      await this.page.waitForTimeout(600);
    }

    for (let step = 0; step < maxScrolls; step++) {
      const rows = (await this.adCardList.locator('[data-index]')
        .evaluateAll(els => els.map(e => Number(e.getAttribute('data-index'))))
        .catch(() => []))
        .filter(n => Number.isFinite(n))
        .sort((a, b) => a - b);

      const unvisited = rows.filter(row => !visited.has(row));

      for (const row of unvisited) {
        visited.add(row);

        const count = await this.getCardsInRow(row).count().catch(() => 0);
        for (let c = 0; c < count; c++) {
          // A row near the end of the grid can fail to mount within the open timeout —
          // that means "cannot inspect this candidate", NOT "this run is broken". Letting
          // it propagate aborted the whole scan, so findFreshSharePopup() threw instead of
          // returning null and the caller never got to skip.
          try {
            await this.openSharePopupOnCard(row, c);
          } catch {
            console.log(`    [scan] row ${row} card ${c} -> could not open, skipping`);
            await this.closeSharePopup().catch(() => {});
            continue;
          }

          const fresh = await this.isSharePopupFresh().catch(() => false);
          console.log(`    [scan] row ${row} card ${c} -> ${fresh ? 'FRESH' : 'has link'}`);
          if (fresh) return { row, card: c };
          await this.closeSharePopup().catch(() => {});
        }
      }

      // Running out of MOUNTED rows is not running out of ads. The grid is paginated —
      // reaching the bottom fires a loader that appends the next batch (~30 more) — so the
      // scan pulls the next page in and keeps going. Only a grid that genuinely has nothing
      // left to load ends the scan.
      if (!(await this._loadMoreAds())) break;
    }
    return null;
  }

  // Scrolls the ad grid to the bottom to trigger the next page, then waits for the batch to
  // land. Returns false only when the grid has nothing more to give — either the "X of Y
  // ads" counter says everything is loaded, or X stops growing.
  //
  // The counter is the reliable signal here. Watching mounted [data-index] nodes instead is
  // wrong: virtuoso unmounts rows that scroll out of view, so "no new rows mounted" happens
  // constantly while there is still plenty left to load.
  async _loadMoreAds(timeout = 20000) {
    const before = await this.getResultsLoadedAndTotal().catch(() => null);

    if (before && Number.isFinite(before.loaded) && Number.isFinite(before.total)
        && before.loaded >= before.total) {
      return false;
    }

    await this.virtualizedGridScroller
      .evaluate(el => { el.scrollTop = el.scrollHeight; })
      .catch(() => {});

    // No counter to poll — give the batch a moment and let the caller keep going.
    if (!before || !Number.isFinite(before.loaded)) {
      await this.page.waitForTimeout(1500);
      return true;
    }

    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(500);
      const now = await this.getResultsLoadedAndTotal().catch(() => null);
      if (now && Number.isFinite(now.loaded) && now.loaded > before.loaded) {
        console.log(`    [scan] loaded ${before.loaded} -> ${now.loaded} of ${now.total} ads`);
        return true;
      }
    }
    return false;
  }

  async closeSharePopup() {
    await this.sharePopupCloseBtn.click();
    // Ant Design exit animation adds ant-zoom-leave-active before hiding;
    // wait up to 5 s, then press Escape as fallback if animation gets stuck
    await this.sharePopup.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
      await this.sharePopup.waitFor({ state: 'hidden' });
    });
  }

  // True when this ad already has a server-persisted share link
  async hasGeneratedShareLink() {
    return this.shareLinkInput.isVisible();
  }

  // Clicks "Generate Link" / "Regenerate Link" and waits for the link input to appear.
  async generateShareLink() {
    // Read the button only once the server state has landed — otherwise the isDisabled()
    // check below samples the pre-load skeleton and always sees "enabled".
    await this.waitForSharePopupSettled();

    // Once a link exists the button reads "Regenerate Link" and stays disabled until the
    // selection DIFFERS from what was last generated. This used to toggle UGC off and
    // straight back on, which restores the original selection — so the app's change check
    // never fired, the button stayed disabled, and the unbounded click() below blocked for
    // the full 300s test timeout. Toggle once and leave the selection changed.
    if (await this.shareActionBtn.isDisabled()) {
      await this.toggleShareUgcCheckbox();
      await this._waitForShareActionEnabled();
    }

    // Bounded, and diagnosed. click() waits for the element to become enabled with no
    // timeout of its own, so on a disabled button it inherits the test timeout and reports
    // only "Test timeout of 300000ms exceeded" — no clue which actionability check failed.
    if (await this.shareActionBtn.isDisabled()) {
      const label = (await this.shareActionBtn.innerText()).trim();
      throw new Error(
        `Share popup action button is still disabled, so no link can be generated. ` +
        `Button reads "${label}". This ad most likely already has a share link and ` +
        `changing an option did not re-enable the button.`);
    }

    await this.shareActionBtn.click({ timeout: 15000 });
    await this.shareLinkInput.waitFor({ state: 'visible', timeout: 30000 });
  }

  // The checkbox toggles fire a synthetic el.click() via evaluate(), which returns before
  // React re-renders — so the button's disabled state must be polled, not read on the same
  // tick. Returns false on timeout and lets the caller raise the error.
  async _waitForShareActionEnabled(timeout = 5000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (!(await this.shareActionBtn.isDisabled())) return true;
      await this.page.waitForTimeout(200);
    }
    return false;
  }

  async getGeneratedShareLink() {
    return await this.shareLinkInput.inputValue();
  }

  async openKaaiCoveragePopover() {
    await this.kaaiCoverageButton.click();
    await this.kaaiCoveragePopover.waitFor({ state: 'visible' });
  }

  // ── Collections ──────────────────────────────────────────────────────────────

  async navigateToCollections() {
    await this.collectionsTab.click({ force: true });
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  // Opens the first collection card visible in the collections list
  async openFirstCollectionCard() {
    await this.collectionListCards.first().waitFor({ state: 'visible' });
    await this.collectionListCards.first().click();
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
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
