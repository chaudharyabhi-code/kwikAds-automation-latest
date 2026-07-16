import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

test('Synced today badge - hover tooltip shows current date in DD/MM/YY format', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  // Build expected date string: DD/MM/YY (e.g. "15/07/26")
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, '0');
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const yy   = String(now.getFullYear()).slice(-2);
  const expectedDate = `Last synced: ${dd}/${mm}/${yy}`;

  await competitor.hoverSyncedTodayBadge();

  await expect(competitor.syncedTodayTooltip).toBeVisible();
  await expect(competitor.syncedTodayTooltip).toContainText(expectedDate);
});
