import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
});

const MERGED_CARD = 0;

test('Merged group card - shows MERGED GROUP badge', async () => {
  await expect(competitor.getMergedGroupBadge(MERGED_CARD)).toBeVisible();
});

test('Merged group card - Ad Volume active count is less than or equal to total', async () => {
  const { active, total } = await competitor.getCardAdVolumeNumbers(MERGED_CARD);
  expect(active).toBeLessThanOrEqual(total);
});

test('Merged group card - Format Split video + image equals total ad count', async () => {
  const { video, image } = await competitor.getCardFormatSplitNumbers(MERGED_CARD);
  const { total } = await competitor.getCardAdVolumeNumbers(MERGED_CARD);
  expect(video + image).toBe(total);
});

test('Merged group card - Ad Longevity testing + scaling + evergreen equals active count', async () => {
  const { testing, scaling, evergreen } = await competitor.getCardAdLongevityNumbers(MERGED_CARD);
  const { active } = await competitor.getCardAdVolumeNumbers(MERGED_CARD);
  expect(testing + scaling + evergreen).toBe(active);
});
