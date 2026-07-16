import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('View Merged Competitor Data - link is visible on merged group card and expands source breakdown', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  const viewDataLink = competitor.getViewMergedDataLink(0);

  await expect(viewDataLink).toBeVisible();
  await expect(viewDataLink).toContainText('View Merged Competitor Data');

  await viewDataLink.click();
  await expect(competitor.savedCompetitorsHeading).toBeVisible();
  await expect(competitor.competitorCards.nth(0)).toBeVisible();
});
