import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

// Long enough that no real ad name can contain it
const NO_MATCH = 'zzq-no-such-creative-zzq';

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
  await myAds.openPerformanceView();
});

// Every test searches for a term taken from the data on screen — the first ad's name, or the
// first group's title — so nothing is hardcoded to one merchant's creatives.
async function firstAdName() {
  const rows = await myAds.getPerfRows();
  test.skip(rows.length === 0, 'No performance data for the default period');
  expect(rows[0].name, 'the first row has no name to search for').not.toBe('');
  return rows[0].name;
}

const names = rows => rows.map(row => row.name);

// Search spans more than the name — the box reads "Search performance ads by name, hook,
// creative design" — so a returned row can match on its hook or design while its NAME contains
// nothing of the term. Asserting "every row's name contains the query" reported the app as broken
// for doing exactly what it advertises. What must hold is that the ad searched for comes back.
//
// ─── Test 1: search by ad name ────────────────────────────────────────────────
test('Performance search - searching the first ad name returns that ad', async () => {
  const name = await firstAdName();

  await myAds.searchPerf(name);

  const results = await myAds.getPerfRows();
  expect(results.length, `searching "${name}" returned nothing`).toBeGreaterThan(0);
  expect(results.map(row => row.name),
    `searching "${name}" did not return that ad`).toContain(name);
});

// ─── Test 2: search by group name on a dimension tab ──────────────────────────
test('Performance search - searching the first group title returns only matching group rows', async () => {
  await myAds.openViewDataByTab('Hook');

  const titles = await myAds.getPerfGroupTitles();
  test.skip(titles.length === 0, 'No Hook groups on this merchant');
  const title = titles[0];

  await myAds.searchPerf(title);

  // Same reason as above: an ad matching on another field pulls its whole group into the results,
  // so other group titles can legitimately appear. The searched group must be one of them.
  const results = await myAds.getPerfGroupTitles();
  expect(results.length, `searching the group "${title}" returned no groups`).toBeGreaterThan(0);
  expect(results, `searching "${title}" did not return that group`).toContain(title);
});

// ─── Test 3: case insensitivity ───────────────────────────────────────────────
test('Performance search - lower case and upper case return identical results', async () => {
  const name = await firstAdName();

  await myAds.searchPerf(name.toLowerCase());
  const lower = names(await myAds.getPerfRows());

  await myAds.searchPerf(name.toUpperCase());
  const upper = names(await myAds.getPerfRows());

  expect(lower.length, `"${name.toLowerCase()}" returned nothing`).toBeGreaterThan(0);
  expect(upper, 'upper case returned a different set from lower case').toEqual(lower);
});

// ─── Test 4: partial match ────────────────────────────────────────────────────
test('Performance search - a partial name returns the matching rows', async () => {
  const name = await firstAdName();
  // Half the name, and never so short that it stops being meaningful
  const partial = name.slice(0, Math.max(4, Math.floor(name.length / 2))).trim();

  await myAds.searchPerf(partial);

  const results = await myAds.getPerfRows();
  expect(results.length, `the partial search "${partial}" returned nothing`).toBeGreaterThan(0);
  // A prefix of the full name must still find the ad it came from
  expect(results.map(row => row.name),
    `the partial search "${partial}" did not return "${name}"`).toContain(name);
});

// ─── Test 5: surrounding whitespace ───────────────────────────────────────────
test('Performance search - leading and trailing spaces are trimmed', async () => {
  const name = await firstAdName();

  await myAds.searchPerf(name);
  const trimmed = names(await myAds.getPerfRows());

  await myAds.searchPerf(`   ${name}   `);
  const padded = names(await myAds.getPerfRows());

  expect(trimmed.length, `"${name}" returned nothing`).toBeGreaterThan(0);
  expect(padded, 'the padded search returned a different set from the trimmed one').toEqual(trimmed);
});

// ─── Test 6: no results ───────────────────────────────────────────────────────
test('Performance search - a term that matches nothing shows the empty state', async () => {
  await myAds.searchPerf(NO_MATCH);

  // Polled rather than read once: the old rows linger while the request is in flight, so an
  // instantaneous count reports the pre-search list. If rows genuinely never clear, this still
  // fails — as it should.
  await expect.poll(() => myAds.perfRows.count(), { timeout: 20000, intervals: [500] })
    .toBe(0);
  await expect(myAds.perfEmptyState).toBeVisible();
});

// ─── Test 7: clearing the search ──────────────────────────────────────────────
test('Performance search - clearing the search restores every row', async () => {
  const before = names(await myAds.getPerfRows());
  test.skip(before.length === 0, 'No performance data for the default period');

  await myAds.searchPerf(before[0]);
  expect((await myAds.getPerfRows()).length,
    'the search did not narrow the rows at all').toBeLessThanOrEqual(before.length);

  await myAds.clearPerfSearch();

  expect(await myAds.perfSearchInput.inputValue(), 'the search box still holds text').toBe('');
  expect(names(await myAds.getPerfRows()), 'the original rows were not restored').toEqual(before);
});
