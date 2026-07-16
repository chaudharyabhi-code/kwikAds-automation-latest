import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('Sync in progress - View Ads button still works and navigates to Ad Library', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  // Trigger sync on the first card
  await competitor.syncCompetitor(0);
  await expect(competitor.syncPopover).toBeVisible();

  // Click View Ads while sync is running
  await competitor.clickViewAds(0);

  // Ad Library grid must appear — confirms navigation succeeded while sync was ongoing
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });
});

test('Sync in progress - Delete button still works and opens confirmation modal', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  // Trigger sync on the first card
  await competitor.syncCompetitor(0);
  await expect(competitor.syncPopover).toBeVisible();

  // Click Delete while sync is running
  await competitor.deleteCompetitor(0);

  // Confirmation modal must open (works for both regular "Remove" and merged "Delete Merged Group" variants)
  await expect(competitor.removeCompetitorModal).toBeVisible();
  await expect(competitor.removeCompetitorCancelBtn).toBeVisible();
  await expect(competitor.removeCompetitorConfirmBtn).toBeVisible();
});
