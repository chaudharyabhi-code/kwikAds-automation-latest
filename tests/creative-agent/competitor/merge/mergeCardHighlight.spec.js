import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('Merge selection - selected card checkbox is checked while unselected card remains unchecked', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  await competitor.enterMergeMode();

  await expect(competitor.getCardCheckbox(1)).not.toBeChecked();
  await expect(competitor.getCardCheckbox(2)).not.toBeChecked();

  await competitor.selectForMerge(1);

  await expect(competitor.getCardCheckbox(1)).toBeChecked();
  await expect(competitor.getCardCheckbox(2)).not.toBeChecked();
});
