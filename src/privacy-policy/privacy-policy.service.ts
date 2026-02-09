import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '../shared/constants/error-codes';

export interface PrivacyPolicyResponseDto {
  content: string;
  version: string;
  updatedAt: Date;
}

@Injectable()
export class PrivacyPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatest(): Promise<PrivacyPolicyResponseDto> {
    const policy = await this.prisma.privacyPolicy.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!policy) {
      throw new HttpException(
        {
          errorCode: ErrorCode.INVALID_REQUEST,
          message: 'Privacy policy not found',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      content: policy.content,
      version: policy.version,
      updatedAt: policy.updatedAt,
    };
  }
}
