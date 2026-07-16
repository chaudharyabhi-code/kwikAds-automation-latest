import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../../pages/kwikads';
import { Competitor } from '../../../../pages/competitor';

// Card index 1 is used across all tests — must be a non-merged competitor
// so the standard "Delete Competitor" modal (not "Delete Merged Group") appears
const CARD_INDEX = 1;

// ─── Test 1: Modal appears ────────────────────────────────────────────────────
test('Delete competitor - confirmation modal shows brand name and Cancel/Delete buttons', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  const brandName = await competitor.getCardName(CARD_INDEX).innerText();
  await competitor.deleteCompetitor(CARD_INDEX);

  await expect(competitor.removeCompetitorModal).toBeVisible();
  await expect(competitor.removeCompetitorModal).toContainText(brandName.trim());
  await expect(competitor.removeCompetitorCancelBtn).toBeVisible();
  await expect(competitor.removeCompetitorConfirmBtn).toBeVisible();
});

// ─── Test 2: Cancel closes modal, competitor stays ────────────────────────────
test('Delete competitor - clicking Cancel closes modal and competitor remains in the list', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  const countBefore = await competitor.getSavedCount();

  await competitor.deleteCompetitor(CARD_INDEX);
  await expect(competitor.removeCompetitorModal).toBeVisible();

  await competitor.removeCompetitorCancelBtn.click();

  // Modal must close
  await expect(competitor.removeCompetitorModal).not.toBeVisible();

  // Saved Competitors count must be unchanged
  const countAfter = await competitor.getSavedCount();
  expect(countAfter).toBe(countBefore);
});

// ─── Test 3: Confirm deletes competitor ──────────────────────────────────────
test('Delete competitor - confirming deletion shows success toast and decrements saved count by 1', async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  const competitor = new Competitor(page);
  await competitor.navigate();

  const countBefore = await competitor.getSavedCount();

  await competitor.deleteCompetitor(CARD_INDEX);
  await expect(competitor.removeCompetitorModal).toBeVisible();

  await competitor.removeCompetitorConfirmBtn.click();

  // Success toast must appear
  await expect(competitor.successToast).toBeVisible();
  await expect(competitor.successToast).toContainText('deleted');

  // Saved Competitors count must decrement by 1
  await expect(competitor.savedCompetitorsHeading).toBeVisible();
  const countAfter = await competitor.getSavedCount();
  expect(countAfter).toBe(countBefore - 1);
});
