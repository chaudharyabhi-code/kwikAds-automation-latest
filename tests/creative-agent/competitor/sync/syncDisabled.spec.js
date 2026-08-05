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

test('Sync button - becomes disabled and shows progress percentage while sync is in progress', async () => {
  // Confirm button says "Sync" before triggering
  await expect(competitor.getSyncButton(0)).toContainText('Sync');
  await expect(competitor.getSyncButton(0)).toBeEnabled();

  // Arm before clicking — the disabled state lasts only while the sync is in flight
  const sawDisabled = await competitor.watchForSyncButtonDisabled(0);

  await competitor.syncCompetitor(0);
  await expect(competitor.syncPopover).toBeVisible();

  // Button must be disabled at some point — cannot re-trigger sync mid-progress
  expect(await sawDisabled()).toBe(true);
});
