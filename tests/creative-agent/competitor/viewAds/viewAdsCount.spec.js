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

test('View Ads - Ad Library filtered result count matches competitor card total ad volume', async () => {
  // Read total ad volume from the competitor card before navigating
  const { total: cardTotal } = await competitor.getCardAdVolumeNumbers(0);
  const brandName            = await competitor.getCardName(0).innerText();

  // Click View Ads
  await competitor.clickViewAds(0);

  // Wait for Ad Library grid to appear
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });

  // Parse total from "30 of Y ads" label
  const adLibraryTotal = await competitor.getAdLibraryTotalCount();

  console.log(`[${brandName.trim()}] Card total: ${cardTotal} | Ad Library total: ${adLibraryTotal}`);
  expect(adLibraryTotal).toBe(cardTotal);
});
