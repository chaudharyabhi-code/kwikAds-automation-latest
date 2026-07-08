import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../../pages/kwikads';
import { MyAds } from '../../../../../pages/my-ads';

// ─── Test 1: Active filter shows only Active badges, zero Paused/Archived ────────
test('My Ads - Status filter: selecting Active shows only Active badges and zero Paused or Archived badges', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.selectStatus('Active');

  const activeBadges   = await myAds.activeAdBadges.count();
  const pausedBadges   = await myAds.pausedAdBadges.count();
  const archivedBadges = await myAds.archivedAdBadges.count();

  console.table({ activeBadges, pausedBadges, archivedBadges });
  expect(activeBadges).toBeGreaterThan(0);
  expect(pausedBadges).toBe(0);
  expect(archivedBadges).toBe(0);
});

// ─── Test 2: Paused filter shows only Paused badges, zero Active/Archived ─────────
test('My Ads - Status filter: selecting Paused shows only Paused badges and zero Active or Archived badges', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.selectStatus('Paused');

  const pausedBadges   = await myAds.pausedAdBadges.count();
  const activeBadges   = await myAds.activeAdBadges.count();
  const archivedBadges = await myAds.archivedAdBadges.count();

  console.table({ pausedBadges, activeBadges, archivedBadges });
  expect(pausedBadges).toBeGreaterThan(0);
  expect(activeBadges).toBe(0);
  expect(archivedBadges).toBe(0);
});

// ─── Test 3: Archived filter shows only Archived badges, zero Active/Paused ───────
test('My Ads - Status filter: selecting Archived shows only Archived badges and zero Active or Paused badges', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.selectStatus('Archived');

  const archivedBadges = await myAds.archivedAdBadges.count();
  const activeBadges   = await myAds.activeAdBadges.count();
  const pausedBadges   = await myAds.pausedAdBadges.count();

  console.table({ archivedBadges, activeBadges, pausedBadges });
  expect(archivedBadges).toBeGreaterThan(0);
  expect(activeBadges).toBe(0);
  expect(pausedBadges).toBe(0);
});

// ─── Test 4: All count = Active count + Paused count + Archived count ────────────
test('My Ads - Status filter: All count equals Active count plus Paused count plus Archived count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  const { total: allCount } = await myAds.getResultsLoadedAndTotal();

  await myAds.selectStatus('Active');
  const { total: activeCount } = await myAds.getResultsLoadedAndTotal();

  await myAds.selectStatus('Paused');
  const { total: pausedCount } = await myAds.getResultsLoadedAndTotal();

  await myAds.selectStatus('Archived');
  const { total: archivedCount } = await myAds.getResultsLoadedAndTotal();

  console.table({ allCount, activeCount, pausedCount, archivedCount, sum: activeCount + pausedCount + archivedCount });
  expect(activeCount + pausedCount + archivedCount).toBe(allCount);
});
