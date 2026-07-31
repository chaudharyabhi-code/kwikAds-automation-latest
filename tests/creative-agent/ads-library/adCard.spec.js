import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { AdsLibrary } from '../../../pages/ads-library';

let adsLibrary;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  adsLibrary = new AdsLibrary(page);
  await adsLibrary.navigateToAdsLibrary();
  await page.waitForLoadState('networkidle');
});

// ─── Test 1: Every ad card shows all required UI elements ─────────────────────
test('Ad card structure - each of the first 5 cards shows brand name, badge, date, format label, and action buttons', async () => {
  // 3 rows × 2 cards each = 6 cards checked (≥ 5 required)
  for (let i = 0; i < 3; i++) {
    const row = adsLibrary.getAdRow(i);

    // Scroll the row into view so virtuoso renders it, then wait for it
    await row.scrollIntoViewIfNeeded();
    await row.waitFor({ state: 'visible' });

    // Cards in this row (the grid renders 3 per row)
    const cards = adsLibrary.getCardsInRow(i);
    const cardCount = await cards.count();
    // Guard: if the card selector ever stops matching, the loop below would run zero
    // times and this test would pass while asserting nothing.
    expect(cardCount, `row ${i} should render at least one card`).toBeGreaterThan(0);

    for (let j = 0; j < cardCount; j++) {
      const card = cards.nth(j);

      // Brand name
      await expect(adsLibrary.cardBrandName(card)).toBeVisible();

      // Status badge (Active / Inactive / Archived)
      await expect(adsLibrary.cardStatusBadge(card)).toBeVisible();

      // Launch date
      await expect(adsLibrary.cardLaunchDate(card)).toBeVisible();

      // Format label (IMAGE or VIDEO)
      const formatLabel = adsLibrary.cardFormatLabel(card);
      await expect(formatLabel.first()).toBeVisible();

      // KAAI Analysis button
      await expect(adsLibrary.cardKaaiButton(card)).toBeVisible();

      // Request Creative button
      await expect(adsLibrary.cardRequestCreativeButton(card)).toBeVisible();

      // 3-dot menu button. Share Creative / Download Creative / Tag Competitor are no
      // longer icon buttons on the card — they now live inside this menu, and are
      // asserted in cardMenu.spec.js ("opens with exactly 6 options").
      await expect(adsLibrary.cardMenuTrigger(card)).toBeVisible();
    }

    // Scroll the container down after each row so the next row enters the viewport
    await adsLibrary.scrollAdGrid(400);
  }
});

// ─── Test 2: Badge colors are correct for Active, Inactive, and Archived ads ──
// The expected colours live on the page object (BADGE_COLOR_*), confirmed in DevTools.
test('Ad card badge - Active badge is green', async () => {
  await adsLibrary.selectStatus('Active Ads');
  await adsLibrary.waitForFilter();

  await expect(adsLibrary.activeAdBadges.first()).toBeVisible();
  await expect(adsLibrary.activeAdBadges.first()).toHaveCSS('color', adsLibrary.BADGE_COLOR_ACTIVE);
});

test('Ad card badge - Inactive badge is red', async () => {
  await adsLibrary.selectStatus('Inactive Ads');
  await adsLibrary.waitForFilter();

  await expect(adsLibrary.inactiveAdBadges.first()).toBeVisible();
  await expect(adsLibrary.inactiveAdBadges.first()).toHaveCSS('color', adsLibrary.BADGE_COLOR_INACTIVE);
});

test('Ad card badge - Archived badge is grey', async () => {
  await adsLibrary.selectStatus('Archived Ads');
  await adsLibrary.waitForFilter();

  await expect(adsLibrary.archivedAdBadges.first()).toBeVisible();
  await expect(adsLibrary.archivedAdBadges.first()).toHaveCSS('color', adsLibrary.BADGE_COLOR_ARCHIVED);
});


// ─── Test 3: Active badge days count matches calculation ──────────────────────
// Formula confirmed by team: Today - Card launch date - 1 = days shown in badge
test('Ad card active badge - days shown in badge matches (today − launch date − 1)', async () => {
  // Filter to Active Ads only so the first card is guaranteed to have an active badge
  await adsLibrary.selectStatus('Active Ads');
  await adsLibrary.waitForFilter();

  // Get the launch date from the first card
  const launchDate = await adsLibrary.getFirstAdLaunchDate();

  // Get the active badge text from the first card (e.g. "Active 3d")
  const firstCard = adsLibrary.getAdRow(0);
  const badgeText = await adsLibrary.cardActiveBadge(firstCard).innerText();

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
