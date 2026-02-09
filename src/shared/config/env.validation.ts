import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsEnum,
  validateSync,
  ValidateIf,
} from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  PORT: number = 5001;

  // Database - DATABASE_URL 또는 개별 변수 필요
  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  DB_HOST?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  DB_PORT?: number;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  DB_USERNAME?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  DB_PASSWORD?: string;

  @ValidateIf((o) => !o.DATABASE_URL)
  @IsString()
  DB_DATABASE?: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  // Teams Webhook
  @IsOptional()
  @IsUrl()
  TEAMS_WEBHOOK_URL?: string;

  // CORS
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints;
        return constraints ? Object.values(constraints).join(', ') : '';
      })
      .filter(Boolean)
      .join('\n');

    throw new Error(`환경변수 검증 실패:\n${errorMessages}`);
  }

  return validatedConfig;
}
