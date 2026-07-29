import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { RolesGuard } from '../users/roles.guard';

@Module({
  controllers: [ChaptersController],
  providers: [ChaptersService, PrismaService, RolesGuard],
})
export class ChaptersModule {}
