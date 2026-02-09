import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
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
import { ErrorCode } from '../common/dto/error-response.dto';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
  ) {}

  async create(dto: CreateInquiryDto): Promise<CreateInquiryResponseDto> {
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

    // Customer 조회 또는 생성
    let customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    const hasPreviousInquiry = !!customer;

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { email: dto.email },
      });
    }

    // Inquiry 생성
    const inquiry = await this.prisma.inquiry.create({
      data: {
        customerId: customer.id,
        name: dto.name,
        companyName: dto.companyName,
        phone: dto.phone,
        inquiryType: dto.inquiryType,
        message: dto.message,
      },
    });

    // ConsentHistory 추가 (MARKETING)
    await this.prisma.consentHistory.create({
      data: {
        customerId: customer.id,
        consentType: 'MARKETING',
        consented: dto.marketingConsent,
      },
    });

    // ConsentHistory 추가 (PRIVACY)
    await this.prisma.consentHistory.create({
      data: {
        customerId: customer.id,
        consentType: 'PRIVACY',
        consented: dto.privacyConsent,
      },
    });

    // Teams 알림 전송 (실패해도 문의 저장은 성공)
    // Teams 알림 전송 (실패해도 문의 저장은 성공)
    await this.teamsService.sendInquiryNotification({
      name: inquiry.name,
      companyName: inquiry.companyName,
      email: customer.email,
      phone: inquiry.phone,
      inquiryType: inquiry.inquiryType,
      message: inquiry.message,
      createdAt: inquiry.createdAt,
    });

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
    const customer = await this.prisma.customer.findUnique({
      where: { email: query.email },
      include: {
        inquiries: {
          where: { deletedAt: null },
        },
      },
    });

    // 전화번호 정규화 후 비교
    const normalizedInputPhone = this.normalizePhone(query.phone);
    const matchingInquiry = customer?.inquiries.find(
      (i) => this.normalizePhone(i.phone) === normalizedInputPhone,
    );

    if (!customer || !matchingInquiry) {
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
        const latest = await this.prisma.consentHistory.findFirst({
          where: { customerId: customer.id, consentType },
          orderBy: { createdAt: 'desc' },
        });

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
    const customer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
      include: {
        inquiries: {
          where: { deletedAt: null },
        },
      },
    });

    // 전화번호 정규화 후 비교
    const normalizedInputPhone = this.normalizePhone(dto.phone);
    const matchingInquiry = customer?.inquiries.find(
      (i) => this.normalizePhone(i.phone) === normalizedInputPhone,
    );

    if (!customer || !matchingInquiry) {
      throw new HttpException(
        {
          errorCode: ErrorCode.CUSTOMER_NOT_FOUND,
          message: 'No customer matches the provided email and phone',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // ConsentHistory에 새 레코드 추가
    const consent = await this.prisma.consentHistory.create({
      data: {
        customerId: customer.id,
        consentType: dto.consentType,
        consented: dto.consented,
      },
    });

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
    const inquiries = await this.prisma.inquiry.findMany({
      where: { deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });

    // 각 문의에 대해 최신 동의 상태 조회
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

    // 헤더 스타일링
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
