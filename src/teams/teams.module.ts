import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TeamsService } from './teams.service';
import { TeamsRetryScheduler } from './teams-retry.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TeamsService, TeamsRetryScheduler],
  exports: [TeamsService],
})
export class TeamsModule {}
