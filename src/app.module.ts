import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { PrivacyPolicyModule } from './privacy-policy/privacy-policy.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [PrismaModule, InquiriesModule, PrivacyPolicyModule, TeamsModule],
})
export class AppModule {}
