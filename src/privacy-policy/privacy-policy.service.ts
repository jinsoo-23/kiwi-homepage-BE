import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../shared/database/drizzle.provider';
import type { DrizzleDB } from '../shared/database/drizzle.provider';
import { privacyPolicies } from '../shared/database/schema';
import { ErrorCode } from '../shared/constants/error-codes';

export interface PrivacyPolicyResponseDto {
  content: string;
  version: string;
  updatedAt: Date;
}

@Injectable()
export class PrivacyPolicyService {
  constructor(@Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB) {}

  async getLatest(): Promise<PrivacyPolicyResponseDto> {
    const [policy] = await this.db
      .select()
      .from(privacyPolicies)
      .orderBy(desc(privacyPolicies.updatedAt))
      .limit(1);

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
