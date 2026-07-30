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

test('"Saved Ads" default card is always present in the collections grid with a creation date', async () => {
  await expect(collections.savedAdsCard).toBeVisible();
  await expect(collections.savedAdsCardDate).toBeVisible();

  const dateText = await collections.savedAdsCardDate.innerText();
  expect(dateText.trim().length).toBeGreaterThan(0);
});

test('"Saved Ads" card does not show a Delete icon unlike user-created collection cards', async () => {
  await expect(collections.savedAdsCardDeleteBtn).not.toBeVisible();
});

test('"Saved Ads" card does not show a "by [user]" attribution unlike user-created collection cards', async () => {
  await expect(collections.savedAdsCardAttribution).not.toBeVisible();
});
