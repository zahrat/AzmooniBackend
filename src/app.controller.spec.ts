import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the ecommerce trust page', () => {
      const page = appController.getHomePage();

      expect(page).toContain('فروش کتاب و سوالات آزمونی');
      expect(page).toContain('الزامات اینماد برای این سایت');
      expect(page).toContain('پرداخت و فعال‌سازی دسترسی به کتاب');
    });
  });

  describe('about', () => {
    it('should return the about page', () => {
      const page = appController.getAboutPage();

      expect(page).toContain('درباره ما');
      expect(page).toContain('آزمونی یک سامانه آموزشی برای کتاب‌ها و سوالات آزمونی است');
      expect(page).toContain('پشتیبانی');
    });
  });

  describe('terms', () => {
    it('should return the terms page', () => {
      const page = appController.getTermsPage();

      expect(page).toContain('قوانین و مقررات');
      expect(page).toContain('تحویل محتوا');
      expect(page).toContain('لغو و بازپرداخت');
    });
  });

  describe('privacy', () => {
    it('should return the privacy page', () => {
      const page = appController.getPrivacyPage();

      expect(page).toContain('حریم خصوصی');
      expect(page).toContain('نوع داده‌ها');
      expect(page).toContain('اشتراک‌گذاری');
    });
  });
});
