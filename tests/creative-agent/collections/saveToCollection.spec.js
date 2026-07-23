import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';
import { Collections } from '../../../pages/collections';
import { matchesGlob } from 'node:path';

// Disposable collection used for the save-and-verify serial tests
const SAVE_TARGET = 'playwright-save-verify';

// Helper: open the 3-dot menu, click "Save to Collection", wait for the
// loader that fires before the modal appears, then return with modal visible.
async function openSaveToCollectionModal(adsLibrary, collections) {
  await adsLibrary.openFirstCardMenu();
  await adsLibrary.clickCardMenuOption('Save to Collection');
  await collections.waitForSaveToCollectionModal(); // loader → modal visible
}

// ── Non-destructive modal inspection tests ────────────────────────────────────

test('"Save to Collection" modal opens with correct title and "Adding 1 ad · N collections available" subtitle', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary  = new AdsLibrary(page);
  const collections = new Collections(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await openSaveToCollectionModal(adsLibrary, collections);

  await expect(collections.saveToCollectionModal).toContainText('Save to Collection');
  await expect(collections.saveToCollectionModalSubtitle).toContainText('Adding 1 ad');
  await expect(collections.saveToCollectionModalSubtitle).toContainText('collections available');

  await collections.saveToCollectionModalCloseBtn.click();
});

test('Modal lists row count matches "N collections available" in subtitle', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary  = new AdsLibrary(page);
  const collections = new Collections(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await openSaveToCollectionModal(adsLibrary, collections);


  // Row count must equal the number advertised in the subtitle
  const subtitleText = await collections.saveToCollectionModalSubtitle.innerText();
  const advertised   = parseInt(subtitleText.match(/(\d+)\s+collections/)?.[1] ?? '0');
  const rowCount     = await collections.saveToCollectionItem.count();
  expect(rowCount).toBe(advertised);

  await collections.saveToCollectionModalCloseBtn.click();
});


test('Closing the modal via X without selecting a collection saves nothing and shows no toast', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary  = new AdsLibrary(page);
  const collections = new Collections(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await openSaveToCollectionModal(adsLibrary, collections);

  await collections.saveToCollectionModalCloseBtn.click();

  await expect(collections.saveToCollectionModal).not.toBeVisible();
  await expect(collections.successToast).not.toBeVisible();
});

test('"+ New Collection" button is visible at the bottom of the Save to Collection modal list', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary  = new AdsLibrary(page);
  const collections = new Collections(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await openSaveToCollectionModal(adsLibrary, collections);

  await expect(collections.saveToCollectionNewCollectionBtn).toBeVisible();

  await collections.saveToCollectionModalCloseBtn.click();
});

test('Multi-selecting ads via Select mode shows "Adding N ads" in the modal subtitle', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary  = new AdsLibrary(page);
  const collections = new Collections(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Enter select mode and pick 2 different cards from the first virtuoso row
  await adsLibrary.enterSelectMode();
  const overlays = adsLibrary.adCardList.locator('[data-index="0"]').locator('div[style*="rgba(255, 255, 255, 0.92)"]');
  await overlays.nth(0).click({ force: true });
  await overlays.nth(1).click({ force: true });
  await adsLibrary.selectionCountText.waitFor({ state: 'visible' });

  // "Add to Collection" toolbar button — no loader before this modal
  await adsLibrary.openAddToCollectionModal();
  await expect(collections.saveToCollectionModalSubtitle).toContainText('Adding 2 ads');

  await collections.saveToCollectionModalCloseBtn.click();
  await adsLibrary.exitSelectMode();
});

// ── Save-and-verify serial tests ──────────────────────────────────────────────

// ── Bulk save — post-save toast text ─────────────────────────────────────────

test('Bulk-saving 2 ads shows "2 ads added to \'<collection>\'" in the success toast', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary  = new AdsLibrary(page);
  const collections = new Collections(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Select 2 ads via the Select toolbar
  await adsLibrary.enterSelectMode();
  const overlays = adsLibrary.adCardList.locator('[data-index="0"]').locator('div[style*="rgba(255, 255, 255, 0.92)"]');
  await overlays.nth(0).click({ force: true });
  await overlays.nth(1).click({ force: true });
  await adsLibrary.selectionCountText.waitFor({ state: 'visible' });

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

  test('Clicking "+ New Collection" opens the inline form with "Create & Add" button', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary  = new AdsLibrary(page);
    const collections = new Collections(page);
    await adsLibrary.navigateToAdsLibrary();
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal(adsLibrary, collections);

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

  test('"Create & Add" creates the collection and saves the ad — both toasts fire', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary  = new AdsLibrary(page);
    const collections = new Collections(page);
    await adsLibrary.navigateToAdsLibrary();
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal(adsLibrary, collections);
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

  test('After inline creation the save modal subtitle shows N+1 collections available', async ({ page }) => {
    if (collectionCountBefore === 0) test.skip(true, 'Could not read initial count — skipping');

    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary  = new AdsLibrary(page);
    const collections = new Collections(page);
    await adsLibrary.navigateToAdsLibrary();
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal(adsLibrary, collections);

    const countAfter = await collections.getSaveToCollectionCount();
    expect(countAfter).toBe(collectionCountBefore + 1);

    await collections.saveToCollectionModalCloseBtn.click();

    // Cleanup — delete the inline-created collection
    await collections.navigate();
    await collections.deleteCollectionByName(INLINE_NAME);
  });
});

// ── Re-saving the same ad to a collection it's already in ─────────────────────

test.describe.serial('Re-saving the same ad to a collection it already belongs to', () => {
  const RESAVE_COLLECTION = `playwright-resave-test ${Math.random()}`;

  // Extra time: the first test creates a collection, navigates tabs, and saves —
  // combined with the short-but-serial second test, 60s per test is tight.
  test.setTimeout(120000);

  test('First save: ad is added to the new collection — success toast and modal close', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary  = new AdsLibrary(page);
    const collections = new Collections(page);

    // Create a disposable collection
    await collections.navigate();
    await collections.openNewCollectionModal();
    await collections.createCollection(RESAVE_COLLECTION);

    await adsLibrary.navigateToAdsLibrary();
    // After navigating from Collections → Ad Library, wait for cards to be
    // fully rendered before attempting the 3-dot menu (avoids closed-page error)
    await adsLibrary.adCardList.first().waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal(adsLibrary, collections);

    // Row starts as "Empty board"
    await expect(collections.saveToCollectionItem.filter({ hasText: RESAVE_COLLECTION })).toContainText('Empty board');

    // Save the first ad — this also covers "Save to a collection that already has ads" for test 2
    await collections.clickSaveToCollectionRow(RESAVE_COLLECTION);

    await expect(collections.successToast).toBeVisible({ timeout: 10000 });
    await expect(collections.saveToCollectionModal).not.toBeVisible();
  });

  test('Second save to same collection: row now shows ad count and re-save produces a toast', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const adsLibrary  = new AdsLibrary(page);
    const collections = new Collections(page);
    await adsLibrary.navigateToAdsLibrary();
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal(adsLibrary, collections);

    // The row must now show a non-zero ad count (proves save to non-empty collection path)
    const row = collections.saveToCollectionItem.filter({ hasText: RESAVE_COLLECTION }).first();
    await expect(row).not.toContainText('Empty board');
    await expect(row).toContainText('ad');

    // Attempt re-save — app either shows success or an "already added" message
    await collections.clickSaveToCollectionRow(RESAVE_COLLECTION);

    // Any toast (success or info) must be visible — modal must close either way
    await expect(collections.saveToCollectionModal).not.toBeVisible();
    const anyToast = page.locator('.ant-message-notice');
    await expect(anyToast).toBeVisible({ timeout: 10000 });

    // Cleanup
    await collections.navigate();
    await collections.deleteCollectionByName(RESAVE_COLLECTION);
  });
});

// ── Save-and-verify serial tests ──────────────────────────────────────────────

test.describe.serial('Save to Collection — full save and verify flow', () => {

  test('Clicking a collection row saves the ad: modal closes → loader → success toast', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const collections = new Collections(page);
    const adsLibrary  = new AdsLibrary(page);

    // Create a fresh isolated collection so the count assertion is reliable
    await collections.navigate();
    await collections.openNewCollectionModal();
    await collections.createCollection(SAVE_TARGET);

    // Navigate to Ad Library and save the first ad to the new collection
    await adsLibrary.navigateToAdsLibrary();
    await page.waitForLoadState('networkidle');

    await openSaveToCollectionModal(adsLibrary, collections);

    // Clicks the row → modal closes → loader fires → networkidle
    await adsLibrary.clickCollectionInModal(SAVE_TARGET);

    // Toast confirms the save with the collection name
    await expect(collections.successToast).toBeVisible({ timeout: 10000 });
    await expect(collections.successToast).toContainText(SAVE_TARGET);
  });

  test('After saving, opening the target collection shows the ad in "Showing 1 ad" count', async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    const collections = new Collections(page);

    await collections.navigate();

    const targetCard = collections.collectionCards.filter({ hasText: SAVE_TARGET }).first();
    await targetCard.waitFor({ state: 'visible' });
    await targetCard.click();

    const spinner = collections.adsLibraryContent.locator("span[aria-label='loading']").first();
    await spinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await collections.detailSelectButton.waitFor({ state: 'visible', timeout: 15000 });

    const adCount = await collections.getDetailAdCount();
    expect(adCount).toBe(1);
    await expect(collections.detailShowingLabel).toContainText('Showing 1 ad');

    // Cleanup
    await collections.goBackToCollections();
    await collections.deleteCollectionByName(SAVE_TARGET);
  });
}); 
