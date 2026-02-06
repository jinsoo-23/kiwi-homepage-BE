import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import {
  CreateInquiryDto,
  CreateInquiryResponseDto,
} from './dto/create-inquiry.dto';
import {
  UpdateMarketingConsentDto,
  UpdateMarketingConsentResponseDto,
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

    // DB에 문의 저장
    const inquiry = await this.prisma.inquiry.create({
      data: {
        name: dto.name,
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
        inquiryType: dto.inquiryType,
        message: dto.message,
        marketingConsent: dto.marketingConsent,
        privacyConsent: dto.privacyConsent,
      },
    });

    // Teams 알림 전송 (실패해도 문의 저장은 성공)
    await this.teamsService.sendInquiryNotification({
      name: inquiry.name,
      companyName: inquiry.companyName,
      email: inquiry.email,
      phone: inquiry.phone,
      inquiryType: inquiry.inquiryType,
      message: inquiry.message,
      createdAt: inquiry.createdAt,
    });

    return {
      id: inquiry.id,
      createdAt: inquiry.createdAt,
    };
  }

  async updateMarketingConsent(
    dto: UpdateMarketingConsentDto,
  ): Promise<UpdateMarketingConsentResponseDto> {
    // email + phone 모두 일치하는 레코드 검색
    const inquiry = await this.prisma.inquiry.findFirst({
      where: {
        email: dto.email,
        phone: dto.phone,
      },
    });

    if (!inquiry) {
      throw new HttpException(
        {
          errorCode: ErrorCode.INQUIRY_NOT_FOUND,
          message: 'No inquiry matches the provided email and phone',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // marketing_consent를 false로 업데이트
    await this.prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { marketingConsent: false },
    });

    return {
      marketingConsent: false,
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
      { header: 'marketing_consent', key: 'marketingConsent', width: 20 },
      { header: 'privacy_consent', key: 'privacyConsent', width: 20 },
      { header: 'created_at', key: 'createdAt', width: 25 },
    ];

    // 모든 문의 데이터 조회
    const inquiries = await this.prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 데이터 추가
    inquiries.forEach((inquiry) => {
      worksheet.addRow({
        name: inquiry.name,
        companyName: inquiry.companyName,
        email: inquiry.email,
        phone: inquiry.phone,
        inquiryType: inquiry.inquiryType,
        message: inquiry.message,
        marketingConsent: inquiry.marketingConsent,
        privacyConsent: inquiry.privacyConsent,
        createdAt: inquiry.createdAt.toISOString(),
      });
    });

    // 헤더 스타일링
    worksheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
