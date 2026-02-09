# DB 마이그레이션 가이드

## 개요

기존 `inquiries` 테이블을 정규화하여 `customers`, `inquiries`, `consent_histories` 세 개의 테이블로 분리합니다.

## 마이그레이션 순서

### 1단계: 기존 테이블 백업

```sql
-- 기존 inquiries 테이블을 백업
ALTER TABLE inquiries RENAME TO inquiries_backup;
```

### 2단계: Prisma 마이그레이션 실행

```bash
npx prisma migrate dev --name normalize_db
```

### 3단계: 데이터 마이그레이션

```bash
npx ts-node prisma/migrate-data.ts
```

### 4단계: 백업 테이블 삭제 (선택)

마이그레이션이 성공적으로 완료되면 백업 테이블을 삭제할 수 있습니다.

```sql
DROP TABLE inquiries_backup;
```

## 롤백 방법

문제가 발생한 경우:

```sql
-- 새 테이블 삭제
DROP TABLE IF EXISTS consent_histories;
DROP TABLE IF EXISTS inquiries;
DROP TABLE IF EXISTS customers;

-- 백업 테이블 복원
ALTER TABLE inquiries_backup RENAME TO inquiries;
```

## 변경 사항

### 이전 구조

```
inquiries
├── id
├── name
├── company_name
├── email
├── phone
├── inquiry_type
├── message
├── status
├── marketing_consent  ← 제거
├── privacy_consent    ← 제거
├── created_at
└── deleted_at
```

### 새 구조

```
customers (신규)
├── id
├── email (UNIQUE)
├── created_at
└── updated_at

inquiries (수정)
├── id
├── customer_id (FK)   ← 추가
├── name
├── company_name
├── phone
├── inquiry_type
├── message
├── status
├── created_at
└── deleted_at

consent_histories (신규)
├── id
├── customer_id (FK)
├── consent_type (MARKETING, PRIVACY)
├── consented
└── created_at
```

## 주의사항

- 마이그레이션 전 반드시 DB 백업을 수행하세요
- 운영 환경에서는 유지보수 시간에 실행하세요
- 마이그레이션 후 API 서버를 재시작해야 합니다
