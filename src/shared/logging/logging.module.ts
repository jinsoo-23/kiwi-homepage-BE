import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

/**
 * 민감정보 마스킹 대상 경로
 * Pino의 redact 옵션에서 사용
 */
const REDACT_PATHS = [
  // 요청/응답 본문 내 민감정보
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.confirmPassword',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.accessToken',

  // 헤더 내 민감정보
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',

  // 응답 본문 내 민감정보
  'res.body.accessToken',
  'res.body.refreshToken',
  'res.body.token',
];

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            // 로그 레벨
            level: isProduction ? 'info' : 'debug',

            // 전송 설정 (개발환경: pretty, 프로덕션: JSON)
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                },

            // 민감정보 마스킹
            redact: {
              paths: REDACT_PATHS,
              censor: '[REDACTED]',
            },

            // 요청 ID 자동 생성
            genReqId: (req) => {
              const existingId = req.headers['x-request-id'];
              if (existingId) {
                return Array.isArray(existingId) ? existingId[0] : existingId;
              }
              return crypto.randomUUID();
            },

            // 커스텀 로그 속성
            customProps: () => ({
              service: 'linus-kiwi-api',
            }),

            // 요청 로그에 포함할 속성
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
                // body는 민감정보가 redact되어 로깅됨
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
            },

            // Health check 경로는 로깅 제외
            autoLogging: {
              ignore: (req) => {
                const url = req.url || '';
                return (
                  url.includes('/health') ||
                  url.includes('/favicon.ico') ||
                  url.includes('/.well-known')
                );
              },
            },
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggingModule {}
