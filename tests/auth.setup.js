import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/login';

setup('authenticate', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login();
  await page.waitForLoadState('networkidle');

  // Save only the login session — merchant selection happens in KwiksAdsCreativeAgent.goto()
  // on every test because merchant context is server-side and cannot be preserved via storageState
  await page.context().storageState({ path: '.auth/user.json' });
});
