import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { AdsLibrary } from '../../../../pages/ads-library';

test('AD Format filter - Video ads + Image ads count = total ads count', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const totalCount = await adsLibrary.getResultsCount();

  await adsLibrary.selectAdFormat('Image (Square Packing)');
  const imageCount = await adsLibrary.getResultsCount();

  await adsLibrary.selectAdFormat('Video (9:16 Portrait)');
  const videoCount = await adsLibrary.getResultsCount();

  console.table({ totalCount, imageCount, videoCount });
  expect(imageCount + videoCount).toBe(totalCount);
});

test('AD Format filter - Image filter shows only IMAGE cards, no VIDEO cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.selectAdFormat('Image (Square Packing)');

  const imageLabels = await adsLibrary.adCardImageLabels.count();
  const videoLabels = await adsLibrary.adCardVideoLabels.count();

  console.table({ imageLabels, videoLabels });
  expect(imageLabels).toBeGreaterThan(0);
  expect(videoLabels).toBe(0);
});

test('AD Format filter - Video filter shows only VIDEO cards, no IMAGE cards', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  await adsLibrary.selectAdFormat('Video (9:16 Portrait)');

  const videoLabels = await adsLibrary.adCardVideoLabels.count();
  const imageLabels = await adsLibrary.adCardImageLabels.count();

  console.table({ videoLabels, imageLabels });
  expect(videoLabels).toBeGreaterThan(0);
  expect(imageLabels).toBe(0);
});
