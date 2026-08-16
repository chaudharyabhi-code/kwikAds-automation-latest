import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
});

test('My Ads - Performance Ad Level total count matches the Meta Creatives total count', async () => {
  await myAds.openPerformanceView();

  // Performance opens on STATUS Active while Meta Creatives is unfiltered, so the two totals
  // are only comparable once the status filter is widened to All.
  await myAds.selectStatus('All');
  expect(await myAds.isViewDataByTabActive('Ad Level')).toBe(true);
  const adLevelTotal = (await myAds.getResultsLoadedAndTotal()).total;

  await myAds.openAdsView();
  await myAds.clickSubTab(myAds.subTabMeta);
  const metaTotal = (await myAds.getResultsLoadedAndTotal()).total;

  expect(metaTotal, `Ad Level shows ${adLevelTotal} ads, Meta Creatives shows ${metaTotal}`)
    .toBe(adLevelTotal);
});
