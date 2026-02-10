# 작업 인계 문서

## 프로젝트 개요
Backend 리팩토링 프로젝트 (BACKEND_COMPARISON.md 기반)

## 완료된 작업

### Phase 1: 기반 작업 ✅
- [x] NestJS + Fastify 어댑터 적용
- [x] Drizzle ORM 설치 및 설정
- [x] Prisma → Drizzle 스키마 변환
- [x] @nestjs/config 환경변수 검증
- [x] 모든 서비스 Drizzle로 전환
  - HealthController
  - PrivacyPolicyService
  - InquiriesService
  - AuthService
  - AdminInquiriesService
  - JwtStrategy
- [x] PrismaModule 제거 및 src/prisma 폴더 삭제

### Phase 2: 새 기능 추가 ✅
- [x] RFC 9457 Problem Details 전역 필터
- [x] @nestjs/throttler Rate Limiting (1분당 20회)
- [x] Health Check 엔드포인트 + @SkipThrottle
- [x] Pino + nestjs-pino 구조화 로깅
- [x] 민감정보 redaction 설정
- [x] Idempotency Key 서버 생성 (5분 버킷)

### Phase 3: 인증 강화 ✅ (NEW)
- [x] argon2 패키지 설치 (OWASP 권장 설정)
- [x] `src/shared/crypto/password.util.ts` 생성
  - hashPassword: Argon2id로 해시
  - verifyPassword: bcrypt/argon2 둘 다 지원
  - needsRehash: 재해시 필요 여부 확인
- [x] AuthService에서 새 유틸 사용
- [x] 로그인 시 bcrypt → argon2 자동 마이그레이션

## 다음에 해야 할 작업

### Phase 4: Teams 안정화
1. inquiries 테이블 컬럼 확인 (teams_status, retry_count, last_error, sent_at)
2. @nestjs/schedule 설정
3. TeamsRetryScheduler 구현 (지수 백오프: 1분 → 5분 → 15분)
4. 3회 실패 시 에러 알림 카드 전송
5. 민감정보 마스킹 유틸

### 추가 작업 (선택)
- [ ] password.util.ts 단위 테스트 작성
- [ ] 모든 사용자 마이그레이션 후 bcrypt 패키지 제거

## 주요 변경 파일

### Drizzle 관련
- `src/shared/database/drizzle.provider.ts` - Drizzle 연결 설정
- `src/shared/database/schema/index.ts` - 모든 테이블 스키마

### 서비스 파일 (Drizzle 전환됨)
- `src/modules/health/health.controller.ts`
- `src/privacy-policy/privacy-policy.service.ts`
- `src/inquiries/inquiries.service.ts`
- `src/admin/auth/auth.service.ts`
- `src/admin/auth/strategies/jwt.strategy.ts`
- `src/admin/inquiries/admin-inquiries.service.ts`

### Phase 3 추가 파일
- `src/shared/crypto/password.util.ts` - Argon2 해싱 유틸
- `src/shared/crypto/index.ts` - export

### 기타 기능
- `src/shared/idempotency/idempotency.util.ts` - 5분 버킷 Key 생성
- `src/shared/filters/http-exception.filter.ts` - RFC 9457
- `src/shared/rate-limiting/throttler.module.ts` - Rate Limiting
- `src/shared/logging/logging.module.ts` - Pino 로깅

## 주의사항
- `import type { DrizzleDB }` 형태로 타입 임포트 분리 필수 (isolatedModules 설정 때문)
- DrizzleModule은 @Global()로 설정되어 있어 별도 import 불필요
- Health Check에 @SkipThrottle() 데코레이터 적용됨
- bcrypt 아직 필요: 기존 사용자 비밀번호가 bcrypt일 수 있으므로 유지

## 마지막 상태
- 브랜치: `dev`
- 마지막 커밋: `922548b`
- 빌드: ✅ 통과 (`npm run build`)
- 린트: 미확인
- 테스트: 미확인

## 참고 문서
- `/BACKEND_COMPARISON.md` - 전체 리팩토링 계획서

## 새 세션 시작 방법

```
HANDOFF.md 읽고 Phase 4 진행해줘
```
