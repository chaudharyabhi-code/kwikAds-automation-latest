import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../pages/kwikads';
import { AdsLibrary } from '../pages/ads-library';
import { Competitor } from '../pages/competitor';

// Minimum saved competitors the Competitors-tab suite needs.
// The merge tests need 2-3; the surplus is headroom for the destructive delete and merge
// tests, which run in parallel and consume cards while the merge tests are still reading them.
const MIN_COMPETITORS = 8;

// Seeding rounds. One pass is not enough: tagging a brand that is ALREADY a competitor adds
// nothing, so a pass can finish having added fewer than intended. Each round re-counts on the
// Competitors tab and only tags the remaining shortfall, moving past brands already tagged.
const MAX_ROUNDS = 3;

/**
 * Precondition for every Competitors-tab test: make sure saved competitors exist.
 *
 * A merchant can legitimately have zero saved competitors, which leaves those tests with
 * nothing to act on — they would skip (or worse, index into an empty list). Rather than
 * depend on whatever happens to be in the environment, this seeds them through the real
 * user flow:
 *
 *   Ad Library → Brand Name filter → select ONE brand → that brand's ads load →
 *   3-dot menu on the first ad → "Tag Competitor" → deselect the brand → next brand
 *
 * Idempotent: it counts what already exists and only tops up the difference, so a run
 * against an already-populated merchant costs one page load.
 */
test('seed saved competitors', async ({ page }) => {
  test.setTimeout(600000);

  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  const adsLibrary = new AdsLibrary(page);

  let after = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    await competitor.navigate();
    after = await competitor.countAllCards();
    console.log(`round ${round}: saved competitors = ${after} (need ${MIN_COMPETITORS})`);

    if (after >= MIN_COMPETITORS) break;

    // Seed the shortfall by tagging brands from the Ad Library. Brands already saved as
    // competitors are detected and skipped, so each round makes progress on new brands.
    await adsLibrary.navigateToAdsLibrary();
    const tagged = await adsLibrary.seedCompetitorsFromBrands(MIN_COMPETITORS - after);
    console.log(`round ${round}: tagged ${tagged} new competitor(s)`);

    // No brand left that could be tagged — further rounds would repeat the same walk
    if (tagged === 0) {
      console.warn(`round ${round}: no new brands could be tagged — stopping`);
      await competitor.navigate();
      after = await competitor.countAllCards();
      break;
    }
  }

  console.log(`saved competitors after seeding: ${after}`);

  // A MERGED GROUP must also exist, otherwise mergedGroupCard, mergeGroupActions and
  // mergeViewData skipped with "run the merge suite first" — they were depending on
  // merge.spec.js having already run, which parallel execution does not guarantee.
  // Seeding it here makes them independent, so a missing merged group is a real failure.
  await competitor.navigate();
  if (await competitor.findMergedGroupCardIndex() !== -1) {
    console.log('a merged group already exists — nothing to merge');
  } else if (after >= 2) {
    console.log('no merged group found — merging the first two competitors');
    await competitor.enterMergeMode();
    await competitor.selectForMerge(0);
    await competitor.selectForMerge(1);
    await competitor.clickMergeAction();
    await competitor.confirmMerge();
    await competitor.waitForMergeToComplete();

    await competitor.navigate();
    console.log(`merged group index after seeding: ${await competitor.findMergedGroupCardIndex()}`);
  }

  // Don't fail the whole run if the environment simply has too few brands with ads —
  // the per-spec precondition guards will skip those tests with a clear reason.
  if (after < MIN_COMPETITORS) {
    console.warn(
      `Only ${after} competitor(s) available after seeding (wanted ${MIN_COMPETITORS}). ` +
      `Competitor tests needing more will skip.`
    );
  }
  expect(after).toBeGreaterThan(0);
});
