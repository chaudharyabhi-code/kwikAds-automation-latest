import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  // A merchant may have no (or too few) saved competitors — skip rather than
  // index into an empty list.
  const cardCount = await competitor.countAllCards();
  test.skip(cardCount < 2, `Needs at least 2 saved competitor(s); found ${cardCount}`);
});

// ─── Test 1: View Ads applies a brand filter for the chosen competitor ────────
test('View Ads - opens the Ad Library with a brand filter tag applied', async () => {
  const brandA = await competitor.getCardName(0).innerText();

  await competitor.clickViewAds(0);

  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });
  await expect(competitor.adLibraryBrandFilterTag).toBeVisible();

  const filterA = await competitor.adLibraryBrandFilterTag.innerText();
  console.log(`Competitor A: "${brandA.trim()}" → filter: "${filterA.trim()}"`);
  expect(filterA.trim().length).toBeGreaterThan(0);
});

// ─── Test 2: a second competitor gets its own filter — no carryover ───────────
// Inherently needs both competitors, since the assertion compares one against the other.
test('View Ads - a second competitor applies a distinct filter with no carryover from the first', async () => {
  const brandA = await competitor.getCardName(0).innerText();
  await competitor.clickViewAds(0);
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });
  const filterA = await competitor.adLibraryBrandFilterTag.innerText();

  await competitor.backToCompetitorsTab();

  const brandB = await competitor.getCardName(1).innerText();
  await competitor.clickViewAds(1);
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });
  const filterB = await competitor.adLibraryBrandFilterTag.innerText();

  console.log(`A: "${brandA.trim()}" → "${filterA.trim()}"  |  B: "${brandB.trim()}" → "${filterB.trim()}"`);

  // Filters must be distinct — no carryover from A to B
  expect(filterA.trim()).not.toBe(filterB.trim());
});
