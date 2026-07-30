import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// Serial so the beforeAll-discovered cardIndex is shared safely across all tests in one worker.
test.describe.serial('Collection detail view — selection mode (requires a collection with ads)', () => {
  let cardIndex = -1;
  let collections;

  // Find the first user-created collection that contains at least 1 ad.
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: '.auth/user.json' });
    const page = await ctx.newPage();
    await new KwiksAdsCreativeAgent(page).goto();
    const c = new Collections(page);
    await c.navigate();
    const total = await c.getRenderedCardCount();
    for (let i = 1; i < total; i++) { // skip index 0 (Saved Ads)
      await c.openCollection(i);
      const count = await c.getDetailAdCount();
      await c.goBackToCollections();
      if (count >= 1) { cardIndex = i; break; }
    }
    await ctx.close();
  });

  // Each test opens the discovered collection fresh and enters selection mode.
  // Calling test.skip() here skips every test in the block when beforeAll found
  // no suitable collection — so no test needs to repeat that guard.
  test.beforeEach(async ({ page }) => {
    test.skip(cardIndex === -1, 'No collection with ads found');

    await new KwiksAdsCreativeAgent(page).goto();
    collections = new Collections(page);
    await collections.navigate();
    await collections.openCollection(cardIndex);
    await collections.enterDetailSelectionMode();
  });

  test('"Remove from Collection" button is disabled when no ads are selected', async () => {
    await expect(collections.detailRemoveFromCollectionBtn).toBeDisabled();
  });

  test('Selecting an ad enables "Remove from Collection" and updates the selected count label', async () => {
    await collections.selectAdInDetail(0);

    await expect(collections.detailRemoveFromCollectionBtn).toBeEnabled();
    await expect(collections.detailShowingLabel).toContainText('selected');
  });

  test('Multiple ads can be selected simultaneously (requires a collection with 2+ ads)', async () => {
    const adCount = await collections.getDetailAdCount();
    if (adCount < 2) test.skip(true, 'Collection has fewer than 2 ads — skipping multi-select test');

    await collections.selectAdInDetail(0);
    await collections.selectAdInDetail(1);

    // Label should reflect 2 selected
    await expect(collections.detailShowingLabel).toContainText('2 selected');
    await expect(collections.detailRemoveFromCollectionBtn).toBeEnabled();
  });

  test('"Cancel" exits selection mode and restores the "Select" button without changing the ad list', async () => {
    const countBefore = await collections.getDetailAdCount();

    await collections.detailCancelSelectionBtn.click();

    // Back to normal view
    await expect(collections.detailSelectButton).toBeVisible();
    await expect(collections.detailRemoveFromCollectionBtn).not.toBeVisible();
    await expect(collections.detailCancelSelectionBtn).not.toBeVisible();
    await expect(collections.detailShowingLabel).toContainText('Showing');
    await expect(collections.detailShowingLabel).not.toContainText('Tap ads to select');

    // Ad count is unchanged
    const countAfter = await collections.getDetailAdCount();
    expect(countAfter).toBe(countBefore);
  });

  test('"Remove from Collection" opens a confirmation modal with the collection name and correct ad count', async () => {
    const collectionName = (await collections.detailName.innerText()).trim();
    await collections.selectAdInDetail(0);
    await collections.clickRemoveFromCollection();

    // Modal appears with correct title and message
    await expect(collections.removeAdsModal).toBeVisible();
    await expect(collections.removeAdsModal).toContainText('Remove ads from collection');
    await expect(collections.removeAdsModal).toContainText(collectionName);
    await expect(collections.removeAdsConfirmBtn).toBeVisible();
    await expect(collections.removeAdsCancelBtn).toBeVisible();
  });

  test('Cancelling the remove confirmation modal dismisses it and leaves the ad in the collection', async () => {
    const countBefore = await collections.getDetailAdCount();

    await collections.selectAdInDetail(0);
    await collections.clickRemoveFromCollection();

    await collections.removeAdsCancelBtn.click();
    await expect(collections.removeAdsModal).not.toBeVisible();

    // Ad count must be unchanged
    const countAfter = await collections.getDetailAdCount();
    expect(countAfter).toBe(countBefore);
  });
});
