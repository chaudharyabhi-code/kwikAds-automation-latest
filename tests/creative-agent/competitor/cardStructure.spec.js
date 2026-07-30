import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Competitor } from '../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
});

test('Competitor card - displays logo, name, status, last synced, Ad Volume, Format Split, and Ad Longevity', async () => {
  await expect(competitor.getCardLogo(0)).toBeVisible();
  await expect(competitor.getCardName(0)).toBeVisible();
  await expect(competitor.getCardStatus(0)).toBeVisible();
  await expect(competitor.getCardLastSynced(0)).toBeVisible();
  await expect(competitor.getCardAdVolumeLabel(0)).toBeVisible();
  await expect(competitor.getCardFormatSplitLabel(0)).toBeVisible();
  await expect(competitor.getCardAdLongevityLabel(0)).toBeVisible();
  await expect(competitor.getCardLongevityTesting(0)).toBeVisible();
  await expect(competitor.getCardLongevityScaling(0)).toBeVisible();
  await expect(competitor.getCardLongevityEvergreen(0)).toBeVisible();
});
