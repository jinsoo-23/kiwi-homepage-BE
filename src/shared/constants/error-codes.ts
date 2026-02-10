/**
 * RFC 9457 Problem Details 형식
 * @see https://www.rfc-editor.org/rfc/rfc9457
 */
export interface ProblemDetails {
  /** 에러 타입을 식별하는 URI (예: /errors/validation) */
  type: string;
  /** 에러 타입에 대한 짧은 제목 */
  title: string;
  /** HTTP 상태 코드 */
  status: number;
  /** 해당 에러에 대한 구체적인 설명 */
  detail: string;
  /** 에러가 발생한 요청 URI */
  instance?: string;
  /** 추가 에러 코드 (내부 식별용) */
  errorCode?: string;
  /** 검증 에러 시 필드별 에러 목록 */
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 에러 코드 enum
 */
export enum ErrorCode {
  // 일반 에러
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',

  // 비즈니스 에러
  INQUIRY_NOT_FOUND = 'INQUIRY_NOT_FOUND',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  DUPLICATE_INQUIRY = 'DUPLICATE_INQUIRY',

  // 외부 서비스 에러
  TEAMS_API_ERROR = 'TEAMS_API_ERROR',
  TEAMS_API_TIMEOUT = 'TEAMS_API_TIMEOUT',
}

/**
 * 에러 코드별 기본 메시지 매핑
 */
export const ERROR_MESSAGES: Record<
  ErrorCode,
  { title: string; type: string }
> = {
  [ErrorCode.INTERNAL_ERROR]: {
    title: 'Internal Server Error',
    type: '/errors/internal',
  },
  [ErrorCode.INVALID_REQUEST]: {
    title: 'Invalid Request',
    type: '/errors/invalid-request',
  },
  [ErrorCode.VALIDATION_ERROR]: {
    title: 'Validation Error',
    type: '/errors/validation',
  },
  [ErrorCode.NOT_FOUND]: {
    title: 'Resource Not Found',
    type: '/errors/not-found',
  },
  [ErrorCode.UNAUTHORIZED]: {
    title: 'Unauthorized',
    type: '/errors/unauthorized',
  },
  [ErrorCode.FORBIDDEN]: {
    title: 'Forbidden',
    type: '/errors/forbidden',
  },
  [ErrorCode.RATE_LIMITED]: {
    title: 'Too Many Requests',
    type: '/errors/rate-limited',
  },
  [ErrorCode.INQUIRY_NOT_FOUND]: {
    title: 'Inquiry Not Found',
    type: '/errors/inquiry-not-found',
  },
  [ErrorCode.CUSTOMER_NOT_FOUND]: {
    title: 'Customer Not Found',
    type: '/errors/customer-not-found',
  },
  [ErrorCode.DUPLICATE_INQUIRY]: {
    title: 'Duplicate Inquiry',
    type: '/errors/duplicate-inquiry',
  },
  [ErrorCode.TEAMS_API_ERROR]: {
    title: 'Teams API Error',
    type: '/errors/teams-api',
  },
  [ErrorCode.TEAMS_API_TIMEOUT]: {
    title: 'Teams API Timeout',
    type: '/errors/teams-timeout',
  },
};
