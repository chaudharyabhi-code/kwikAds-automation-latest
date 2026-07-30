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

test('Collection count badge matches number of collection cards rendered in the grid', async () => {
  const badgeCount = await collections.getCollectionCount();
  const renderedCount = await collections.getRenderedCardCount();

  expect(renderedCount).toBe(badgeCount);
});
