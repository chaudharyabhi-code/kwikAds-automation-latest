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

test('Merge selection - selecting one competitor increments count but banner still requires 2', async () => {
  await competitor.enterMergeMode();
  await competitor.selectForMerge(1);

  await expect(competitor.mergeCountButton).toContainText('Merge (1)');
  await expect(competitor.mergeBanner).toContainText('Select at least 2');
});
