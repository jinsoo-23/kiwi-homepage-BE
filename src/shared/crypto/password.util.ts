import * as argon2 from 'argon2';

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
 * 비밀번호 검증 (Argon2id 전용)
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!hash.startsWith('$argon2')) {
    return false;
  }
  return argon2.verify(hash, password);
}
