import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';

// ─── Test 1: Count cross-verification ────────────────────────────────────────
test('ALL STATUS filter - Active + Inactive + Archived count = Total count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalCount    = await adsLibrary.getResultsCount();

  await adsLibrary.selectStatus('Active Ads');
  const activeCount   = await adsLibrary.getResultsCount();

  await adsLibrary.selectStatus('Inactive Ads');
  const inactiveCount = await adsLibrary.getResultsCount();

  await adsLibrary.selectStatus('Archived Ads');
  const archivedCount = await adsLibrary.getResultsCount();

  console.table({ totalCount, activeCount, inactiveCount, archivedCount });
  expect(activeCount + inactiveCount + archivedCount).toBe(totalCount);
});

// ─── Test 2: Active Ads ───────────────────────────────────────────────────────
test('ALL STATUS filter - Active Ads shows only Active badges, no Inactive or Archived', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.selectStatus('Active Ads');

  const activeBadges   = await adsLibrary.activeAdBadges.count();
  const inactiveBadges = await adsLibrary.inactiveAdBadges.count();
  const archivedBadges = await adsLibrary.archivedAdBadges.count();

  console.table({ activeBadges, inactiveBadges, archivedBadges });
  expect(activeBadges).toBeGreaterThan(0);
  expect(inactiveBadges).toBe(0);
  expect(archivedBadges).toBe(0);
});

// ─── Test 3: Inactive Ads ─────────────────────────────────────────────────────
test('ALL STATUS filter - Inactive Ads shows only Inactive badges, no Active or Archived', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.selectStatus('Inactive Ads');

  const inactiveBadges = await adsLibrary.inactiveAdBadges.count();
  const activeBadges   = await adsLibrary.activeAdBadges.count();
  const archivedBadges = await adsLibrary.archivedAdBadges.count();

  console.table({ inactiveBadges, activeBadges, archivedBadges });
  expect(inactiveBadges).toBeGreaterThan(0);
  expect(activeBadges).toBe(0);
  expect(archivedBadges).toBe(0);
});

// ─── Test 4: Archived Ads ─────────────────────────────────────────────────────
test('ALL STATUS filter - Archived Ads shows only Archived badges, no Active or Inactive', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.selectStatus('Archived Ads');

  const archivedBadges = await adsLibrary.archivedAdBadges.count();
  const activeBadges   = await adsLibrary.activeAdBadges.count();
  const inactiveBadges = await adsLibrary.inactiveAdBadges.count();

  console.table({ archivedBadges, activeBadges, inactiveBadges });
  expect(archivedBadges).toBeGreaterThan(0);
  expect(activeBadges).toBe(0);
  expect(inactiveBadges).toBe(0);
});

// ─── Test 5: All Ads resets filter ───────────────────────────────────────────
test('ALL STATUS filter - All Ads resets filter and restores total count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalCount = await adsLibrary.getResultsCount();

  await adsLibrary.selectStatus('Active Ads');
  await adsLibrary.selectStatus('All Ads');

  const resetCount = await adsLibrary.getResultsCount();

  console.table({ resetCount, totalCount });
  expect(resetCount).toBe(totalCount);

  const activeBadges   = await adsLibrary.activeAdBadges.count();
  const archivedBadges = await adsLibrary.archivedAdBadges.count();
  expect(activeBadges + archivedBadges).toBeGreaterThan(0);
});
