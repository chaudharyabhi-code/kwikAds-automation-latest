import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

let collections;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  collections = new Collections(page);
  await collections.navigate();
});

test('Collections tab loads with search bar, count badge, New Collection button, and collection cards including Saved Ads', async () => {
  await expect(collections.searchInput).toBeVisible();
  await expect(collections.collectionCount).toBeVisible();
  await expect(collections.newCollectionButton).toBeVisible();
  await expect(collections.savedAdsCard).toBeVisible();

  const count = await collections.getCollectionCount();
  expect(count).toBeGreaterThan(0);
});
