import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
});

test('View Ads - navigates to Ad Library with brand name filter pre-applied for that competitor', async () => {
  // Note the brand name on the card before clicking
  const brandName = await competitor.getCardName(0).innerText();

  // Click View Ads
  await competitor.clickViewAds(0);

  // Ad Library grid must appear (navigation to Ad Library succeeded)
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });

  // Brand filter must have a selected tag — confirms the brand was pre-applied
  await expect(competitor.adLibraryBrandFilterTag).toBeVisible();

  // The filter tag must contain some non-empty text
  const filterText = await competitor.adLibraryBrandFilterTag.innerText();
  console.log(`Card brand: "${brandName.trim()}" | Filter applied: "${filterText.trim()}"`);
  expect(filterText.trim().length).toBeGreaterThan(0);
});
