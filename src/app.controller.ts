import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHomePage(): string {
    return this.appService.getEcommerceTrustPage();
  }

  @Get('about')
  getAboutPage(): string {
    return this.appService.getAboutPage();
  }

  @Get('terms')
  getTermsPage(): string {
    return this.appService.getTermsPage();
  }

  @Get('privacy')
  getPrivacyPage(): string {
    return this.appService.getPrivacyPage();
  }
}
