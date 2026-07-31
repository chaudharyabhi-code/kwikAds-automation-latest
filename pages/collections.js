export class Collections {
  constructor(page) {
    this.page = page;
    this.adsLibraryContent = this.page.locator('div[id="single-spa-application:@gokwik/kwikads"]');

    // Top navigation tab
    this.collectionsTab = this.adsLibraryContent.locator('button').filter({ hasText: /^Collections$/ });

    // Page header elements
    this.searchInput        = this.adsLibraryContent.locator('input[placeholder="Search collections..."]');
    this.collectionCount    = this.adsLibraryContent.locator('span').filter({ hasText: /^\d+$/ }).first();
    this.newCollectionButton = this.adsLibraryContent.locator('button').filter({ hasText: 'New Collection' });

    // Collection cards grid — each card is a direct child of the repeat(auto-fill) grid
    this.collectionCardsGrid = this.adsLibraryContent.locator('div[style*="minmax(220px"]');
    this.collectionCards     = this.collectionCardsGrid.locator('> div');

    // Empty state shown when search returns no results — text includes the search term e.g. 'No collections matching "xyz"'
    this.emptySearchState = this.adsLibraryContent.getByText(/No collections matching/i);

    // Default "Saved Ads" card (always present, no delete icon, no attribution)
    this.savedAdsCard            = this.collectionCardsGrid.locator('> div').filter({ hasText: 'Saved Ads' });
    this.savedAdsCardDate        = this.savedAdsCard.locator('span[style*="font-size: 12px"]').first();
    this.savedAdsCardDeleteBtn   = this.savedAdsCard.locator('[aria-label="delete"]');
    this.savedAdsCardAttribution = this.savedAdsCard.locator('div[title]');

    // Success / error toasts
    this.successToast = this.page.locator('.ant-message-notice-success');
    this.errorToast   = this.page.locator('.ant-message-notice-error');
    // Any toast regardless of severity — for flows where the app may report
    // either success or an informational "already added" message
    this.anyToast     = this.page.locator('.ant-message-notice');
    // Page-level loading spinner inside the Creative Agent shell
    this.pageSpinner  = this.adsLibraryContent.locator("span[aria-label='loading']").first();

    // Delete confirmation modal
    this.deleteModal      = this.page.locator('div[aria-modal="true"].ant-modal-confirm');
    this.deleteConfirmBtn = this.deleteModal.locator('button').filter({ hasText: /^(Delete|Confirm)$/ });
    this.deleteCancelBtn  = this.deleteModal.locator('button').filter({ hasText: 'Cancel' });

    // ── Collection detail view ───────────────────────────────────────────────
    // Sticky header visible once a collection card is opened
    this.detailBackButton   = this.adsLibraryContent.locator('button.ant-btn-text.ant-btn-icon-only').first();
    this.detailName         = this.adsLibraryContent.locator('[style*="font-size: 18px"]').first();
    // "N ad · by user@example.com"
    this.detailAdCountInfo  = this.adsLibraryContent.locator('[style*="font-size: 13px"]').filter({ hasText: /\d+ ad/ }).first();
    // Text changes across states: "Showing N ad" / "Tap ads to select · Showing N ad" / "N selected · Showing N ad"
    this.detailShowingLabel = this.adsLibraryContent.locator('span').filter({ hasText: /Showing \d+ ad/ }).first();
    // Header "Select" button. Exclude ad-card "check Select" buttons (CheckOutlined icon → aria-label="check")
    // so only the toolbar button without a check icon is matched.
    this.detailSelectButton = this.adsLibraryContent.locator('button[type="button"]')
      .filter({ hasText: 'Select' }).first();

    // Selection mode toolbar (visible after clicking Select)
    this.detailRemoveFromCollectionBtn = this.adsLibraryContent.locator('button').filter({ hasText: 'Remove from Collection' });
    // Plain substring to tolerate icon whitespace in the button's innerText
    this.detailCancelSelectionBtn      = this.adsLibraryContent.locator('button').filter({ hasText: 'Cancel' });

    // Individual ad cards inside the virtual grid (identified by data-testid="virtuoso-item-list")
    this.detailAdItems = this.adsLibraryContent.locator('div[data-testid="virtuoso-item-list"]').last().locator('div[style*="border: 1px solid rgb(233, 234, 235);"][style*="border-radius: 25px"][style*="overflow: hidden"][style*="background-color: rgb(255, 255, 255)"][style*="cursor: pointer"]');

    // Empty state when the collection contains no ads
    this.detailEmptyState         = this.adsLibraryContent.getByText('No ads in this collection');
    this.detailEmptyStateSubtitle = this.adsLibraryContent.getByText('Save ads from the Ad Library to see them here.');

    // ── Save to Collection modal (opened from Ad Library 3-dot menu or Select toolbar) ──
    this.saveToCollectionModal            = this.page.locator('div[aria-modal="true"]').filter({ hasText: 'Save to Collection' });
    // "Adding N ad(s) · M collections available"
    this.saveToCollectionModalSubtitle    = this.saveToCollectionModal.locator('p').filter({ hasText: /Adding \d+ ad/ }).first();
    // X close button (position:absolute in the modal header area)
    this.saveToCollectionModalCloseBtn    = this.saveToCollectionModal.locator('button[style*="position: absolute"]');
    // "+ New Collection" button at the bottom of the collection list
    this.saveToCollectionNewCollectionBtn = this.saveToCollectionModal.locator('button').filter({ hasText: 'New Collection' });
    // Scrollable list of collection rows (each row is clickable)
    this.saveToCollectionDiv             = this.saveToCollectionModal.locator('div[style*="padding: 16px 16px 18px"][style*="background-color: rgb(255, 255, 255)"]');
    this.saveToCollectionItem = this.saveToCollectionDiv.locator('div[style*="display: flex"][style*="flex-direction: column"][style*="gap: 6px"][style*="max-height: 48vh"][style*="overflow-y: auto"][style*="margin-bottom: 10px"][style*="padding-right: 2px"] div[style*="cursor: pointer"]');

    // ── Inline "New Collection" mini-modal (opened via "+ New Collection" inside the Save to Collection modal) ──
    // Identified by the unique subtitle "Create a board to organise your ads" — distinct from the
    // Collections-page "Create New Collection" modal.
    this.inlineNewCollectionModal        = this.page.locator('.ant-modal-content').filter({ hasText: 'Create a board to organise your ads' });
    this.inlineNewCollectionInput        = this.inlineNewCollectionModal.locator('input[placeholder="e.g. Summer Campaign Ideas"]');
    this.inlineNewCollectionCreateAddBtn = this.inlineNewCollectionModal.locator('button').filter({ hasText: 'Create & Add' });
    this.inlineNewCollectionCancelBtn    = this.inlineNewCollectionModal.locator('button').filter({ hasText: 'Cancel' });

    // Filtered success toasts — two fire after "Create & Add": "Collection '...' created!" and "Ad saved to '...' successfully!"
    this.collectionCreatedToast   = this.page.locator('.ant-message-notice-success').filter({ hasText: /created/i });
    this.adSavedToCollectionToast = this.page.locator('.ant-message-notice-success').filter({ hasText: /saved/i });

    // ── Remove-from-collection confirmation modal ─────────────────────────────
    this.removeAdsModal      = this.page.locator('.ant-modal-confirm').filter({ hasText: 'Remove ads from collection' });
    this.removeAdsConfirmBtn = this.removeAdsModal.locator('button').filter({ hasText: /^Remove$/ });
    this.removeAdsCancelBtn  = this.removeAdsModal.locator('button').filter({ hasText: /^Cancel$/ });

    // ── Create New Collection modal ──────────────────────────────────────────
    this.createCollectionModal      = this.page.locator('.ant-modal-content').filter({ hasText: 'Create New Collection' });
    this.boardNameInput             = this.createCollectionModal.locator('input[placeholder="Board name (e.g., Summer Campaign Ideas)"]');
    this.boardNameCounter           = this.createCollectionModal.locator('.ant-input-suffix span').first();
    this.descriptionTextarea        = this.createCollectionModal.locator('textarea[placeholder="Description (optional)"]');
    this.createCollectionCreateBtn  = this.createCollectionModal.locator('button').filter({ hasText: 'Create' });
    this.createCollectionCancelBtn  = this.createCollectionModal.locator('button').filter({ hasText: 'Cancel' });
  }

  async navigate() {
    await this.adsLibraryContent.waitFor({ state: 'visible' });
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

    await this.collectionsTab.click({ force: true });
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.newCollectionButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
  }

  // Parses the numeric count from the badge next to the search bar
  async getCollectionCount() {
    const text = await this.collectionCount.innerText();
    return parseInt(text.trim());
  }

  // Returns the number of collection cards rendered in the grid
  async getRenderedCardCount() {
    return this.collectionCards.count();
  }

  // Returns the Nth collection card locator (0-based, excludes Saved Ads)
  getCard(n = 0) {
    return this.collectionCards.nth(n);
  }

  // Returns the name text from the Nth card
  getCardName(n = 0) {
    return this.collectionCards.nth(n).locator('div[style*="font-size: 15px"]').first();
  }

  // Returns the date text from the Nth card
  getCardDate(n = 0) {
    return this.collectionCards.nth(n).locator('span[style*="font-size: 12px"]').first();
  }

  // Returns the delete icon button on the Nth card (identified by aria-label="delete")
  getCardDeleteButton(n = 0) {
    return this.collectionCards.nth(n).locator('[aria-label="delete"]');
  }

  // Returns the "by [user]" attribution div on the Nth card
  getCardAttribution(n = 0) {
    return this.collectionCards.nth(n).locator('div[title]');
  }

  // ── Dynamic discovery (never assume a fixed grid index) ─────────────────────

  // Index of the first user-created collection, or -1 if there are none.
  // The default "Saved Ads" card has no delete icon, so the presence of one is what
  // identifies a user-created card — independent of grid order.
  async findUserCreatedCardIndex() {
    // Make sure the grid is actually rendered first. Without this, a slow/failed load
    // yields a count of 0, the caller's guard skips, and a real failure is hidden as
    // "no collections exist".
    await this.collectionCardsGrid.waitFor({ state: 'visible', timeout: 30000 });
    const total = await this.collectionCards.count();
    for (let i = 0; i < total; i++) {
      if (await this.getCardDeleteButton(i).count() > 0) return i;
    }
    return -1;
  }

  // ONE pass over the grid, returning the first user-created card, the first card that
  // contains ads, and the first empty card.
  //
  // A collection card in the grid does NOT show its ad count, so the only way to learn it
  // is to open the collection — which costs a click + loader per collection. Doing that
  // per test blows the 60s default timeout, so callers should run this once in a
  // beforeAll and reuse the indexes.
  async scanCollectionsOnce() {
    await this.collectionCardsGrid.waitFor({ state: 'visible', timeout: 30000 });
    const total = await this.collectionCards.count();
    const found = { userCard: -1, withAds: -1, empty: -1 };

    for (let i = 0; i < total; i++) {
      if (await this.getCardDeleteButton(i).count() === 0) continue; // skip "Saved Ads"
      if (found.userCard === -1) found.userCard = i;
      if (found.withAds !== -1 && found.empty !== -1) break;         // nothing left to learn

      await this.openCollection(i);
      const isEmpty = await this.isOpenCollectionEmpty();
      await this.goBackToCollections();

      if (isEmpty && found.empty === -1) found.empty = i;
      if (!isEmpty && found.withAds === -1) found.withAds = i;
    }
    return found;
  }

  // Index of the first user-created collection that contains NO ads, else -1.
  async findEmptyCardIndex() {
    await this.collectionCardsGrid.waitFor({ state: 'visible', timeout: 30000 });
    const total = await this.collectionCards.count();
    for (let i = 0; i < total; i++) {
      if (await this.getCardDeleteButton(i).count() === 0) continue; // skip Saved Ads
      await this.openCollection(i);
      const empty = await this.isOpenCollectionEmpty();
      await this.goBackToCollections();
      if (empty) return i;
    }
    return -1;
  }

  // Index of the first collection whose header reports at least `min` ads, else -1.
  async findCardIndexWithAds(min = 1) {
    await this.collectionCardsGrid.waitFor({ state: 'visible', timeout: 30000 });
    const total = await this.collectionCards.count();
    for (let i = 0; i < total; i++) {
      if (await this.getCardDeleteButton(i).count() === 0) continue; // skip Saved Ads
      await this.openCollection(i);
      const count = await this.getDetailAdCount();
      await this.goBackToCollections();
      if (count >= min) return i;
    }
    return -1;
  }

  // ── Lookup by collection name (rather than grid index) ───────────────────────

  // Returns the collection card whose text contains `name`
  getCardByName(name) {
    return this.collectionCards.filter({ hasText: name });
  }

  // "by you" / "by user@example.com" attribution on a named card
  getCardAttributionByName(name) {
    return this.getCardByName(name).locator('div[title]');
  }

  // Delete (trash) icon on a named card
  getCardDeleteButtonByName(name) {
    return this.getCardByName(name).locator('[aria-label="delete"]');
  }

  // Opens the New Collection modal
  async openNewCollectionModal() {
    await this.newCollectionButton.click();
    await this.createCollectionModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Fills name (and optional description) then clicks Create and waits for modal to close
  async createCollection(name, description = '') {
    await this.boardNameInput.fill(name);
    if (description) {
      await this.descriptionTextarea.fill(description);
    }
    await this.createCollectionCreateBtn.click();
    // Button shows a loader while the API call is in flight — wait for the modal to close
    await this.createCollectionModal.waitFor({ state: 'hidden', timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  // Finds a collection card by name and deletes it (including confirmation modal)
  async deleteCollectionByName(name) {
    const card = this.collectionCardsGrid.locator('> div').filter({ hasText: name });
    await card.locator('[aria-label="delete"]').click();
    await this.deleteModal.waitFor({ state: 'visible', timeout: 5000 });
    await this.deleteConfirmBtn.click();
    await this.deleteModal.waitFor({ state: 'hidden', timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  // Waits for the loader that fires after clicking "Save to Collection" from the 3-dot menu,
  // then waits for the Save to Collection modal to become visible.
  async waitForSaveToCollectionModal() {
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    // Short window to catch the spinner — if it doesn't appear, move on immediately
    await spinner.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.saveToCollectionModal.waitFor({ state: 'visible', timeout: 20000 });
  }

  // Types in the search box and waits for results to filter
  async search(query) {
    await this.searchInput.fill(query);
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  // Opens the Nth collection card and waits for the detail view to load (loader appears
  // during open).
  //
  // Readiness is keyed on the back button + ad-count line, which render for EVERY
  // collection. An empty collection shows neither the "Select" button nor the
  // "Showing N ads" label — only the empty state — so waiting on Select would hang
  // forever on any collection with no ads.
  async openCollection(n = 0) {
    await this.collectionCards.nth(n).click();
    await this.pageSpinner.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this.pageSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.detailBackButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.detailAdCountInfo.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  // True when the open collection contains no ads (empty-state placeholder shown).
  async isOpenCollectionEmpty() {
    return this.detailEmptyState.isVisible();
  }

  // Clicks the back arrow and waits for the collections grid to reappear
  async goBackToCollections() {
    await this.detailBackButton.click();
    await this.newCollectionButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  // Clicks "Select" to enter selection mode.
  // Waits for "Cancel" to appear — Cancel is always rendered in selection mode
  // regardless of whether the collection has ads, making it the safest signal.
  async enterDetailSelectionMode() {
    await this.detailSelectButton.click();
    await this.detailCancelSelectionBtn.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Clicks the Nth ad card in the detail view virtual grid (0-based)
  async selectAdInDetail(n = 0) {
    await this.detailAdItems.nth(n).click();
  }

  // Clicks "Remove from Collection" and waits for the confirmation modal to open
  async clickRemoveFromCollection() {
    await this.detailRemoveFromCollectionBtn.click();
    await this.removeAdsModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Confirms removal and waits for the loader + network to settle
  async confirmRemoveFromCollection() {
    await this.removeAdsConfirmBtn.click();
    const spinner = this.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  // Parses the numeric ad count from the detail header info text e.g. "1 ad · by user@example.com"
  async getDetailAdCount() {
    const text = await this.detailAdCountInfo.innerText();
    const match = text.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Parses the numeric count from the "Showing N ad(s)" label
  async getDetailShowingCount() {
    const text = await this.detailShowingLabel.innerText();
    const match = text.match(/Showing (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Parses N from "Adding 1 ad · N collections available" in the Save to Collection modal subtitle
  async getSaveToCollectionCount() {
    const text = await this.saveToCollectionModalSubtitle.innerText();
    const match = text.match(/(\d+)\s+collections/);
    return match ? parseInt(match[1]) : 0;
  }

  // Clicks a named row in the Save to Collection modal and waits for the modal to close + network to settle
  async clickSaveToCollectionRow(collectionName) {
    await this.saveToCollectionItem.filter({ hasText: collectionName }).first().click();
    await this.saveToCollectionModal.waitFor({ state: 'hidden', timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  // Clicks "+ New Collection" inside the Save to Collection modal and waits for the inline mini-modal
  async clickNewCollectionInSaveModal() {
    await this.saveToCollectionNewCollectionBtn.click();
    await this.inlineNewCollectionModal.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Fills the inline "New Collection" form and clicks "Create & Add" — creates the collection
  // AND saves the current ad in one action. Both toasts fire and both modals close.
  async createAndAddCollectionInline(name) {
    await this.inlineNewCollectionInput.fill(name);
    await this.inlineNewCollectionCreateAddBtn.click();
    await this.inlineNewCollectionModal.waitFor({ state: 'hidden', timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }
}
