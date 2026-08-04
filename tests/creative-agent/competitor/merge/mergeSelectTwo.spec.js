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

test('Merge selection - selecting two competitors updates banner and shows Merge (2)', async () => {
  await competitor.enterMergeMode();
  // Indices 0 and 1, not 1 and 2. The guard above only requires 2 cards, but nth(2) is the
  // THIRD one — with exactly 2 saved competitors (which the destructive delete/merge specs
  // reliably leave behind mid-run) that checkbox does not exist, so check() sat waiting for
  // actionability until the whole test timed out. merge.spec.js already uses 0 and 1.
  await competitor.selectForMerge(0);
  await competitor.selectForMerge(1);

  await expect(competitor.mergeCountButton).toContainText('Merge (2)');
  await expect(competitor.mergeBanner).toContainText('2 competitors selected');
});
