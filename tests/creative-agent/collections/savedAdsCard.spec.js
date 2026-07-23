import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

test('"Saved Ads" default card is always present in the collections grid with a creation date', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await expect(collections.savedAdsCard).toBeVisible();
  await expect(collections.savedAdsCardDate).toBeVisible();

  const dateText = await collections.savedAdsCardDate.innerText();
  expect(dateText.trim().length).toBeGreaterThan(0);
});

test('"Saved Ads" card does not show a Delete icon unlike user-created collection cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await expect(collections.savedAdsCardDeleteBtn).not.toBeVisible();
});

test('"Saved Ads" card does not show a "by [user]" attribution unlike user-created collection cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const collections = new Collections(page);
  await collections.navigate();

  await expect(collections.savedAdsCardAttribution).not.toBeVisible();
});
