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

test('Merge entry point - clicking Merge enters selection mode with checkboxes, banner, and Cancel', async () => {
  await competitor.enterMergeMode();

  await expect(competitor.getCardCheckbox(0)).toBeVisible();
  await expect(competitor.getCardCheckbox(1)).toBeVisible();
  await expect(competitor.mergeBanner).toContainText('Select at least 2');
  await expect(competitor.mergeCountButton).toContainText('Merge (0)');
  await expect(competitor.cancelMergeModeButton).toBeVisible();
});
