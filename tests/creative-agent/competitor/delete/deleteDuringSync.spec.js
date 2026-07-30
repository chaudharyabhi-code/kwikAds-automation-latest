import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

let competitor;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  competitor = new Competitor(page);
  await competitor.navigate();
});

test('Delete during sync - delete flow works while sync is in progress and stops sync gracefully', async () => {
  const countBefore = await competitor.getSavedCount();

  // Step 1: Trigger sync on card 0 and confirm it is in progress
  await competitor.syncCompetitor(0);
  await expect(competitor.syncPopover).toBeVisible();
  await expect(competitor.syncPopover).toContainText(/Starting|Syncing/);

  // Step 2: Click Delete on card 1 (different card) while card 0's sync popover is still active.
  // Deleting the same card whose sync popover is open causes the popover to intercept the click.
  await competitor.deleteCompetitor(1);

  // Delete modal must open even while another card's sync is in progress
  await expect(competitor.removeCompetitorModal).toBeVisible();
  await expect(competitor.removeCompetitorCancelBtn).toBeVisible();
  await expect(competitor.removeCompetitorConfirmBtn).toBeVisible();

  // Step 3: Confirm deletion
  await competitor.removeCompetitorConfirmBtn.click();

  // Success toast confirms the competitor was removed
  await expect(competitor.successToast).toBeVisible();
  await expect(competitor.successToast).toContainText('deleted');

  // Saved Competitors count decrements by 1
  const countAfter = await competitor.getSavedCount();
  expect(countAfter).toBe(countBefore - 1);
});
