import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

// Only the modal flow is serial — tests 1 (open) to 3 (cancel) are read-only,
// test 4 (confirm) permanently merges cards 0+1 and must run last.
test.describe.serial('Merge modal flow', () => {
  let competitor;
  let brand1;
  let brand2;
  let countBefore;
  let vol1, vol2;
  let fmt1, fmt2;
  let lon1, lon2;

  test.beforeEach(async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    competitor = new Competitor(page);
    await competitor.navigate();

    // A merchant may have fewer than 2 saved competitors — merging needs two.
    const cardCount = await competitor.countAllCards();
    test.skip(cardCount < 2, `Needs at least 2 saved competitors; found ${cardCount}`);

    brand1 = (await competitor.getCardName(0).innerText()).trim();
    brand2 = (await competitor.getCardName(1).innerText()).trim();
    countBefore = await competitor.getSavedCount();

    // Capture stats BEFORE merge mode changes the card UI
    vol1 = await competitor.getCardAdVolumeNumbers(0);
    vol2 = await competitor.getCardAdVolumeNumbers(1);
    fmt1 = await competitor.getCardFormatSplitNumbers(0);
    fmt2 = await competitor.getCardFormatSplitNumbers(1);
    lon1 = await competitor.getCardAdLongevityNumbers(0);
    lon2 = await competitor.getCardAdLongevityNumbers(1);

    await competitor.enterMergeMode();
    await competitor.selectForMerge(0);
    await competitor.selectForMerge(1);
    await competitor.clickMergeAction();
  });

  test('Merge modal - opens with title and lists selected brands as radio options with one pre-selected', async () => {
    await expect(competitor.mergeModal).toBeVisible();
    await expect(competitor.mergeModal).toContainText('Merge Competitors');
    await expect(competitor.mergeModal).toContainText(brand1);
    await expect(competitor.mergeModal).toContainText(brand2);

    const checkedCount = await competitor.mergeModalRadios.evaluateAll(
      radios => radios.filter(r => r.checked).length
    );
    expect(checkedCount).toBe(1);
  });

  test('Merge modal - switching radio selection changes the representative competitor', async () => {
    await expect(competitor.mergeModalRadios.nth(0)).toBeChecked();

    await competitor.mergeModalRadios.nth(1).click();

    await expect(competitor.mergeModalRadios.nth(1)).toBeChecked();
    await expect(competitor.mergeModalRadios.nth(0)).not.toBeChecked();
  });

  test('Merge modal - clicking Cancel closes modal without merging', async () => {
    await competitor.mergeModalCancelBtn.click();

    await expect(competitor.mergeModal).not.toBeVisible();

    const countAfter = await competitor.getSavedCount();
    expect(countAfter).toBe(countBefore);
  });

  // Must be last — permanently merges cards 0 and 1
  test('Confirm & Merge - shows success toast, decrements saved count by 1, and merged card aggregates Ad Volume, Format Split, Ad Longevity from both source competitors', async () => {
    await competitor.confirmMerge();

    // Toast appears while the loader is still running — assert it before it auto-dismisses (~3s)
    await expect(competitor.successToast).toBeVisible({ timeout: 15000 });
    await expect(competitor.successToast).toContainText('merged');

    // Now wait for the loader to finish and the list to reload
    await competitor.waitForMergeToComplete();

    const countAfter = await competitor.getSavedCount();
    expect(countAfter).toBe(countBefore - 1);

    // Representative card (index 0) shows MERGED GROUP badge
    await expect(competitor.getMergedGroupBadge(0)).toBeVisible();

    // Merged card sits at index 0 (the representative radio is pre-selected as card 0)
    // Verify aggregated Ad Volume = sum of both source competitors
    const mergedVol = await competitor.getCardAdVolumeNumbers(0);
    expect(mergedVol.active).toBe(vol1.active + vol2.active);
    expect(mergedVol.total).toBe(vol1.total + vol2.total);

    // Verify aggregated Format Split
    const mergedFmt = await competitor.getCardFormatSplitNumbers(0);
    expect(mergedFmt.video).toBe(fmt1.video + fmt2.video);
    expect(mergedFmt.image).toBe(fmt1.image + fmt2.image);

    // Verify aggregated Ad Longevity
    const mergedLon = await competitor.getCardAdLongevityNumbers(0);
    expect(mergedLon.testing).toBe(lon1.testing + lon2.testing);
    expect(mergedLon.scaling).toBe(lon1.scaling + lon2.scaling);
    expect(mergedLon.evergreen).toBe(lon1.evergreen + lon2.evergreen);
  });
});
