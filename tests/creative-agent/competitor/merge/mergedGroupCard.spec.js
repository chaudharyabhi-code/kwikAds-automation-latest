import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
// Index of the merged-group card, discovered per run. Merge order is not guaranteed,
// so the merged card is not necessarily the first one in the list.
let mergedCard;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  mergedCard = await competitor.findMergedGroupCardIndex();
  // competitor.setup.js seeds a merged group, so a missing one is a real failure, not a skip.
  expect(mergedCard, 'no merged group card exists — competitor.setup.js should have seeded one').not.toBe(-1);
});


test('Merged group card - shows MERGED GROUP badge', async () => {
  await expect(competitor.getMergedGroupBadge(mergedCard)).toBeVisible();
});

test('Merged group card - Ad Volume active count is less than or equal to total', async () => {
  const { active, total } = await competitor.getCardAdVolumeNumbers(mergedCard);
  expect(active).toBeLessThanOrEqual(total);
});

test('Merged group card - Format Split video + image equals total ad count', async () => {
  const { video, image } = await competitor.getCardFormatSplitNumbers(mergedCard);
  const { total } = await competitor.getCardAdVolumeNumbers(mergedCard);
  expect(video + image).toBe(total);
});

test('Merged group card - Ad Longevity testing + scaling + evergreen equals active count', async () => {
  const { testing, scaling, evergreen } = await competitor.getCardAdLongevityNumbers(mergedCard);
  const { active } = await competitor.getCardAdVolumeNumbers(mergedCard);
  expect(testing + scaling + evergreen).toBe(active);
});
