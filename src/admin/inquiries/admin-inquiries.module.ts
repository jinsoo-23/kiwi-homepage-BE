import { Module } from '@nestjs/common';
import { AdminInquiriesController } from './admin-inquiries.controller';
import { AdminInquiriesService } from './admin-inquiries.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminInquiriesController],
  providers: [AdminInquiriesService],
})
export class AdminInquiriesModule {}
