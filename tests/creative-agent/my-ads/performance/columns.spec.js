import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds, PERF_COLUMNS } from '../../../../pages/my-ads';

const DIMENSION_TABS = ['Hook', 'Narration', 'Message Style', 'Visual Style'];

// Ad Level shows PERF_COLUMNS as-is. A grouped tab renames the first column to the dimension and
// inserts an "Ads" column after it, so it carries one column more.
const groupedColumns = tab => [tab, 'Ads', ...PERF_COLUMNS.slice(1)];

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
  await myAds.openPerformanceView();
});

// Headers are matched by NAME INSIDE the <th>, position by position — not by exact string
// equality, because several headers also render an info circle.
const expectHeaders = (actual, expected, tab) => {
  expect(actual.length, `"${tab}" headers: ${actual.join(' | ')}`).toBe(expected.length);
  expected.forEach((name, i) => {
    expect.soft(actual[i], `"${tab}" column ${i} should be "${name}"`).toContain(name);
  });
};

// ─── Case 1: all 11 Ad Level columns, in order ────────────────────────────────
test('Performance Ad Level - all 11 columns are present in the expected order', async () => {
  expectHeaders(await myAds.getPerfHeaders(), PERF_COLUMNS, 'Ad Level');
});

// ─── Case 2: the first column is named after the active tab ───────────────────
test('Performance - the first column header changes with the VIEW DATA BY tab', async () => {
  expect(await myAds.perfFirstColumnHeader.innerText()).toContain('Ad creative');

  for (const tab of DIMENSION_TABS) {
    await myAds.openViewDataByTab(tab);
    await expect(myAds.perfFirstColumnHeader, `"${tab}" did not rename column 1`)
      .toContainText(tab, { timeout: 30000 });
  }
});

// ─── Case 3: the Ads column belongs to the grouped views only ─────────────────
test('Performance - the Ads column appears only on the grouped tabs', async () => {
  expect(await myAds.getPerfHeaders(), 'Ad Level should have no Ads column')
    .not.toContain('Ads');

  for (const tab of DIMENSION_TABS) {
    await myAds.openViewDataByTab(tab);
    await expect(myAds.perfFirstColumnHeader).toContainText(tab, { timeout: 30000 });
    expectHeaders(await myAds.getPerfHeaders(), groupedColumns(tab), tab);
  }
});


// ─── Case 5: the trend icon opens the chart ───────────────────────────────────
test('Performance - the Velocity trend icon opens the Spend Velocity chart', async () => {
  test.skip(await myAds.perfRows.count() === 0, 'No performance data for the default period');

  await myAds.perfVelocityTrendButton(0).click();

  await expect(myAds.perfVelocityModal).toBeVisible();
  await expect(myAds.perfVelocityModal).toContainText('Spend Velocity');
  // The chart itself, plus the range presets it is drawn from
  await expect(myAds.perfVelocityChart, 'the modal opened without a chart').toBeVisible();
  for (const preset of ['7D', '14D', '30D']) {
    await expect(myAds.perfVelocityPreset(preset),
      `the "${preset}" preset is missing`).toBeVisible();
  }
});

// ─── Case 6: the eye icon is Ad Level only, and opens the ad ───────────────────
test('Performance - the eye icon exists only on Ad Level and opens the ad modal', async () => {
  const rows = await myAds.getPerfRows();
  test.skip(rows.length === 0, 'No performance data for the default period');

  expect(await myAds.perfEyeIcons.count(),
    'every Ad Level row should offer an eye icon').toBe(rows.length);

  await myAds.openPerfAdDetail(0);
  await expect(myAds.modalAdName).toContainText(rows[0].name);
  await myAds.closeAdDetailModal();

  // A collapsed group row offers no eye icon — only the ads inside it do
  for (const tab of DIMENSION_TABS) {
    await myAds.openViewDataByTab(tab);
    await expect(myAds.perfFirstColumnHeader).toContainText(tab, { timeout: 30000 });
    expect.soft(await myAds.perfEyeIcons.count(),
      `"${tab}" shows eye icons while its groups are collapsed`).toBe(0);
  }
});
