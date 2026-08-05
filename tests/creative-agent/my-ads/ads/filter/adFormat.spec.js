import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../../pages/kwikads';
import { MyAds, AD_FORMAT_ALL } from '../../../../../pages/my-ads';

let myAds;

// Shared setup: log in, land on the page under test.
test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
});

/**
 * Ad Format filter — My Ads > Ads.
 *
 * Three principles hold this spec together:
 *
 * 1. The format list is READ FROM THE DROPDOWN at runtime, never hard-coded. It has already
 *    grown once: Video and Image gained Flexible, Carousel and Collection. The previous
 *    version of this spec asserted `video + image === total`, which became unsatisfiable the
 *    moment the other three shipped. Reading the list keeps these tests covering the whole
 *    set as it grows.
 *
 * 2. The card badge is the FORMAT, not the media type. A Flexible ad carries video or image
 *    media and still badges FLEXIBLE; FLEXIBLE and CAROUSEL are emitted by the same badge
 *    component (identical inline style). So every non-empty format must badge its own name.
 *
 * 3. A format with NO ads is a legitimate state, not a failure — Carousel has none on the dev
 *    merchant. Those cases assert the empty state instead of demanding cards.
 *
 * KNOWN PRODUCT DEFECT — the badge test below fails on Collection by design. Its ads badge
 * IMAGE and carry no COLLECTION badge, while Flexible and Carousel badge themselves correctly.
 * The filter itself is fine (counts are disjoint and sum exactly to the total), so this is a
 * rendering bug and the suite reports it rather than accommodating it. It will go green when
 * the app is fixed, with no change needed here.
 *
 * Tests walk every format in a single pass because each test re-runs the full login
 * (~40-55s) — one loop is far cheaper than one test per format.
 */

// ─── Test 1: every individual format's count sums to the All Formats total ─────
test('My Ads - AD Format filter: the sum of every individual format equals the All Formats total', async () => {
  await myAds.selectAdFormat(AD_FORMAT_ALL);
  const { total: allFormatsTotal } = await myAds.getResultsLoadedAndTotal();

  const formats = await myAds.getAdFormatOptions();
  expect(formats.length, 'Ad Format dropdown returned no individual formats').toBeGreaterThan(0);

  const counts = {};
  for (const format of formats) {
    await myAds.selectAdFormat(format);
    counts[format] = (await myAds.getResultsLoadedAndTotal()).total;
  }

  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  console.table({ ...counts, sum, allFormatsTotal });

  // Every ad belongs to exactly one format, so the parts must account for the whole.
  // This is also what proves the filters are disjoint — no ad double-counted, none dropped.
  expect(sum).toBe(allFormatsTotal);
});

// ─── Test 2: All Formats resets the filter ────────────────────────────────────
test('My Ads - AD Format filter: selecting All Formats restores the unfiltered total', async () => {
  const { total: totalBefore } = await myAds.getResultsLoadedAndTotal();
  const formats = await myAds.getAdFormatOptions();

  // Narrow using the first format that returns a NON-EMPTY subset. An empty format is also
  // "less than the total", but only trivially, and would not prove the reset restored anything.
  let narrowed = null;
  for (const format of formats) {
    await myAds.selectAdFormat(format);
    const { total } = await myAds.getResultsLoadedAndTotal();
    if (total > 0 && total < totalBefore) {
      narrowed = { format, total };
      break;
    }
  }

  test.skip(!narrowed, 'No format returns a non-empty subset of the total — cannot verify the reset');

  await myAds.selectAdFormat(AD_FORMAT_ALL);
  const { total: restoredTotal } = await myAds.getResultsLoadedAndTotal();

  console.table({ totalBefore, narrowedTo: narrowed.format, filteredTotal: narrowed.total, restoredTotal });
  expect(restoredTotal).toBe(totalBefore);
});

// ─── Test 3: each format badges its own cards, and never another format's ─────

// One step per format so the report marks exactly which format failed.
// expect.soft so a failing format does not stop the rest from being checked.
test('My Ads - AD Format filter: each format badges its cards with its own format and no other', async () => {
  const formats = await myAds.getAdFormatOptions();

  for (const format of formats) {
    await test.step(`Ad Format "${format}"`, async () => {
      await myAds.selectAdFormat(format);
      const { total } = await myAds.getResultsLoadedAndTotal();

      if (total === 0) {
        await expect(myAds.emptyState).toBeVisible();
        return;
      }

      expect.soft(await myAds.getRenderedFormatBadges()).toEqual([format.toUpperCase()]);
    });
  }
});

// ─── Test 4: a format with zero ads degrades gracefully ───────────────────────
test('My Ads - AD Format filter: a format with no ads shows the empty state and a zero count', async () => {
  const formats = await myAds.getAdFormatOptions();

  let emptyFormat = null;
  for (const format of formats) {
    await myAds.selectAdFormat(format);
    if ((await myAds.getResultsLoadedAndTotal()).total === 0) {
      emptyFormat = format;
      break;
    }
  }

  test.skip(!emptyFormat,
    `Every format has ads on this merchant — nothing to assert (checked: ${formats.join(', ')})`);

  console.log(`Asserting empty-state handling for format: ${emptyFormat}`);

  // The counter reads 0 of 0 rather than disappearing or going blank
  const { loaded, total } = await myAds.getResultsLoadedAndTotal();
  expect(loaded).toBe(0);
  expect(total).toBe(0);

  // The empty state replaces the grid, and no card list is rendered at all
  await expect(myAds.emptyState).toBeVisible();
  await expect(myAds.adCardList).toHaveCount(0);

  // The page stays usable — filters remain, and Select has nothing to act on
  await expect(myAds.adFormatFilter).toBeVisible();
  await expect(myAds.selectButton).toBeDisabled();
});
