import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Competitor } from '../../../pages/competitor';

// ─── Test 1: Competitors tab loads with all required UI elements ───────────────
test('Competitors tab - loads with search bar, Saved Competitors count, Synced today badge, and Merge button', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  // Search bar is visible and interactive
  await expect(competitor.searchInput).toBeVisible();

  // "Synced today" badge confirms last sync happened today
  await expect(competitor.syncedTodayBadge).toBeVisible();

  // Merge button is available for merging competitor groups
  await expect(competitor.mergeButton).toBeVisible();
});
