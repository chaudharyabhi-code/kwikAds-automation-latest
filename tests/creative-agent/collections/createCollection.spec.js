import { test, expect } from '@playwright/test';
import { KwiksAdsCreativeAgent } from '../../../pages/kwikads';
import { Collections } from '../../../pages/collections';

// Per-run suffix. With fixed names, any run that died before afterAll cleanup left the
// collection behind, and the next run's create hit "A collection with this name already
// exists" — the modal correctly stayed open, createCollection()'s hidden-wait timed out, and
// .serial then skipped the rest of the block. The duplicate-name test below still works
// because test 1 creates NAME_ONLY within this same run.
const RUN           = Math.random().toString(36).slice(2, 8);
const NAME_ONLY     = `playwright-test-name-only ${RUN}`;
const NAME_AND_DESC = `playwright-test-with-desc ${RUN}`;

// All tests in this block create collections — serial ensures cleanup runs last.
// The badge count is NOT asserted against countBefore ± 1 anywhere here. It is a
// per-merchant total, and the other collection specs create and delete on that same merchant
// from parallel workers, so the absolute number moves mid-test — measured 55 where 54 was
// expected. Existence of the named collection is the behaviour these tests are actually about,
// and it is immune to that drift. saveToCollection.spec.js reached the same conclusion.
test.describe.serial('Create new collection', () => {
  let collections;

  // Shared setup: log in, land on the Collections tab.
  test.beforeEach(async ({ page }) => {
    await new KwiksAdsCreativeAgent(page).goto();
    collections = new Collections(page);
    await collections.navigate();
    // Every test in this block starts from the open New Collection modal
    await collections.openNewCollectionModal();
  });

  test('Description field is optional - create with board name only succeeds', async () => {
    await collections.createCollection(NAME_ONLY);

    await expect(collections.successToast).toBeVisible({ timeout: 10000 });
    await expect(collections.successToast).toContainText(NAME_ONLY);

    await collections.search(NAME_ONLY);
    await expect(collections.getCardByName(NAME_ONLY)).toBeVisible();
  });

  test('Create with board name and description - card appears with "by you" attribution and today\'s date', async () => {
    await collections.createCollection(NAME_AND_DESC, 'A test description');

    await expect(collections.successToast).toBeVisible({ timeout: 10000 });

    // Newly created card appears in the grid. Searched for, not scanned: the grid paginates
    // and the new collection is not guaranteed to land on the page it renders first — this
    // assertion failed on a card that had just been created successfully.
    await collections.search(NAME_AND_DESC);

    const newCard = collections.getCardByName(NAME_AND_DESC);
    await expect(newCard).toBeVisible();
    await expect(collections.getCardAttributionByName(NAME_AND_DESC)).toContainText('by you');
  });

  test('Duplicate collection name - shows error toast "A collection with this name already exists" and modal stays open', async () => {
    await collections.boardNameInput.fill(NAME_ONLY);
    await collections.createCollectionCreateBtn.click();

    // Duplicate is blocked — error toast appears and the modal stays open
    await expect(collections.errorToast).toBeVisible({ timeout: 10000 });
    await expect(collections.errorToast).toContainText('A collection with this name already exists');
    await expect(collections.createCollectionModal).toBeVisible();
  });

  // Remove the collections created above so re-runs start from a clean slate
  // (otherwise the duplicate-name test would fail on the second run).
  test.afterAll(async ({ browser }) => {
    // Cleanup logs in from scratch (login + merchant select), which is slow on the
    // dev env — the default 60s test budget is not enough and silently leaves data behind.
    test.setTimeout(240000);
    const ctx  = await browser.newContext({ storageState: '.auth/user.json' });
    const page = await ctx.newPage();
    try {
      await new KwiksAdsCreativeAgent(page).goto();
      const c = new Collections(page);
      await c.navigate();
      for (const name of [NAME_ONLY, NAME_AND_DESC]) {
        // may not exist if its creating test failed — ignore
        await c.deleteCollectionByName(name).catch(() => {});
      }
    } finally {
      await ctx.close();
    }
  });
});
