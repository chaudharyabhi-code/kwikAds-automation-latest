import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

// ─── Test 1: Every ad card shows all required UI elements ─────────────────────
test('Ad card structure - each of the first 5 cards shows brand name, badge, date, format label, and action buttons', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  const scroller = adsLibrary.adsLibraryContent.locator('.virtualized-ad-grid-scroller');

  // 3 rows × 2 cards each = 6 cards checked (≥ 5 required)
  for (let i = 0; i < 3; i++) {
    const row = adsLibrary.adCardList.locator(`[data-index="${i}"]`);

    // Scroll the row into view so virtuoso renders it, then wait for it
    await row.scrollIntoViewIfNeeded();
    await row.waitFor({ state: 'visible' });

    // Both cards in this row
    const cards = row.locator('div[style*="width: calc(50%"]');
    const cardCount = await cards.count();

    for (let j = 0; j < cardCount; j++) {
      const card = cards.nth(j);

      // Brand name
      await expect(card.locator('h4').first()).toBeVisible();

      // Status badge (Active / Inactive / Archived)
      await expect(
        card.locator('span').filter({ hasText: /^(Active|Inactive|Archived)/ }).first()
      ).toBeVisible();

      // Launch date
      await expect(
        card.locator('span[style*="rgb(100, 116, 139)"]').first()
      ).toBeVisible();

      // Format label (IMAGE or VIDEO)
      const formatLabel = card.getByText('IMAGE', { exact: true }).or(card.getByText('VIDEO', { exact: true }));
      await expect(formatLabel.first()).toBeVisible();

      // KAAI Analysis button
      await expect(
        card.locator('button').filter({ hasText: /KAAI/i }).first()
      ).toBeVisible();

      // Share Creative button
      await expect(card.locator('button[title="Share Creative"]').first()).toBeVisible();

      // Download Creative button
      await expect(card.locator('button[title="Download Creative"]').first()).toBeVisible();

      // Competitor icon button (Tag or Remove)
      await expect(
        card.locator('button[title="Tag Competitor"], button[title="Remove Competitor"]').first()
      ).toBeVisible();

      // 3-dot menu button
      await expect(card.locator('button.ant-dropdown-trigger').first()).toBeVisible();
    }

    // Scroll the container down after each row so the next row enters the viewport
    await scroller.evaluate(el => el.scrollBy({ top: 400, behavior: 'instant' }));
  }
});

// ─── Test 2: Badge colors are correct for Active, Inactive, and Archived ads ──
// Colors confirmed from DevTools:
//   Active   → rgb(82, 196, 26)   green
//   Inactive → rgb(255, 77, 79)   red
//   Archived → rgb(140, 140, 140) grey
test('Ad card badge - Active is green, Inactive is red, Archived is grey', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // ── Active: green ─────────────────────────────────────────────────────────────
  await adsLibrary.selectStatus('Active Ads');
  await adsLibrary.waitForFilter();
  await expect(adsLibrary.activeAdBadges.first()).toBeVisible();
  await expect(adsLibrary.activeAdBadges.first()).toHaveCSS('color', 'rgb(82, 196, 26)');

  // ── Inactive: red ─────────────────────────────────────────────────────────────
  await adsLibrary.selectStatus('Inactive Ads');
  await adsLibrary.waitForFilter();
  await expect(adsLibrary.inactiveAdBadges.first()).toBeVisible();
  await expect(adsLibrary.inactiveAdBadges.first()).toHaveCSS('color', 'rgb(255, 77, 79)');

  // ── Archived: grey ────────────────────────────────────────────────────────────
  await adsLibrary.selectStatus('Archived Ads');
  await adsLibrary.waitForFilter();
  await expect(adsLibrary.archivedAdBadges.first()).toBeVisible();
  await expect(adsLibrary.archivedAdBadges.first()).toHaveCSS('color', 'rgb(140, 140, 140)');
});


// ─── Test 3: Active badge days count matches calculation ──────────────────────
// Formula confirmed by team: Today - Card launch date - 1 = days shown in badge
test('Ad card active badge - days shown in badge matches (today − launch date − 1)', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');

  // Filter to Active Ads only so the first card is guaranteed to have an active badge
  await adsLibrary.selectStatus('Active Ads');
  await adsLibrary.waitForFilter();

  // Get the launch date from the first card
  const launchDate = await adsLibrary.getFirstAdLaunchDate();

  // Get the active badge text from the first card (e.g. "Active 3d")
  const firstCard = adsLibrary.adCardList.locator('[data-index="0"]');
  const badgeText  = await firstCard
    .locator('span').filter({ hasText: /^Active/ }).first()
    .innerText();

  const match = badgeText.match(/(\d+)d/);
  expect(match, `Badge "${badgeText}" should contain "Xd" (e.g. "Active 3d")`).not.toBeNull();
  const daysShown = parseInt(match[1]);

  // Calculate expected days: today (midnight) − launch date (midnight) − 1
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const launch = new Date(launchDate);
  launch.setHours(0, 0, 0, 0);
  const expectedDays = Math.floor((today.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24)) - 1;

  console.log(`Launch date: ${launch.toDateString()} | Expected: ${expectedDays}d | Badge shows: ${daysShown}d`);
  expect(daysShown).toBe(expectedDays);
});
