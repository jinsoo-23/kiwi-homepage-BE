import { Module } from '@nestjs/common';
import { EnvConfigModule } from './shared/config/env.config';
import { DrizzleModule } from './shared/database/drizzle.module';
import { RateLimitingModule } from './shared/rate-limiting';
import { AppLoggingModule } from './shared/logging';
import { FiltersModule } from './shared/filters/filters.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { PrivacyPolicyModule } from './privacy-policy/privacy-policy.module';
import { TeamsModule } from './teams/teams.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    EnvConfigModule,
    AppLoggingModule,
    FiltersModule,
    DrizzleModule,
    RateLimitingModule,
    InquiriesModule,
    PrivacyPolicyModule,
    TeamsModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
