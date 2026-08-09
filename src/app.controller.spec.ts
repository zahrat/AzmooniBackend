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

      expect(page).toContain('آمادگی برای اینماد');
      expect(page).toContain('قوانین و مقررات');
      expect(page).toContain('حریم خصوصی');
    });
  });
});
