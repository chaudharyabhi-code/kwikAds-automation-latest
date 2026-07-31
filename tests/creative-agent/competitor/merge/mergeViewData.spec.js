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
  test.skip(cardCount < 1, `Needs at least 1 saved competitor(s); found ${cardCount}`);
});

test('View Merged Competitor Data - link is visible on merged group card and expands source breakdown', async () => {
  const viewDataLink = competitor.getViewMergedDataLink(0);

  await expect(viewDataLink).toBeVisible();
  await expect(viewDataLink).toContainText('View Merged Competitor Data');

  await viewDataLink.click();
  await expect(competitor.savedCompetitorsHeading).toBeVisible();
  await expect(competitor.competitorCards.nth(0)).toBeVisible();
});
