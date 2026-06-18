import { Page } from '@playwright/test';

export class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = this.page.locator('input[placeholder="example@email.com"]');
    this.passwordInput = this.page.locator('input[type="password"]');
    this.otpInput = this.page.locator('input[placeholder="******"]');
    this.submitButton = this.page.locator('button[type="submit"]');
    this.otpSubmitButton = this.page.locator('button[type="button"]').nth(0);
    this.merchantChangeButton = this.page.locator('button[type="button"] span[role="img"]').nth(0);
    this.merchantChangeSearchInput = this.page.locator('div[role="dialog"] input[type="text"]');
    this.merchantSelectCheckbox = this.page.locator('div[role="dialog"] ul').locator('input[type="radio"]').nth(0);
    this.setMerchantButton = this.page.locator('div[role="dialog"] button[type="button"]').filter({hasText:"Set Merchant"});
  }

  async goto() {
    await this.page.goto(`${process.env.BASE_URL}/login`);
  }

  async enterUsername() {
    await this.emailInput.fill(process.env.LOGIN_EMAIL);
  }

  async enterOTP() {
    await this.otpInput.fill(process.env.OTP);
  }

  async enterPassword() {
    await this.passwordInput.fill(process.env.PASSWORD);
  }

  async login() {
    await this.enterUsername();
    await this.submitButton.click();
    await this.enterPassword();
    await this.submitButton.click();
    await this.enterOTP();
    await this.otpSubmitButton.click();
  }
  async selectMerchant() {
    await this.merchantChangeButton.click();
    await this.merchantChangeSearchInput.fill(process.env.MERCHANT_NAME);
    await this.page.waitForTimeout(1000);
    await this.merchantSelectCheckbox.check();
        await this.page.waitForTimeout(1000);

    await this.setMerchantButton.click();
    
  }
}
