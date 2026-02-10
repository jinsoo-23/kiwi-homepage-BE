import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  // Pino Logger 사용
  app.useLogger(app.get(Logger));

  // 보안 헤더 (Helmet)
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });

  // Cookie Parser
  await app.register(fastifyCookie);

  // CORS 설정
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5002',
    credentials: true,
  });

  // 전역 Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 5001;
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
