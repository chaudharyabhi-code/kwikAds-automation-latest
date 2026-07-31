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

test('Search - valid match filters grid to show only matching collections', async () => {
  // Discover a real user-created collection instead of assuming one sits at index 1 —
  // a merchant may have none at all.
  const userCard = await collections.findUserCreatedCardIndex();
  test.skip(userCard === -1, 'No user-created collection to search for');

  const firstCardName = (await collections.getCardName(userCard).innerText()).trim();

  await collections.search(firstCardName);

  // Matching card is visible
  const matchingCard = collections.getCardByName(firstCardName);
  await expect(matchingCard).toBeVisible();

  // "Saved Ads" (index 0) is not visible since it doesn't match the search term
  await expect(collections.savedAdsCard).not.toBeVisible();
});

test('Search - no match shows "No collections matching" message and no cards', async () => {
  const query = 'zzz_no_match_xyz_123';
  await collections.search(query);

  // Empty state contains the search term in the message e.g. 'No collections matching "zzz_no_match_xyz_123"'
  await expect(collections.emptySearchState).toBeVisible();
  await expect(collections.emptySearchState).toContainText(query);

  const renderedCount = await collections.getRenderedCardCount();
  expect(renderedCount).toBe(0);
});

test('Search - "Saved Ads" is included in search results like any other collection', async () => {
  await collections.search('Saved Ads');

  await expect(collections.savedAdsCard).toBeVisible();
});
