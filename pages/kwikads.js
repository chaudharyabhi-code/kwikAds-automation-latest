export class KwiksAdsCreativeAgent {
  constructor(page) {
    this.page = page;
    this.kwidAdsSideBar= this.page.locator('li div').filter({hasText:"KwikAds"});
    this.createAgent=  this.kwidAdsSideBar.locator("..").locator('ul li').filter({hasText:"Creative Agent"});
  }
  
  async goto() {
    await this.page.goto(process.env.BASE_URL);
    await this.page.waitForLoadState('networkidle');
    await this.navigateToCreativeAgent();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToCreativeAgent() {
    await this.kwidAdsSideBar.click();
    await this.createAgent.click();
  }

 

  
}

