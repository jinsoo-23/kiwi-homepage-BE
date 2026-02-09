import { Module, Global } from '@nestjs/common';
import { drizzleProvider, DRIZZLE_TOKEN } from './drizzle.provider';

@Global()
@Module({
  providers: [drizzleProvider],
  exports: [DRIZZLE_TOKEN],
})
export class DrizzleModule {}

export { DRIZZLE_TOKEN };
