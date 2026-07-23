import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

test('Search - valid match filters grid to show only matching collections', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  // Read the name of the first user-created card dynamically so the test doesn't depend on a hardcoded name
  const firstCardName = (await collections.getCardName(1).innerText()).trim();

  await collections.search(firstCardName);

  // Matching card is visible
  const matchingCard = collections.collectionCardsGrid.locator('> div').filter({ hasText: firstCardName });
  await expect(matchingCard).toBeVisible();

  // "Saved Ads" (index 0) is not visible since it doesn't match the search term
  await expect(collections.savedAdsCard).not.toBeVisible();
});

test('Search - no match shows "No collections matching" message and no cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  const query = 'zzz_no_match_xyz_123';
  await collections.search(query);

  // Empty state contains the search term in the message e.g. 'No collections matching "zzz_no_match_xyz_123"'
  await expect(collections.emptySearchState).toBeVisible();
  await expect(collections.emptySearchState).toContainText(query);

  const renderedCount = await collections.getRenderedCardCount();
  expect(renderedCount).toBe(0);
});

test('Search - "Saved Ads" is included in search results like any other collection', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await collections.search('Saved Ads');

  await expect(collections.savedAdsCard).toBeVisible();
});
