import { Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '../shared/constants/error-codes';

export interface InquiryData {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  inquiryType: string;
  message: string;
  createdAt: Date;
}

export interface TeamsNotificationResult {
  success: boolean;
  error?: string;
  sentAt?: Date;
}

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  private readonly webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  private readonly timeout = 15000; // 15초 타임아웃

  /**
   * Teams로 문의 알림을 전송하고 결과를 반환합니다.
   */
  async sendInquiryNotification(inquiry: InquiryData): Promise<TeamsNotificationResult> {
    if (!this.webhookUrl) {
      this.logger.warn(
        'TEAMS_WEBHOOK_URL is not configured. Skipping Teams notification.',
      );
      // Webhook URL이 없으면 성공으로 처리 (설정되지 않은 환경)
      return { success: true, sentAt: new Date() };
    }

    const payload = this.buildAdaptiveCard(inquiry);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = `Teams API Error: ${response.status} ${response.statusText}`;
        this.logger.error(errorMessage, ErrorCode.TEAMS_API_ERROR);
        return { success: false, error: errorMessage };
      }

      this.logger.log('Teams notification sent successfully');
      return { success: true, sentAt: new Date() };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          const errorMessage = 'Teams API Timeout: Request exceeded 15 seconds';
          this.logger.error(errorMessage, ErrorCode.TEAMS_API_TIMEOUT);
          return { success: false, error: errorMessage };
        }

        this.logger.error(
          `Teams API Error: ${error.message}`,
          ErrorCode.TEAMS_API_ERROR,
        );
        return { success: false, error: error.message };
      }

      return { success: false, error: 'Unknown error occurred' };
    }
  }

  /**
   * 3회 실패 시 관리자에게 에러 알림 카드를 전송합니다.
   */
  async sendErrorNotification(
    inquiry: InquiryData,
    lastError: string,
    retryCount: number,
  ): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    const payload = this.buildErrorCard(inquiry, lastError, retryCount);

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      this.logger.warn(
        `Error notification sent for inquiry ${inquiry.id} after ${retryCount} retries`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send error notification for inquiry ${inquiry.id}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private buildAdaptiveCard(inquiry: InquiryData) {
    const inquiryTypeMap: Record<string, string> = {
      kiwi: 'Kiwi 문의',
      kiwiFeature: 'Kiwi 기능 문의',
      kiwiPartnership: 'Kiwi 파트너십 문의',
    };

    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: '📬 새 문의가 도착했습니다',
                weight: 'bolder',
                size: 'large',
              },
              {
                type: 'FactSet',
                facts: [
                  { title: '이름', value: inquiry.name },
                  { title: '기업/기관명', value: inquiry.companyName },
                  { title: '이메일', value: inquiry.email },
                  { title: '휴대폰', value: inquiry.phone },
                  {
                    title: '문의 구분',
                    value:
                      inquiryTypeMap[inquiry.inquiryType] ||
                      inquiry.inquiryType,
                  },
                  {
                    title: '문의일시',
                    value: inquiry.createdAt.toISOString(),
                  },
                ],
              },
              {
                type: 'TextBlock',
                text: '문의 내용',
                weight: 'bolder',
                spacing: 'medium',
              },
              {
                type: 'TextBlock',
                text: inquiry.message,
                wrap: true,
              },
            ],
          },
        },
      ],
    };
  }

  private buildErrorCard(
    inquiry: InquiryData,
    lastError: string,
    retryCount: number,
  ) {
    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: '⚠️ 문의 알림 전송 실패',
                weight: 'bolder',
                size: 'large',
                color: 'attention',
              },
              {
                type: 'TextBlock',
                text: `${retryCount}회 재시도 후 최종 실패했습니다. 수동 확인이 필요합니다.`,
                wrap: true,
                color: 'attention',
              },
              {
                type: 'FactSet',
                facts: [
                  { title: '문의 ID', value: inquiry.id },
                  { title: '이름', value: inquiry.name },
                  { title: '기업/기관명', value: inquiry.companyName },
                  { title: '이메일', value: inquiry.email },
                  { title: '마지막 에러', value: lastError },
                ],
              },
              {
                type: 'TextBlock',
                text: '문의 내용',
                weight: 'bolder',
                spacing: 'medium',
              },
              {
                type: 'TextBlock',
                text: inquiry.message,
                wrap: true,
              },
            ],
          },
        },
      ],
    };
  }
}
