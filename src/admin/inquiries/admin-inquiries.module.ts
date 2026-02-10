import { Module } from '@nestjs/common';
import { AdminInquiriesController } from './admin-inquiries.controller';
import { AdminInquiriesService } from './admin-inquiries.service';
import { AdminCustomersController } from '../customers/admin-customers.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminInquiriesController, AdminCustomersController],
  providers: [AdminInquiriesService],
})
export class AdminInquiriesModule {}
