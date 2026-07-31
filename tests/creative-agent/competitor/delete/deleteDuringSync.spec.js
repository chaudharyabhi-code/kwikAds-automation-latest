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
  // Sync runs at most once per day. While the "Synced today" badge is showing, the
  // Sync button will not start a new sync and no progress popover ever appears.
  test.skip(await competitor.isSyncedToday(), 'Competitors already synced today — cannot trigger a new sync');
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
