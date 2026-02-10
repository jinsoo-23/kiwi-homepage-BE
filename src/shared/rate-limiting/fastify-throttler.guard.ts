import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify 전용 ThrottlerGuard
 * IP 추출 및 응답 헤더 설정을 Fastify 방식으로 처리
 */
@Injectable()
export class FastifyThrottlerGuard extends ThrottlerGuard {
  /**
   * Fastify 요청에서 클라이언트 IP 추출
   */
  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();
    return {
      req: http.getRequest<FastifyRequest>(),
      res: http.getResponse<FastifyReply>(),
    };
  }

  /**
   * 클라이언트 IP 추출 (프록시 환경 지원)
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: FastifyRequest): Promise<string> {
    // X-Forwarded-For 헤더 우선 사용 (프록시/로드밸런서 환경)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    // X-Real-IP 헤더 (Nginx 등)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // 기본 IP
    return req.ip || 'unknown';
  }

  /**
   * Rate Limit 초과 시 RFC 9457 형식 에러
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new ThrottlerException(
      '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    );
  }
}
