import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds, AD_STATUSES, STATUS_ALL, CARD_MENU_ACTIONS } from '../../../../pages/my-ads';

let myAds;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
});

// A filter with no results is a valid state — assert the empty state and stop. Otherwise every
// rendered card must have a creative, and carry `status` when one is given ("All" mixes them).
async function expectEveryCardHasCreative(label, status) {
  if ((await myAds.getResultsLoadedAndTotal()).total === 0) {
    await expect(myAds.emptyState).toBeVisible();
    return;
  }

  await myAds.waitForGridPainted();
  const cards = await myAds.adCards.count();
  expect(cards, `${label} reports ads but rendered no cards`).toBeGreaterThan(0);

  for (let i = 0; i < cards; i++) {
    expect(await myAds.cardCreative(i).count(), `${label} card ${i} has a blank creative area`)
      .toBeGreaterThan(0);
    // A format label must be present. Whether it is the RIGHT one is asserted in
    // adFormat.spec.js — checking it here too would report one app bug as two failures.
    await expect(myAds.cardFormatBadge(i), `${label} card ${i} has no format label`).toBeVisible();
    if (status) await expect(myAds.cardStatusBadge(i)).toContainText(status);
  }
}

// ─── Test 1: every card renders its full anatomy ──────────────────────────────
test('My Ads - each of the first 5 cards shows all expected elements', async () => {
  if ((await myAds.getResultsLoadedAndTotal()).total === 0) {
    await expect(myAds.emptyState).toBeVisible();
    return;
  }

  await myAds.waitForGridPainted();
  // Inspect 5 as the test case asks, or fewer if the merchant has fewer
  const cards = Math.min(5, await myAds.adCards.count());
  expect(cards, 'results count is non-zero but no cards rendered').toBeGreaterThan(0);

  for (let i = 0; i < cards; i++) {
    await test.step(`card ${i}`, async () => {
      await expect(myAds.cardInitialCircle(i)).toBeVisible();
      await expect(myAds.cardName(i)).toBeVisible();
      await expect(myAds.cardMenuTrigger(i)).toBeVisible();
      await expect(myAds.cardStatusBadge(i)).toBeVisible();
      await expect(myAds.cardDate(i)).toBeVisible();
      await expect(myAds.cardFormatBadge(i)).toBeVisible();
      await expect(myAds.cardKaaiButton(i)).toBeVisible();
      expect(await myAds.cardCreative(i).count(), 'card has no creative').toBeGreaterThan(0);
    });
  }

  // Share and Download are 3-dot menu items on My Ads, not icons on the card face
  await test.step('card 0 menu actions', async () => {
    await myAds.cardMenuTrigger(0).click();
    for (const item of CARD_MENU_ACTIONS) {
      await expect(myAds.cardMenuItems.filter({ hasText: item })).toBeVisible();
    }
  });
});

// ─── Test 2: status badge colours ─────────────────────────────────────────────
test('My Ads - status badges are colour-coded: Active green, Paused orange, Archived grey, Uploaded red', async () => {
  for (const status of AD_STATUSES) {
    await myAds.selectStatus(status);
    if ((await myAds.getResultsLoadedAndTotal()).total === 0) continue;
    await expect(myAds.cardStatusBadge(0)).toHaveCSS('color', myAds.BADGE_COLOURS[status]);
  }

  // The Uploaded badge only exists on the Draft Creatives sub-tab
  await myAds.selectStatus(STATUS_ALL);
  await myAds.clickSubTab(myAds.subTabDraft);
  if ((await myAds.getResultsLoadedAndTotal()).total > 0) {
    await expect(myAds.cardStatusBadge(0)).toHaveCSS('color', myAds.BADGE_COLOURS.Uploaded);
  }
});

// ─── Test 3: creative is never blank, whatever the status ─────────────────────
test('My Ads - every card renders its creative across all statuses', async () => {
  for (const status of [STATUS_ALL, ...AD_STATUSES]) {
    await test.step(`STATUS = ${status}`, async () => {
      await myAds.selectStatus(status);
      // "All" legitimately mixes statuses, so no badge is expected for it
      await expectEveryCardHasCreative(status, status === STATUS_ALL ? null : status);
    });
  }
});

// ─── Test 4: every FORMAT × STATUS combination renders its creative ───────────
// The cross-product, not one filter at a time: "AD FORMAT = Video, STATUS = Active, then
// Paused, then Archived". Varying status at format=All (test 3) never reaches Video+Archived.
test('My Ads - every card renders its creative across all ad format and status combinations', async () => {
  test.setTimeout(600000);

  for (const format of await myAds.getAdFormatOptions()) {
    await myAds.selectAdFormat(format);

    for (const status of AD_STATUSES) {
      const combination = `${format} + ${status}`;
      await test.step(combination, async () => {
        await myAds.selectStatus(status);
        await expectEveryCardHasCreative(combination, status);
      });
    }
  }
});
