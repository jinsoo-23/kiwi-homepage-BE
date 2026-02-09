/**
 * 기존 Inquiry 데이터를 새 구조로 마이그레이션하는 스크립트
 *
 * 실행 방법:
 * npx ts-node prisma/migrate-data.ts
 *
 * 주의: 이 스크립트는 Prisma 마이그레이션 이후에 실행해야 합니다.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OldInquiry {
  id: string;
  name: string;
  company_name: string;
  email: string;
  phone: string;
  inquiry_type: string;
  message: string;
  status: string;
  marketing_consent: boolean;
  privacy_consent: boolean;
  created_at: Date;
  deleted_at: Date | null;
}

async function main() {
  console.log('데이터 마이그레이션 시작...');

  // 1. 기존 inquiries 테이블에서 데이터 조회 (raw query)
  const oldInquiries = await prisma.$queryRaw<OldInquiry[]>`
    SELECT
      id, name, company_name, email, phone, inquiry_type,
      message, status, marketing_consent, privacy_consent,
      created_at, deleted_at
    FROM inquiries_backup
    ORDER BY created_at ASC
  `;

  console.log(`기존 문의 데이터 ${oldInquiries.length}건 발견`);

  if (oldInquiries.length === 0) {
    console.log('마이그레이션할 데이터가 없습니다.');
    return;
  }

  // 2. 이메일별로 그룹핑
  const emailMap = new Map<string, OldInquiry[]>();
  for (const inquiry of oldInquiries) {
    const existing = emailMap.get(inquiry.email) || [];
    existing.push(inquiry);
    emailMap.set(inquiry.email, existing);
  }

  console.log(`고유 이메일 ${emailMap.size}개 발견`);

  // 3. 트랜잭션으로 마이그레이션 실행
  await prisma.$transaction(async (tx) => {
    for (const [email, inquiries] of emailMap) {
      // 3-1. Customer 생성
      const firstInquiry = inquiries[0];
      const customer = await tx.customer.create({
        data: {
          email,
          createdAt: firstInquiry.created_at,
        },
      });

      console.log(`Customer 생성: ${email} (${inquiries.length}건의 문의)`);

      // 3-2. 각 문의에 대해 Inquiry 생성 및 ConsentHistory 추가
      for (const oldInq of inquiries) {
        // Inquiry 생성
        await tx.inquiry.create({
          data: {
            id: oldInq.id,
            customerId: customer.id,
            name: oldInq.name,
            companyName: oldInq.company_name,
            phone: oldInq.phone,
            inquiryType: oldInq.inquiry_type,
            message: oldInq.message,
            status: oldInq.status,
            createdAt: oldInq.created_at,
            deletedAt: oldInq.deleted_at,
          },
        });

        // ConsentHistory 추가 (MARKETING)
        await tx.consentHistory.create({
          data: {
            customerId: customer.id,
            consentType: 'MARKETING',
            consented: oldInq.marketing_consent,
            createdAt: oldInq.created_at,
          },
        });

        // ConsentHistory 추가 (PRIVACY)
        await tx.consentHistory.create({
          data: {
            customerId: customer.id,
            consentType: 'PRIVACY',
            consented: oldInq.privacy_consent,
            createdAt: oldInq.created_at,
          },
        });
      }
    }
  });

  console.log('데이터 마이그레이션 완료!');

  // 4. 마이그레이션 결과 확인
  const customerCount = await prisma.customer.count();
  const inquiryCount = await prisma.inquiry.count();
  const consentCount = await prisma.consentHistory.count();

  console.log(`
마이그레이션 결과:
- Customer: ${customerCount}건
- Inquiry: ${inquiryCount}건
- ConsentHistory: ${consentCount}건
  `);
}

main()
  .catch((e) => {
    console.error('마이그레이션 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
