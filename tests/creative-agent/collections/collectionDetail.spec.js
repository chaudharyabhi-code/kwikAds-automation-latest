import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// The detail view renders differently depending on whether the collection has ads:
//
//   any collection  → back arrow, name, "N ad · by …" line
//   has ads         → additionally "Showing N ads" label and the "Select" button
//   empty           → empty-state placeholder ONLY; no Select button, no Showing label
//
// So the blocks below each discover a collection matching their precondition at
// runtime instead of assuming a fixed grid index.

let collections;

// Discovering which collection has ads / is empty requires OPENING each collection
// (the grid card shows no ad count). That is far too slow to repeat per test, so it runs
// once here and the indexes are reused by the blocks below.
let found = { userCard: -1, withAds: -1, empty: -1 };

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300000);
  const ctx  = await browser.newContext({ storageState: '.auth/user.json' });
  const page = await ctx.newPage();
  try {
    await new KwiksAdsCreativeAgent(page).goto();
    const c = new Collections(page);
    await c.navigate();
    found = await c.scanCollectionsOnce();
    console.log('collection scan ->', JSON.stringify(found));
  } finally {
    await ctx.close();
  }
});

test.beforeEach(async ({ page }) => {
  await new KwiksAdsCreativeAgent(page).goto();
  collections = new Collections(page);
  await collections.navigate();
});

// ─── Header elements common to every collection ───────────────────────────────
test.describe('Collection detail view — header (any collection)', () => {

  test.beforeEach(async () => {
    test.skip(found.userCard === -1, 'No user-created collection exists to open');
    await collections.openCollection(found.userCard);
  });

  test('Opening a collection shows the back arrow', async () => {
    await expect(collections.detailBackButton).toBeVisible();
  });

  test('Opening a collection shows a non-empty collection name', async () => {
    await expect(collections.detailName).toBeVisible();
    const name = await collections.detailName.innerText();
    expect(name.trim().length).toBeGreaterThan(0);
  });

  test('Opening a collection shows the ad-count line', async () => {
    await expect(collections.detailAdCountInfo).toBeVisible();
    await expect(collections.detailAdCountInfo).toContainText('ad');
  });

  test('Back arrow returns to the Collections grid and hides the detail header', async () => {
    await collections.goBackToCollections();

    await expect(collections.newCollectionButton).toBeVisible();
    await expect(collections.collectionCardsGrid).toBeVisible();
    // Back in the list view — the detail Select button must not be present
    await expect(collections.detailSelectButton).not.toBeVisible();
  });
});

// ─── A collection that actually contains ads ──────────────────────────────────
test.describe('Collection detail view — collection containing ads', () => {

  test.beforeEach(async () => {
    test.skip(found.withAds === -1, 'No collection with at least one ad');
    await collections.openCollection(found.withAds);
  });

  test('A collection with ads shows the "Showing N ads" label', async () => {
    await expect(collections.detailShowingLabel).toBeVisible();
    await expect(collections.detailShowingLabel).toContainText('Showing');
  });

  test('A collection with ads shows the Select button', async () => {
    await expect(collections.detailSelectButton).toBeVisible();
  });

  test('Ad count in the detail header matches the "Showing N ad(s)" label count', async () => {
    const headerCount  = await collections.getDetailAdCount();
    const showingCount = await collections.getDetailShowingCount();
    expect(headerCount).toBe(showingCount);
  });

  test('"Select" button enters selection mode and updates the label to "Tap ads to select"', async () => {
    await collections.enterDetailSelectionMode();

    await expect(collections.detailShowingLabel).toContainText('Tap ads to select');
  });

  test('Selection mode replaces the Select button with a Cancel button', async () => {
    await collections.enterDetailSelectionMode();

    await expect(collections.detailCancelSelectionBtn).toBeVisible();
    await expect(collections.detailSelectButton).not.toBeVisible();
  });
});

// ─── An empty collection ──────────────────────────────────────────────────────
// Previously untested: an empty collection renders no Select button and no
// "Showing N ads" label at all, only the empty-state placeholder.
test.describe('Collection detail view — empty collection', () => {

  test.beforeEach(async () => {
    test.skip(found.empty === -1, 'No empty collection available');
    await collections.openCollection(found.empty);
  });

  test('An empty collection shows the "No ads in this collection" empty state', async () => {
    await expect(collections.detailEmptyState).toBeVisible();
    await expect(collections.detailEmptyStateSubtitle).toBeVisible();
  });

  test('An empty collection reports a zero ad count in the header', async () => {
    expect(await collections.getDetailAdCount()).toBe(0);
  });

  test('An empty collection shows no Select button', async () => {
    await expect(collections.detailSelectButton).not.toBeVisible();
  });

  test('An empty collection shows no "Showing N ads" label', async () => {
    await expect(collections.detailShowingLabel).not.toBeVisible();
  });

  test('An empty collection still shows the back arrow and can be exited', async () => {
    await expect(collections.detailBackButton).toBeVisible();

    await collections.goBackToCollections();

    await expect(collections.newCollectionButton).toBeVisible();
    await expect(collections.collectionCardsGrid).toBeVisible();
  });
});
