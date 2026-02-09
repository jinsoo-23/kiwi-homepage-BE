import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { InquiriesService } from './inquiries.service';
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
import { IdempotencyKey } from '../shared/idempotency';

@Controller('api/v1')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post('inquiries')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createInquiryDto: CreateInquiryDto,
    @IdempotencyKey() idempotencyKey?: string,
  ): Promise<CreateInquiryResponseDto> {
    return this.inquiriesService.create(createInquiryDto, idempotencyKey);
  }

  @Get('consents')
  @HttpCode(HttpStatus.OK)
  async getConsents(
    @Query() query: GetConsentsQueryDto,
  ): Promise<GetConsentsResponseDto> {
    return this.inquiriesService.getConsents(query);
  }

  @Patch('consents')
  @HttpCode(HttpStatus.OK)
  async updateConsent(
    @Body() updateConsentDto: UpdateConsentDto,
  ): Promise<UpdateConsentResponseDto> {
    return this.inquiriesService.updateConsent(updateConsentDto);
  }

  @Get('inquiries/export')
  async exportToExcel(@Res() res: FastifyReply): Promise<void> {
    const buffer = await this.inquiriesService.exportToExcel();

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `inquiries_${dateStr}.xlsx`;

    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
