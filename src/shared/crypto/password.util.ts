import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';

/**
 * Argon2id로 비밀번호 해시
 * OWASP 권장 설정 사용
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB (OWASP 권장)
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * 비밀번호 검증 (bcrypt/argon2 둘 다 지원)
 * 점진적 마이그레이션을 위해 해시 형식 자동 감지
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  // argon2 해시는 '$argon2'로 시작
  if (hash.startsWith('$argon2')) {
    return argon2.verify(hash, password);
  }

  // bcrypt 해시는 '$2a$', '$2b$', '$2y$'로 시작
  if (hash.startsWith('$2')) {
    return bcrypt.compare(password, hash);
  }

  // 알 수 없는 해시 형식
  return false;
}

/**
 * 해시가 argon2로 재해시가 필요한지 확인
 * bcrypt 해시면 true 반환
 */
export function needsRehash(hash: string): boolean {
  return !hash.startsWith('$argon2');
}
