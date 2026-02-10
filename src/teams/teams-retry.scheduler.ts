import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { DRIZZLE_TOKEN } from '../shared/database/drizzle.provider';
import type { DrizzleDB } from '../shared/database/drizzle.provider';
import { inquiries, customers } from '../shared/database/schema';
import { TeamsService } from './teams.service';

const MAX_RETRY_COUNT = 3;

// Teams 상태 상수
const TeamsStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

@Injectable()
export class TeamsRetryScheduler {
  private readonly logger = new Logger(TeamsRetryScheduler.name);

  constructor(
    @Inject(DRIZZLE_TOKEN) private readonly db: DrizzleDB,
    private readonly teamsService: TeamsService,
  ) {}

  /**
   * 1분마다 실패한 Teams 알림을 재시도합니다.
   * 지수 백오프: retryCount에 따라 1분, 2분, 4분 후 재시도
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedNotifications(): Promise<void> {
    const now = new Date();

    // 실패한 알림 중 재시도 가능한 건 조회
    const failedInquiries = await this.db
      .select({
        id: inquiries.id,
        name: inquiries.name,
        companyName: inquiries.companyName,
        phone: inquiries.phone,
        inquiryType: inquiries.inquiryType,
        message: inquiries.message,
        createdAt: inquiries.createdAt,
        retryCount: inquiries.retryCount,
        lastError: inquiries.lastError,
        customerEmail: customers.email,
      })
      .from(inquiries)
      .innerJoin(customers, eq(inquiries.customerId, customers.id))
      .where(
        and(
          eq(inquiries.teamsStatus, TeamsStatus.FAILED),
          lt(inquiries.retryCount, MAX_RETRY_COUNT),
          isNull(inquiries.deletedAt),
        ),
      );

    if (failedInquiries.length === 0) {
      return;
    }

    this.logger.log(`Found ${failedInquiries.length} failed notifications to retry`);

    for (const inquiry of failedInquiries) {
      // 지수 백오프: 2^retryCount 분 후에 재시도
      // retryCount=0: 1분, retryCount=1: 2분, retryCount=2: 4분
      const backoffMinutes = Math.pow(2, inquiry.retryCount ?? 0);
      const nextRetryTime = new Date(inquiry.createdAt);
      nextRetryTime.setMinutes(nextRetryTime.getMinutes() + backoffMinutes);

      // 아직 백오프 시간이 지나지 않았으면 스킵
      if (now < nextRetryTime) {
        continue;
      }

      const currentRetryCount = (inquiry.retryCount ?? 0) + 1;

      this.logger.log(
        `Retrying notification for inquiry ${inquiry.id} (attempt ${currentRetryCount}/${MAX_RETRY_COUNT})`,
      );

      const result = await this.teamsService.sendInquiryNotification({
        id: inquiry.id,
        name: inquiry.name,
        companyName: inquiry.companyName,
        email: inquiry.customerEmail,
        phone: inquiry.phone,
        inquiryType: inquiry.inquiryType,
        message: inquiry.message,
        createdAt: inquiry.createdAt,
      });

      if (result.success) {
        // 성공: 상태 업데이트
        await this.db
          .update(inquiries)
          .set({
            teamsStatus: TeamsStatus.SENT,
            sentAt: result.sentAt,
            lastError: null,
          })
          .where(eq(inquiries.id, inquiry.id));

        this.logger.log(
          `Successfully sent notification for inquiry ${inquiry.id} on retry ${currentRetryCount}`,
        );
      } else {
        // 실패: retryCount 증가
        await this.db
          .update(inquiries)
          .set({
            retryCount: currentRetryCount,
            lastError: result.error,
          })
          .where(eq(inquiries.id, inquiry.id));

        // 최대 재시도 횟수 도달 시 에러 알림 전송
        if (currentRetryCount >= MAX_RETRY_COUNT) {
          this.logger.error(
            `Max retries reached for inquiry ${inquiry.id}. Sending error notification.`,
          );

          await this.teamsService.sendErrorNotification(
            {
              id: inquiry.id,
              name: inquiry.name,
              companyName: inquiry.companyName,
              email: inquiry.customerEmail,
              phone: inquiry.phone,
              inquiryType: inquiry.inquiryType,
              message: inquiry.message,
              createdAt: inquiry.createdAt,
            },
            result.error ?? 'Unknown error',
            currentRetryCount,
          );
        }
      }
    }
  }
}
