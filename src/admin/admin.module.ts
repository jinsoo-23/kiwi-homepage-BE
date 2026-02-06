import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AdminInquiriesModule } from './inquiries/admin-inquiries.module';

@Module({
  imports: [AuthModule, AdminInquiriesModule],
})
export class AdminModule {}
