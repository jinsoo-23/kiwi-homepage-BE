import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryInquiriesDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      inquiryType,
      marketingConsent,
    } = query;

    // 기본 where 조건
    const inquiryWhere: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status) {
      inquiryWhere.status = status;
    }

    if (inquiryType) {
      inquiryWhere.inquiryType = inquiryType;
    }

    // 검색 조건
    const customerWhere: Record<string, unknown> = {};
    if (search) {
      customerWhere.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        {
          inquiries: {
            some: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
              ],
              deletedAt: null,
            },
          },
        },
      ];
    }

    // Customer 기준으로 조회
    const customers = await this.prisma.customer.findMany({
      where: {
        ...customerWhere,
        inquiries: {
          some: inquiryWhere,
        },
      },
      include: {
        inquiries: {
          where: inquiryWhere,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
            inquiryType: true,
            status: true,
            createdAt: true,
          },
        },
        consentHistory: {
          where: { consentType: 'MARKETING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // marketingConsent 필터 적용
    let filteredCustomers = customers;
    if (marketingConsent !== undefined) {
      filteredCustomers = customers.filter((c) => {
        const consent = c.consentHistory[0]?.consented ?? false;
        return consent === marketingConsent;
      });
    }

    // 페이지네이션
    const total = filteredCustomers.length;
    const skip = (page - 1) * limit;
    const paginatedCustomers = filteredCustomers.slice(skip, skip + limit);

    // 응답 데이터 구성
    const data: CustomerGroup[] = paginatedCustomers.map((customer) => ({
      customerId: customer.id,
      email: customer.email,
      marketingConsent: customer.consentHistory[0]?.consented ?? false,
      marketingConsentUpdatedAt:
        customer.consentHistory[0]?.createdAt ?? customer.createdAt,
      inquiryCount: customer.inquiries.length,
      inquiries: customer.inquiries,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: {
          include: {
            consentHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!inquiry) {
      throw new NotFoundException({
        errorCode: 'INQUIRY_NOT_FOUND',
        message: '문의를 찾을 수 없습니다',
      });
    }

    // 최신 동의 상태 추출
    const marketingConsent = inquiry.customer.consentHistory.find(
      (c) => c.consentType === 'MARKETING',
    );
    const privacyConsent = inquiry.customer.consentHistory.find(
      (c) => c.consentType === 'PRIVACY',
    );

    return {
      id: inquiry.id,
      name: inquiry.name,
      companyName: inquiry.companyName,
      email: inquiry.customer.email,
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
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        inquiries: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        consentHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException({
        errorCode: 'CUSTOMER_NOT_FOUND',
        message: '고객을 찾을 수 없습니다',
      });
    }

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        createdAt: customer.createdAt,
      },
      inquiries: customer.inquiries.map((inq) => ({
        id: inq.id,
        name: inq.name,
        companyName: inq.companyName,
        phone: inq.phone,
        inquiryType: inq.inquiryType,
        message: inq.message,
        status: inq.status,
        createdAt: inq.createdAt,
      })),
      consentHistory: customer.consentHistory.map((c) => ({
        consentType: c.consentType,
        consented: c.consented,
        createdAt: c.createdAt,
      })),
    };
  }

  async updateStatus(id: string, status: 'PENDING' | 'COMPLETED') {
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, deletedAt: null },
    });

    if (!inquiry) {
      throw new NotFoundException({
        errorCode: 'INQUIRY_NOT_FOUND',
        message: '문의를 찾을 수 없습니다',
      });
    }

    await this.prisma.inquiry.update({
      where: { id },
      data: { status },
    });

    return { id, status };
  }

  async softDelete(id: string) {
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, deletedAt: null },
    });

    if (!inquiry) {
      throw new NotFoundException({
        errorCode: 'INQUIRY_NOT_FOUND',
        message: '문의를 찾을 수 없습니다',
      });
    }

    await this.prisma.inquiry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async exportToExcel(): Promise<ExcelJS.Buffer> {
    const inquiries = await this.prisma.inquiry.findMany({
      where: { deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

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

    for (const inquiry of inquiries) {
      const marketingConsent = await this.prisma.consentHistory.findFirst({
        where: { customerId: inquiry.customerId, consentType: 'MARKETING' },
        orderBy: { createdAt: 'desc' },
      });
      const privacyConsent = await this.prisma.consentHistory.findFirst({
        where: { customerId: inquiry.customerId, consentType: 'PRIVACY' },
        orderBy: { createdAt: 'desc' },
      });

      worksheet.addRow({
        name: inquiry.name,
        companyName: inquiry.companyName,
        email: inquiry.customer.email,
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
