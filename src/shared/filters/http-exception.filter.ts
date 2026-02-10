import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ProblemDetails,
  ValidationError,
  ErrorCode,
  ERROR_MESSAGES,
} from '../constants/error-codes';

/**
 * RFC 9457 Problem Details 형식의 전역 예외 필터
 * @see https://www.rfc-editor.org/rfc/rfc9457
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    try {
      const problemDetails = this.buildProblemDetails(exception, request);
      this.logError(exception, problemDetails);

      response
        .code(problemDetails.status)
        .header('Content-Type', 'application/problem+json')
        .send(problemDetails);
    } catch (filterError) {
      // 필터 내부 에러 발생 시 기본 응답
      console.error('ProblemDetailsFilter error:', filterError);
      response.code(500).header('Content-Type', 'application/json').send({
        type: '/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An error occurred while processing the error response',
      });
    }
  }

  private buildProblemDetails(
    exception: unknown,
    request: FastifyRequest,
  ): ProblemDetails {
    const instance = request.url;

    // HttpException 처리
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // class-validator 검증 에러 처리
      if (exception instanceof BadRequestException) {
        const validationErrors =
          this.extractValidationErrors(exceptionResponse);
        if (validationErrors.length > 0) {
          return {
            type: ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR].type,
            title: ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR].title,
            status,
            detail: '요청 데이터 검증에 실패했습니다.',
            instance,
            errorCode: ErrorCode.VALIDATION_ERROR,
            errors: validationErrors,
          };
        }
      }

      // 커스텀 에러 응답 처리
      const customError = this.extractCustomError(exceptionResponse);
      const errorCode =
        customError.errorCode ||
        this.getErrorCodeByStatus(status as HttpStatus);
      const errorInfo = ERROR_MESSAGES[errorCode as ErrorCode] || {
        type: '/errors/unknown',
        title: 'Unknown Error',
      };

      return {
        type: errorInfo.type,
        title: errorInfo.title,
        status,
        detail: customError.message || exception.message,
        instance,
        errorCode,
      };
    }

    // 알 수 없는 에러 (500)
    return {
      type: ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR].type,
      title: ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR].title,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: '서버 내부 오류가 발생했습니다.',
      instance,
      errorCode: ErrorCode.INTERNAL_ERROR,
    };
  }

  private extractValidationErrors(
    response: string | object,
  ): ValidationError[] {
    if (typeof response !== 'object' || response === null) {
      return [];
    }

    const res = response as Record<string, unknown>;
    const messages = res.message;

    if (!Array.isArray(messages)) {
      return [];
    }

    // class-validator 메시지를 ValidationError 형식으로 변환
    return messages.map((msg: string) => {
      // "field must be ..." 형태에서 field 추출 시도
      const match = msg.match(/^(\w+)\s/);
      return {
        field: match ? match[1] : 'unknown',
        message: msg,
      };
    });
  }

  private extractCustomError(response: string | object): {
    errorCode?: string;
    message?: string;
  } {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (typeof response === 'object' && response !== null) {
      const res = response as Record<string, unknown>;
      return {
        errorCode: res.errorCode as string | undefined,
        message: Array.isArray(res.message)
          ? res.message.join(', ')
          : (res.message as string | undefined),
      };
    }

    return {};
  }

  private getErrorCodeByStatus(status: HttpStatus): ErrorCode {
    if (status === HttpStatus.BAD_REQUEST) {
      return ErrorCode.INVALID_REQUEST;
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (status === HttpStatus.FORBIDDEN) {
      return ErrorCode.FORBIDDEN;
    }
    if (status === HttpStatus.NOT_FOUND) {
      return ErrorCode.NOT_FOUND;
    }
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return ErrorCode.RATE_LIMITED;
    }
    return ErrorCode.INTERNAL_ERROR;
  }

  private logError(exception: unknown, problemDetails: ProblemDetails): void {
    const logContext = {
      errorCode: problemDetails.errorCode,
      status: problemDetails.status,
      type: problemDetails.type,
      instance: problemDetails.instance,
    };

    if (problemDetails.status >= 500) {
      this.logger.error(
        `[${problemDetails.errorCode}] ${problemDetails.detail}`,
        exception instanceof Error ? exception.stack : undefined,
        logContext,
      );
    } else {
      this.logger.warn(
        `[${problemDetails.errorCode}] ${problemDetails.detail}`,
        logContext,
      );
    }
  }
}
