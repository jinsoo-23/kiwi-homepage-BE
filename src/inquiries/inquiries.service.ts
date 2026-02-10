import { Injectable, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../shared/database/drizzle.provider';
import type { DrizzleDB } from '../shared/database/drizzle.provider';
import {
  customers,
  inquiries,
  consentHistories,
} from '../shared/database/schema';
import { TeamsService } from '../teams/teams.service';

// Teams 상태 상수
export const TeamsStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
import {
  CreateInquiryDto,
  CreateInquiryResponseDto,
} from './dto/create-inquiry.dto';
import {
  GetConsentsQueryDto,
  GetConsentsResponseDto,
  UpdateConsentDto,
  UpdateConsentResponseDto,
} from './dto/update-marketing-consent.dto';
import { ErrorCode } from '../shared/constants/error-codes';
import { generateIdempotencyKey } from '../shared/idempotency';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly teamsService: TeamsService,
  ) {}

  async create(
    dto: CreateInquiryDto,
    idempotencyKey?: string,
  ): Promise<CreateInquiryResponseDto> {
    // privacyConsent 검증
    if (dto.privacyConsent !== true) {
      throw new HttpException(
        {
          errorCode: ErrorCode.INVALID_REQUEST,
          message: 'privacyConsent must be true',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 클라이언트가 Idempotency Key를 제공하지 않으면 서버에서 생성 (5분 버킷)
    const finalIdempotencyKey =
      idempotencyKey || generateIdempotencyKey(dto.email, dto.phone, dto.message);

    // Idempotency Key로 기존 문의 조회 (중복 제출 방지)
    if (finalIdempotencyKey) {
      const [existingInquiry] = await this.db
        .select()
        .from(inquiries)
        .where(eq(inquiries.idempotencyKey, finalIdempotencyKey))
        .limit(1);

      if (existingInquiry) {
        return {
          id: existingInquiry.id,
          createdAt: existingInquiry.createdAt,
          hasPreviousInquiry: true,
          message: '이미 처리된 요청입니다.',
        };
      }
    }

    // Customer 조회 또는 생성
    const [existingCustomer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.email, dto.email))
      .limit(1);

    const hasPreviousInquiry = !!existingCustomer;

    let customer = existingCustomer;
    if (!customer) {
      const [newCustomer] = await this.db
        .insert(customers)
        .values({ email: dto.email })
        .returning();
      customer = newCustomer;
    }

    // Inquiry 생성 (idempotencyKey 포함)
    const [inquiry] = await this.db
      .insert(inquiries)
      .values({
        customerId: customer.id,
        idempotencyKey: finalIdempotencyKey,
        name: dto.name,
        companyName: dto.companyName,
        phone: dto.phone,
        inquiryType: dto.inquiryType,
        message: dto.message,
      })
      .returning();

    // ConsentHistory 추가 (MARKETING, PRIVACY)
    await this.db.insert(consentHistories).values([
      {
        customerId: customer.id,
        consentType: 'MARKETING',
        consented: dto.marketingConsent,
      },
      {
        customerId: customer.id,
        consentType: 'PRIVACY',
        consented: dto.privacyConsent,
      },
    ]);

    // Teams 알림 전송 및 상태 업데이트
    const teamsResult = await this.teamsService.sendInquiryNotification({
      id: inquiry.id,
      name: inquiry.name,
      companyName: inquiry.companyName,
      email: customer.email,
      phone: inquiry.phone,
      inquiryType: inquiry.inquiryType,
      message: inquiry.message,
      createdAt: inquiry.createdAt,
    });

    // Teams 알림 결과에 따라 DB 업데이트
    if (teamsResult.success) {
      await this.db
        .update(inquiries)
        .set({
          teamsStatus: TeamsStatus.SENT,
          sentAt: teamsResult.sentAt,
        })
        .where(eq(inquiries.id, inquiry.id));
    } else {
      await this.db
        .update(inquiries)
        .set({
          teamsStatus: TeamsStatus.FAILED,
          lastError: teamsResult.error,
          retryCount: 0,
        })
        .where(eq(inquiries.id, inquiry.id));

      this.logger.warn(
        `Teams notification failed for inquiry ${inquiry.id}: ${teamsResult.error}`,
      );
    }

    const response: CreateInquiryResponseDto = {
      id: inquiry.id,
      createdAt: inquiry.createdAt,
      hasPreviousInquiry,
    };

    if (hasPreviousInquiry) {
      response.message = '이전에 동일한 이메일로 문의한 이력이 있습니다.';
    }

    return response;
  }

  // 전화번호 정규화 (숫자만 추출 후 뒤 10자리)
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-10);
  }

  async getConsents(query: GetConsentsQueryDto): Promise<GetConsentsResponseDto> {
    // email로 Customer 조회
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.email, query.email))
      .limit(1);

    if (!customer) {
      throw new HttpException(
        {
          errorCode: ErrorCode.CUSTOMER_NOT_FOUND,
          message: 'No customer matches the provided email and phone',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Customer의 문의 조회
    const customerInquiries = await this.db
      .select()
      .from(inquiries)
      .where(
        and(eq(inquiries.customerId, customer.id), isNull(inquiries.deletedAt)),
      );

    // 전화번호 정규화 후 비교
    const normalizedInputPhone = this.normalizePhone(query.phone);
    const matchingInquiry = customerInquiries.find(
      (i) => this.normalizePhone(i.phone) === normalizedInputPhone,
    );

    if (!matchingInquiry) {
      throw new HttpException(
        {
          errorCode: ErrorCode.CUSTOMER_NOT_FOUND,
          message: 'No customer matches the provided email and phone',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // 각 동의 유형별 최신 상태 조회
    const consentTypes = ['MARKETING', 'PRIVACY'];
    const consents = await Promise.all(
      consentTypes.map(async (consentType) => {
        const [latest] = await this.db
          .select()
          .from(consentHistories)
          .where(
            and(
              eq(consentHistories.customerId, customer.id),
              eq(consentHistories.consentType, consentType),
            ),
          )
          .orderBy(desc(consentHistories.createdAt))
          .limit(1);

        return {
          consentType,
          consented: latest?.consented ?? false,
          updatedAt: latest?.createdAt ?? customer.createdAt,
        };
      }),
    );

    return {
      email: customer.email,
      consents,
    };
  }

  async updateConsent(dto: UpdateConsentDto): Promise<UpdateConsentResponseDto> {
    // email로 Customer 조회
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.email, dto.email))
      .limit(1);

    if (!customer) {
      throw new HttpException(
        {
          errorCode: ErrorCode.CUSTOMER_NOT_FOUND,
          message: 'No customer matches the provided email and phone',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Customer의 문의 조회
    const customerInquiries = await this.db
      .select()
      .from(inquiries)
      .where(
        and(eq(inquiries.customerId, customer.id), isNull(inquiries.deletedAt)),
      );

    // 전화번호 정규화 후 비교
    const normalizedInputPhone = this.normalizePhone(dto.phone);
    const matchingInquiry = customerInquiries.find(
      (i) => this.normalizePhone(i.phone) === normalizedInputPhone,
    );

    if (!matchingInquiry) {
      throw new HttpException(
        {
          errorCode: ErrorCode.CUSTOMER_NOT_FOUND,
          message: 'No customer matches the provided email and phone',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // ConsentHistory에 새 레코드 추가
    const [consent] = await this.db
      .insert(consentHistories)
      .values({
        customerId: customer.id,
        consentType: dto.consentType,
        consented: dto.consented,
      })
      .returning();

    return {
      consentType: consent.consentType,
      consented: consent.consented,
      updatedAt: consent.createdAt,
    };
  }

  async exportToExcel(): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.default.Workbook();
    const worksheet = workbook.addWorksheet('Inquiries');

    // 컬럼 정의
    worksheet.columns = [
      { header: 'name', key: 'name', width: 20 },
      { header: 'company_name', key: 'companyName', width: 30 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'phone', key: 'phone', width: 20 },
      { header: 'inquiry_type', key: 'inquiryType', width: 20 },
      { header: 'message', key: 'message', width: 50 },
      { header: 'status', key: 'status', width: 15 },
      { header: 'marketing_consent', key: 'marketingConsent', width: 20 },
      { header: 'privacy_consent', key: 'privacyConsent', width: 20 },
      { header: 'created_at', key: 'createdAt', width: 25 },
    ];

    // 모든 문의 데이터 조회 (Customer 포함)
    const allInquiries = await this.db
      .select({
        id: inquiries.id,
        customerId: inquiries.customerId,
        name: inquiries.name,
        companyName: inquiries.companyName,
        phone: inquiries.phone,
        inquiryType: inquiries.inquiryType,
        message: inquiries.message,
        status: inquiries.status,
        createdAt: inquiries.createdAt,
        customerEmail: customers.email,
      })
      .from(inquiries)
      .innerJoin(customers, eq(inquiries.customerId, customers.id))
      .where(isNull(inquiries.deletedAt))
      .orderBy(desc(inquiries.createdAt));

    // 각 문의에 대해 최신 동의 상태 조회
    for (const inquiry of allInquiries) {
      const [marketingConsent] = await this.db
        .select()
        .from(consentHistories)
        .where(
          and(
            eq(consentHistories.customerId, inquiry.customerId),
            eq(consentHistories.consentType, 'MARKETING'),
          ),
        )
        .orderBy(desc(consentHistories.createdAt))
        .limit(1);

      const [privacyConsent] = await this.db
        .select()
        .from(consentHistories)
        .where(
          and(
            eq(consentHistories.customerId, inquiry.customerId),
            eq(consentHistories.consentType, 'PRIVACY'),
          ),
        )
        .orderBy(desc(consentHistories.createdAt))
        .limit(1);

      worksheet.addRow({
        name: inquiry.name,
        companyName: inquiry.companyName,
        email: inquiry.customerEmail,
        phone: inquiry.phone,
        inquiryType: inquiry.inquiryType,
        message: inquiry.message,
        status: inquiry.status,
        marketingConsent: marketingConsent?.consented ? 'O' : 'X',
        privacyConsent: privacyConsent?.consented ? 'O' : 'X',
        createdAt: inquiry.createdAt.toISOString(),
      });
    }

    // 헤더 스타일링
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
