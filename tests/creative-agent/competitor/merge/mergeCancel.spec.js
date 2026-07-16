import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('Merge - clicking Cancel exits selection mode and list returns to normal view unchanged', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  const countBefore = await competitor.getSavedCount();

  await competitor.enterMergeMode();
  await competitor.selectForMerge(1);
  await competitor.cancelMergeMode();

  await expect(competitor.getCardCheckbox(0)).not.toBeVisible();
  await expect(competitor.mergeCountButton).not.toBeVisible();

  const countAfter = await competitor.getSavedCount();
  expect(countAfter).toBe(countBefore);
});
