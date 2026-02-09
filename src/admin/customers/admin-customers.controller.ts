import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminInquiriesService } from '../inquiries/admin-inquiries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/admin/customers')
@UseGuards(JwtAuthGuard)
export class AdminCustomersController {
  constructor(private readonly adminInquiriesService: AdminInquiriesService) {}

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.adminInquiriesService.getCustomerHistory(id);
  }
}
