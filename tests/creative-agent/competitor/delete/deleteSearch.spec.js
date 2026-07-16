import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('Deleted competitor - no longer appears in search results', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  // Record brand name of card 1 (non-merged) before deleting
  const brandName = await competitor.getCardName(1).innerText();

  // Delete card 1 and confirm
  await competitor.deleteCompetitor(1);
  await expect(competitor.removeCompetitorModal).toBeVisible();
  await competitor.removeCompetitorConfirmBtn.click();
  await expect(competitor.successToast).toBeVisible();

  // Search for the deleted brand name
  await competitor.search(brandName.trim());

  // Competitor cards list must not contain the deleted brand name as saved
  await expect(competitor.competitorCards).not.toContainText(brandName);
});
