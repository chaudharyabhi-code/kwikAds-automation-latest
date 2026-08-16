import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds, AD_STATUSES, STATUS_ALL, PERF_DEFAULTS } from '../../../../pages/my-ads';

const FORMATS = ['Video', 'Image', 'Flexible'];
// Sort options that map onto a numeric column, so the ordering can actually be verified
const SORT_COLUMN = { Spend: 'Ad Spends', Orders: 'Orders', ROAS: 'ROAS', CTR: 'CTR' };

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
  await myAds.openPerformanceView();
});

// The performance table has no ranking columns (see PERF_COLUMNS), so a ranking tier cannot be
// verified row by row the way status and format can. What is verifiable: the dropdown offers the
// tier, selecting it applies, the view resolves to rows or the empty state rather than breaking,
// and the result never exceeds the unfiltered total — a filter can only ever narrow.
async function checkRankingTiers(name) {
  const options = await myAds.getSelectOptions(myAds.rankingFilter(name));
  expect.soft(options, `${name} Ranking options: ${options.join(' | ')}`).toHaveLength(7);
  expect.soft(options[0], `${name} Ranking should open on All`).toBe(STATUS_ALL);

  await myAds.selectStatus(STATUS_ALL);
  const unfiltered = await myAds.getPerfTotal();

  for (const tier of options.slice(1)) {
    await myAds.selectRanking(name, tier);
    expect.soft(await myAds.getSelectValue(myAds.rankingFilter(name)),
      `${name} Ranking = "${tier}" did not apply`).toBe(tier);

    const total = await myAds.getPerfTotal();
    expect.soft(total,
      `${name} Ranking = "${tier}" returned ${total} ads, more than the unfiltered ${unfiltered}`)
      .toBeLessThanOrEqual(unfiltered);

    if (total > 0) {
      expect.soft(await myAds.perfRows.count(),
        `${name} Ranking = "${tier}" reports ${total} ads but rendered no rows`).toBeGreaterThan(0);
    } else {
      await expect.soft(myAds.perfEmptyState,
        `${name} Ranking = "${tier}" has no ads but shows no empty state`).toBeVisible();
    }
  }
}

// ─── Test 1: Status ───────────────────────────────────────────────────────────
test('Performance - STATUS lists All/Active/Paused/Archived and each filters the table', async () => {
  expect(await myAds.getSelectOptions(myAds.statusFilter))
    .toEqual([STATUS_ALL, ...AD_STATUSES]);

  for (const status of AD_STATUSES) {
    await myAds.selectStatus(status);
    const rows = await myAds.getPerfRows();
    // A status can legitimately have no ads; only the rows that DO render must match
    const wrong = rows.filter(r => r.status.toLowerCase() !== status.toLowerCase());
    expect.soft(wrong.map(r => `${r.name} → ${r.status}`),
      `STATUS = "${status}" returned rows of another status`).toEqual([]);
  }
});

// ─── Test 2: Format ───────────────────────────────────────────────────────────
test('Performance - FORMAT lists All/Video/Image/Flexible and each filters the table', async () => {
  expect(await myAds.getSelectOptions(myAds.perfFormatFilter))
    .toEqual([STATUS_ALL, ...FORMATS]);

  // Widen the status so a format is not also being narrowed to Active-only ads
  await myAds.selectStatus(STATUS_ALL);

  for (const format of FORMATS) {
    await myAds.selectPerfFormat(format);
    const rows = await myAds.getPerfRows();
    const wrong = rows.filter(r => r.format.toLowerCase() !== format.toLowerCase());
    expect.soft(wrong.map(r => `${r.name} → ${r.format}`),
      `FORMAT = "${format}" returned rows of another format`).toEqual([]);
  }
});

// ─── Test 3: Sort By ──────────────────────────────────────────────────────────
test('Performance - SORT BY offers Spend/Orders/ROAS/CTR/Name and re-sorts on each', async () => {
  const options = await myAds.getSelectOptions(myAds.sortByFilter);
  expect(options, `SORT BY options: ${options.join(' | ')}`)
    .toEqual(expect.arrayContaining([...Object.keys(SORT_COLUMN), 'Name']));

  await myAds.selectStatus(STATUS_ALL);
  await expect(myAds.perfOrderButton).toContainText(PERF_DEFAULTS.order);

  for (const [option, column] of Object.entries(SORT_COLUMN)) {
    await myAds.selectSortBy(option);
    // Rows with no data print "—"; drop them and check the rest still descends
    const values = (await myAds.getPerfMetricValues(column)).filter(v => v !== null);
    const descending = values.every((v, i) => i === 0 || values[i - 1] >= v);
    expect.soft(descending,
      `SORT BY = "${option}" (Desc) did not order ${column}: ${values.join(', ')}`).toBe(true);
  }

  await myAds.selectSortBy('Name');
  const names = (await myAds.getPerfRows()).map(r => r.name);
  // ignorePunctuation, because ad names are separator-heavy ("Yowza_TwistSet_…",
  // "Yowza__Tso_…") and the app orders on the letters alone: twistset > tso > thesela.
  // Comparing with punctuation significant disagrees with it on where "_" and "__" fall and
  // reports a correct sort as broken.
  const sortedByName = names.every((n, i) => i === 0 || names[i - 1].localeCompare(
    n, undefined, { sensitivity: 'base', ignorePunctuation: true }) >= 0);
  expect.soft(sortedByName,
    `SORT BY = "Name" (Desc) did not order alphabetically: ${names.join(', ')}`).toBe(true);
});

// ─── Test 4: Order toggle ─────────────────────────────────────────────────────
test('Performance - the ORDER toggle reverses the sort direction', async () => {
  await myAds.selectStatus(STATUS_ALL);
  await myAds.selectSortBy('Spend');
  await expect(myAds.perfOrderButton).toContainText('Desc');

  const desc = (await myAds.getPerfMetricValues('Ad Spends')).filter(v => v !== null);
  expect(desc.length, 'no spend data to sort').toBeGreaterThan(1);

  await myAds.togglePerfOrder();
  await expect(myAds.perfOrderButton).toContainText('Asc');

  const asc = (await myAds.getPerfMetricValues('Ad Spends')).filter(v => v !== null);
  const ascending = asc.every((v, i) => i === 0 || asc[i - 1] <= v);
  expect(ascending, `Asc did not order spend ascending: ${asc.join(', ')}`).toBe(true);
  // Ascending must start at or below where descending ended, not repeat the same page
  expect(asc[0], `Asc starts at ${asc[0]}, Desc started at ${desc[0]}`).toBeLessThanOrEqual(desc[0]);
});

// ─── Test 5: Date range ───────────────────────────────────────────────────────
test('Performance - the DATE RANGE picker accepts a custom start and end date', async () => {
  await myAds.selectStatus(STATUS_ALL);
  const [, originalTo] = await myAds.getPerfDateValues();
  const originalTotal = await myAds.getPerfTotal();

  // Narrow to the single last day of the current range — unambiguously different, and a
  // narrower window can only ever return a subset
  await myAds.setPerfDateRange(originalTo, originalTo);

  expect(await myAds.getPerfDateValues(), 'the custom range was not applied')
    .toEqual([originalTo, originalTo]);

  const narrowedTotal = await myAds.getPerfTotal();
  expect(narrowedTotal,
    `narrowing to ${originalTo} returned ${narrowedTotal} ads, more than the wider range's ${originalTotal}`)
    .toBeLessThanOrEqual(originalTotal);

  if (narrowedTotal === 0) await expect(myAds.perfEmptyState).toBeVisible();
  else expect(await myAds.perfRows.count()).toBeGreaterThan(0);
});

// ─── Test 6: Combined filters ─────────────────────────────────────────────────
test('Performance - STATUS, FORMAT and QUALITY RANKING combine with AND logic', async () => {
  await myAds.selectStatus('Active');
  await myAds.selectPerfFormat('Video');
  const twoFilterTotal = await myAds.getPerfTotal();

  const tiers = await myAds.getSelectOptions(myAds.qualityRankingFilter);
  const tier = tiers[1];
  await myAds.selectRanking('Quality', tier);

  // All three are still shown as applied
  expect(await myAds.getSelectValue(myAds.statusFilter)).toBe('Active');
  expect(await myAds.getSelectValue(myAds.perfFormatFilter)).toBe('Video');
  expect(await myAds.getSelectValue(myAds.qualityRankingFilter)).toBe(tier);

  // Adding a third condition can only narrow the result
  const threeFilterTotal = await myAds.getPerfTotal();
  expect(threeFilterTotal,
    `adding QUALITY = "${tier}" widened the result from ${twoFilterTotal} to ${threeFilterTotal}`)
    .toBeLessThanOrEqual(twoFilterTotal);

  // Every row satisfies both conditions the table exposes
  for (const row of await myAds.getPerfRows()) {
    expect.soft(row.status.toLowerCase(), `"${row.name}" is not Active`).toBe('active');
    expect.soft(row.format.toLowerCase(), `"${row.name}" is not Video`).toBe('video');
  }
});

// ─── Tests 7-9: the three ranking dropdowns ───────────────────────────────────
test('Performance - QUALITY RANKING lists all 7 tiers and each filters', async () => {
  await checkRankingTiers('Quality');
});

test('Performance - ENGAGEMENT RANKING lists all 7 tiers and each filters', async () => {
  await checkRankingTiers('Engagement');
});

test('Performance - CONVERSION RANKING lists all 7 tiers and each filters', async () => {
  await checkRankingTiers('Conversion');
});

// ─── STATUS = All resets the filter ───────────────────────────────────────────
test('Performance - selecting STATUS All resets the status filter', async () => {
  await myAds.selectStatus('Paused');
  const pausedTotal = await myAds.getPerfTotal();

  await myAds.selectStatus(STATUS_ALL);

  expect(await myAds.getSelectValue(myAds.statusFilter)).toBe(STATUS_ALL);
  const allTotal = await myAds.getPerfTotal();
  expect(allTotal, `All shows ${allTotal} ads, fewer than Paused alone (${pausedTotal})`)
    .toBeGreaterThanOrEqual(pausedTotal);

  // With the filter genuinely off, the ads on show are not confined to one status — only
  // provable when Paused was a real subset rather than the whole account.
  if (allTotal > pausedTotal) {
    const statuses = new Set((await myAds.getPerfRows()).map(row => row.status.toLowerCase()));
    expect.soft([...statuses], 'All still shows only Paused ads').not.toEqual(['paused']);
  }
});

// ─── FORMAT options per VIEW DATA BY tab ──────────────────────────────────────
// Hook and Narration lock the filter (covered in viewDataBy.spec.js); these three leave it
// open, and must offer the full choice rather than merely being enabled.
test('Performance - Ad Level, Message Style and Visual Style all offer All/Video/Image in FORMAT', async () => {
  for (const tab of ['Ad Level', 'Message Style', 'Visual Style']) {
    await myAds.openViewDataByTab(tab);
    expect.soft(await myAds.isPerfFormatLocked(), `"${tab}" locked FORMAT`).toBe(false);

    const options = await myAds.getSelectOptions(myAds.perfFormatFilter);
    expect.soft(options, `"${tab}" FORMAT options: ${options.join(' | ')}`)
      .toEqual(expect.arrayContaining([STATUS_ALL, 'Video', 'Image']));
  }
});

// ─── SORT BY option list ──────────────────────────────────────────────────────
// Six options, in this order. The written test case says five and omits "Conversion Rate", but
// the app does offer it — confirmed in the dropdown, not inferred — so the case was out of date.
// Asserted as an exact list and order, so both a removed and an added option are reported.
const SORT_OPTIONS = ['Spend', 'ROAS', 'CTR', 'Orders', 'Conversion Rate', 'Name'];

test('Performance - SORT BY offers exactly its six options', async () => {
  const options = await myAds.getSelectOptions(myAds.sortByFilter);
  expect(options, `SORT BY offers ${options.length}: ${options.join(' | ')}`).toEqual(SORT_OPTIONS);
});

// ─── A custom multi-day date range ────────────────────────────────────────────
test('Performance - setting a custom multi-day date range updates the table', async () => {
  await myAds.selectStatus(STATUS_ALL);
  const [, originalTo] = await myAds.getPerfDateValues();
  const originalTotal = await myAds.getPerfTotal();

  // The last seven days of the range the view opened with
  const asIso = date => date.toISOString().slice(0, 10);
  const from = new Date(originalTo);
  from.setDate(from.getDate() - 6);

  await myAds.setPerfDateRange(asIso(from), originalTo);

  expect(await myAds.getPerfDateValues(), 'the custom range was not applied')
    .toEqual([asIso(from), originalTo]);

  const narrowedTotal = await myAds.getPerfTotal();
  expect(narrowedTotal,
    `a 7-day window returned ${narrowedTotal} ads, more than the wider range's ${originalTotal}`)
    .toBeLessThanOrEqual(originalTotal);

  if (narrowedTotal === 0) await expect(myAds.perfEmptyState).toBeVisible();
  else expect(await myAds.perfRows.count()).toBeGreaterThan(0);
});

// ─── CLEAR ALL ────────────────────────────────────────────────────────────────
// A search alone surfaces CLEAR ALL — confirmed on both environments. An earlier version of this
// test seemed to show otherwise on QA, but that was searchPerf returning before the search had
// been applied, so the button was asserted on a screen that had not updated yet.
test('Performance - CLEAR ALL is hidden at the default state and appears once a search is typed', async () => {
  await expect(myAds.perfClearAllButton,
    'CLEAR ALL is offered before anything has been filtered').not.toBeVisible();

  const rows = await myAds.getPerfRows();
  await myAds.searchPerf(rows.length ? rows[0].name : 'video');

  await expect(myAds.perfClearAllButton,
    'CLEAR ALL did not appear after a search was typed').toBeVisible();
});

test('Performance - CLEAR ALL resets every active filter to its default', async () => {
  const [defaultFrom, defaultTo] = await myAds.getPerfDateValues();

  await myAds.selectStatus('Paused');
  await myAds.selectSortBy('Orders');
  await myAds.selectRanking('Quality', (await myAds.getSelectOptions(myAds.qualityRankingFilter))[1]);
  // Always search: it is the trigger that puts CLEAR ALL on screen, so the button is guaranteed
  // to be there to click regardless of what the dropdowns did.
  const rows = await myAds.getPerfRows();
  await myAds.searchPerf(rows.length ? rows[0].name : 'video');

  await expect(myAds.perfClearAllButton).toBeVisible();
  await myAds.clickPerfClearAll();

  expect.soft(await myAds.getSelectValue(myAds.statusFilter), 'STATUS not reset')
    .toBe(PERF_DEFAULTS.status);
  expect.soft(await myAds.getSelectValue(myAds.perfFormatFilter), 'FORMAT not reset')
    .toBe(PERF_DEFAULTS.format);
  expect.soft(await myAds.getSelectValue(myAds.sortByFilter), 'SORT BY not reset')
    .toBe(PERF_DEFAULTS.sortBy);
  expect.soft(await myAds.getSelectValue(myAds.qualityRankingFilter), 'QUALITY RANKING not reset')
    .toBe(STATUS_ALL);
  await expect.soft(myAds.perfOrderButton, 'ORDER not reset').toContainText(PERF_DEFAULTS.order);
  expect.soft(await myAds.perfSearchInput.inputValue(), 'the search box was not cleared').toBe('');
  expect.soft(await myAds.getPerfDateValues(), 'DATE RANGE not reset')
    .toEqual([defaultFrom, defaultTo]);
});
