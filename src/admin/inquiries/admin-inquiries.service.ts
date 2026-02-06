import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryInquiriesDto } from './dto/query-inquiries.dto';
import * as ExcelJS from 'exceljs';

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
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (inquiryType) {
      where.inquiryType = inquiryType;
    }

    if (marketingConsent !== undefined) {
      where.marketingConsent = marketingConsent;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          inquiryType: true,
          status: true,
          marketingConsent: true,
          createdAt: true,
        },
      }),
      this.prisma.inquiry.count({ where }),
    ]);

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
    });

    if (!inquiry) {
      throw new NotFoundException({
        errorCode: 'INQUIRY_NOT_FOUND',
        message: '문의를 찾을 수 없습니다',
      });
    }

    return inquiry;
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

    inquiries.forEach((inquiry) => {
      worksheet.addRow({
        ...inquiry,
        marketingConsent: inquiry.marketingConsent ? 'O' : 'X',
        privacyConsent: inquiry.privacyConsent ? 'O' : 'X',
        createdAt: inquiry.createdAt.toISOString(),
      });
    });

    return workbook.xlsx.writeBuffer();
  }
}
