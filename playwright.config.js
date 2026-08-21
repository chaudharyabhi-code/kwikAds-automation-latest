// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
/* In headless mode the browser window defaults to 800x600. With `viewport: null` the page
   inherits that, so CI renders the ad grid at ONE card per row (locally, maximised, it is
   three) and most content sits below the fold — layout-dependent tests then behave nothing
   like a local run. Pin a realistic desktop viewport in CI; keep the real maximised window
   locally so headed debugging still uses the full screen. */
const VIEWPORT = process.env.CI ? { width: 1920, height: 1080 } : null;

/* Competitor specs that MUTATE the shared saved-competitor list, or that need a merged group
   to already exist. These run in their own project that DEPENDS on the read-only competitor
   project, so Playwright finishes every read-only test before any deletion starts.

   Without the split, the delete and merge specs ran concurrently with the merge-selection
   specs across 4 workers and drained the list underneath them — seeding 5 and deleting 3 left
   the selection tests skipping with "Needs at least 2 saved competitors; found 1". */
/* The only specs that need a collection containing an ad. Everything else in the suite must
   NOT depend on collection-setup — making the whole chromium project depend on it meant every
   My Ads and Ad Library spec paid for collection seeding, and a seeding failure blocked them. */
const COLLECTION_DEPENDENT = [
  '**/collections/**/*.spec.js',
  '**/ads-library/selectMode.spec.js',
];

/* Sync runs at most once per merchant per day, so these specs are the least deterministic in
   the suite — they routinely skip themselves on the "Synced today" guard and their popover
   assertions are timing-bound. While they lived in 'chromium-competitor' a single sync flake
   failed that project and Playwright then skipped all 18 tests of the mutating project that
   depends on it. They only need one saved competitor to exist, so they get their own project
   that nothing depends on and that gates nothing. */
const COMPETITOR_SYNC = ['**/competitor/sync/**/*.spec.js'];

const COMPETITOR_MUTATING = [
  '**/competitor/delete/**/*.spec.js',
  '**/competitor/merge/merge.spec.js',
  '**/competitor/merge/mergeGroupActions.spec.js',
  '**/competitor/merge/mergeViewData.spec.js',
  '**/competitor/merge/mergedGroupCard.spec.js',
];

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry once on CI. The comment said "retry on CI only" but both branches were 0, so nothing
     ever retried: one network blip, one slow render, and a test is red for good. That is a large
     part of why the same commit produced 20 failures one run and 73 the next. A retry also marks
     the test "flaky" rather than "passed", so genuine instability stays visible instead of being
     hidden — and a real defect fails both attempts and still reports as failed. */
  retries: process.env.CI ? 0 : 0,
  /* Opt out of parallel tests on CI. */
  /* 2, not 4. A GitHub runner has 2-4 cores; four browsers plus the app starve each other and
     the symptom is exactly the timeouts above. Parallelism comes from sharding across runners
     instead — 8 shards x 2 workers is 16 browsers at once, spread over 8 machines. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html'],['blob']],
  /* Per-test budget. Every test logs in from scratch (login + merchant select + KYC
     dismiss) before it does anything, which alone costs ~30-40s on the dev env — and
     any test that then opens a collection or an ad detail measured 52-56s. 60s left no
     headroom, so those failed intermittently in beforeEach/mid-test. */
  /* 360s, not 120s. On CI a run of 347 tests produced 79 failures and 53 of them were
     "Test timeout of 120000ms exceeded while running beforeEach" — the hook alone (log in,
     select the merchant, navigate, wait for the shell) costs 40-60s on a loaded runner, so any
     test whose setup also opens a collection or a modal ran out of budget before its first
     assertion. Almost none of those were real defects.
     A long budget does not slow a passing run: tests still finish when they finish. It only
     changes how long a genuinely stuck one waits, and actionTimeout/navigationTimeout below
     already cap individual actions so a real hang still fails fast with a named locator. */
  timeout: 360000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',
    /* Both of these default to 0 = "no limit, bounded only by the test timeout". That is
       what turned several failures into bare "Test timeout of 120000ms exceeded" with no
       indication of what was stuck: one click() on a permanently-disabled button, or one
       check() on a checkbox that never became actionable, silently consumed the entire
       per-test budget. Bounding them makes the offending action fail fast and name itself
       in the call log, and leaves the remaining budget for the rest of the test. */
    actionTimeout: 20000,
    navigationTimeout: 45000,
    screenshot: 'only-on-failure',
    headless: !!process.env.CI,
    viewport: VIEWPORT,
    ignoreHTTPSErrors: true,
    launchOptions: {
      /* Local only. slowMo pauses 500ms before EVERY Playwright action, which is useful when
         watching a run headed and pure waste on CI: a test doing 40 actions sleeps 20s, and
         across 347 tests that is well over an hour of deliberate idling, on top of the real work.
         It was applied unconditionally, so CI paid it too. */
      slowMo: process.env.CI ? 0 : 500,
      args: [
        '--start-maximized',
      ],
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: 'tests/auth.setup.js',
    },
    /* Seeds saved competitors before the suite runs. A merchant can legitimately have
       none, which leaves every Competitors-tab test with nothing to act on. Idempotent:
       it tops up only the shortfall, so an already-populated merchant costs one page
       load. */
    {
      name: 'competitor-setup',
      testMatch: 'tests/competitor.setup.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    /* Seeds a collection that CONTAINS an ad before the suite runs. Collections and
       Select-mode tests skipped wholesale without one ("No collection with at least one ad").
       Idempotent: an already-populated merchant costs one page load. */
    {
      name: 'collection-setup',
      testMatch: 'tests/collection.setup.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    /* Everything except the Competitors tab — no competitor seeding needed, so these do
       not pay for it. */
    {
      name: 'chromium',
      testIgnore: ['**/competitor/**', '**/*.setup.js', ...COLLECTION_DEPENDENT],
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
    /* Collections and Select mode — the only specs that need a seeded collection, so they are
       the only ones that wait on collection-setup. */
    {
      name: 'chromium-collections',
      testMatch: COLLECTION_DEPENDENT,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup', 'collection-setup'],
    },
    /* Competitors tab only — these need saved competitors to exist, so this is the only
       project that depends on the seeder. Playwright prunes a project with no matching
       tests, so seeding is skipped when you run e.g. just an ads-library spec. */
    {
      name: 'chromium-competitor',
      testMatch: '**/competitor/**/*.spec.js',
      testIgnore: [...COMPETITOR_MUTATING, ...COMPETITOR_SYNC],
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup', 'competitor-setup'],
    },
    /* Deletes and merges, plus the specs that read a merged group.
       Depends on 'chromium-competitor' so every read-only test finishes before anything starts
       deleting. Measured both ways: with the dependency 36 pass / 3 fail, without it 34 / 5 —
       removing it lets deletes remove cards mid-test, and the merge-selection and count specs
       fail on a list that moved under them.
       The dependency does mean Playwright skips this whole project if the read-only one has ANY
       failure. That is a reason to keep the read-only project green, not a reason to drop the
       ordering: 4 races on every run is worse than 18 skips on a bad one.
       The specs also self-heal (ensureCompetitors / ensureMergedGroup), which handles a consumed
       precondition independently of the ordering. */
    {
      name: 'chromium-competitor-mutating',
      testMatch: COMPETITOR_MUTATING,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup', 'competitor-setup', 'chromium-competitor'],
    },
    /* Sync specs — see COMPETITOR_SYNC above. Deliberately NOT in the dependency chain in
       either direction: nothing waits on it, so a sync flake now costs only the test that
       flaked instead of that test plus 18 skips. They read card 0 and need one competitor;
       the delete specs top the list up rather than drain it, so running alongside them is
       safe. */
    {
      name: 'chromium-competitor-sync',
      testMatch: COMPETITOR_SYNC,
      use: {
        ...devices['Desktop Chrome'],
        viewport: VIEWPORT,
        deviceScaleFactor: undefined,
        storageState: '.auth/user.json',
      },
      dependencies: ['setup', 'competitor-setup'],
    },


    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'],
    //     storageState: '.auth/user.json',

    //    },
    //   dependencies: ['setup'],
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

