import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AdminInquiriesService } from './admin-inquiries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryInquiriesDto } from './dto/query-inquiries.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('api/v1/admin/inquiries')
@UseGuards(JwtAuthGuard)
export class AdminInquiriesController {
  constructor(private readonly adminInquiriesService: AdminInquiriesService) {}

  @Get()
  async findAll(@Query() query: QueryInquiriesDto) {
    return this.adminInquiriesService.findAll(query);
  }

  @Get('export')
  async export(@Res() res: FastifyReply) {
    const buffer = await this.adminInquiriesService.exportToExcel();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    res.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.header(
      'Content-Disposition',
      `attachment; filename=inquiries_${date}.xlsx`,
    );

    res.send(buffer);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminInquiriesService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.adminInquiriesService.updateStatus(id, updateStatusDto.status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.adminInquiriesService.softDelete(id);
  }
}
