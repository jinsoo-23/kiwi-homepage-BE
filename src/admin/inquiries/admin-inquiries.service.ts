import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, isNull, and, or, ilike } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../../shared/database/drizzle.provider';
import type { DrizzleDB } from '../../shared/database/drizzle.provider';
import {
  customers,
  inquiries,
  consentHistories,
} from '../../shared/database/schema';
import { QueryInquiriesDto } from './dto/query-inquiries.dto';
import * as ExcelJS from 'exceljs';

export interface CustomerGroup {
  customerId: string;
  email: string;
  marketingConsent: boolean;
  marketingConsentUpdatedAt: Date;
  inquiryCount: number;
  inquiries: {
    id: string;
    name: string;
    companyName: string;
    phone: string;
    inquiryType: string;
    status: string;
    createdAt: Date;
  }[];
}

@Injectable()
export class AdminInquiriesService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async findAll(query: QueryInquiriesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      inquiryType,
      marketingConsent,
    } = query;

    // 모든 고객 조회
    const allCustomers = await this.db.select().from(customers);

    // 각 고객에 대해 문의와 동의 상태 조회
    const customerGroups: CustomerGroup[] = [];

    for (const customer of allCustomers) {
      // 문의 조건 생성
      const conditions = [
        eq(inquiries.customerId, customer.id),
        isNull(inquiries.deletedAt),
      ];
      if (status) {
        conditions.push(eq(inquiries.status, status));
      }
      if (inquiryType) {
        conditions.push(eq(inquiries.inquiryType, inquiryType));
      }

      // 고객의 문의 조회
      const customerInquiries = await this.db
        .select({
          id: inquiries.id,
          name: inquiries.name,
          companyName: inquiries.companyName,
          phone: inquiries.phone,
          inquiryType: inquiries.inquiryType,
          status: inquiries.status,
          createdAt: inquiries.createdAt,
        })
        .from(inquiries)
        .where(and(...conditions))
        .orderBy(desc(inquiries.createdAt));

      // 문의가 없으면 건너뜀
      if (customerInquiries.length === 0) continue;

      // 검색 필터 적용
      if (search) {
        const searchLower = search.toLowerCase();
        const emailMatch = customer.email.toLowerCase().includes(searchLower);
        const inquiryMatch = customerInquiries.some(
          (inq) =>
            inq.name.toLowerCase().includes(searchLower) ||
            inq.companyName.toLowerCase().includes(searchLower),
        );
        if (!emailMatch && !inquiryMatch) continue;
      }

      // 최신 마케팅 동의 상태 조회
      const [latestConsent] = await this.db
        .select()
        .from(consentHistories)
        .where(
          and(
            eq(consentHistories.customerId, customer.id),
            eq(consentHistories.consentType, 'MARKETING'),
          ),
        )
        .orderBy(desc(consentHistories.createdAt))
        .limit(1);

      const hasMarketingConsent = latestConsent?.consented ?? false;

      // marketingConsent 필터 적용
      if (marketingConsent !== undefined && hasMarketingConsent !== marketingConsent) {
        continue;
      }

      customerGroups.push({
        customerId: customer.id,
        email: customer.email,
        marketingConsent: hasMarketingConsent,
        marketingConsentUpdatedAt: latestConsent?.createdAt ?? customer.createdAt,
        inquiryCount: customerInquiries.length,
        inquiries: customerInquiries,
      });
    }

    // updatedAt 기준 정렬 (최신순)
    customerGroups.sort((a, b) => {
      const aDate = a.inquiries[0]?.createdAt ?? new Date(0);
      const bDate = b.inquiries[0]?.createdAt ?? new Date(0);
      return bDate.getTime() - aDate.getTime();
    });

    // 페이지네이션
    const total = customerGroups.length;
    const skip = (page - 1) * limit;
    const paginatedData = customerGroups.slice(skip, skip + limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const [inquiry] = await this.db
      .select()
      .from(inquiries)
      .where(and(eq(inquiries.id, id), isNull(inquiries.deletedAt)))
      .limit(1);

    if (!inquiry) {
      throw new NotFoundException({
        errorCode: 'INQUIRY_NOT_FOUND',
        message: '문의를 찾을 수 없습니다',
      });
    }

    // 고객 조회
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, inquiry.customerId))
      .limit(1);

    // 최신 동의 상태 조회
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

    return {
      id: inquiry.id,
      name: inquiry.name,
      companyName: inquiry.companyName,
      email: customer.email,
      phone: inquiry.phone,
      inquiryType: inquiry.inquiryType,
      message: inquiry.message,
      status: inquiry.status,
      marketingConsent: marketingConsent?.consented ?? false,
      privacyConsent: privacyConsent?.consented ?? false,
      createdAt: inquiry.createdAt,
    };
  }

  async getCustomerHistory(customerId: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) {
      throw new NotFoundException({
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: '고객을 찾을 수 없습니다',
      });
    }

    // 고객의 문의 조회
    const customerInquiries = await this.db
      .select()
      .from(inquiries)
      .where(
        and(eq(inquiries.customerId, customerId), isNull(inquiries.deletedAt)),
      )
      .orderBy(desc(inquiries.createdAt));

    // 고객의 동의 이력 조회
    const customerConsentHistory = await this.db
      .select()
      .from(consentHistories)
      .where(eq(consentHistories.customerId, customerId))
      .orderBy(desc(consentHistories.createdAt));

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        createdAt: customer.createdAt,
      },
      inquiries: customerInquiries.map((inq) => ({
        id: inq.id,
        name: inq.name,
        companyName: inq.companyName,
        phone: inq.phone,
        inquiryType: inq.inquiryType,
        message: inq.message,
        status: inq.status,
        createdAt: inq.createdAt,
      })),
      consentHistory: customerConsentHistory.map((c) => ({
        consentType: c.consentType,
        consented: c.consented,
        createdAt: c.createdAt,
      })),
    };
  }

  async updateStatus(id: string, status: 'PENDING' | 'COMPLETED') {
    const [inquiry] = await this.db
      .select()
      .from(inquiries)
      .where(and(eq(inquiries.id, id), isNull(inquiries.deletedAt)))
      .limit(1);

    if (!inquiry) {
      throw new NotFoundException({
        errorCode: 'INQUIRY_NOT_FOUND',
        message: '문의를 찾을 수 없습니다',
      });
    }

    await this.db
      .update(inquiries)
      .set({ status })
      .where(eq(inquiries.id, id));

    return { id, status };
  }

  async softDelete(id: string) {
    const [inquiry] = await this.db
      .select()
      .from(inquiries)
      .where(and(eq(inquiries.id, id), isNull(inquiries.deletedAt)))
      .limit(1);

    if (!inquiry) {
      throw new NotFoundException({
        errorCode: 'INQUIRY_NOT_FOUND',
        message: '문의를 찾을 수 없습니다',
      });
    }

    await this.db
      .update(inquiries)
      .set({ deletedAt: new Date() })
      .where(eq(inquiries.id, id));

    return { success: true };
  }

  async exportToExcel(): Promise<ExcelJS.Buffer> {
    // 모든 문의 조회 (고객 정보 포함)
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('문의 목록');

    worksheet.columns = [
      { header: '문의자명', key: 'name', width: 15 },
      { header: '기업/기관명', key: 'companyName', width: 20 },
      { header: '이메일', key: 'email', width: 25 },
      { header: '휴대폰 번호', key: 'phone', width: 15 },
      { header: '문의 구분', key: 'inquiryType', width: 15 },
      { header: '문의 내용', key: 'message', width: 50 },
      { header: '상태', key: 'status', width: 10 },
      { header: '광고성 정보 수신', key: 'marketingConsent', width: 15 },
      { header: '개인정보 수집 동의', key: 'privacyConsent', width: 15 },
      { header: '생성일', key: 'createdAt', width: 20 },
    ];

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

    return workbook.xlsx.writeBuffer();
  }
}
