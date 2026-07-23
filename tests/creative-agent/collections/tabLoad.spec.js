import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

test('Collections tab loads with search bar, count badge, New Collection button, and collection cards including Saved Ads', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await expect(collections.searchInput).toBeVisible();
  await expect(collections.collectionCount).toBeVisible();
  await expect(collections.newCollectionButton).toBeVisible();
  await expect(collections.savedAdsCard).toBeVisible();

  const count = await collections.getCollectionCount();
  expect(count).toBeGreaterThan(0);
});
