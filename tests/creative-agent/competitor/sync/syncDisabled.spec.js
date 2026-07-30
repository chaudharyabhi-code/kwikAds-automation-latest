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

test('Sync button - becomes disabled and shows progress percentage while sync is in progress', async () => {
  // Confirm button says "Sync" before triggering
  await expect(competitor.getSyncButton(0)).toContainText('Sync');
  await expect(competitor.getSyncButton(0)).toBeEnabled();

  // Trigger sync
  await competitor.syncCompetitor(0);
  await expect(competitor.syncPopover).toBeVisible();

  // Button must be disabled — cannot re-trigger sync mid-progress
  await expect(competitor.getSyncButton(0)).toBeDisabled();

  // Button text changes to a progress percentage, not "Sync"
  await expect(competitor.getSyncButton(0)).not.toContainText('Sync');
});
