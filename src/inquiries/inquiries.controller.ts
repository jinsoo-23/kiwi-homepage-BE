import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { InquiriesService } from './inquiries.service';
import {
  CreateInquiryDto,
  CreateInquiryResponseDto,
} from './dto/create-inquiry.dto';
import {
  UpdateMarketingConsentDto,
  UpdateMarketingConsentResponseDto,
} from './dto/update-marketing-consent.dto';

@Controller('api/v1/inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createInquiryDto: CreateInquiryDto,
  ): Promise<CreateInquiryResponseDto> {
    return this.inquiriesService.create(createInquiryDto);
  }

  @Patch('marketing-consent')
  @HttpCode(HttpStatus.OK)
  async updateMarketingConsent(
    @Body() updateMarketingConsentDto: UpdateMarketingConsentDto,
  ): Promise<UpdateMarketingConsentResponseDto> {
    return this.inquiriesService.updateMarketingConsent(
      updateMarketingConsentDto,
    );
  }

  @Get('export')
  async exportToExcel(@Res() res: Response): Promise<void> {
    const buffer = await this.inquiriesService.exportToExcel();

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `inquiries_${dateStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
