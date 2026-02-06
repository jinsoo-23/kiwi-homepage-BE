import { Controller, Get } from '@nestjs/common';
import {
  PrivacyPolicyService,
  PrivacyPolicyResponseDto,
} from './privacy-policy.service';

@Controller('api/v1/privacy-policy')
export class PrivacyPolicyController {
  constructor(private readonly privacyPolicyService: PrivacyPolicyService) {}

  @Get()
  async getLatest(): Promise<PrivacyPolicyResponseDto> {
    return this.privacyPolicyService.getLatest();
  }
}
