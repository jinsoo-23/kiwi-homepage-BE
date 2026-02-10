/**
 * Teams 알림 상태
 */
export const TeamsStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

export type TeamsStatusType = (typeof TeamsStatus)[keyof typeof TeamsStatus];

/**
 * Teams 알림 최대 재시도 횟수
 */
export const MAX_RETRY_COUNT = 3;
