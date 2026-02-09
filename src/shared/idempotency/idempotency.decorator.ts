import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

/**
 * X-Idempotency-Key 헤더에서 값을 추출하는 데코레이터
 *
 * @example
 * ```typescript
 * @Post()
 * async create(@IdempotencyKey() key: string | undefined) {
 *   // key가 있으면 중복 체크
 * }
 * ```
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const key = request.headers['x-idempotency-key'];

    if (!key) {
      return undefined;
    }

    return Array.isArray(key) ? key[0] : key;
  },
);

/**
 * Idempotency Key 헤더 이름
 */
export const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';
