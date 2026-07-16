import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('View Ads - each competitor applies its own distinct brand filter with no carryover', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  // ── Competitor A (card 0) ────────────────────────────────────────────────
  const brandA = await competitor.getCardName(0).innerText();
  await competitor.clickViewAds(0);
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });
  await expect(competitor.adLibraryBrandFilterTag).toBeVisible();
  const filterA = await competitor.adLibraryBrandFilterTag.innerText();

  console.log(`Competitor A: "${brandA.trim()}" → filter: "${filterA.trim()}"`);

  // ── Return to Competitors tab ─────────────────────────────────────────────
  await competitor.backToCompetitorsTab();

  // ── Competitor B (card 1) ────────────────────────────────────────────────
  const brandB = await competitor.getCardName(1).innerText();
  await competitor.clickViewAds(1);
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });
  await expect(competitor.adLibraryBrandFilterTag).toBeVisible();
  const filterB = await competitor.adLibraryBrandFilterTag.innerText();

  console.log(`Competitor B: "${brandB.trim()}" → filter: "${filterB.trim()}"`);

  // Filters must be distinct — no carryover from A to B
  expect(filterA.trim()).not.toBe(filterB.trim());
});
