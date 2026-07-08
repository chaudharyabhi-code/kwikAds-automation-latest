import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../../pages/kwikads';
import { MyAds } from '../../../../../pages/my-ads';

// ─── Test 1: Video + Image count = Total count ────────────────────────────────
test('My Ads - AD Format filter: Video count + Image count equals total count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  const { total: totalCount } = await myAds.getResultsLoadedAndTotal();

  await myAds.selectAdFormat('Video');
  const { total: videoCount } = await myAds.getResultsLoadedAndTotal();

  await myAds.selectAdFormat('Image');
  const { total: imageCount } = await myAds.getResultsLoadedAndTotal();

  console.table({ totalCount, videoCount, imageCount });
  expect(videoCount + imageCount).toBe(totalCount);
});

// ─── Test 2: Video filter shows only VIDEO cards, zero IMAGE cards ─────────────
test('My Ads - AD Format filter: selecting Video shows only VIDEO cards and zero IMAGE cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.selectAdFormat('Video');

  const videoLabels = await myAds.adCardVideoLabels.count();
  const imageLabels = await myAds.adCardImageLabels.count();

  console.table({ videoLabels, imageLabels });
  expect(videoLabels).toBeGreaterThan(0);
  expect(imageLabels).toBe(0);
});

// ─── Test 3: Image filter shows only IMAGE cards, zero VIDEO cards ─────────────
test('My Ads - AD Format filter: selecting Image shows only IMAGE cards and zero VIDEO cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  await myAds.selectAdFormat('Image');

  const imageLabels = await myAds.adCardImageLabels.count();
  const videoLabels = await myAds.adCardVideoLabels.count();

  console.table({ imageLabels, videoLabels });
  expect(imageLabels).toBeGreaterThan(0);
  expect(videoLabels).toBe(0);
});

// ─── Test 4: All Formats resets filter — count restores, both types visible ────
test('My Ads - AD Format filter: selecting All Formats restores original count and shows both VIDEO and IMAGE cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const myAds = new MyAds(page);
  await myAds.navigate();

  const { total: totalBefore } = await myAds.getResultsLoadedAndTotal();

  // Apply Video filter then reset to All Formats
  await myAds.selectAdFormat('Video');
  const { total: filteredTotal } = await myAds.getResultsLoadedAndTotal();
  expect(filteredTotal).toBeLessThan(totalBefore);

  await myAds.selectAdFormat('All Formats');
  const { total: restoredTotal } = await myAds.getResultsLoadedAndTotal();

  console.table({ totalBefore, filteredTotal, restoredTotal });
  expect(restoredTotal).toBe(totalBefore);
});
