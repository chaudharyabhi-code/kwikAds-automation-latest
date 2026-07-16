import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('Merge selection - selecting two competitors updates banner and shows Merge (2)', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  await competitor.enterMergeMode();
  await competitor.selectForMerge(1);
  await competitor.selectForMerge(2);

  await expect(competitor.mergeCountButton).toContainText('Merge (2)');
  await expect(competitor.mergeBanner).toContainText('2 competitors selected');
});
