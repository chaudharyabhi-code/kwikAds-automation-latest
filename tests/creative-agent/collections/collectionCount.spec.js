import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

test('Collection count badge matches number of collection cards rendered in the grid', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  const badgeCount = await collections.getCollectionCount();
  const renderedCount = await collections.getRenderedCardCount();

  expect(renderedCount).toBe(badgeCount);
});
