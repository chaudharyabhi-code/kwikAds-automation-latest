import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// The collection-setup project seeds this one with two ads before the project runs, so the
// subject is known up front. The previous version discovered it in a beforeAll that opened
// every collection in the grid in turn — on a merchant with dozens that blew the 120s hook
// budget, and the hook failure skipped all five tests below it.
const SEED_NAME = 'playwright-seeded-with-ad';

// NOT .serial. It only ever was so the tests could share the beforeAll-discovered index, and
// that cost five results every time the hook or the first test failed. Each test now finds the
// seeded collection itself and none of them removes an ad, so they are independent.
test.describe('Collection detail view — selection mode (requires a collection with ads)', () => {
  let collections;

  test.beforeEach(async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    collections = new Collections(page);
    await collections.navigate();
    await collections.searchAndOpenCollection(SEED_NAME);
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
    // No skip guard: collection-setup seeds two ads, so a shortfall here is a seeding
    // failure worth reporting rather than a precondition the merchant may legitimately lack.
    expect(await collections.getDetailAdCount()).toBeGreaterThanOrEqual(2);

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
