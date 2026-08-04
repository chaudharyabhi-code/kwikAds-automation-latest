import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';
import { Collections } from '../../../pages/collections';

// Disposable collection used for the save-and-verify serial tests
const SAVE_TARGET = 'playwright-save-verify';

let adsLibrary, collections;

// File-level shared setup — applies to every test below, including those inside
// the describe blocks. Lands on the Ad Library tab, where all save flows start.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary  = new AdsLibrary(page);
  collections = new Collections(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
});

// Helper: open the 3-dot menu, click "Save to Collection", wait for the
// loader that fires before the modal appears, then return with modal visible.
async function openSaveToCollectionModal() {
  await adsLibrary.openFirstCardMenu();
  await adsLibrary.clickCardMenuOption('Save to Collection');
  await collections.waitForSaveToCollectionModal(); // loader → modal visible
}

// Helper: enter Select mode and pick the first two cards in the first virtuoso row.
async function selectTwoAds() {
  await adsLibrary.enterSelectMode();
  const overlays = adsLibrary.getRowSelectionOverlays(0);
  await overlays.nth(0).click({ force: true });
  await overlays.nth(1).click({ force: true });
  await adsLibrary.selectionCountText.waitFor({ state: 'visible' });
}

// ── Non-destructive modal inspection tests ────────────────────────────────────

test('"Save to Collection" modal opens with correct title and "Adding 1 ad · N collections available" subtitle', async () => {
  await openSaveToCollectionModal();

  await expect(collections.saveToCollectionModal).toContainText('Save to Collection');
  await expect(collections.saveToCollectionModalSubtitle).toContainText('Adding 1 ad');
  await expect(collections.saveToCollectionModalSubtitle).toContainText('collections available');

  await collections.saveToCollectionModalCloseBtn.click();
});

test('Modal lists row count matches "N collections available" in subtitle', async () => {
  await openSaveToCollectionModal();

  // Row count must equal the number advertised in the subtitle
  const subtitleText = await collections.saveToCollectionModalSubtitle.innerText();
  const advertised   = parseInt(subtitleText.match(/(\d+)\s+collections/)?.[1] ?? '0');
  const rowCount     = await collections.saveToCollectionItem.count();
  expect(rowCount).toBe(advertised);

  await collections.saveToCollectionModalCloseBtn.click();
});


test('Closing the modal via X without selecting a collection saves nothing and shows no toast', async () => {
  await openSaveToCollectionModal();

  await collections.saveToCollectionModalCloseBtn.click();

  await expect(collections.saveToCollectionModal).not.toBeVisible();
  await expect(collections.successToast).not.toBeVisible();
});

test('"+ New Collection" button is visible at the bottom of the Save to Collection modal list', async () => {
  await openSaveToCollectionModal();

  await expect(collections.saveToCollectionNewCollectionBtn).toBeVisible();

  await collections.saveToCollectionModalCloseBtn.click();
});

test('Multi-selecting ads via Select mode shows "Adding N ads" in the modal subtitle', async () => {
  // Enter select mode and pick 2 different cards from the first virtuoso row
  await selectTwoAds();

  // "Add to Collection" toolbar button — no loader before this modal
  await adsLibrary.openAddToCollectionModal();
  await expect(collections.saveToCollectionModalSubtitle).toContainText('Adding 2 ads');

  await collections.saveToCollectionModalCloseBtn.click();
  await adsLibrary.exitSelectMode();
});

// ── Bulk save — post-save toast text ─────────────────────────────────────────

test('Bulk-saving 2 ads shows "2 ads added to \'<collection>\'" in the success toast', async () => {
  // Select 2 ads via the Select toolbar
  await selectTwoAds();

  // Open "Add to Collection" modal (toolbar path — no pre-loader)
  await adsLibrary.openAddToCollectionModal();
  await expect(collections.saveToCollectionModal).toBeVisible();

  // Save to the always-present "Saved Ads" collection
  await collections.clickSaveToCollectionRow('Saved Ads');

  // Toast must mention both the count and the target collection
  await expect(collections.successToast).toBeVisible({ timeout: 10000 });
  await expect(collections.successToast).toContainText('2 ads added to');
  await expect(collections.successToast).toContainText('Saved Ads');

});

// ── Create new collection inline via "+ New Collection" in the save modal ─────

test.describe.serial('Create a new collection inline via "+ New Collection" in the save modal', () => {
  const INLINE_NAME = `playwright-inline-create ${Math.random()}`;
  let collectionCountBefore = 0;

  test('Clicking "+ New Collection" opens the inline form with "Create & Add" button', async () => {
    await openSaveToCollectionModal();

    collectionCountBefore = await collections.getSaveToCollectionCount();

    await collections.clickNewCollectionInSaveModal();

    await expect(collections.inlineNewCollectionModal).toBeVisible();
    await expect(collections.inlineNewCollectionInput).toBeVisible();
    await expect(collections.inlineNewCollectionCreateAddBtn).toBeVisible();
    // Button is disabled until a name is entered
    await expect(collections.inlineNewCollectionCreateAddBtn).toBeDisabled();

    await collections.inlineNewCollectionCancelBtn.click();
    await collections.saveToCollectionModalCloseBtn.click();
  });

  test('"Create & Add" creates the collection and saves the ad — both toasts fire', async () => {
    await openSaveToCollectionModal();
    await collections.clickNewCollectionInSaveModal();

    await collections.createAndAddCollectionInline(INLINE_NAME);

    // Both modals must close
    await expect(collections.inlineNewCollectionModal).not.toBeVisible();
    await expect(collections.saveToCollectionModal).not.toBeVisible();

    // Two success toasts: one for collection creation, one for the ad save
    await expect(collections.collectionCreatedToast).toBeVisible({ timeout: 10000 });
    await expect(collections.collectionCreatedToast).toContainText(INLINE_NAME);
    await expect(collections.adSavedToCollectionToast).toBeVisible({ timeout: 10000 });
    await expect(collections.adSavedToCollectionToast).toContainText(INLINE_NAME);
  });

  test('After inline creation the save modal subtitle shows N+1 collections available', async () => {
    if (collectionCountBefore === 0) test.skip(true, 'Could not read initial count — skipping');

    await openSaveToCollectionModal();

    const countAfter = await collections.getSaveToCollectionCount();

    // NOT toBe(collectionCountBefore + 1). The collection list is one per-merchant resource
    // and the other specs in this directory create/delete collections from parallel workers,
    // so the absolute total drifts by however many they add mid-run — observed 11 -> 14
    // where this file created exactly one. This describe being .serial only orders ITS OWN
    // tests; it cannot hold the rest of the suite still.
    // Assert what the test is actually about: the inline-created collection is now offered,
    // and the total grew.
    await expect(collections.saveToCollectionItem.filter({ hasText: INLINE_NAME }).first())
      .toBeVisible();
    expect(countAfter).toBeGreaterThan(collectionCountBefore);

    await collections.saveToCollectionModalCloseBtn.click();
  });

  // Remove the inline-created collection regardless of which test failed
  test.afterAll(async ({ browser }) => {
    // Cleanup logs in from scratch (login + merchant select), which is slow on the
    // dev env — the default 60s test budget is not enough and silently leaves data behind.
    test.setTimeout(240000);
    const ctx  = await browser.newContext({ storageState: '.auth/user.json' });
    const page = await ctx.newPage();
    try {
      await new KwiksAdsCreativeAgent(page).goto();
      const c = new Collections(page);
      await c.navigate();
      await c.deleteCollectionByName(INLINE_NAME).catch(() => {}); // may not exist
    } finally {
      await ctx.close();
    }
  });
});

// ── Re-saving the same ad to a collection it's already in ─────────────────────

test.describe.serial('Re-saving the same ad to a collection it already belongs to', () => {
  const RESAVE_COLLECTION = 'playwright-resave-test';
  // Ad count the modal advertised before the re-save, shared across the tests below
  let countInModalBeforeResave = 1;

  // Extra time: the first test creates a collection, navigates tabs, and saves —
  // combined with the short-but-serial second test, 60s per test is tight.
  test.setTimeout(120000);

  test('First save: ad is added to the new collection — success toast and modal close', async ({ page }) => {
    // Create a disposable collection
    await collections.navigate();
    await collections.openNewCollectionModal();
    await collections.createCollection(RESAVE_COLLECTION);

    await adsLibrary.navigateToAdsLibrary();
    // After navigating from Collections → Ad Library, wait for cards to be
    // fully rendered before attempting the 3-dot menu (avoids closed-page error)
    await adsLibrary.adCardList.first().waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal();

    // Row starts as "Empty board"
    await expect(collections.saveToCollectionItem.filter({ hasText: RESAVE_COLLECTION })).toContainText('Empty board');

    // Save the first ad — this also covers "Save to a collection that already has ads" for test 2
    await collections.clickSaveToCollectionRow(RESAVE_COLLECTION);

    await expect(collections.successToast).toBeVisible({ timeout: 10000 });
    await expect(collections.saveToCollectionModal).not.toBeVisible();
  });

  test('After the first save the modal row shows an ad count instead of "Empty board"', async () => {
    await openSaveToCollectionModal();

    const row = collections.saveToCollectionItem.filter({ hasText: RESAVE_COLLECTION }).first();
    await expect(row).not.toContainText('Empty board');
    await expect(row).toContainText('ad');

    // Remember the advertised count for the verification test below
    const rowText = await row.innerText();
    countInModalBeforeResave = parseInt(rowText.match(/(\d+)\s*ad/)?.[1] ?? '1');

    await collections.saveToCollectionModalCloseBtn.click();
  });

  test('Re-saving the same ad to the same collection closes the modal and shows feedback', async () => {
    await openSaveToCollectionModal();

    await collections.clickSaveToCollectionRow(RESAVE_COLLECTION);

    await expect(collections.saveToCollectionModal).not.toBeVisible();
    await expect(collections.anyToast).toBeVisible({ timeout: 10000 });
  });

  test('After re-saving, the collection detail still shows at least the original ad count', async () => {
    await collections.navigate();

    const targetCard = collections.getCardByName(RESAVE_COLLECTION).first();
    await targetCard.waitFor({ state: 'visible' });
    await targetCard.click();

    const spinner = collections.pageSpinner;
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await collections.detailSelectButton.waitFor({ state: 'visible', timeout: 15000 });

    // Count must be >= the count the modal showed before re-saving
    // (app may add a duplicate → +1, or prevent duplicates → unchanged)
    const countAfterInDetail = await collections.getDetailAdCount();
    expect(countAfterInDetail).toBeGreaterThanOrEqual(countInModalBeforeResave);
    expect(countAfterInDetail).toBeGreaterThan(0);

    await collections.goBackToCollections();
  });

  // Remove the disposable collection regardless of which test failed
  test.afterAll(async ({ browser }) => {
    // Cleanup logs in from scratch (login + merchant select), which is slow on the
    // dev env — the default 60s test budget is not enough and silently leaves data behind.
    test.setTimeout(240000);
    const ctx  = await browser.newContext({ storageState: '.auth/user.json' });
    const page = await ctx.newPage();
    try {
      await new KwiksAdsCreativeAgent(page).goto();
      const c = new Collections(page);
      await c.navigate();
      await c.deleteCollectionByName(RESAVE_COLLECTION).catch(() => {}); // may not exist
    } finally {
      await ctx.close();
    }
  });
});

// ── Save-and-verify serial tests ──────────────────────────────────────────────

test.describe.serial('Save to Collection — full save and verify flow', () => {

  test('Clicking a collection row saves the ad: modal closes → loader → success toast', async ({ page }) => {
    // Create a fresh isolated collection so the count assertion is reliable
    await collections.navigate();
    await collections.openNewCollectionModal();
    await collections.createCollection(SAVE_TARGET);

    // Navigate to Ad Library and save the first ad to the new collection
    await adsLibrary.navigateToAdsLibrary();
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal();

    // Clicks the row → modal closes → loader fires → networkidle
    await adsLibrary.clickCollectionInModal(SAVE_TARGET);

    // Toast confirms the save with the collection name
    await expect(collections.successToast).toBeVisible({ timeout: 10000 });
    await expect(collections.successToast).toContainText(SAVE_TARGET);
  });

  test('After saving, opening the target collection shows the ad in "Showing 1 ad" count', async () => {
    await collections.navigate();

    const targetCard = collections.collectionCards.filter({ hasText: SAVE_TARGET }).first();
    await targetCard.waitFor({ state: 'visible' });
    await targetCard.click();

    const spinner = collections.pageSpinner;
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await collections.detailSelectButton.waitFor({ state: 'visible', timeout: 15000 });

    const adCount = await collections.getDetailAdCount();
    expect(adCount).toBe(1);
    await expect(collections.detailShowingLabel).toContainText('Showing 1 ad');

    await collections.goBackToCollections();
  });

  // Remove the disposable collection regardless of which test failed
  test.afterAll(async ({ browser }) => {
    // Cleanup logs in from scratch (login + merchant select), which is slow on the
    // dev env — the default 60s test budget is not enough and silently leaves data behind.
    test.setTimeout(240000);
    const ctx  = await browser.newContext({ storageState: '.auth/user.json' });
    const page = await ctx.newPage();
    try {
      await new KwiksAdsCreativeAgent(page).goto();
      const c = new Collections(page);
      await c.navigate();
      await c.deleteCollectionByName(SAVE_TARGET).catch(() => {}); // may not exist
    } finally {
      await ctx.close();
    }
  });
});
