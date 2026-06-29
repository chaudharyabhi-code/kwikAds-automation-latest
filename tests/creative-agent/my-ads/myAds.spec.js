import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { MyAds } from '../../../pages/my-ads';

// ─── Test 1: All elements visible on My Ads page load ─────────────────────────
test('My Ads - page loads with all required UI elements visible', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();
  await page.waitForLoadState('networkidle');

  // Sub-tabs
  await expect(myAds.subTabAll.first()).toBeVisible();
  await expect(myAds.subTabMeta.first()).toBeVisible();
  await expect(myAds.subTabDraft.first()).toBeVisible();

  // Search bar
  await expect(myAds.searchInput).toBeVisible();

  // Filters
  await expect(myAds.adFormatFilter.first()).toBeVisible();
  await expect(myAds.statusFilter.first()).toBeVisible();
  await expect(myAds.kaaiFilter.first()).toBeVisible();
  await expect(myAds.sortByFilter.first()).toBeVisible();

  // Date range and min days running
  await expect(myAds.launchDateRange.first()).toBeVisible();
  await expect(myAds.minDaysInput.first()).toBeVisible();

  // Order button
  await expect(myAds.orderDescButton.first()).toBeVisible();
  // Results count and ad card list
  await expect(myAds.resultsCount).toBeVisible();
  await expect(myAds.adCardList.nth(0)).toBeVisible();

  // Toolbar: KAAI %, Select, + upload, sync
  await expect(myAds.kaaiCoverageButton).toBeVisible();
  await expect(myAds.selectButton).toBeVisible();
  await expect(myAds.uploadButton.first()).toBeVisible();
  await expect(myAds.syncButton.first()).toBeVisible();
});

// ─── Test 2: Results count shows loaded and total correctly ───────────────────
test('My Ads - results count shows 30 loaded initially and correct total', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();
  await page.waitForLoadState('networkidle');

  const { loaded, total } = await myAds.getResultsLoadedAndTotal();

  console.log(`My Ads initial count: ${loaded} of ${total} ads`);

  // First page batch is always 30
  expect(loaded).toBe(30);
  // Total must be positive
  expect(total).toBeGreaterThan(0);
  // Loaded never exceeds total
  expect(loaded).toBeLessThanOrEqual(total);

  // Badge in the search bar must show the same total
  const badgeText = (await myAds.resultsBadge.first().innerText()).replace(/,/g, '');
  expect(parseInt(badgeText)).toBe(total);
});

// ─── Test 3: Scrolling loads more ad cards beyond the initial 30 ──────────────
test('My Ads - scrolling down loads more ad cards beyond initial 30', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();
  await page.waitForLoadState('networkidle');

  const { loaded: initialLoaded, total } = await myAds.getResultsLoadedAndTotal();
  expect(initialLoaded).toBe(30);

  if (total <= 30) {
    console.log(`Total is ${total} — nothing more to load; skipping scroll assertion`);
    return;
  }

  await myAds.scroller.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));

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
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();
  await page.waitForLoadState('networkidle');

  const { loaded: loadedBefore, total: totalBefore } = await myAds.getResultsLoadedAndTotal();

  if (totalBefore <= 30) {
    console.log(`Total is ${totalBefore} — nothing more to load; skipping`);
    return;
  }

  await myAds.scroller.evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
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
