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
export const CARD_MENU_ACTIONS = [
  'Share Creative', 'Download Creative', 'Save to Collection', 'Copy ID',
];

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
    await this.page.waitForLoadState('networkidle');
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
