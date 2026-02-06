# ===========================================
# Stage 1: Dependencies
# ===========================================
FROM node:20-alpine AS deps

# OpenSSL: Prisma 클라이언트에 필요
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# 의존성 파일 복사
COPY package.json yarn.lock ./

# 의존성 설치
RUN yarn install --frozen-lockfile

# ===========================================
# Stage 2: Builder
# ===========================================
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# deps 스테이지에서 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules

# 소스 코드 복사
COPY . .

# Prisma 클라이언트 생성
RUN npx prisma generate

# NestJS 빌드
RUN yarn build

# ===========================================
# Stage 3: Runner (Production)
# ===========================================
FROM node:20-alpine AS runner

# OpenSSL: Prisma 런타임에 필요
RUN apk add --no-cache openssl

WORKDIR /app

# 프로덕션 환경 설정
ENV NODE_ENV=production

# 보안: non-root 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# 빌드 결과물 복사
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Prisma 스키마와 마이그레이션 복사 (런타임에 필요)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# non-root 사용자로 전환
USER nestjs

# 포트 노출
EXPOSE 5001

ENV PORT=5001

# 실행 (마이그레이션 후 앱 시작)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
