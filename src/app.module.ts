import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { QuestionsModule } from './questions/questions.module';
import { AnswersModule } from './answers/answers.module';
import { ChaptersModule } from './chapters/chapters.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    UsersModule,
    BooksModule,
    ChaptersModule,
    QuestionsModule,
    AnswersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
