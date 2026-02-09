import { ConfigModule } from '@nestjs/config';
import { validate } from './env.validation';

export const EnvConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validate,
  envFilePath: ['.env.local', '.env'],
});
