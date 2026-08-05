import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

let myAds;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
  await page.waitForLoadState('networkidle');
});

// ─── Test 1: All elements visible on My Ads page load ─────────────────────────
test('My Ads - page loads with all required UI elements visible', async () => {
  // Main tabs — Ads and Performance must both be visible; Ads is active by default
  await expect(myAds.adsTab).toBeVisible();
  await expect(myAds.performanceTab).toBeVisible();

  // Sub-tabs (inside Ads tab)
  await expect(myAds.subTabAll).toBeVisible();
  await expect(myAds.subTabMeta).toBeVisible();
  await expect(myAds.subTabDraft).toBeVisible();

  // Search bar
  await expect(myAds.searchInput).toBeVisible();

  // Filters
  await expect(myAds.adFormatFilter).toBeVisible();
  await expect(myAds.statusFilter).toBeVisible();
  await expect(myAds.kaaiFilter).toBeVisible();
  await expect(myAds.sortByFilter).toBeVisible();

  // Date range and min days running
  await expect(myAds.launchDateRange).toBeVisible();
  await expect(myAds.minDaysInput).toBeVisible();

  // Ranking filters
  await expect(myAds.qualityRankingFilter).toBeVisible();
  await expect(myAds.engagementRankingFilter).toBeVisible();
  await expect(myAds.conversionRankingFilter).toBeVisible();

  // Ad account selector
  await expect(myAds.adAccountFilter).toBeVisible();

  // Order button
  await expect(myAds.orderDescButton).toBeVisible();
  // Results count and ad card list
  await expect(myAds.resultsCount).toBeVisible();
  await expect(myAds.adCardList).toBeVisible();

  // Toolbar: KAAI %, Select, + upload, sync
  await expect(myAds.kaaiCoverageButton).toBeVisible();
  await expect(myAds.selectButton).toBeVisible();
  await expect(myAds.uploadButton).toBeVisible();
  await expect(myAds.syncButton).toBeVisible();
});

// ─── Test 2: Results count shows loaded and total correctly ───────────────────
test('My Ads - results count shows the first batch loaded and the correct total', async ({ page }) => {
  const { loaded, total } = await myAds.getResultsLoadedAndTotal();

  console.log(`My Ads initial count: ${loaded} of ${total} ads`);

  // First batch is FIRST_PAGE_SIZE, or the whole set when there are fewer ads than that
  expect(loaded).toBe(Math.min(myAds.FIRST_PAGE_SIZE, total));
  // Total must be positive
  expect(total).toBeGreaterThan(0);
  // Loaded never exceeds total
  expect(loaded).toBeLessThanOrEqual(total);

  // Badge in the search bar must show the same total
  const badgeText = (await myAds.resultsBadge.innerText()).replace(/,/g, '');
  expect(parseInt(badgeText)).toBe(total);
});

// ─── Test 3: Scrolling loads more ad cards beyond the initial 30 ──────────────
test('My Ads - scrolling down loads more ad cards beyond initial 30', async () => {
  const { loaded: initialLoaded, total } = await myAds.getResultsLoadedAndTotal();
  expect(initialLoaded).toBe(Math.min(myAds.FIRST_PAGE_SIZE, total));

  if (total <= myAds.FIRST_PAGE_SIZE) {
    console.log(`Total is ${total} — nothing more to load; skipping scroll assertion`);
    return;
  }

  await myAds.scrollGridToBottom();

  let afterLoaded;
  await expect.poll(
    async () => {
      ({ loaded: afterLoaded } = await myAds.getResultsLoadedAndTotal());
      return afterLoaded;
    },
    { timeout: 15000, intervals: [500] }
  ).toBeGreaterThan(initialLoaded);

  console.log(`After scroll: ${afterLoaded} loaded (was ${initialLoaded})`);
});

// ─── Test 4: Total count unchanged, loaded count increases after scroll ────────
test('My Ads - total ad count stays the same while loaded count grows on scroll', async ({ page }) => {
  const { loaded: loadedBefore, total: totalBefore } = await myAds.getResultsLoadedAndTotal();

  if (totalBefore <= 30) {
    console.log(`Total is ${totalBefore} — nothing more to load; skipping`);
    return;
  }

  await myAds.scrollGridToBottom();
await myAds.page.waitForTimeout(4000);
  let loadedAfter, totalAfter;
  await expect.poll(
    async () => {
      ({ loaded: loadedAfter, total: totalAfter } = await myAds.getResultsLoadedAndTotal());
      return loadedAfter;
    },
    { timeout: 15000, intervals: [500] }
  ).toBeGreaterThan(loadedBefore);

  console.table({ loadedBefore, loadedAfter, totalBefore, totalAfter });

  // Server-side total must never change
  expect(totalAfter).toBe(totalBefore);
  // More items rendered after scroll
  expect(loadedAfter).toBeGreaterThan(loadedBefore);
});
