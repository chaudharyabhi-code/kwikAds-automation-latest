import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

// File-level, not per-test test.slow(): test.slow() is the first statement of a test BODY, so it
// runs only after beforeEach has finished and cannot extend the budget the hook itself spends.
// beforeEach here logs in, selects the merchant and opens the Performance view, which on a
// merchant with real volume exceeded the 120s default and failed in the hook.
test.describe.configure({ timeout: 360000 });

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
