import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

let collections;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  collections = new Collections(page);
  await collections.navigate();
});

// The badge counts EVERY collection; the grid renders one page of them. Comparing the two
// directly failed 60 vs 16 — 60 collections across 4 pages, 16 shown. So the badge is checked
// against the pagination total, and the rendered cards against the page's own range.
test('Collection count badge matches number of collection cards rendered in the grid', async () => {
  const badgeCount = await collections.getCollectionCount();
  const rendered = await collections.getRenderedCardCount();
  const range = await collections.getPaginationRange();

  if (!range) {
    // Few enough collections to fit one page — the app renders no pagination control
    expect(rendered, 'no pagination, so every collection should be on screen').toBe(badgeCount);
    return;
  }

  expect(range.total, `badge says ${badgeCount}, pagination says ${range.total}`).toBe(badgeCount);
  expect(rendered, `page shows ${range.from}-${range.to} but rendered ${rendered} cards`)
    .toBe(range.to - range.from + 1);
});
