# 작업 인계 문서

> 작성일: 2026-02-10
> 프로젝트: linus-kiwi-homepage-BE (NestJS + Fastify + Drizzle)

## 프로젝트 개요
Backend 리팩토링 프로젝트 (BACKEND_COMPARISON.md 기반)

## 완료된 작업

### Phase 1: 기반 작업 ✅
- [x] NestJS + Fastify 어댑터 적용
- [x] Drizzle ORM 설치 및 설정
- [x] Prisma → Drizzle 스키마 변환
- [x] @nestjs/config 환경변수 검증
- [x] 모든 서비스 Drizzle로 전환
- [x] PrismaModule 제거 및 src/prisma 폴더 삭제

### Phase 2: 새 기능 추가 ✅
- [x] RFC 9457 Problem Details 전역 필터
- [x] @nestjs/throttler Rate Limiting (1분당 20회)
- [x] Health Check 엔드포인트 + @SkipThrottle
- [x] Pino + nestjs-pino 구조화 로깅
- [x] 민감정보 redaction 설정
- [x] Idempotency Key 서버 생성 (5분 버킷)

### Phase 3: 인증 강화 ✅
- [x] argon2 패키지 설치 (OWASP 권장 설정)
- [x] `src/shared/crypto/password.util.ts` 생성
- [x] 로그인 시 bcrypt → argon2 자동 마이그레이션

### Phase 4: Teams 안정화 ✅
- [x] Teams 알림 재시도 스케줄러 구현

### Phase 5: 보안 및 코드 품질 리팩토링 ✅ (이번 세션)
- [x] **JWT 보안 강화**: ConfigService.getOrThrow() 사용
  - `auth.module.ts`: JwtModule.registerAsync + ConfigService
  - `auth.service.ts`: JWT_REFRESH_SECRET ConfigService 주입
  - `jwt.strategy.ts`: JWT_SECRET ConfigService 주입
- [x] **ESLint 오류 해결** (26개 → 0개)
  - 미사용 import 제거
  - @ValidateIf, @Transform 타입 명시
  - serializers 타입 명시
  - switch-case → if-else 변환
- [x] **TeamsStatus 상수 통합**
  - `src/shared/constants/teams.constants.ts` 신규 생성
- [x] **N+1 쿼리 해결 + 유틸리티 추출**
  - `src/shared/utils/consent.util.ts` - 배치 동의 조회
  - `src/shared/utils/excel.util.ts` - Excel 워크시트 유틸
- [x] **tsconfig strict 옵션**: noFallthroughCasesInSwitch: true

## 다음에 해야 할 작업

### 즉시 (커밋 필요)
```bash
git add .
git commit -m "[refactor] 백엔드 보안 및 코드 품질 개선

- JWT 시크릿 ConfigService.getOrThrow() 사용
- ESLint 오류 26개 해결
- TeamsStatus 상수 통합
- Excel/Consent 유틸리티 추출 + N+1 해결
- tsconfig noFallthroughCasesInSwitch: true

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 추가 작업 (선택)
- [ ] TypeScript strict 옵션 추가 적용
  - `strictBindCallApply: true`
  - `noImplicitAny: true` (점진적 적용 권장)
- [ ] password.util.ts 단위 테스트 작성
- [ ] 모든 사용자 마이그레이션 후 bcrypt 패키지 제거

## 주요 변경 파일 (이번 세션)

### 신규 생성
| 파일 | 설명 |
|------|------|
| `src/shared/constants/teams.constants.ts` | TeamsStatus, MAX_RETRY_COUNT |
| `src/shared/utils/consent.util.ts` | 배치 동의 조회 (N+1 해결) |
| `src/shared/utils/excel.util.ts` | Excel 워크시트 유틸 |
| `src/shared/utils/index.ts` | 재export |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/admin/auth/auth.module.ts` | JwtModule.registerAsync |
| `src/admin/auth/auth.service.ts` | ConfigService 주입 |
| `src/admin/auth/strategies/jwt.strategy.ts` | ConfigService 주입 |
| `src/admin/inquiries/admin-inquiries.service.ts` | 유틸리티 사용 |
| `src/inquiries/inquiries.service.ts` | 유틸리티 사용 |
| `src/shared/config/env.validation.ts` | 타입 명시 |
| `src/shared/filters/http-exception.filter.ts` | if-else 변환 |
| `src/shared/logging/logging.module.ts` | 타입 명시 |
| `src/shared/rate-limiting/fastify-throttler.guard.ts` | async 시그니처 |
| `src/teams/teams-retry.scheduler.ts` | 공통 상수 사용 |
| `tsconfig.json` | noFallthroughCasesInSwitch: true |

## 주의사항

1. **JWT 환경변수 필수**
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` 없으면 앱 시작 실패 (Fail-fast)
   - 개발 환경에서도 반드시 설정 필요

2. **건드리면 안 되는 파일**
   - `src/shared/database/schema/index.ts`: DB 스키마 정의
   - `drizzle.config.ts`: 마이그레이션 설정

3. **타입 임포트**
   - `import type { DrizzleDB }` 형태 필수 (isolatedModules)

4. **bcrypt 유지**
   - 기존 사용자 비밀번호가 bcrypt일 수 있으므로 패키지 유지

## 마지막 상태

- **브랜치**: dev
- **마지막 커밋**: 1528401 `[chore] Prisma 완전 제거, Drizzle ORM 전용으로 전환`
- **변경 상태**: 커밋되지 않음 (staged 전)
- **검증 결과**:
  - `npm run lint` ✅ 0 errors, 0 warnings
  - `npm run build` ✅ 성공

## 빠른 검증 명령어

```bash
npm run lint   # ESLint 검증
npm run build  # TypeScript 빌드
npm run start:dev  # 개발 서버 실행
```

## 참고 문서
- `/BACKEND_COMPARISON.md` - 전체 리팩토링 계획서

## 새 세션 시작 방법

```
HANDOFF.md 읽고 이어서 작업해줘
```
