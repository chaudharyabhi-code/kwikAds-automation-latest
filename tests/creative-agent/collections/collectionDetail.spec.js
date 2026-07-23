import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// Opens the first user-created collection (index 1 in the grid)
const USER_CARD = 1;

test.describe('Collection detail view — structure', () => {
  let collections;

  test.beforeEach(async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    collections = new Collections(page);
    await collections.navigate();
    await collections.openCollection(USER_CARD);
  });

  test('Clicking a collection card opens detail view with back arrow, name, ad count, Showing label and Select button', async () => {
    await expect(collections.detailBackButton).toBeVisible();

    await expect(collections.detailName).toBeVisible();
    const name = await collections.detailName.innerText();
    expect(name.trim().length).toBeGreaterThan(0);

    await expect(collections.detailAdCountInfo).toBeVisible();
    await expect(collections.detailAdCountInfo).toContainText('ad');

    await expect(collections.detailShowingLabel).toBeVisible();
    await expect(collections.detailShowingLabel).toContainText('Showing');

    await expect(collections.detailSelectButton).toBeVisible();
  });

  test('Back arrow returns to the Collections grid and hides the detail header', async () => {
    await collections.goBackToCollections();

    await expect(collections.newCollectionButton).toBeVisible();
    await expect(collections.collectionCardsGrid).toBeVisible();
    // Back in the list view — Select button should no longer be visible
    await expect(collections.detailSelectButton).not.toBeVisible();
  });

  test('Ad count in detail header matches the "Showing N ad(s)" label count', async () => {
    const headerCount  = await collections.getDetailAdCount();
    const showingCount = await collections.getDetailShowingCount();
    expect(headerCount).toBe(showingCount);
  });

  test('"Select" button enters selection mode — label updates, Cancel appears, Select itself is replaced', async () => {
    await collections.enterDetailSelectionMode();

    // Label changes to tap-to-select state regardless of whether the collection has ads
    await expect(collections.detailShowingLabel).toContainText('Tap ads to select');

    // Cancel is always present in selection mode (our wait signal in enterDetailSelectionMode)
    await expect(collections.detailCancelSelectionBtn).toBeVisible();

    // "Select" button is replaced by the toolbar
    await expect(collections.detailSelectButton).not.toBeVisible();
  });
});
