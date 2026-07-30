import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

let adsLibrary;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
});

// ─── Test 1: Not-analysed card — loader appears, then analysis completes ──────
// AI analysis can take a while; give this one a larger budget than the 60s default.
test('KAAI Analysis - clicking KAAI button on a not-analysed card triggers analysis with a loader', async () => {
  test.setTimeout(180000);

  // Show only cards that have NOT been analysed yet
  await adsLibrary.selectKaaiOption('Not Analysed');
  await adsLibrary.waitForFilter();

  // Click the KAAI Analysis button on the first card
  await adsLibrary.clickFirstKaaiButton();

  // Analysis in-flight state: spinner + "Analyzing creative with AI..." caption.
  // Both prove the analysis was actually triggered.
  await expect(adsLibrary.kaaiModalLoader).toBeVisible();
  await expect(adsLibrary.kaaiModalAnalyzingText).toBeVisible();

  // Analysis finished — the in-flight indicators go away
  await adsLibrary.waitForKaaiAnalysisToFinish(120000);
  await expect(adsLibrary.kaaiModalLoader).not.toBeVisible();
  await expect(adsLibrary.kaaiModalAnalyzingText).not.toBeVisible();

  // The KAAI Analysis tab is still the selected tab and the modal stayed open
  await expect(adsLibrary.cardDetailModal).toBeVisible();
  await expect(adsLibrary.cardDetailKaaiTab).toBeVisible();

  await adsLibrary.closeCardDetail();
});

// ─── Test 2: Already-analysed card — no loader, result shown immediately ──────
test('KAAI Analysis - clicking KAAI button on an already-analysed card shows content immediately without a loader', async () => {
  // Show only cards that already have KAAI analysis done
  await adsLibrary.selectKaaiOption('KAAI Analysed');
  await adsLibrary.waitForFilter();

  // Click the KAAI Analysis button on the first card
  await adsLibrary.clickFirstKaaiButton();

  // Modal opens straight into the KAAI Analysis tab
  await expect(adsLibrary.cardDetailModal).toBeVisible();
  await expect(adsLibrary.cardDetailKaaiTab).toBeVisible();

  // No AI call is made — neither in-flight indicator should ever appear
  await expect(adsLibrary.kaaiModalLoader).not.toBeVisible();
  await expect(adsLibrary.kaaiModalAnalyzingText).not.toBeVisible();

  await adsLibrary.closeCardDetail();
});

// ─── Test 3: Updated modal header shows the new meta panels ──────────────────
test('Card detail modal - header shows Library ID and the Active Period / Formats / Live Channels panels', async () => {
  await adsLibrary.selectKaaiOption('KAAI Analysed');
  await adsLibrary.waitForFilter();

  await adsLibrary.clickFirstKaaiButton();
  await expect(adsLibrary.cardDetailModal).toBeVisible();

  // Library ID is present and numeric
  const libraryId = await adsLibrary.getCardDetailLibraryId();
  expect(libraryId).toMatch(/^\d+$/);

  // The three meta panels introduced in the updated modal
  await expect(adsLibrary.cardDetailActivePeriod).toBeVisible();
  await expect(adsLibrary.cardDetailFormats).toBeVisible();
  await expect(adsLibrary.cardDetailLiveChannels).toBeVisible();

  // Both tabs are offered
  await expect(adsLibrary.cardDetailKaaiTab).toBeVisible();
  await expect(adsLibrary.cardDetailAdCopyTab).toBeVisible();

  await adsLibrary.closeCardDetail();
});

// ─── Test 4: Footer action buttons are available inside the modal ────────────
test('Card detail modal - footer offers Save to Collection, Request Creative and a Tag/Remove Competitor action', async () => {
  await adsLibrary.selectKaaiOption('KAAI Analysed');
  await adsLibrary.waitForFilter();

  await adsLibrary.clickFirstKaaiButton();
  await expect(adsLibrary.cardDetailModal).toBeVisible();

  await expect(adsLibrary.cardDetailSaveToCollectionBtn).toBeVisible();
  await expect(adsLibrary.cardDetailRequestCreativeBtn).toBeVisible();
  // Label is "Tag Competitor" or "Remove Competitor" depending on saved state
  await expect(adsLibrary.cardDetailCompetitorBtn).toBeVisible();

  await adsLibrary.closeCardDetail();
});
