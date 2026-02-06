# Kiwi Homepage Backend

Kiwi LMS 제품 홈페이지 백엔드 API 서버

## 기술 스택

- **Runtime**: Node.js 20+
- **Framework**: NestJS
- **Language**: TypeScript 5 (strict)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: JWT + HttpOnly Cookie

## 시작하기

### 환경 설정

`.env` 파일을 별도로 전달받아 프로젝트 루트에 위치시키세요.

### 설치 및 실행

```bash
# 의존성 설치
yarn install

# DB 마이그레이션
npx prisma migrate dev

# 시드 데이터 (Admin 계정 생성)
npx prisma db seed

# 개발 서버 실행
yarn start:dev

# 프로덕션 빌드
yarn build

# 프로덕션 실행
yarn start:prod
```

### Admin 계정

시드 실행 후 생성되는 기본 계정:
- **Email**: admin@linus.kr
- **Password**: `ADMIN_INITIAL_PASSWORD` 환경변수 값

## API 엔드포인트

### Public API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/inquiries` | 문의 생성 |
| PATCH | `/api/v1/inquiries/marketing-consent` | 광고 수신 동의 철회 |
| GET | `/api/v1/privacy-policy` | 개인정보 처리방침 조회 |

### Admin API (인증 필요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/admin/auth/login` | 로그인 |
| POST | `/api/v1/admin/auth/logout` | 로그아웃 |
| POST | `/api/v1/admin/auth/refresh` | 토큰 갱신 |
| GET | `/api/v1/admin/auth/me` | 인증 상태 확인 |
| GET | `/api/v1/admin/inquiries` | 문의 목록 조회 |
| GET | `/api/v1/admin/inquiries/:id` | 문의 상세 조회 |
| PATCH | `/api/v1/admin/inquiries/:id/status` | 상태 변경 |
| DELETE | `/api/v1/admin/inquiries/:id` | 삭제 (Soft Delete) |
| GET | `/api/v1/admin/inquiries/export` | 엑셀 다운로드 |

### 문의 목록 Query Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| page | number | 페이지 번호 (기본값: 1) |
| limit | number | 페이지당 항목 수 (5, 10, 25 중 선택, 기본값: 10) |
| search | string | 검색어 (이름, 이메일, 기업명) |
| status | string | 상태 필터 (PENDING, COMPLETED) |
| marketingConsent | boolean | 광고 수신 동의 필터 |

## 에러 코드

| errorCode | 설명 |
|-----------|------|
| INVALID_REQUEST | 요청 값 검증 실패 |
| INQUIRY_NOT_FOUND | 일치 문의 없음 |
| INVALID_CREDENTIALS | 로그인 실패 |
| UNAUTHORIZED | 인증 필요 |
| INVALID_REFRESH_TOKEN | 유효하지 않은 Refresh Token |
| TEAMS_API_ERROR | Teams 알림 실패 |
| TEAMS_API_TIMEOUT | Teams 호출 타임아웃 |

## 프로젝트 구조

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── dto/
│   └── filters/
├── admin/
│   ├── auth/           # 인증 (로그인, JWT)
│   └── inquiries/      # 문의 관리
├── inquiries/          # 문의 생성 (Public)
├── privacy-policy/     # 개인정보 처리방침
├── prisma/             # Prisma 서비스
└── teams/              # Teams 알림
```

## 스크립트

```bash
yarn start:dev   # 개발 서버 (watch 모드)
yarn build       # 프로덕션 빌드
yarn start:prod  # 프로덕션 실행
yarn lint        # ESLint 검사
yarn test        # 테스트 실행
```
