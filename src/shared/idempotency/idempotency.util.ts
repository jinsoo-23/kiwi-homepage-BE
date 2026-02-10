import * as crypto from 'crypto';

/**
 * Idempotency Key 5분 버킷 생성 유틸리티
 *
 * 동일한 사용자가 5분 내에 동일한 내용으로 중복 제출하는 것을 방지합니다.
 * email + phone + message 조합으로 5분 단위 버킷의 해시를 생성합니다.
 */

const BUCKET_MINUTES = 5;

/**
 * 서버에서 Idempotency Key를 생성합니다.
 *
 * @param email - 사용자 이메일
 * @param phone - 사용자 전화번호
 * @param content - 문의 내용 (message)
 * @returns 64자리 hex 문자열
 *
 * @example
 * ```typescript
 * const key = generateIdempotencyKey('user@example.com', '010-1234-5678', '문의 내용');
 * // => 'a1b2c3d4e5f6...' (64자리)
 * ```
 */
export function generateIdempotencyKey(
  email: string,
  phone: string,
  content: string,
): string {
  // 5분 단위 버킷 계산 (같은 5분 구간 내에서는 동일한 버킷 값)
  const bucket = Math.floor(Date.now() / (BUCKET_MINUTES * 60 * 1000));

  // 정규화: 소문자, 공백 제거
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPhone = phone.replace(/\D/g, ''); // 숫자만 추출
  const normalizedContent = content.trim();

  // 조합하여 해시 생성
  const data = `${normalizedEmail}:${normalizedPhone}:${normalizedContent}:${bucket}`;

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 64);
}
