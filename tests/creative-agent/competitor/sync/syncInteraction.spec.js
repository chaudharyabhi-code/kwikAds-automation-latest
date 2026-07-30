import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on Competitors, and put card 0 into a syncing state.
// Both tests below verify that other card actions still work *while* sync runs, so
// confirming the sync popover is showing is a precondition, not the assertion itself.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
  await competitor.syncCompetitor(0);
  await expect(competitor.syncPopover).toBeVisible();
});

test('Sync in progress - View Ads button still works and navigates to Ad Library', async () => {
  // Click View Ads while sync is running
  await competitor.clickViewAds(0);

  // Ad Library grid must appear — confirms navigation succeeded while sync was ongoing
  await expect(competitor.adLibraryGrid).toBeVisible({ timeout: 15000 });
});

test('Sync in progress - Delete button still works and opens confirmation modal', async () => {
  // Click Delete while sync is running
  await competitor.deleteCompetitor(0);

  // Confirmation modal must open (works for both regular "Remove" and merged "Delete Merged Group" variants)
  await expect(competitor.removeCompetitorModal).toBeVisible();
  await expect(competitor.removeCompetitorCancelBtn).toBeVisible();
  await expect(competitor.removeCompetitorConfirmBtn).toBeVisible();
});
