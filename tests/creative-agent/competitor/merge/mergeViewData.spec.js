import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;
// The link only exists on a MERGED GROUP card, which is not necessarily the first one.
let mergedCard;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  mergedCard = await competitor.findMergedGroupCardIndex();
  // competitor.setup.js seeds a merged group, so a missing one is a real failure, not a skip.
  expect(mergedCard, 'no merged group card exists — competitor.setup.js should have seeded one').not.toBe(-1);
});

test('View Merged Competitor Data - link is visible on merged group card and expands source breakdown', async () => {
  // Was hardcoded to card 0, which is only the merged group by luck.
  const viewDataLink = competitor.getViewMergedDataLink(mergedCard);

  await expect(viewDataLink).toBeVisible();
  await expect(viewDataLink).toContainText('View Merged Competitor Data');

  await viewDataLink.click();
  await expect(competitor.savedCompetitorsHeading).toBeVisible();
  await expect(competitor.competitorCards.nth(0)).toBeVisible();
});
