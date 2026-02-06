# Linus Kiwi Homepage Backend

고객 문의 및 동의 관리 시스템 백엔드 API

## 기술 스택

- **Runtime**: Node.js 20+
- **Framework**: NestJS
- **Language**: TypeScript 5.x (strict)
- **ORM**: Prisma
- **Database**: PostgreSQL

## 시작하기

### 1. 의존성 설치

```bash
yarn install
```

### 2. 환경변수 설정

`.env` 파일을 수정하세요:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/linus_kiwi?schema=public"

# Server
PORT=4000
CORS_ORIGIN="http://localhost:3000"

# Teams Webhook (선택 - 미설정 시 알림 스킵)
TEAMS_WEBHOOK_URL=""
```

### 3. 데이터베이스 마이그레이션

```bash
# 마이그레이션 생성 및 적용
npx prisma migrate dev --name init

# Prisma Client 생성 (마이그레이션 시 자동 생성됨)
npx prisma generate
```

### 4. 서버 실행

```bash
# 개발 모드
yarn start:dev

# 프로덕션 빌드
yarn build
yarn start:prod
```

서버가 `http://localhost:4000`에서 실행됩니다.

## API 엔드포인트

### 문의 생성

```
POST /api/v1/inquiries
```

**Request Body:**
```json
{
  "name": "홍길동",
  "email": "hong@company.com",
  "phone": "010-1234-5678",
  "inquiryType": "kiwi",
  "message": "문의 내용입니다.",
  "marketingConsent": true,
  "privacyConsent": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "createdAt": "2026-01-20T10:30:00Z"
}
```

### 광고성 정보 수신 동의 철회

```
PATCH /api/v1/inquiries/marketing-consent
```

**Request Body:**
```json
{
  "email": "hong@company.com",
  "phone": "010-1234-5678"
}
```

**Response:**
```json
{
  "marketingConsent": false
}
```

### 개인정보 처리방침 조회

```
GET /api/v1/privacy-policy
```

**Response:**
```json
{
  "content": "개인정보 처리방침 내용...",
  "version": "v1.0",
  "updatedAt": "2026-01-15T12:00:00Z"
}
```

### 문의 데이터 엑셀 다운로드 (내부용)

```
GET /api/v1/inquiries/export
```

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 파일명: `inquiries_YYYYMMDD.xlsx`

## 에러 코드

| errorCode         | 설명                |
| ----------------- | ------------------- |
| INVALID_REQUEST   | 요청 값 검증 실패   |
| INQUIRY_NOT_FOUND | 일치 문의 없음      |
| TEAMS_API_ERROR   | Teams 알림 실패     |
| TEAMS_API_TIMEOUT | Teams 호출 타임아웃 |

## 개발

```bash
# 린트
yarn lint

# 빌드
yarn build

# 테스트
yarn test
```

## 프로젝트 구조

```
src/
├── main.ts                 # 애플리케이션 진입점
├── app.module.ts           # 루트 모듈
├── common/
│   ├── dto/               # 공통 DTO
│   └── filters/           # 예외 필터
├── inquiries/             # 문의 모듈
│   ├── dto/
│   ├── inquiries.controller.ts
│   ├── inquiries.service.ts
│   └── inquiries.module.ts
├── privacy-policy/        # 개인정보 처리방침 모듈
├── prisma/                # Prisma 서비스
└── teams/                 # Teams 알림 서비스
```
