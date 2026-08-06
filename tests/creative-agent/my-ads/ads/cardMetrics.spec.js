import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import {
  MyAds, CARD_METRICS, CARD_EXPANDED_METRICS, CARD_COMPETITOR_SIGNALS,
} from '../../../../pages/my-ads';

let myAds;

// Meta Creatives, not All: a draft card can appear on All and drafts carry none of these
// metrics, so the test would fail on whichever card it happened to pick.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
  await myAds.clickSubTab(myAds.subTabMeta);
  await myAds.selectSortBy('Spend');
});

// ─── Test 1: the always-visible metrics ───────────────────────────────────────
test('My Ads - cards show AD SPEND, VELOCITY and CTR', async () => {
  await myAds.waitForGridPainted();
  const cards = Math.min(3, await myAds.adCards.count());
  expect(cards, 'no Meta Creatives cards rendered').toBeGreaterThan(0);

  for (let i = 0; i < cards; i++) {
    await test.step(`card ${i}`, async () => {
      for (const metric of CARD_METRICS) {
        await expect(myAds.cardMetric(i, metric)).toBeVisible();
      }
    });
  }
});

// ─── Test 2: METRICS expands to reveal the rest ───────────────────────────────
test('My Ads - METRICS expands to show REVENUE, ROAS, NNR and Competitor Signals', async () => {
  await myAds.waitForGridPainted();

  for (const metric of CARD_EXPANDED_METRICS) {
    await expect(myAds.cardMetric(0, metric)).not.toBeVisible();
  }

  await myAds.toggleCardMetrics(0);

  for (const metric of CARD_EXPANDED_METRICS) {
    await expect(myAds.cardMetric(0, metric)).toBeVisible();
  }
  await expect(myAds.cardCompetitorSignals(0)).toBeVisible();
  for (const signal of CARD_COMPETITOR_SIGNALS) {
    await expect(myAds.cardMetric(0, signal)).toBeVisible();
  }
});

// ─── Test 3: METRICS collapses again ──────────────────────────────────────────
test('My Ads - clicking METRICS again collapses back to AD SPEND, VELOCITY and CTR', async () => {
  await myAds.waitForGridPainted();

  await myAds.toggleCardMetrics(0);
  await expect(myAds.cardMetric(0, CARD_EXPANDED_METRICS[0])).toBeVisible();

  await myAds.toggleCardMetrics(0);

  for (const metric of CARD_EXPANDED_METRICS) {
    await expect(myAds.cardMetric(0, metric)).not.toBeVisible();
  }
  await expect(myAds.cardCompetitorSignals(0)).not.toBeVisible();

  // The base metrics stay
  for (const metric of CARD_METRICS) {
    await expect(myAds.cardMetric(0, metric)).toBeVisible();
  }
});
