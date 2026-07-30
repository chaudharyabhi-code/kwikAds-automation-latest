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

test('Sync button - clicking Sync on a card shows popover with starting phase', async () => {
  await competitor.syncCompetitor(0);

  // Popover must appear immediately after clicking
  await expect(competitor.syncPopover).toBeVisible();

  // Popover shows "Starting…" immediately, then switches to "Syncing 1/2 — BrandName"
  await expect(competitor.syncPopover).toContainText(/Starting|Syncing/);

  // Phase line is always present from the start
  await expect(competitor.syncPopover).toContainText('Phase: starting');
});
