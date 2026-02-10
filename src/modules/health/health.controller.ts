import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../../shared/database/drizzle.provider';
import type { DrizzleDB } from '../../shared/database/drizzle.provider';

@Controller('api/v1/health')
export class HealthController {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  @Get()
  @SkipThrottle()
  async check() {
    let dbHealthy = false;

    try {
      await this.db.execute(sql`SELECT 1`);
      dbHealthy = true;
    } catch {
      dbHealthy = false;
    }

    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'up' : 'down',
      },
    };
  }
}
