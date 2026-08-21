import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { MyAds } from '../../../../pages/my-ads';

const DIMENSION_TABS = ['Hook', 'Narration', 'Message Style', 'Visual Style'];

let myAds;

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  myAds = new MyAds(page);
  await myAds.navigate();
  await myAds.openPerformanceView();
});

// The counter above the table reads "9 groups · 255 ads", and each group row carries its own
// "154 ads" badge. Two independent things must agree with it: the badges must account for every
// ad, and the rows must account for every group. A tab can legitimately have one group or none,
// which is a skip rather than a failure.

// ─── The ad badges account for every ad ───────────────────────────────────────
for (const tab of DIMENSION_TABS) {
  test(`Performance ${tab} - the group ads badges sum to the total ad count`, async () => {
    await myAds.openViewDataByTab(tab);

    const badges = await myAds.getPerfGroupBadges();
    test.skip(badges.length === 0, `"${tab}" has no groups on this merchant`);

    const counts = await myAds.getPerfGroupedCounts();
    expect(counts, `"${tab}" shows no "N groups · N ads" counter`).not.toBeNull();

    const missing = badges.filter(badge => badge === null).length;
    expect(missing, `${missing} "${tab}" group row(s) carry no ads badge`).toBe(0);

    expect(badges.reduce((a, b) => a + b, 0),
      `badges ${badges.join(' + ')} against a total of ${counts.ads}`).toBe(counts.ads);
  });
}

// ─── The rows account for every group ─────────────────────────────────────────
for (const tab of DIMENSION_TABS) {
  test(`Performance ${tab} - the number of group rows matches the group count`, async () => {
    await myAds.openViewDataByTab(tab);

    const counts = await myAds.getPerfGroupedCounts();
    test.skip(counts === null, `"${tab}" shows no "N groups · N ads" counter`);

    expect(await myAds.perfGroupRows.count(),
      `the counter says ${counts.groups} groups`).toBe(counts.groups);
  });
}
