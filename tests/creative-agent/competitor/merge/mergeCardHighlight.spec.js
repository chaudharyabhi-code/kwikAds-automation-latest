import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  // A merchant may have no (or too few) saved competitors — skip rather than
  // index into an empty list.
  const cardCount = await competitor.countAllCards();
  test.skip(cardCount < 2, `Needs at least 2 saved competitor(s); found ${cardCount}`);
});

test('Merge selection - selected card checkbox is checked while unselected card remains unchecked', async () => {
  await competitor.enterMergeMode();

  await expect(competitor.getCardCheckbox(1)).not.toBeChecked();
  await expect(competitor.getCardCheckbox(2)).not.toBeChecked();

  await competitor.selectForMerge(1);

  await expect(competitor.getCardCheckbox(1)).toBeChecked();
  await expect(competitor.getCardCheckbox(2)).not.toBeChecked();
});
