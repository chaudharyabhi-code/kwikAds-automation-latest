import { expect } from '@playwright/test';

// The Ad Format dropdown's reset option. Its count is the total every individual format
// must sum to, so it is excluded whenever the individual formats are enumerated.
export const AD_FORMAT_ALL = 'All Formats';

// The Status filter's real statuses. "All" is the reset option and is excluded, since a card
// cannot carry an "All" badge.
export const AD_STATUSES = ['Active', 'Paused', 'Archived'];
export const STATUS_ALL = 'All';

// Actions in a card's 3-dot menu. Share and Download live here, not on the card face.
// "Delete Draft" is excluded — it only appears on draft cards.
// Metrics always shown on a card, and the ones revealed by the METRICS toggle.
export const CARD_METRICS = ['AD SPEND', 'VELOCITY', 'CTR'];
export const CARD_EXPANDED_METRICS = ['REVENUE', 'ROAS', 'NNR'];
export const CARD_COMPETITOR_SIGNALS = ['Quality', 'Engagement', 'Conversion'];

// Ad detail modal. Text is TITLE CASE in the DOM — the uppercase look comes from
// text-transform, so matching on "AD SPEND" here would find nothing (unlike the card, which
// really does hold uppercase text).
export const MODAL_TABS = ['Performance Matrix', 'KAAI Analysis', 'Ad Copy Details'];
export const MODAL_METRICS = [
  'Ad Spend', 'ROAS', 'Click-Through Rate', 'Total Clicks',
  'Orders Generated', 'Revenue', 'Spend Velocity', 'Net New Reach (Last Day)',
];
export const MODAL_COMPETITOR_SIGNALS = ['Quality Ranking', 'Engagement Ranking', 'Conversion Ranking'];
// The modal badge wording differs from the card badge: an Active ad reads "Live Platform Ad"
export const MODAL_STATUS_BADGES = { Active: 'Live Platform Ad', Paused: 'Paused', Archived: 'Archived' };

export const CARD_MENU_ACTIONS = [
  'Share Creative', 'Download Creative', 'Save to Collection', 'Copy ID',
];

// The 3-dot menu differs by creative type. Note the label discrepancy the product team should
// confirm: Meta says "Copy Ad ID", Draft says "Copy ID" — drafts have no published Meta ad id.
export const META_CARD_MENU = [
  'Share Creative', 'Download Creative', 'Save to Collection', 'Copy Ad ID',
];
export const DRAFT_CARD_MENU = [
  'Share Creative', 'Download Creative', 'Save to Collection', 'Copy ID', 'Delete Draft',
];


// ── Performance view (My Ads → Performance) ──────────────────────────────────
export const VIEW_DATA_BY_TABS = ['Ad Level', 'Hook', 'Narration', 'Message Style', 'Visual Style'];
export const PERF_COLUMNS = [
  'Ad creative', 'Ad Spends', 'Velocity', 'Impressions', 'Clicks', 'CTR',
  'Orders', 'Revenue', 'ROAS', 'Total Unique Reach', 'Benchmark',
];
// Defaults the view opens with. NOTE: the test case says FORMAT = Video in its expected result
// but FORMAT = ALL in its title — the app shows "All", which is what this asserts.
export const PERF_DEFAULTS = { status: 'Active', format: 'All', sortBy: 'Spend', order: 'Desc' };

// Strips currency, commas and spaces so two spellings of the same number compare equal. The
// modal groups digits the Indian way ("₹2,27,040") where the table groups them plainly
// ("₹227,040") — identical values, and a raw string comparison fails on the comma positions.
export function normaliseMetric(text) {
  return String(text ?? '').replace(/[₹,\s]/g, '');
}

// The table prints a metric in full where the modal abbreviates it once it grows: the row reads
// "2,030" and the modal "2K", the row "1,397" and the modal "1.4K". K = thousand, L = lakh.
// One decimal place, and a trailing ".0" is dropped — the app writes 2,030 as "2K", not "2.0K".
// A ₹ prefix and a % or x suffix are carried through; anything below 1,000 is left untouched.
//   "2,030" → "2K"      "1,397" → "1.4K"      "₹52,777" → "₹52.8K"      "1,52,777" → "1.5L"
export function abbreviateMetric(text) {
  const raw = String(text ?? '').trim();
  const parts = raw.match(/^(₹)?\s*([\d,]+(?:\.\d+)?)\s*(%|x)?$/i);
  if (!parts) return raw;

  const [, currency = '', digits, suffix = ''] = parts;
  const value = parseFloat(digits.replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 1000) return raw;

  const [scaled, unit] = value >= 100000 ? [value / 100000, 'L'] : [value / 1000, 'K'];
  return `${currency}${scaled.toFixed(1).replace(/\.0$/, '')}${unit}${suffix}`;
}

export class MyAds {
  constructor(page) {
    this.page = page;

    // Number of ads the grid loads in its first batch (product behaviour)
    this.FIRST_PAGE_SIZE = 30;

    // Status badge text colours, read from the browser. Active and Archived match the
    // Ads Library values; Paused and Uploaded are My Ads only.
    this.BADGE_COLOURS = {
      Active:   'rgb(82, 196, 26)',   // green
      Paused:   'rgb(250, 173, 20)',  // orange
      Archived: 'rgb(140, 140, 140)', // grey
      Uploaded: 'rgb(239, 68, 68)',   // red
    };

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
    // Anchored regexes — a bare "Ranking" would match all three of these
    this.qualityRankingFilter    = this.rankingFilter('Quality');
    this.engagementRankingFilter = this.rankingFilter('Engagement');
    this.conversionRankingFilter = this.rankingFilter('Conversion');
    // Sits in the page header, outside the filter card
    this.adAccountFilter = this.adsLibraryContent.locator('.ant-select')
      .filter({ hasText: 'Ad Accounts' }).first();

    // Card format labels — scoped to first scroller only (two exist in DOM; second is hidden)
    this.adCardVideoLabels = this.adCardFormatLabels('Video');
    this.adCardImageLabels = this.adCardFormatLabels('Image');
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
    // Ad Format dropdown options (portal-rendered by Ant Design).
    // Scoped to the OPEN dropdown: Ant leaves closed dropdowns in the DOM, so an unscoped
    // match also picks up Status/KAAI/Sort By options and can select from the wrong list.
    this.openDropdown = this.page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    this.adFormatDropdownOptions = this.openDropdown.locator('.ant-select-item-option');

    // Results and card list
    this.resultsCount = this.adsLibraryContent.locator('span').filter({ hasText: /\d+ of [\d,]+ ads/ }).first();
    this.adCardList   = this.adsLibraryContent.locator('[data-testid="virtuoso-item-list"]').first();
    // Ad cards. Two style fragments, not nine — the previous locator also demanded
    // "box-shadow: none;", which the card does not carry, so it matched nothing.
    this.adCards      = this.adCardList.locator('div[style*="cursor: pointer"][style*="border-radius: 25px"]');
    this.firstAdCard  = this.adCards.first();
    this.scroller     = this.adsLibraryContent.locator('.virtualized-ad-grid-scroller').first();
    this.emptyState   = this.adsLibraryContent.getByText('No ads found matching your search', { exact: true }).first();

    // Ad detail modal (portal-rendered by Ant Design, outside the app root)
    // ":visible" matters: closing an Ant modal leaves it in the DOM, so `.first()` on a bare
    // .ant-modal-content can resolve to a STALE closed modal. That is how a test read the ad
    // name from a previously-opened modal and asserted the wrong ad. Matching only the visible
    // one also keeps not.toBeVisible()/waitFor('hidden') working, since a closed modal then
    // matches nothing.
    this.adDetailModal      = this.page.locator('.ant-modal-content').first();
    this.adDetailModalClose = this.adDetailModal.locator('button.ant-modal-close').first();

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
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
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
  // Opens the first ad card's detail modal, reads its name and ID, then closes it.
  // Lets the search tests use real data from the page instead of hardcoded .env values.
  async getFirstAdNameAndId() {
    await this.firstAdCard.scrollIntoViewIfNeeded();
    await this.firstAdCard.click({ force: true });
    await this.adDetailModal.waitFor({ state: 'visible', timeout: 10000 });

    const name = (await this.adDetailModal.locator('h2').first().innerText()).trim();
    const modalText = await this.adDetailModal.innerText();

    await this.adDetailModalClose.click();
    await this.adDetailModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // "Ad ID: 120250895036710195" on Meta ads, "ID: 4" on drafts
    const id = modalText.match(/\bID\s*:?\s*(\d+)/i)?.[1] ?? null;
    return { name, id };
  }

  // Waits for the spinner to appear then disappear after any filter action
  async waitForFilter() {
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  // ── Ad card anatomy (card-scoped factories) ──────────────────────────────────
  card(n = 0) { return this.adCards.nth(n); }

  // Brand initial avatar in the card header
  cardInitialCircle(n = 0) {
    return this.card(n).locator('div[style*="border-radius: 50%"][style*="width: 32px"]').first();
  }
  cardName(n = 0) {
    return this.card(n).locator('div[style*="font-weight: 700"]').filter({ hasText: /\S/ }).first();
  }
  cardMenuTrigger(n = 0) { return this.card(n).locator('button.ant-dropdown-trigger').first(); }
  // Items in the open 3-dot menu — Share and Download live here, not on the card face
  get cardMenuItems() { return this.page.locator('.ant-dropdown:not(.ant-dropdown-hidden) li'); }
  // Ant marks destructive items with -item-danger, which is what renders "Delete Draft" red
  get cardMenuDangerItem() {
    return this.page.locator('.ant-dropdown:not(.ant-dropdown-hidden) li.ant-dropdown-menu-item-danger').first();
  }
  // Meta cards say "Copy Ad ID", drafts say "Copy ID" — match either
  get cardMenuCopyIdItem() {
    return this.cardMenuItems.filter({ hasText: /^Copy (Ad )?ID$/ }).first();
  }
  cardMenuItem(label) {
    return this.cardMenuItems.filter({ hasText: new RegExp(`^${label}$`) }).first();
  }

  async openCardMenu(n = 0) {
    await this.cardMenuTrigger(n).click();
    await this.cardMenuItems.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  // Menu labels in render order, so a spec can assert the exact list and its ordering.
  async getCardMenuLabels() {
    return (await this.cardMenuItems.allInnerTexts()).map(t => t.trim()).filter(Boolean);
  }

  async closeCardMenu() {
    await this.page.keyboard.press('Escape');
    await this.cardMenuItems.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ── Upload Media modal (opened by the "+" button — see this.uploadButton) ────
  get uploadModal() {
    return this.page.locator('.ant-modal-content:visible').filter({ hasText: 'Upload Media to My Ads' }).first();
  }
  get uploadModalCloseBtn() { return this.uploadModal.locator('button.ant-modal-close').first(); }
  get uploadDropZone() {
    return this.uploadModal.locator('[aria-label="Drop files or browse to upload"]').first();
  }
  // Hidden input — Playwright can setInputFiles on it without opening a file chooser
  get uploadFileInput() { return this.uploadModal.locator('input[type="file"]').first(); }
  get uploadFileRows() {
    return this.uploadModal.locator('div[style*="border: 1px solid rgb(229, 229, 231)"]');
  }
  get uploadCounter() {
    return this.uploadModal.locator('span').filter({ hasText: /\d+\/50 files selected/ }).first();
  }
  // Primary footer button: "Upload" / "Upload N files"
  get uploadConfirmBtn() { return this.uploadModal.locator('button.ant-btn-primary').first(); }
  // Secondary footer button: "Cancel", becomes "Close" once an upload finishes
  get uploadDismissBtn() { return this.uploadModal.locator('button.ant-btn-default').first(); }
  // Warning banner shown inside the modal when a row fails
  get uploadFailureAlert() { return this.uploadModal.locator('.ant-alert-message').first(); }
  uploadRowDeleteBtn(n = 0) {
    return this.uploadFileRows.nth(n).locator('button').filter({
      has: this.page.locator('span[aria-label="delete"]'),
    }).first();
  }
  uploadRowRetryBtn(n = 0) {
    return this.uploadFileRows.nth(n).locator('button').filter({
      has: this.page.locator('span[aria-label="reload"]'),
    }).first();
  }

  async openUploadModal() {
    await this.uploadButton.click();
    await this.uploadModal.waitFor({ state: 'visible', timeout: 15000 });
  }

  get uploadSuccessToast() { return this.page.locator('.ant-message-notice-success').first(); }
  get uploadWarningToast() { return this.page.locator('.ant-message-notice-warning').first(); }

  // Records the text of every toast that appears, and returns a getter for the collected list.
  // Arm BEFORE the action: Ant toasts auto-dismiss in ~3s, so anything that takes longer than
  // that — an upload, for instance — outlives its own toast and a later assertion finds nothing.
  async watchForToasts() {
    await this.page.evaluate(() => {
      window.__kwikToasts = [];
      const capture = () => document.querySelectorAll('.ant-message-notice').forEach((n) => {
        const text = (n.innerText || '').trim();
        if (text && !window.__kwikToasts.includes(text)) window.__kwikToasts.push(text);
      });
      capture();
      window.__kwikToastObs = new MutationObserver(capture);
      window.__kwikToastObs.observe(document.body, { subtree: true, childList: true });
    });

    // Deliberately does NOT disconnect: callers poll this, and disconnecting on the first read
    // would stop recording. The observer dies with the page.
    return async () => this.page.evaluate(() => window.__kwikToasts || []);
  }

  // Waits for an in-flight upload to resolve and reports WHICH way it went, rather than just
  // timing out. The row text is the signal: "· Uploaded" on success, "· FAILED" on failure.
  // Uploads are intermittently rejected on the first attempt, so a test needs to tell the two
  // apart to report the defect precisely.
  async waitForUploadOutcome(timeout = 90000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const text = await this.uploadModal.innerText().catch(() => '');
      if (/FAILED/.test(text)) return 'failed';
      if (/·\s*Uploaded/i.test(text)) return 'uploaded';
      await this.page.waitForTimeout(500);
    }
    return 'timeout';
  }

  async getUploadSelectedCount() {
    const text = await this.uploadCounter.innerText();
    return parseInt(text.match(/(\d+)\/50/)?.[1] ?? '0', 10);
  }

  // ── Select mode ──────────────────────────────────────────────────────────────
  get addToCollectionButton() {
    return this.adsLibraryContent.locator('button').filter({ hasText: 'Add to Collection' }).first();
  }
  get cancelSelectionButton() {
    return this.adsLibraryContent.locator('button').filter({ hasText: /^Cancel$/ }).first();
  }
  get selectionCountText() {
    return this.adsLibraryContent.locator('span').filter({ hasText: /\d+ selected/ }).first();
  }
  // Shown in place of "N selected" before anything is picked
  get tapToSelectText() {
    return this.adsLibraryContent.locator('span').filter({ hasText: /Tap to select/ }).first();
  }
  // The select-mode tick box is a custom 22px div, NOT an <input type="checkbox">, so :checked
  // does not apply. Selection is encoded in its background: solid blue when picked,
  // translucent white when not.
  get cardCheckboxes() {
    return this.adCardList.locator('div[style*="width: 22px"][style*="height: 22px"][style*="z-index: 5"]');
  }
  get selectedCardCheckboxes() {
    return this.adCardList
      .locator('div[style*="z-index: 5"][style*="background-color: rgb(0, 75, 141)"]');
  }
  // True when the Nth card's tick box is filled in
  async isCardSelected(n = 0) {
    const style = await this.cardCheckboxes.nth(n).getAttribute('style') ?? '';
    return style.includes('rgb(0, 75, 141)');
  }

  async enterSelectMode() {
    await this.selectButton.click();
    await this.cancelSelectionButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async exitSelectMode() {
    await this.cancelSelectionButton.click();
    await this.selectButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  // In select mode the whole card is a toggle — no need to hit the checkbox itself
  async toggleCardSelection(n = 0) {
    await this.card(n).click({ force: true });
  }

  // 0 when the "N selected" label is not rendered at all (nothing selected yet)
  async getSelectedCount() {
    if (await this.selectionCountText.count() === 0) return 0;
    const text = await this.selectionCountText.innerText().catch(() => '');
    return parseInt(text.match(/(\d+)\s+selected/)?.[1] ?? '0', 10);
  }

  // Share Creative popup, opened from the card's 3-dot menu.
  // ":visible" because Ant leaves closed modals in the DOM.
  get sharePopup() {
    return this.page.locator('div[aria-modal="true"]:visible').filter({ hasText: 'Share Creative' }).first();
  }
  get sharePopupCloseBtn() {
    return this.sharePopup.locator('button[style*="position: absolute"]').first();
  }

  // Delete Draft confirmation
  get deleteDraftModal() {
    return this.page.locator('.ant-modal-content:visible, .ant-modal-confirm')
      .filter({ hasText: /Delete Draft/i }).first();
  }
  get deleteDraftConfirmBtn() {
    return this.deleteDraftModal.locator('button').filter({ hasText: /^Delete$/i }).first();
  }
  get deleteDraftCancelBtn() {
    return this.deleteDraftModal.locator('button').filter({ hasText: /^Cancel$/i }).first();
  }
  // Active / Paused / Archived / Uploaded pill
  cardStatusBadge(n = 0) {
    return this.card(n).locator('span[style*="border-radius: 9999px"][style*="font-weight: 700"]').first();
  }
  cardDate(n = 0) { return this.card(n).getByText(/[A-Z][a-z]{2}\s\d{1,2},\s\d{4}/).first(); }
  cardFormatBadge(n = 0) {
    return this.card(n)
      .locator('div[style*="position: absolute"][style*="font-weight: 700"][style*="letter-spacing: 0.3px"]').first();
  }
  cardKaaiButton(n = 0) { return this.card(n).locator('button').filter({ hasText: /KAAI/i }).first(); }
  // The creative itself — a <video> for video ads, an <img> for everything else
  cardCreative(n = 0) { return this.card(n).locator('video, img'); }

  // METRICS expand/collapse toggle, and any metric label on the card by its text
  cardMetricsToggle(n = 0) { return this.card(n).locator('button').filter({ hasText: /^Metrics$/i }).first(); }
  cardMetric(n, label) { return this.card(n).getByText(label, { exact: true }).first(); }
  cardCompetitorSignals(n = 0) { return this.card(n).getByText('Competitor Signals', { exact: true }).first(); }

  async toggleCardMetrics(n = 0) {
    await this.cardMetricsToggle(n).click();
  }

  // ── Ad detail modal ──────────────────────────────────────────────────────────
  // The ad title. Scoped to the header h2 by its style so it cannot pick up any other
  // heading the modal body renders (e.g. "KAAI Creative Analysis" on the KAAI tab).
  get modalAdName() {
    return this.adDetailModal
      .locator('h2[style*="font-size: 13px"][style*="font-weight: 700"]').first();
  }
  get modalAdIdRow() { return this.adDetailModal.getByText(/Ad ID/i).first(); }
  get modalCopyIdIcon() { return this.adDetailModal.locator('span[aria-label="copy"]').first(); }
  get modalLaunchedDate() { return this.adDetailModal.getByText(/Launched/i).first(); }
  get modalActivePeriod() { return this.adDetailModal.getByText(/Active Period/i).first(); }
  get modalFormats() { return this.adDetailModal.getByText(/^Formats$/i).first(); }
  // Anchored regex, not a bare string: Playwright's hasText is case-INSENSITIVE, so
  // "KAAI Analysis" would also match the footer's "KAAI analysis" button.
  modalTab(name) { return this.adDetailModal.locator('button').filter({ hasText: new RegExp(`^${name}$`) }).first(); }
  modalText(text) { return this.adDetailModal.getByText(text, { exact: true }).first(); }
  get modalSaveToCollectionBtn() {
    return this.adDetailModal.locator('button').filter({ hasText: /^Save to Collection$/ }).first();
  }
  // Only rendered when the ad has NOT been analysed yet
  get modalKaaiAnalysisBtn() {
    return this.adDetailModal.locator('button').filter({ hasText: /^KAAI analysis$/ }).first();
  }
  // The selected modal tab is the one with a coloured bottom border; inactive tabs are
  // transparent. There is no aria-selected on these buttons, so the border is the only signal.
  async getActiveModalTab() {
    return this.adDetailModal.locator('button').evaluateAll(buttons => {
      const active = buttons.find(b =>
        /Performance Matrix|KAAI Analysis|Ad Copy Details/.test(b.textContent) &&
        getComputedStyle(b).borderBottomColor !== 'rgba(0, 0, 0, 0)');
      return active ? active.textContent.trim() : null;
    });
  }

  async openAdDetailModal(n = 0) {
    await this.card(n).scrollIntoViewIfNeeded();
    await this.card(n).click({ force: true });
    await this.adDetailModal.waitFor({ state: 'visible', timeout: 15000 });
  }

  // Escape is the fallback because the × is not always clickable: the click resolved to the right
  // button and then burned the full 20s action timeout without landing, the modal's video player
  // overlaying it. Ant closes on Escape, so the modal shuts either way.
  async closeAdDetailModal() {
    await this.adDetailModalClose.click({ timeout: 8000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
    });
    await this.adDetailModal.waitFor({ state: 'hidden', timeout: 10000 }).catch(async () => {
      await this.page.keyboard.press('Escape');
      await this.adDetailModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    });
  }

  get modalNextAdBtn() { return this.adDetailModal.locator('button[aria-label="Next ad"]').first(); }

  async openModalTab(name) {
    await this.modalTab(name).click();
  }

  // The KAAI Analysis tab lays every attribute out the same way — a label cell followed by its
  // tags — so one lookup by label serves Hook Type, Structure, Message Angle, Product Show and
  // every other field, instead of a selector per dimension.
  //
  // Returns the FIRST tag of that row as { starred, text }. The app stars only the top-ranked
  // tag, so first-in-document-order and starred are the same tag; `starred` is returned rather
  // than assumed so a test can prove it. The star is stripped from `text`, and the label is
  // capitalised in CSS, which innerText already applies.
  async getKaaiTopTag(fieldLabel) {
    return this.adDetailModal.evaluate((modal, label) => {
      const labelCell = [...modal.querySelectorAll('div')]
        .find(el => !el.children.length && el.innerText.trim() === label);
      const tag = labelCell?.parentElement?.querySelector('.ant-tag');
      if (!tag) return null;
      const raw = tag.innerText.trim();
      return { starred: raw.startsWith('★'), text: raw.replace(/^★\s*/, '').trim() };
    }, fieldLabel);
  }

  // Heading the KAAI tab renders once its analysis is on screen
  get modalKaaiHeading() {
    return this.adDetailModal.getByText('KAAI Creative Analysis').first();
  }

  // A Meta creative's modal reads "Ad ID: 1202…"; a DRAFT's reads just "ID: 4" — it has no
  // published Meta ad id. Requiring the literal "Ad ID" returned null for every draft.
  async getModalAdId() {
    const text = await this.adDetailModal.innerText();
    return text.match(/\b(?:Ad\s+)?ID\s*:?\s*(\d+)/i)?.[1] ?? null;
  }


  // ── Performance view ─────────────────────────────────────────────────────────
  // The Ads/Performance toggle carries its own class, which separates it from the
  // All/Meta/Draft sub-tabs that use the same Ant segmented control.
  get viewModeSegmented() { return this.adsLibraryContent.locator('.viewmode-segmented').first(); }
  get adsViewTab() { return this.viewModeSegmented.locator('label').filter({ hasText: /^Ads$/ }).first(); }
  get performanceViewTab() {
    return this.viewModeSegmented.locator('label').filter({ hasText: 'Performance' }).first();
  }
  async getActiveViewMode() {
    return (await this.viewModeSegmented.locator('label.ant-segmented-item-selected')
      .first().innerText()).trim();
  }

  get perfSearchInput() {
    return this.adsLibraryContent.locator('input[placeholder*="Search performance ads"]').first();
  }
  get perfResultsCount() {
    // [\d,]+ — the total is thousands-separated ("30 of 2,081 ads"), which \d+ cannot match.
    // It only ever passed because STATUS defaults to Active, and that count is small.
    return this.adsLibraryContent.locator('span').filter({ hasText: /\d+ of [\d,]+ ads/ }).first();
  }
  // Performance has its own FORMAT filter; the Ads view calls the equivalent "Ad Format"
  get perfFormatFilter() {
    return this.filtersDiv.locator('label').filter({ hasText: /^Format$/i })
      .locator('..').locator('.ant-select').first();
  }
  get perfDateRange() { return this.filtersDiv.locator('.ant-picker-range').first(); }
  get perfOrderButton() {
    return this.filtersDiv.locator('button').filter({ hasText: /^(Desc|Asc)$/ }).first();
  }
  viewDataByTab(name) {
    return this.adsLibraryContent.locator('button').filter({ hasText: new RegExp(`^${name}$`) }).first();
  }
  // The selected tab is painted white with a shadow; the others are transparent
  async isViewDataByTabActive(name) {
    const style = (await this.viewDataByTab(name).getAttribute('style')) ?? '';
    return style.includes('rgb(255, 255, 255)');
  }
  get perfTable() { return this.adsLibraryContent.locator('table').first(); }
  // A data row is one that carries either an eye icon (a single ad) or an expand chevron (a
  // group). Neither `tr[data-index]` nor a bare `tbody tr` works:
  //   - tr[data-index] only matches Ad Level, which is the one virtualised tab. The grouped tabs
  //     render ordinary rows, so it found nothing and a populated Hook tab looked empty.
  //   - bare `tbody tr` also matched rows that hold no ad — virtuoso's trailing filler row, and
  //     a merchant row — which arrived in assertions as blank name/format/status and read as
  //     "the filter returned a row of the wrong status".
  get perfRows() {
    return this.perfTable.locator('tbody tr').filter({
      has: this.page.locator('button:has([aria-label="eye"]), span.anticon-right, span.anticon-down'),
    });
  }
  get perfEmptyState() {
    return this.adsLibraryContent.getByText('No performance data found for this period').first();
  }

  // Selected value of an Ant select, e.g. "Active"
  async getSelectValue(filter) {
    return (await filter.locator('.ant-select-selection-item').first().innerText()).trim();
  }

  async openPerformanceView() {
    await this.performanceViewTab.click();
    await this.perfSearchInput.waitFor({ state: 'visible', timeout: 20000 });
    await this.waitForFilter();
  }

  async openAdsView() {
    await this.adsViewTab.click();
    await this.searchInput.waitFor({ state: 'visible', timeout: 20000 });
    await this.waitForFilter();
  }

  // ── Performance filters ──────────────────────────────────────────────────────
  // Option labels of any Ant select, read from the open dropdown and then closed again.
  async getSelectOptions(filter) {
    await filter.click();
    const dropdown = this.openDropdown.last();
    await dropdown.waitFor({ state: 'visible' });
    const options = await dropdown.locator('.ant-select-item-option').evaluateAll(
      els => els.map(e => (e.getAttribute('title') ?? e.innerText).trim()));
    await this.page.keyboard.press('Escape');
    await dropdown.waitFor({ state: 'hidden' }).catch(() => {});
    return options;
  }

  // Selects an option in any Ant select. Scoped to the OPEN dropdown: Ant leaves every
  // dropdown it has ever opened in the DOM, so an unscoped lookup can click an option
  // belonging to a different, hidden filter.
  async selectFilterOption(filter, option) {
    await filter.click();
    const dropdown = this.openDropdown.last();
    await dropdown.waitFor({ state: 'visible' });
    await dropdown.getByTitle(option, { exact: true }).click();
    await this.waitForFilter();
  }

  async selectPerfFormat(option) {
    await this.selectFilterOption(this.perfFormatFilter, option);
  }

  // name: 'Quality' | 'Engagement' | 'Conversion'
  async selectRanking(name, tier) {
    await this.selectFilterOption(this.rankingFilter(name), tier);
  }

  async togglePerfOrder() {
    await this.perfOrderButton.click();
    await this.waitForFilter();
  }

  // Both ends of the range picker, as displayed ("2026-07-12")
  async getPerfDateValues() {
    return this.perfDateRange.locator('input').evaluateAll(els => els.map(e => e.value));
  }

  async setPerfDateRange(from, to) {
    const inputs = this.perfDateRange.locator('input');
    await inputs.first().click();
    await inputs.first().fill(from);
    await this.page.keyboard.press('Enter');
    await inputs.nth(1).fill(to);
    await this.page.keyboard.press('Enter');
    await this.page.locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden)')
      .first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.waitForFilter();
  }

  // One entry per rendered row: { name, format, status } — the first column prints the name,
  // then a "Video · Active" subtitle, which is the only place the row exposes either.
  async getPerfRows() { return this._parsePerfRows(this.perfRows); }

  // Only the rows that represent a single ad. On Ad Level that is every row; on the grouped
  // tabs it is the ads revealed underneath an expanded group.
  async getPerfAdRows() { return this._parsePerfRows(this.perfAdRows); }

  // Reads the subtitle from its OWN element rather than splitting innerText on newlines. Some
  // rows render name and subtitle without a line break between them, and the newline-based
  // parser then returned the two stuck together as the name with an empty format and status —
  // which surfaced as "STATUS = Archived returned rows of another status" against rows whose
  // subtitle plainly read "Video · Archived".
  async _parsePerfRows(rows) {
    return rows.evaluateAll(els => els.map(row => {
      const cell = row.querySelector('td');
      if (!cell) return { name: '', format: '', status: '' };

      const squash = text => (text ?? '').replace(/\s+/g, ' ').trim();
      // The subtitle is the innermost element reading "Format · Status"
      const subtitle = squash([...cell.querySelectorAll('*')].reverse()
        .find(el => !el.children.length && el.textContent.includes('·'))?.textContent);

      const full = squash(cell.innerText);
      const [format = '', status = ''] = subtitle.split('·').map(s => s.trim());
      return { name: subtitle ? squash(full.replace(subtitle, '')) : full, format, status };
    }));
  }

  // Cell text of one column, looked up by its header so a column reorder cannot silently
  // shift the assertion onto a neighbouring metric.
  async getPerfColumnValues(header) { return this._perfColumnValues(header, this.perfRows); }

  // Same, but only the single-ad rows — on a grouped tab row 0 is the group, so a comparison
  // against the ad whose modal is open has to skip it.
  async getPerfAdColumnValues(header) { return this._perfColumnValues(header, this.perfAdRows); }

  async _perfColumnValues(header, rows) {
    const headers = await this.perfTable.locator('thead th').evaluateAll(
      els => els.map(e => e.innerText.trim()));
    const index = headers.findIndex(h => h.toLowerCase() === header.toLowerCase());
    if (index === -1) {
      throw new Error(`No "${header}" column in the performance table. Columns: ${headers.join(' | ')}`);
    }
    return rows.evaluateAll(
      (els, i) => els.map(r => (r.querySelectorAll('td')[i]?.innerText ?? '').trim()), index);
  }

  // Every metric tile in the open ad detail modal as { LABEL: value }, e.g.
  // { 'AD SPEND': '₹2,044', 'ROAS': '2.9x', 'CLICK-THROUGH RATE': '4.76%' }.
  // Each tile is a label <p> immediately followed by its value <p>. Keys are upper-cased
  // because the labels are uppercased in CSS, and innerText returns them already transformed.
  async getModalMetrics() {
    return this.adDetailModal.evaluate(modal => {
      const metrics = {};
      modal.querySelectorAll('p').forEach(label => {
        const value = label.nextElementSibling;
        if (value?.tagName === 'P') {
          metrics[label.innerText.trim().toUpperCase()] = value.innerText.trim();
        }
      });
      return metrics;
    });
  }

  // Same column as numbers, so specs never parse display strings themselves.
  // "₹4,959" → 4959, "4.2K" → 4200, "3.92%" → 3.92, "2.4x" → 2.4, "—" → null (no data).
  async getPerfMetricValues(header) {
    return (await this.getPerfColumnValues(header)).map(text => {
      const cleaned = text.replace(/[₹,\s%]/g, '').replace(/x$/i, '');
      const match = cleaned.match(/^(-?[\d.]+)([KMB])?$/i);
      if (!match) return null;
      const multiplier = { k: 1e3, m: 1e6, b: 1e9 }[(match[2] ?? '').toLowerCase()] ?? 1;
      return parseFloat(match[1]) * multiplier;
    });
  }

  // Total from the "X of Y ads" counter, or 0 when the view is showing its empty state.
  async getPerfTotal() {
    if (await this.perfEmptyState.isVisible().catch(() => false)) return 0;
    return (await this.getResultsLoadedAndTotal()).total;
  }

  // The eye icon is what identifies a single-ad row: Ad Level gives every row one, while the
  // grouped tabs (Hook / Narration / Message Style / Visual Style) list a collapsed group row
  // first — "Non KAAI · 18 ads" — and only reveal ad rows, with their icons, once it is opened.
  get perfEyeIcons() { return this.perfRows.locator('button:has([aria-label="eye"])'); }
  get perfAdRows() {
    return this.perfRows.filter({ has: this.page.locator('button:has([aria-label="eye"])') });
  }
  perfRowEyeIcon(n = 0) {
    return this.perfAdRows.nth(n).locator('button:has([aria-label="eye"])').first();
  }

  // Group rows carry the expand chevron; ad rows never do.
  get perfGroupRows() {
    return this.perfRows.filter({ has: this.page.locator('span.anticon-right, span.anticon-down') });
  }
  perfGroupExpandIcon(n = 0) {
    return this.perfGroupRows.nth(n).locator('span.anticon-right, span.anticon-down').first();
  }
  // Ant swaps the chevron's direction rather than adding a class: right = collapsed, down = open
  async isPerfGroupExpanded(n = 0) {
    return (await this.perfGroupExpandIcon(n).getAttribute('aria-label')) === 'down';
  }

  // The group title, e.g. "Non KAAI" — the value the rows are grouped by. Shares the row parser
  // so it cannot drift from it, and so it is immune to the same missing-newline case.
  async getPerfGroupTitles() {
    return (await this._parsePerfRows(this.perfGroupRows)).map(row => row.name);
  }

  // The group's name cell — clicking this is what toggles the group open and shut.
  perfGroupTitle(n = 0) {
    return this.perfGroupRows.nth(n).locator('td').first()
      .locator('div[style*="font-weight: 700"]').first();
  }

  // The "154 ads" badge in each group row's Ads column, as numbers
  async getPerfGroupBadges() {
    return this.perfGroupRows.evaluateAll(rows => rows.map(row => {
      const cell = row.querySelectorAll('td')[1];
      const digits = (cell?.innerText ?? '').match(/(\d[\d,]*)/);
      return digits ? parseInt(digits[1].replace(/,/g, ''), 10) : null;
    }));
  }

  // "9 groups · 255 ads" → { groups: 9, ads: 255 }. Null on Ad Level, which counts differently.
  async getPerfGroupedCounts() {
    const parts = (await this._perfCounterText())
      .match(/([\d,]+)\s*groups?\s*·\s*([\d,]+)\s*ads?/i);
    return parts
      ? { groups: +parts[1].replace(/,/g, ''), ads: +parts[2].replace(/,/g, '') }
      : null;
  }

  // Clicking a group's NAME toggles it. Waits on the ad rows actually appearing rather than a
  // fixed delay, since the group fetches its ads on expand, and scrolls the row into view first —
  // lower groups sit below the fold once a tab has several.
  async expandPerfGroup(n = 0) {
    const before = await this.perfAdRows.count();
    await this.perfGroupTitle(n).scrollIntoViewIfNeeded();
    await this.perfGroupTitle(n).click();
    // Both signals: the chevron confirms THIS group opened, the row count confirms its ads
    // arrived (the group fetches them on expand).
    await expect.poll(() => this.isPerfGroupExpanded(n), { timeout: 20000, intervals: [500] })
      .toBe(true);
    await expect.poll(() => this.perfAdRows.count(), { timeout: 20000, intervals: [500] })
      .toBeGreaterThan(before);
  }

  // Waits on THIS group's chevron, not on a global row count. A count-based wait breaks two ways:
  // collapsing an already-collapsed group can never satisfy "fewer rows than before" and burns the
  // full timeout, and with another group still open the total does not drop either.
  async collapsePerfGroup(n = 0) {
    await this.perfGroupTitle(n).scrollIntoViewIfNeeded();
    await this.perfGroupTitle(n).click();
    await expect.poll(() => this.isPerfGroupExpanded(n), { timeout: 20000, intervals: [500] })
      .toBe(false);
  }

  // The dimension tabs force FORMAT to Video and disable it; Ad Level leaves it editable.
  async isPerfFormatLocked() {
    return this.perfFormatFilter.evaluate(el => el.className.includes('ant-select-disabled'));
  }

  // First column header — "Ad creative" on Ad Level, the dimension name on a grouped tab
  get perfFirstColumnHeader() { return this.perfTable.locator('thead th').first(); }

  // Text of the action buttons in a row: "Competitor Tracker" on a group, "Creative Signals"
  // on an ad. The eye icon has no text, so it drops out.
  async getPerfGroupButtons(n = 0) { return this._perfRowButtons(this.perfGroupRows.nth(n)); }
  async getPerfAdButtons(n = 0) { return this._perfRowButtons(this.perfAdRows.nth(n)); }
  async _perfRowButtons(row) {
    return row.locator('button').evaluateAll(
      els => els.map(e => e.innerText.trim()).filter(Boolean));
  }

  async openPerfAdDetail(n = 0) {
    await this.perfRowEyeIcon(n).scrollIntoViewIfNeeded();
    await this.perfRowEyeIcon(n).click();
    await this.adDetailModal.waitFor({ state: 'visible', timeout: 15000 });
  }

  // ── Performance search ───────────────────────────────────────────────────────
  // The × inside the search box, and the "CLEAR ALL" chip that appears beside it
  get perfClearSearchButton() {
    return this.adsLibraryContent.locator('button[title="Clear search"]').first();
  }
  get perfClearAllButton() {
    return this.adsLibraryContent.locator('button').filter({ hasText: /^Clear all$/i }).first();
  }

  // Counter text, in either shape the view uses: "30 of 276 ads" on Ad Level, "9 groups · 255
  // ads" on a dimension tab.
  async _perfCounterText() {
    return this.adsLibraryContent.locator('span')
      .filter({ hasText: /\d+ of [\d,]+ ads|[\d,]+ groups? ·/ }).first()
      .innerText().catch(() => '');
  }

  // Waits for the COUNTER to change, not just for rows to exist. The previous results stay on
  // screen while the search request is in flight, so "some rows are present" is satisfied
  // immediately and a count read straight after returned the pre-search list — which made a
  // no-match search look like it returned 24 ads, and would let "the search returned my ad" pass
  // against the unfiltered grid. Non-fatal: two searches with identical results leave the counter
  // unchanged, and that is not a failure.
  async searchPerf(query) {
    const before = await this._perfCounterText();
    await this.perfSearchInput.click();
    await this.perfSearchInput.press('ControlOrMeta+a');
    await this.perfSearchInput.press('Delete');
    await this.perfSearchInput.pressSequentially(query, { delay: 15 });
    // Enter SUBMITS the search — there is no debounce on this box. Measured: six seconds after
    // typing, the counter still read "30 of 276 ads" with 24 rows, and only became "0 of 0 ads"
    // once Enter was pressed. Without it the grid stayed unfiltered, so every assertion that
    // merely looked for an ad among the results passed against the full, unsearched list.
    await this.perfSearchInput.press('Enter');
    await this.waitForFilter();
    await expect.poll(() => this._perfCounterText(), { timeout: 15000, intervals: [500] })
      .not.toBe(before).catch(() => {});
    await this._waitForPerfContent();
  }

  // Same counter-change wait as searchPerf: the searched results stay on screen until the cleared
  // query comes back, so returning immediately reports the still-filtered grid.
  async clearPerfSearch() {
    const before = await this._perfCounterText();
    await this.perfClearSearchButton.click();
    await this.waitForFilter();
    await expect.poll(() => this._perfCounterText(), { timeout: 15000, intervals: [500] })
      .not.toBe(before).catch(() => {});
    await this._waitForPerfContent();
  }

  async clickPerfClearAll() {
    await this.perfClearAllButton.click();
    await this.waitForFilter();
    await this._waitForPerfContent();
  }

  // Switches the VIEW DATA BY tab (Ad Level / Hook / Narration / Message Style / Visual Style)
  async openViewDataByTab(name) {
    await this.viewDataByTab(name).click();
    await this.waitForFilter();
    await this._waitForPerfContent();
  }

  // Rows are virtualised and mount after the network settles, so a count taken straight after
  // waitForFilter() reads 0 on a tab that does have data. Non-fatal: a genuinely empty tab with
  // no empty state is a finding for the test to report, not a poll timeout to drown it in.
  async _waitForPerfContent(timeout = 30000) {
    await expect.poll(async () => {
      if (await this.perfRows.count() > 0) return true;
      return this.perfEmptyState.isVisible().catch(() => false);
    }, { timeout, intervals: [500] }).toBe(true).catch(() => {});
  }

  rankingFilter(name) {
    return this.filtersDiv.locator('label')
      .filter({ hasText: new RegExp(`^${name} Ranking$`, 'i') })
      .locator('..').locator('.ant-select').first();
  }

  // Every format badge in the grid — the uppercase label overlaid on each card's media
  // ("VIDEO", "IMAGE", "FLEXIBLE", "CAROUSEL", and, once the app is fixed, "COLLECTION").
  //
  // Identified by the badge component's inline-style signature rather than by text. Specs
  // assert a badge is ABSENT (Collection renders none), and that claim is only trustworthy if
  // the locator can match nothing but the badge itself. Verified identical across FLEXIBLE and
  // CAROUSEL, so this is one shared component.
  formatBadges() {
    return this.adsLibraryContent
      .locator('.virtualized-ad-grid-scroller').first()
      .locator('div[style*="position: absolute"][style*="font-weight: 700"][style*="letter-spacing: 0.3px"]');
  }

  // Badges for one specific format. A factory rather than a locator per format: the Ad Format
  // dropdown has already grown once (Video/Image gained Flexible, Carousel, Collection) and
  // hard-coded pairs went stale the moment it did.
  adCardFormatLabels(format) {
    return this.formatBadges()
      .filter({ hasText: new RegExp(`^\\s*${format.toUpperCase()}\\s*$`) });
  }

  // The distinct set of format badges the grid is currently rendering, uppercase and sorted.
  //
  // One DOM read that answers both halves of "this format badges itself, and no other format":
  // the set must be exactly [FORMAT]. Checking that as N separate is-X-absent counts costs
  // O(N²) round-trips and reports only what is missing, never what is actually there.
  //
  // Polls briefly so a slow-painting grid does not read as an empty badge set.
  async getRenderedFormatBadges(graceMs = 5000) {
    await this.waitForGridPainted();
    const deadline = Date.now() + graceMs;

    let names = [];
    do {
      const texts = await this.formatBadges().allInnerTexts();
      names = [...new Set(texts.map(t => t.trim().toUpperCase()).filter(Boolean))].sort();
      if (names.length) break;
      await this.page.waitForTimeout(250);
    } while (Date.now() < deadline);

    return names;
  }

  // Waits for the ad grid to actually paint after a filter change. selectAdFormat() already
  // waits out the spinner; this covers the gap between "spinner gone" and "cards on screen".
  // Non-fatal: an empty result set legitimately paints no grid.
  async waitForGridPainted(timeout = 15000) {
    await this.adCardList.first().waitFor({ state: 'visible', timeout }).catch(() => {});
  }

  // Opens the Ad Format dropdown, reads whatever options the app currently offers, closes it
  // again, and returns the individual formats with "All Formats" removed.
  //
  // Read at runtime instead of hard-coded so the format tests keep covering the full list as
  // it grows. The old spec summed only Video + Image against the All Formats total, which
  // silently became unsatisfiable once the other three formats shipped.
  async getAdFormatOptions() {
    await this.adFormatFilter.click();
    await this.openDropdown.waitFor({ state: 'visible' });
    const labels = (await this.adFormatDropdownOptions.allInnerTexts())
      .map(t => t.trim())
      .filter(Boolean)
      .filter(t => t !== AD_FORMAT_ALL);

    await this.page.keyboard.press('Escape');
    await this.openDropdown.waitFor({ state: 'hidden' }).catch(() => {});
    return labels;
  }

  // Clicks the Ad Format dropdown and selects the given option
  // ("Video", "Image", "Flexible", "Carousel", "Collection", "All Formats")
  async selectAdFormat(format) {
    await this.adFormatFilter.click();
    await this.openDropdown.waitFor({ state: 'visible' });
    // Anchored regex, not a bare substring. With six options now — and the list demonstrably
    // still growing — a substring match is one rename away from picking the wrong option.
    await this.adFormatDropdownOptions
      .filter({ hasText: new RegExp(`^\\s*${format}\\s*$`) })
      .first()
      .click();
    await this.waitForFilter();
  }

  // Clicks the Status dropdown and selects the given option ("All", "Active", "Paused", "Archived")
  // All three delegate to selectFilterOption, which scopes the option lookup to the dropdown
  // that is actually open. They used to search '.ant-select-dropdown' unscoped, and Ant keeps
  // every dropdown it has ever opened in the DOM: once a second filter had been opened, an
  // option label shared between them ("All" is on Status, Format and all three Rankings)
  // matched more than once and the click failed on strict mode.
  async selectStatus(status) {
    await this.selectFilterOption(this.statusFilter, status);
  }

  // Sort By dropdown ("Recently Added", "Spend", "Orders", "CTR", ...)
  async selectSortBy(option) {
    await this.selectFilterOption(this.sortByFilter, option);
  }

  // Clicks the KAAI Analysis dropdown and selects the given option ("All", "KAAI Analysed", "Not Analysed")
  async selectKaaiOption(option) {
    await this.selectFilterOption(this.kaaiFilter, option);
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

  // Arms a MutationObserver that records whether the modal's Sync button EVER carries
  // Ant's .ant-btn-loading class, then returns a getter for the verdict.
  //
  // Why not just expect(loadingBtn).toBeVisible() after clicking: the loading class only
  // exists while the sync request is in flight, and the modal unmounts as soon as it
  // resolves. That request came back in ~600ms, so by the time a post-click assertion
  // started polling the class — and often the whole modal — was already gone, failing with
  // "element(s) not found". An observer installed BEFORE the click cannot miss the change,
  // which makes the assertion deterministic instead of a race against the backend.
  //
  // Must be called before clicking Sync.
  async watchForSyncKaaiLoadingState() {
    await this.page.evaluate(() => {
      window.__kwikSawSyncLoading = false;
      const hit = () => !!document.querySelector(
        '.ant-modal-confirm button.ant-btn-primary.ant-btn-loading');
      if (hit()) window.__kwikSawSyncLoading = true;
      const observer = new MutationObserver(() => {
        if (hit()) window.__kwikSawSyncLoading = true;
      });
      observer.observe(document.body, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['class'],
      });
      window.__kwikSyncLoadingObserver = observer;
    });

    return async () => {
      const seen = await this.page.evaluate(() => {
        window.__kwikSyncLoadingObserver?.disconnect();
        return window.__kwikSawSyncLoading === true;
      });
      return seen;
    };
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
