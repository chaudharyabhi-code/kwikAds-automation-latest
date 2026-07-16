import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/login';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login();

  // Wait until the post-login redirect lands on the executive-summary page —
  // this confirms the session is fully established before saving state.
  await page.waitForURL(/executive-summary/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Save only the login session — merchant selection happens in KwiksAdsCreativeAgent.goto()
  // on every test because merchant context is server-side and cannot be preserved via storageState
  await page.context().storageState({ path: '.auth/user.json' });
});
